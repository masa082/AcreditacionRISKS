import Link from "next/link";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { startEnrollment } from "@/lib/actions/enrollment";
import { money, dateOnly } from "@/lib/format";
import { isSchemeComingSoon } from "@/lib/brand";
import { ProcessSteps } from "@/components/process-steps";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = { title: "Programas de certificación disponibles" };

const MODALITY_ES: Record<string, string> = {
  ONLINE: "En línea",
  ONSITE: "Presencial",
  HYBRID: "Híbrida",
};

interface ExamRow {
  id: string;
  name: string;
  durationMin: number;
  passingScore: number;
  attemptsAllowed: number;
  modality: string;
  availableTo: Date | null;
  description: string | null;
  schemeId: string | null;
}

interface SchemeGroup {
  schemeId: string;
  schemeName: string;
  scope: string | null;
  validityMonths: number;
  normReference: string | null;
  exams: ExamRow[];
  feeTotal: number;
  feeCurrency: string;
}

/**
 * Progreso del candidato por examen — calculado server-side a partir
 * de la enrollment + documentos + pagos + intentos + certificado.
 *
 * `paid` es la señal MAESTRA para decidir si mostrar precio o estado:
 *   - paid === true → ocultamos costo, mostramos panel de progreso
 *     con puntajes y siguiente paso.
 *   - paid === false → mostramos precio + CTA "Inscribirme" como antes
 *     (también si hay enrollment pero sin pago confirmado todavía).
 */
interface ExamProgress {
  enrollmentId: string;
  enrollmentStatus: string;
  consentDone: boolean;
  docsRequired: number;
  docsApproved: number;
  docsSubmitted: number; // includes SUBMITTED + APPROVED
  paid: boolean;
  paymentPending: boolean;
  attempt: {
    status: string;
    scorePercent: number | null;
    passed: boolean | null;
    submittedAt: Date | null;
  } | null;
  certificateIssued: boolean;
}

export default async function AvailableExamsPage() {
  const { subscriberId, candidateId } = await requireCandidatePage();
  const locale = await getServerLocale();
  const now = new Date();

  const [exams, activeEnrollments] = await Promise.all([
    prisma.exam.findMany({
      where: {
        subscriberId,
        status: "PUBLISHED",
        OR: [{ availableTo: null }, { availableTo: { gte: now } }],
      },
      orderBy: { name: "asc" },
      include: {
        scheme: { select: { id: true, name: true, scope: true, validityMonths: true, normReference: true } },
      },
    }),
    prisma.enrollment.findMany({
      where: { candidateId, status: { notIn: ["CANCELLED", "REJECTED", "EXPIRED"] } },
      include: {
        documents: { select: { status: true } },
        payments: { select: { status: true, amount: true } },
        attempts: {
          select: {
            status: true,
            scorePercent: true,
            passed: true,
            submittedAt: true,
            examId: true,
          },
          orderBy: { createdAt: "desc" },
        },
        certificates: { select: { id: true } },
        scheme: { select: { id: true } },
      },
    }),
  ]);

  // Documentos requeridos por esquema (para calcular "faltan X").
  const schemeIdsForReq = Array.from(
    new Set(activeEnrollments.map((e) => e.schemeId).filter((x): x is string => !!x)),
  );
  const requiredDocs = schemeIdsForReq.length
    ? await prisma.requiredDocument.findMany({
        where: {
          subscriberId,
          isActive: true,
          required: true,
          schemeId: { in: schemeIdsForReq },
        },
        select: { schemeId: true },
      })
    : [];
  const reqDocCountByScheme = new Map<string, number>();
  for (const r of requiredDocs) {
    if (!r.schemeId) continue;
    reqDocCountByScheme.set(r.schemeId, (reqDocCountByScheme.get(r.schemeId) ?? 0) + 1);
  }

  // Mapa examen → progreso + mapa esquema → inscripción activa.
  const progressByExam = new Map<string, ExamProgress>();
  const enrolledSchemes = new Set<string>();
  for (const e of activeEnrollments) {
    if (e.schemeId) enrolledSchemes.add(e.schemeId);

    const paid = e.payments.some((p) => p.status === "APPROVED");
    const paymentPending = !paid && e.payments.some((p) => p.status === "PENDING");
    const docsApproved = e.documents.filter((d) => d.status === "APPROVED").length;
    const docsSubmitted = e.documents.filter(
      (d) => d.status === "APPROVED" || d.status === "SUBMITTED",
    ).length;
    const docsRequired = e.schemeId ? reqDocCountByScheme.get(e.schemeId) ?? 0 : 0;
    const certificateIssued = e.certificates.length > 0;

    // El intento del examen (puede no existir aún).
    if (e.examId) {
      const attempt = e.attempts.find((a) => a.examId === e.examId) ?? e.attempts[0] ?? null;
      progressByExam.set(e.examId, {
        enrollmentId: e.id,
        enrollmentStatus: e.status,
        consentDone: true, // los consentimientos viven en otro nivel; asumimos sí si está inscrito.
        docsRequired,
        docsApproved,
        docsSubmitted,
        paid,
        paymentPending,
        attempt: attempt
          ? {
              status: attempt.status,
              scorePercent: attempt.scorePercent ? Number(attempt.scorePercent.toString()) : null,
              passed: attempt.passed,
              submittedAt: attempt.submittedAt,
            }
          : null,
        certificateIssued,
      });
    }
  }

  const schemeIds = Array.from(new Set(exams.map((e) => e.schemeId).filter((x): x is string => !!x)));
  const fees = schemeIds.length
    ? await prisma.feeConfig.findMany({
        where: { subscriberId, schemeId: { in: schemeIds }, isActive: true, concept: { in: ["ENROLLMENT", "EXAM"] } },
      })
    : [];
  const feeBySchemeTotal = new Map<string, { total: number; currency: string }>();
  for (const f of fees) {
    if (!f.schemeId) continue;
    const cur = feeBySchemeTotal.get(f.schemeId) ?? { total: 0, currency: f.currency };
    cur.total += Number(f.amount.toString());
    feeBySchemeTotal.set(f.schemeId, cur);
  }

  // Agrupar exámenes publicados por esquema.
  const groups = new Map<string, SchemeGroup>();
  const orphanExams: ExamRow[] = [];
  for (const e of exams) {
    const row: ExamRow = {
      id: e.id,
      name: e.name,
      durationMin: e.durationMin,
      passingScore: Number(e.passingScore.toString()),
      attemptsAllowed: e.attemptsAllowed,
      modality: e.modality,
      availableTo: e.availableTo,
      description: e.description,
      schemeId: e.schemeId,
    };
    if (!e.schemeId || !e.scheme) {
      orphanExams.push(row);
      continue;
    }
    const g = groups.get(e.schemeId) ?? {
      schemeId: e.scheme.id,
      schemeName: e.scheme.name,
      scope: e.scheme.scope,
      validityMonths: e.scheme.validityMonths,
      normReference: e.scheme.normReference,
      exams: [],
      feeTotal: feeBySchemeTotal.get(e.scheme.id)?.total ?? 0,
      feeCurrency: feeBySchemeTotal.get(e.scheme.id)?.currency ?? "COP",
    };
    g.exams.push(row);
    groups.set(e.schemeId, g);
  }
  const schemeList = Array.from(groups.values()).sort((a, b) => {
    const aSoon = isSchemeComingSoon(a.schemeName) ? 1 : 0;
    const bSoon = isSchemeComingSoon(b.schemeName) ? 1 : 0;
    if (aSoon !== bSoon) return aSoon - bSoon;
    return a.schemeName.localeCompare(b.schemeName);
  });

  // Step actual del proceso global del candidato — lo computamos
  // mirando el avance "más adelantado" de cualquier programa pagado.
  // Si no hay nada pagado, queda en paso 2 (Documentos + pago).
  let globalStep: 1 | 2 | 3 | 4 = 2;
  for (const p of progressByExam.values()) {
    if (p.certificateIssued) globalStep = 4;
    else if (p.attempt?.passed) globalStep = Math.max(globalStep, 4) as 1 | 2 | 3 | 4;
    else if (p.attempt && p.attempt.status !== "NOT_STARTED") globalStep = Math.max(globalStep, 3) as 1 | 2 | 3 | 4;
    else if (p.paid) globalStep = Math.max(globalStep, 3) as 1 | 2 | 3 | 4;
  }

  return (
    <>
      <PageHeader
        title="Programas de certificación disponibles"
        subtitle="Cada programa incluye dos evaluaciones (Caso Práctico y Examen Teórico) que culminan en una certificación profesional verificable."
      />

      {/* Stepper compacto: ahora se ajusta al avance real del candidato. */}
      <div className="mb-5">
        <ProcessSteps currentStep={globalStep} variant="compact" locale={locale} />
      </div>

      {schemeList.length === 0 && orphanExams.length === 0 ? (
        <EmptyState>
          No hay programas publicados en este momento. Vuelva más tarde o contacte a la entidad certificadora.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {schemeList.map((g) => (
            <ProgramCard
              key={g.schemeId}
              group={g}
              progressByExam={progressByExam}
              enrolledSchemes={enrolledSchemes}
            />
          ))}
          {orphanExams.map((e) => (
            <Card key={e.id} className="p-5">
              <h3 className="font-semibold text-slate-900">{e.name}</h3>
              <Badge tone="amber">Sin programa asignado</Badge>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Estado "consolidado" del programa para el candidato — mezcla el
 * progreso de TODAS las evaluaciones del esquema. Decide qué panel
 * mostrar a la derecha (precio vs estado del proceso).
 */
function consolidateProgress(
  group: SchemeGroup,
  progressByExam: Map<string, ExamProgress>,
): {
  anyPaid: boolean;
  anyEnrolled: boolean;
  paymentPending: boolean;
  perExam: { exam: ExamRow; progress: ExamProgress | null }[];
} {
  let anyPaid = false;
  let anyEnrolled = false;
  let paymentPending = false;
  const perExam = group.exams.map((e) => {
    const p = progressByExam.get(e.id) ?? null;
    if (p) {
      anyEnrolled = true;
      if (p.paid) anyPaid = true;
      if (p.paymentPending) paymentPending = true;
    }
    return { exam: e, progress: p };
  });
  return { anyPaid, anyEnrolled, paymentPending, perExam };
}

function ProgramCard({
  group,
  progressByExam,
  enrolledSchemes,
}: {
  group: SchemeGroup;
  progressByExam: Map<string, ExamProgress>;
  enrolledSchemes: Set<string>;
}) {
  const years = Math.round(group.validityMonths / 12);
  const yearsLabel = `${years} ${years === 1 ? "año" : "años"}`;
  const inProgress = enrolledSchemes.has(group.schemeId);
  const comingSoon = isSchemeComingSoon(group.schemeName);
  const examOrder = [...group.exams].sort((a, b) => {
    const w = (n: string) => (/teórico/i.test(n) ? 0 : /caso/i.test(n) ? 1 : 2);
    return w(a.name) - w(b.name) || a.name.localeCompare(b.name);
  });

  const consolidated = consolidateProgress(
    { ...group, exams: examOrder },
    progressByExam,
  );

  // Decisión clave: si YA pagó (al menos una evaluación), ocultamos
  // el precio y mostramos el panel guiado de "Estado del proceso".
  const showProgressPanel = consolidated.anyPaid;

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">{group.schemeName}</h2>
            {comingSoon ? (
              <Badge tone="amber">Próximamente</Badge>
            ) : showProgressPanel ? (
              <Badge tone="green">En su proceso</Badge>
            ) : inProgress ? (
              <Badge tone="green">Inscrito</Badge>
            ) : null}
          </div>
          {group.scope ? <p className="mt-2 text-sm text-slate-600">{group.scope}</p> : null}
          {group.normReference ? <p className="mt-2 text-xs italic text-slate-400">Referencia: {group.normReference}</p> : null}
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Incluye {group.exams.length} evaluaciones:
          </p>
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            {examOrder.map((e) => {
              const p = progressByExam.get(e.id);
              return (
                <li key={e.id} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                      p?.attempt?.passed
                        ? "bg-emerald-100 text-emerald-700"
                        : p?.attempt?.status === "IN_PROGRESS"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-brand-50 text-brand-800"
                    }`}
                  >
                    {p?.attempt?.passed ? "✓" : p?.attempt?.status === "IN_PROGRESS" ? "…" : "○"}
                  </span>
                  <span>
                    <strong className="text-slate-800">{e.name}</strong>
                    <span className="ml-2 text-xs text-slate-400">
                      {e.durationMin} min · Aprobación {e.passingScore}% · {MODALITY_ES[e.modality] ?? e.modality}
                    </span>
                    {p?.attempt?.scorePercent != null ? (
                      <span
                        className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          p.attempt.passed
                            ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                        }`}
                      >
                        Puntaje: {p.attempt.scorePercent.toLocaleString("es-CO", { maximumFractionDigits: 1 })}% ·{" "}
                        {p.attempt.passed ? "✓ Aprobado" : "✗ No aprobado"}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900 ring-1 ring-brand-100">
            Al aprobar ambas evaluaciones, recibirá el <strong>Certificado de Competencias</strong> con vigencia de {yearsLabel} y verificación pública por QR.
          </p>
        </div>

        <aside className="rounded-2xl bg-slate-50 p-5">
          {comingSoon ? (
            <ComingSoonPanel schemeName={group.schemeName} />
          ) : showProgressPanel ? (
            // Ya pagó al menos una evaluación → panel guiado SIN precio.
            <ProcessStatusPanel
              consolidated={consolidated}
              yearsLabel={yearsLabel}
            />
          ) : (
            // No pagó todavía → panel comercial con precio y CTA.
            <PricePanel
              group={group}
              consolidated={consolidated}
              yearsLabel={yearsLabel}
            />
          )}
        </aside>
      </div>
    </Card>
  );
}

function ComingSoonPanel({ schemeName }: { schemeName: string }) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-800">
        🕒 Próximamente
      </div>
      <Link
        href={`/contacto?cert=${encodeURIComponent(schemeName)}`}
        className="block rounded-lg border border-brand-200 px-3 py-2 text-center text-xs font-semibold text-brand-800 hover:bg-brand-50"
      >
        Notifíquenme cuando esté disponible →
      </Link>
    </div>
  );
}

/**
 * Panel ORIGINAL — precio + CTA de inscripción. Solo se ve cuando el
 * candidato AÚN NO ha pagado ninguna evaluación del programa.
 */
function PricePanel({
  group,
  consolidated,
  yearsLabel,
}: {
  group: SchemeGroup;
  consolidated: ReturnType<typeof consolidateProgress>;
  yearsLabel: string;
}) {
  return (
    <>
      <div className="text-xs uppercase tracking-wider text-slate-500">Costo del programa</div>
      <div className="mt-1 text-2xl font-bold text-brand-800">
        {group.feeTotal > 0 ? money(group.feeTotal, group.feeCurrency) : "Sin costo"}
      </div>
      <div className="text-[11px] text-slate-500">+ IVA · pago único por el programa</div>
      <dl className="mt-5 space-y-2 text-xs text-slate-500">
        <div className="flex justify-between"><dt>Vigencia</dt><dd className="font-semibold text-slate-700">{yearsLabel}</dd></div>
        <div className="flex justify-between"><dt>Evaluaciones</dt><dd className="font-semibold text-slate-700">{group.exams.length}</dd></div>
        <div className="flex justify-between"><dt>Modalidad</dt><dd className="font-semibold text-slate-700">En línea</dd></div>
      </dl>
      <div className="mt-5 space-y-2">
        {consolidated.perExam.map(({ exam, progress }) => {
          const isTeor = /teórico/i.test(exam.name);
          const label = isTeor ? "Examen Teórico" : /caso/i.test(exam.name) ? "Caso Práctico" : exam.name;
          const earliestClose = exam.availableTo ? `Cierra ${dateOnly(exam.availableTo)}` : null;
          return (
            <div key={exam.id}>
              {progress ? (
                <Link
                  href={`/portal/inscripcion/${progress.enrollmentId}`}
                  className="block rounded-lg border border-brand-300 px-3 py-2 text-center text-sm font-semibold text-brand-800 hover:bg-brand-50"
                >
                  Continuar · {label}
                </Link>
              ) : (
                <form action={startEnrollment.bind(null, exam.id)}>
                  <SubmitButton pendingText="Inscribiendo…">Inscribirme · {label}</SubmitButton>
                </form>
              )}
              {earliestClose ? <p className="mt-1 text-center text-[10px] text-amber-600">{earliestClose}</p> : null}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[10px] text-slate-400">
        La primera inscripción cubre el costo del programa. La segunda evaluación queda <strong>sin costo adicional</strong>.
      </p>
    </>
  );
}

/**
 * Panel NUEVO — guía al candidato que YA PAGÓ por el resto del proceso.
 *
 * Muestra:
 *  - Checklist con lo hecho (✓) / lo pendiente (○) / lo en curso (⏳)
 *  - Puntajes obtenidos por cada evaluación presentada
 *  - "Siguiente paso" destacado con CTA principal
 *  - Datos administrativos (vigencia, modalidad) discretos abajo
 *
 * NO muestra precio — el candidato ya pagó. Cumple la regla
 * solicitada por el usuario: "Cuando un Candidato ya pago su proceso,
 * que no se vuelva a mostrar el precio solo los puntajes obtenidos y
 * lo que le falta".
 */
function ProcessStatusPanel({
  consolidated,
  yearsLabel,
}: {
  consolidated: ReturnType<typeof consolidateProgress>;
  yearsLabel: string;
}) {
  // Buscamos UN enrollment "pagado" para llevar al candidato cuando
  // pulse el botón principal del siguiente paso. Si todas las
  // evaluaciones tienen su enrollment, priorizamos la del examen teórico.
  const teor = consolidated.perExam.find(
    (x) => /teórico/i.test(x.exam.name) && x.progress?.paid,
  );
  const caso = consolidated.perExam.find(
    (x) => /caso/i.test(x.exam.name) && x.progress?.paid,
  );
  const anyPaid =
    teor ??
    caso ??
    consolidated.perExam.find((x) => x.progress?.paid) ??
    consolidated.perExam.find((x) => x.progress);
  const targetEnrollmentId = anyPaid?.progress?.enrollmentId ?? null;

  // Estado del Examen Teórico y del Caso Práctico para el checklist.
  const teorProg = teor?.progress ?? null;
  const casoProg = caso?.progress ?? null;

  // Decidir el "siguiente paso" más útil para guiar al candidato.
  const next = computeNextStep({ teorProg, casoProg });

  // Documentos consolidados: si hay más de un enrollment, tomamos el
  // peor (lo que más falta) para que el checklist refleje "lo pendiente".
  const allProgs = consolidated.perExam.map((x) => x.progress).filter((x): x is ExamProgress => !!x);
  const docsRequired = Math.max(0, ...allProgs.map((p) => p.docsRequired));
  const docsApproved = Math.min(...allProgs.map((p) => p.docsApproved), docsRequired);
  const docsSubmitted = Math.min(...allProgs.map((p) => p.docsSubmitted), docsRequired);
  const allDocsApproved = docsRequired > 0 && docsApproved >= docsRequired;
  const allDocsSubmitted = docsRequired > 0 && docsSubmitted >= docsRequired;

  return (
    <div className="space-y-4">
      <div className="text-xs uppercase tracking-wider text-emerald-700">Estado de su proceso</div>

      {/* Checklist guiado */}
      <ul className="space-y-1.5 text-[12.5px]">
        <ChecklistItem state="done" label="Inscripción registrada" />
        <ChecklistItem
          state={allDocsApproved ? "done" : allDocsSubmitted ? "pending" : "todo"}
          label="Documentos"
          detail={
            docsRequired > 0
              ? allDocsApproved
                ? `Aprobados (${docsApproved}/${docsRequired})`
                : `${docsSubmitted}/${docsRequired} cargados · en revisión`
              : "Cargados"
          }
        />
        <ChecklistItem state="done" label="Pago confirmado" detail="Aprobado por el organismo" />

        {teorProg ? (
          <ChecklistItem
            state={
              teorProg.attempt?.passed
                ? "done"
                : teorProg.attempt?.passed === false
                ? "failed"
                : teorProg.attempt?.status === "IN_PROGRESS"
                ? "pending"
                : "todo"
            }
            label="Examen Teórico"
            detail={
              teorProg.attempt?.scorePercent != null
                ? `Puntaje: ${teorProg.attempt.scorePercent.toLocaleString("es-CO", {
                    maximumFractionDigits: 1,
                  })}% · ${teorProg.attempt.passed ? "Aprobado" : "No aprobado"}`
                : teorProg.attempt?.status === "IN_PROGRESS"
                ? "Iniciado, sin enviar"
                : "Pendiente de presentar"
            }
          />
        ) : null}

        {casoProg ? (
          <ChecklistItem
            state={
              casoProg.attempt?.passed
                ? "done"
                : casoProg.attempt?.passed === false
                ? "failed"
                : casoProg.attempt?.status === "IN_PROGRESS"
                ? "pending"
                : "todo"
            }
            label="Caso Práctico"
            detail={
              casoProg.attempt?.scorePercent != null
                ? `Puntaje: ${casoProg.attempt.scorePercent.toLocaleString("es-CO", {
                    maximumFractionDigits: 1,
                  })}% · ${casoProg.attempt.passed ? "Aprobado" : "No aprobado"}`
                : casoProg.attempt?.status === "IN_PROGRESS"
                ? "Iniciado, sin enviar"
                : "Pendiente de presentar"
            }
          />
        ) : null}

        <ChecklistItem
          state={allProgs.some((p) => p.certificateIssued) ? "done" : "todo"}
          label="Certificado emitido"
          detail={
            allProgs.some((p) => p.certificateIssued)
              ? "Disponible en Mis Certificados"
              : "Tras aprobar ambas evaluaciones"
          }
        />
      </ul>

      {/* Siguiente paso destacado */}
      {next ? (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            ➜ Siguiente paso
          </div>
          <p className="mt-0.5 text-[12.5px] font-semibold text-emerald-900">{next.title}</p>
          {next.detail ? <p className="text-[11px] text-emerald-800">{next.detail}</p> : null}
          {next.href ? (
            <Link
              href={next.href}
              className="mt-2 block rounded-lg btn-grad-navy px-3 py-2 text-center text-sm font-bold text-white shadow-sm"
            >
              {next.cta}
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Acceso a la inscripción / ficha del proceso */}
      {targetEnrollmentId ? (
        <Link
          href={`/portal/inscripcion/${targetEnrollmentId}`}
          className="block rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          📂 Ver detalles del proceso
        </Link>
      ) : null}

      {/* Datos administrativos discretos */}
      <dl className="space-y-1 border-t border-slate-200 pt-3 text-[11px] text-slate-500">
        <div className="flex justify-between"><dt>Vigencia al certificarse</dt><dd className="font-semibold text-slate-700">{yearsLabel}</dd></div>
        <div className="flex justify-between"><dt>Modalidad</dt><dd className="font-semibold text-slate-700">En línea</dd></div>
      </dl>
    </div>
  );
}

function ChecklistItem({
  state,
  label,
  detail,
}: {
  state: "done" | "pending" | "todo" | "failed";
  label: string;
  detail?: string;
}) {
  const cfg = {
    done: { icon: "✓", cls: "bg-emerald-100 text-emerald-700", text: "text-slate-800" },
    pending: { icon: "⏳", cls: "bg-amber-100 text-amber-700", text: "text-slate-800" },
    todo: { icon: "○", cls: "bg-slate-100 text-slate-400", text: "text-slate-500" },
    failed: { icon: "✗", cls: "bg-rose-100 text-rose-700", text: "text-rose-800" },
  }[state];
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${cfg.cls}`}>
        {cfg.icon}
      </span>
      <span className="min-w-0">
        <span className={`font-semibold ${cfg.text}`}>{label}</span>
        {detail ? <span className="ml-1 text-[11px] text-slate-500">— {detail}</span> : null}
      </span>
    </li>
  );
}

/// Calcula el "siguiente paso" guiado según el estado de las dos
/// evaluaciones del programa.
function computeNextStep({
  teorProg,
  casoProg,
}: {
  teorProg: ExamProgress | null;
  casoProg: ExamProgress | null;
}): { title: string; detail?: string; cta: string; href?: string } | null {
  // Teórico no presentado → presentarlo.
  if (teorProg && !teorProg.attempt) {
    return {
      title: "Presente el Examen Teórico",
      detail: "Su pago está confirmado. Cuando esté listo, inicie la evaluación desde la inscripción.",
      cta: "Continuar al Examen Teórico →",
      href: `/portal/inscripcion/${teorProg.enrollmentId}`,
    };
  }
  // Teórico en curso → continuar.
  if (teorProg?.attempt?.status === "IN_PROGRESS") {
    return {
      title: "Continúe el Examen Teórico",
      detail: "Tiene un intento en curso. Vuelva a la prueba para finalizarla.",
      cta: "Volver a la prueba →",
      href: `/portal/inscripcion/${teorProg.enrollmentId}`,
    };
  }
  // Teórico no aprobado → puede reintentar.
  if (teorProg?.attempt?.passed === false) {
    return {
      title: "Revise el resultado del Examen Teórico",
      detail: "No alcanzó el puntaje de aprobación. Revise el detalle y consulte sus opciones de reintento.",
      cta: "Ver detalle del intento →",
      href: `/portal/inscripcion/${teorProg.enrollmentId}`,
    };
  }
  // Teórico aprobado y Caso Práctico no inscrito todavía.
  if (teorProg?.attempt?.passed && !casoProg) {
    return {
      title: "Inscríbase al Caso Práctico",
      detail: "Aprobó el Examen Teórico. Avance al Caso Práctico — sin costo adicional.",
      cta: "Ir a inscripción del Caso Práctico →",
      href: `/portal/inscripcion/${teorProg.enrollmentId}`,
    };
  }
  // Caso práctico inscrito pero no presentado.
  if (casoProg && !casoProg.attempt) {
    return {
      title: "Presente el Caso Práctico",
      detail: "Es la última evaluación. Al aprobarla se emitirá su certificado.",
      cta: "Continuar al Caso Práctico →",
      href: `/portal/inscripcion/${casoProg.enrollmentId}`,
    };
  }
  if (casoProg?.attempt?.status === "IN_PROGRESS") {
    return {
      title: "Continúe el Caso Práctico",
      detail: "Tiene un intento en curso. Vuelva a la prueba para finalizarla.",
      cta: "Volver a la prueba →",
      href: `/portal/inscripcion/${casoProg.enrollmentId}`,
    };
  }
  if (casoProg?.attempt?.passed === false) {
    return {
      title: "Revise el resultado del Caso Práctico",
      detail: "Revise el detalle del intento y las opciones de reintento.",
      cta: "Ver detalle del intento →",
      href: `/portal/inscripcion/${casoProg.enrollmentId}`,
    };
  }
  // Ambos aprobados → esperar certificado.
  if (teorProg?.attempt?.passed && casoProg?.attempt?.passed) {
    const certIssued =
      (teorProg.certificateIssued ?? false) || (casoProg.certificateIssued ?? false);
    if (certIssued) {
      return {
        title: "Certificado emitido",
        detail: "Su certificado está disponible para descarga y verificación pública.",
        cta: "Ver mis certificados →",
        href: "/portal/certificados",
      };
    }
    return {
      title: "Esperando emisión del certificado",
      detail: "Aprobó ambas evaluaciones. El comité valida y emite su certificado en breve.",
      cta: "Ver detalles del proceso →",
      href: `/portal/inscripcion/${teorProg.enrollmentId}`,
    };
  }
  return null;
}
