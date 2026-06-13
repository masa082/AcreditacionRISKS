import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { CandidatesTable, type CandidateRow } from "@/components/candidates-table";
import { money, dateOnly, dateTime } from "@/lib/format";

export const metadata = { title: "Candidatos" };

const ENROLL_STATUS_ES: Record<string, string> = {
  STARTED: "Iniciado",
  CONSENT_PENDING: "Autorización pendiente",
  DOCS_PENDING: "Documentos pendientes",
  PAYMENT_PENDING: "Pago pendiente",
  SCHEDULING: "Por agendar",
  READY: "Listo para presentar",
  IN_PROGRESS: "En presentación",
  GRADING: "En calificación",
  COMMITTEE: "En comité",
  APPROVED: "Aprobado",
  REJECTED: "No aprobado",
  CERTIFIED: "Certificado",
  EXPIRED: "Vencido",
  CANCELLED: "Cancelado",
};

interface SearchParams {
  q?: string;
  status?: string;
  payment?: string;
  consent?: string;
  from?: string;
  to?: string;
}

function buildWhere(args: { subscriberId: string } & SearchParams) {
  const { subscriberId, q, status, payment, consent, from, to } = args;
  const where: Record<string, unknown> = { subscriberId };
  if (q?.trim()) {
    where.OR = [
      { firstName: { contains: q.trim(), mode: "insensitive" } },
      { lastName: { contains: q.trim(), mode: "insensitive" } },
      { email: { contains: q.trim(), mode: "insensitive" } },
      { documentNumber: { contains: q.trim(), mode: "insensitive" } },
    ];
  }
  const dateFrom = from ? new Date(from) : null;
  const dateTo = to ? new Date(to) : null;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }
  // status / payment se combinan en enrollments.some
  const enrSome: Record<string, unknown> = {};
  if (status) enrSome.status = status;
  if (payment === "approved") enrSome.payments = { some: { status: "APPROVED" } };
  else if (payment === "pending") enrSome.payments = { some: { status: "PENDING" } };
  else if (payment === "none") enrSome.payments = { none: {} };
  if (Object.keys(enrSome).length > 0) where.enrollments = { some: enrSome };

  if (consent === "yes") where.consents = { some: {} };
  else if (consent === "no") where.consents = { none: {} };

  return where;
}

export default async function CandidatesListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.CANDIDATE_MANAGE) && !can(ctx, PERMISSIONS.ENROLLMENT_MANAGE)) {
    redirect("/panel");
  }
  const sp = await searchParams;
  const where = buildWhere({ subscriberId, ...sp });

  const [candidates, totalCount] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        user: { select: { id: true, lastLoginAt: true, lastLoginIp: true } },
        consents: { take: 1, orderBy: { createdAt: "desc" }, select: { id: true } },
        enrollments: {
          orderBy: { createdAt: "desc" },
          include: {
            scheme: { select: { name: true } },
            exam: { select: { name: true, passingScore: true } },
            payments: {
              orderBy: [{ status: "asc" }, { paidAt: "desc" }],
              select: { status: true, amount: true, currency: true },
            },
            documents: { select: { status: true, fileName: true } },
            // Attempts del candidato para esta inscripción — para mostrar
            // los puntajes obtenidos por evaluación.
            attempts: {
              orderBy: { createdAt: "desc" },
              select: {
                status: true,
                scorePercent: true,
                passed: true,
                submittedAt: true,
              },
              take: 1,
            },
            certificates: { select: { id: true, status: true } },
          },
        },
      },
    }),
    prisma.candidate.count({ where: { subscriberId } }),
  ]);

  // Conteo de correos enviados a cada candidato (bitácora EmailLog).
  const candidateIds = candidates.map((c) => c.id);
  const emailsAgg = candidateIds.length
    ? await prisma.emailLog.groupBy({
        by: ["candidateId"],
        where: { subscriberId, candidateId: { in: candidateIds } },
        _count: { _all: true },
      })
    : [];
  const emailsByCandidate = new Map<string, number>(
    emailsAgg.map((r) => [r.candidateId as string, r._count._all]),
  );

  // Conteo de incidencias PENDIENTES (no resueltas) por candidato.
  const incidentsAgg = candidateIds.length
    ? await prisma.processIncident.groupBy({
        by: ["candidateId"],
        where: {
          subscriberId,
          candidateId: { in: candidateIds },
          resolvedAt: null,
        },
        _count: { _all: true },
      })
    : [];
  const incidentsByCandidate = new Map<string, number>(
    incidentsAgg.map((r) => [r.candidateId as string, r._count._all]),
  );

  // Para conteo de logins agregamos AuditLog por actorId.
  const userIds = candidates.map((c) => c.user?.id).filter(Boolean) as string[];
  const [loginAgg, activeSessions] = await Promise.all([
    userIds.length
      ? prisma.auditLog.groupBy({
          by: ["actorId"],
          where: { actorId: { in: userIds }, action: "auth.login" },
          _count: { _all: true },
        })
      : Promise.resolve([] as { actorId: string | null; _count: { _all: number } }[]),
    // Sesiones activas ahora mismo (no revocadas y no expiradas).
    userIds.length
      ? prisma.session.findMany({
          where: { userId: { in: userIds }, revokedAt: null, expiresAt: { gt: new Date() } },
          select: { userId: true },
          distinct: ["userId"],
        })
      : Promise.resolve([] as { userId: string }[]),
  ]);
  const loginsByUser = new Map<string, number>(loginAgg.map((r) => [r.actorId as string, r._count._all]));
  const onlineUsers = new Set(activeSessions.map((s) => s.userId));

  const rows: CandidateRow[] = candidates.map((c) => {
    const last = c.enrollments[0];
    const lastPayment = last?.payments[0];

    // CONTEO AGREGADO de documentos: antes solo se contaban los de la
    // última inscripción, lo que daba 0/0/0 falso cuando una nueva
    // inscripción del programa reusaba docs aprobados de otra anterior
    // (caso de Samuel Sánchez: 9 APPROVED en Examen Teórico, 0 en Caso
    // Práctico porque están heredados). Ahora sumamos los docs APROBADOS
    // distintos por requiredDocument a través de TODAS las inscripciones.
    const allDocs = c.enrollments.flatMap((e) => e.documents ?? []);
    const docsApproved = allDocs.filter((d) => d.status === "APPROVED").length;
    const docsPending = allDocs.filter((d) => d.status === "SUBMITTED").length;
    const docsRejected = allDocs.filter((d) => d.status === "REJECTED").length;
    const docsPdf = allDocs.filter((d) => /\.pdf$/i.test(d.fileName ?? "")).length;
    const docsImg = allDocs.filter((d) => /\.(png|jpe?g)$/i.test(d.fileName ?? "")).length;

    const paymentLabel: CandidateRow["paymentLabel"] = lastPayment?.status === "APPROVED" ? "approved"
      : lastPayment?.status === "PENDING" ? "pending"
      : lastPayment?.status === "REJECTED" ? "rejected"
      : "none";

    // PROGRAMA del candidato — nombre del esquema más reciente.
    // (Suele ser el mismo entre evaluaciones del mismo programa.)
    const programName = last?.scheme?.name ?? null;

    // PUNTAJES por evaluación — recorre todas las inscripciones y
    // saca el último attempt de cada una. Para la tabla mostramos
    // máximo 2 chips (Teórico / Caso Práctico) que cubren el flujo OCP.
    const scores: CandidateRow["scores"] = [];
    for (const e of c.enrollments) {
      const att = e.attempts[0];
      if (!att) continue;
      const examName = e.exam?.name ?? "Evaluación";
      const examShort = /teórico|teorico/i.test(examName)
        ? "Teórico"
        : /caso/i.test(examName)
        ? "Caso"
        : examName.slice(0, 12);
      const pct = att.scorePercent ? Number(att.scorePercent.toString()) : null;
      scores.push({
        examShort,
        scorePercent: pct,
        passed: att.passed,
        status: att.status,
      });
    }
    // ¿Tiene certificado emitido?
    const hasCert = c.enrollments.some((e) => e.certificates.some((cert) => cert.status === "VALID"));

    return {
      id: c.id,
      fullName: `${c.firstName} ${c.lastName}`,
      email: c.email,
      documentLabel: c.documentType ? `${c.documentType} ${c.documentNumber ?? ""}`.trim() : (c.documentNumber ?? "—"),
      enrollments: c.enrollments.length,
      lastStatus: last?.status ?? "",
      lastStatusLabel: last ? (ENROLL_STATUS_ES[last.status] ?? last.status) : "Sin inscripciones",
      lastCreatedAt: last ? dateOnly(last.createdAt) : null,
      paymentLabel,
      paymentAmount: lastPayment && Number(lastPayment.amount.toString()) > 0
        ? money(lastPayment.amount, lastPayment.currency)
        : null,
      consentGiven: c.consents.length > 0,
      docsApproved,
      docsPending,
      docsRejected,
      docsPdf,
      docsImg,
      programName,
      scores,
      hasCert,
      lastLoginLabel: c.user?.lastLoginAt ? dateTime(c.user.lastLoginAt) : null,
      lastLoginIp: c.user?.lastLoginIp ?? null,
      loginCount: c.user?.id ? loginsByUser.get(c.user.id) ?? 0 : 0,
      isOnline: c.user?.id ? onlineUsers.has(c.user.id) : false,
      emailsCount: emailsByCandidate.get(c.id) ?? 0,
      incidentsCount: incidentsByCandidate.get(c.id) ?? 0,
    };
  });

  const totalPendingDocs = rows.reduce((s, r) => s + r.docsPending, 0);

  return (
    <>
      <PageHeader
        title="Candidatos"
        subtitle={`${rows.length} de ${totalCount} mostrados · ${totalPendingDocs} documento(s) por revisar`}
      />
      <Card>
        <div className="p-5">
          <CandidatesTable rows={rows} />
        </div>
      </Card>
    </>
  );
}
