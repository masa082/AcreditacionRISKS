import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { dateOnly, dateTime } from "@/lib/format";

export const metadata = { title: "Certificados obtenidos del candidato" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  CERTIFICATION: "Certificado de competencias",
  EXAM_PRESENTATION: "Constancia de presentación",
};
const STATUS_TONE: Record<string, "green" | "amber" | "red" | "slate"> = {
  VALID: "green", EXPIRED: "amber", SUSPENDED: "red", WITHDRAWN: "red", CANCELLED: "slate",
};
const STATUS_LABEL: Record<string, string> = {
  VALID: "Vigente", EXPIRED: "Vencido", SUSPENDED: "Suspendido", WITHDRAWN: "Retirado", CANCELLED: "Anulado",
};
const ATTEMPT_LABEL: Record<string, string> = {
  NOT_STARTED: "No iniciado",
  IN_PROGRESS: "En curso",
  SUBMITTED: "Enviado",
  AUTO_GRADED: "Calificado (auto)",
  MANUAL_GRADING: "Por calificar",
  GRADED: "Calificado",
  PASSED: "Aprobó",
  FAILED: "No aprobó",
  PENDING_COMMITTEE: "En comité",
  VOID: "Anulado",
};
const COMMITTEE_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  REREVIEW: "Revisar de nuevo",
};
const INFO_REQUEST_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  ANSWERED: "Respondida",
  DISMISSED: "Cerrada",
};

/**
 * Expediente de certificación del candidato visto por el admin del
 * suscriptor. Incluye:
 *  - Resumen de certificados emitidos (Certificación y Constancias).
 *  - Por cada inscripción (expediente):
 *      · Datos del examen y esquema
 *      · Intentos con puntajes y estado
 *      · Conceptos del comité evaluador (decisión + votos + observaciones)
 *      · Solicitudes de información adicional + respuesta del candidato
 *      · Encuesta de satisfacción si la respondió
 */
export default async function CandidateCertificatesPanelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { subscriberId } = await requireSubscriberPage();
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, documentNumber: true, email: true, subscriberId: true },
  });
  if (!candidate || candidate.subscriberId !== subscriberId) notFound();

  const [certs, enrollments] = await Promise.all([
    prisma.certificate.findMany({
      where: { candidateId: id, subscriberId },
      orderBy: { issuedAt: "desc" },
      include: { enrollment: { select: { code: true } } },
    }),
    prisma.enrollment.findMany({
      where: { candidateId: id, subscriberId },
      orderBy: { createdAt: "desc" },
      include: {
        scheme: { select: { name: true, code: true } },
        exam: { select: { name: true, passingScore: true, type: true, attemptsAllowed: true } },
        attempts: {
          orderBy: { attemptNumber: "asc" },
          include: {
            satisfactionSurvey: true,
            infoRequests: { orderBy: { createdAt: "desc" } },
            answers: {
              where: { graderComment: { not: null } },
              select: { id: true, manualScore: true, graderComment: true, gradedById: true },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { votes: { orderBy: { createdAt: "asc" } } },
        },
      },
    }),
  ]);

  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();
  const certifications = certs.filter((c) => c.type === "CERTIFICATION");
  const presentations = certs.filter((c) => c.type === "EXAM_PRESENTATION");

  return (
    <>
      <PageHeader
        title={`Expediente de ${fullName}`}
        subtitle={`${candidate.documentNumber ?? "—"} · ${candidate.email}`}
        actions={
          <Link
            href={`/panel/candidatos/${candidate.id}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            ← Volver a la ficha
          </Link>
        }
      />

      {/* ── Resumen rápido ──────────────────────────────────────── */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Certificaciones</div>
          <div className="mt-1 text-2xl font-bold text-gold-700">{certifications.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Constancias</div>
          <div className="mt-1 text-2xl font-bold text-sky-700">{presentations.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Procesos</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{enrollments.length}</div>
        </Card>
      </div>

      {/* ── Bloque 1: Certificados emitidos ──────────────────── */}
      <h2 className="mb-2 text-base font-bold text-slate-900">🎓 Certificados emitidos</h2>
      {certs.length === 0 ? (
        <Card className="p-5"><EmptyState>Este candidato aún no tiene certificados emitidos.</EmptyState></Card>
      ) : (
        <div className="space-y-3">
          {certs.map((c) => {
            const isExpired = c.expiresAt && c.status === "VALID" && c.expiresAt < new Date();
            const effective = isExpired ? "EXPIRED" : c.status;
            const tone = STATUS_TONE[effective] ?? "slate";
            const isCertification = c.type === "CERTIFICATION";
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={tone}>{STATUS_LABEL[effective] ?? effective}</Badge>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${
                        isCertification ? "bg-gold-50 text-gold-700 ring-gold-200" : "bg-sky-50 text-sky-800 ring-sky-200"
                      }`}>
                        {isCertification ? "🎓 Certificación" : "📄 Constancia"}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-bold text-slate-900">{c.title}</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {TYPE_LABEL[c.type] ?? c.type}
                      {c.enrollment?.code ? <> · Folio <span className="font-mono">{c.enrollment.code}</span></> : null}
                      <> · Emitido {dateOnly(c.issuedAt)}</>
                      {c.expiresAt ? <> · Vence {dateOnly(c.expiresAt)}</> : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Código</div>
                    <div className="mt-0.5 font-mono text-xs font-bold text-slate-800">{c.code}</div>
                  </div>
                </div>
                <footer className="flex flex-wrap items-center justify-end gap-2 bg-slate-50 px-5 py-2">
                  <a href={`/verificar/${encodeURIComponent(c.code)}`} target="_blank" rel="noopener noreferrer"
                     className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                    🔗 Verificación pública
                  </a>
                  <a href={`/api/certificate/${encodeURIComponent(c.code)}/og`} target="_blank" rel="noopener noreferrer"
                     className="rounded-lg border border-[#0a66c2]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#0a66c2] hover:bg-[#eff6ff]">
                    🎖️ Insignia LinkedIn
                  </a>
                  <a href={`/api/certificate/${c.verifyToken}/pdf`} target="_blank" rel="noopener noreferrer"
                     className="rounded-lg btn-grad-navy px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                    ⬇ Ver PDF
                  </a>
                </footer>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Bloque 2: Expediente de exámenes ──────────────────── */}
      <h2 className="mb-2 mt-8 text-base font-bold text-slate-900">📋 Expediente de exámenes y comité</h2>
      {enrollments.length === 0 ? (
        <Card className="p-5"><EmptyState>Este candidato aún no tiene procesos abiertos.</EmptyState></Card>
      ) : (
        <div className="space-y-4">
          {enrollments.map((e) => (
            <Card key={e.id} className="overflow-hidden">
              <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{e.exam?.name ?? "Sin examen asignado"}</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {e.scheme?.name ?? "—"} · Folio <span className="font-mono">{e.code}</span>
                      {e.exam?.passingScore ? <> · Umbral aprobatorio {Number(e.exam.passingScore.toString())}%</> : null}
                    </p>
                  </div>
                  <Badge tone={
                    e.status === "CERTIFIED" || e.status === "APPROVED" ? "green"
                    : e.status === "COMMITTEE" || e.status === "GRADING" ? "blue"
                    : e.status === "REJECTED" ? "red" : "slate"
                  }>{e.status}</Badge>
                </div>
              </div>

              {/* Intentos */}
              <section className="border-b border-slate-100 px-5 py-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Intentos del examen</h4>
                {e.attempts.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-400">No ha presentado este examen.</p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {e.attempts.map((a) => {
                      const score = a.scorePercent != null ? Number(a.scorePercent.toString()) : null;
                      const passed = a.passed;
                      return (
                        <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                Intento #{a.attemptNumber}
                              </span>
                              <Badge tone={
                                a.status === "PASSED" ? "green"
                                : a.status === "FAILED" ? "red"
                                : a.status === "MANUAL_GRADING" || a.status === "PENDING_COMMITTEE" ? "amber" : "slate"
                              }>{ATTEMPT_LABEL[a.status] ?? a.status}</Badge>
                              {a.submittedAt ? <span className="text-[10px] text-slate-400">Enviado {dateTime(a.submittedAt)}</span> : null}
                              {a.gradedAt ? <span className="text-[10px] text-slate-400">Calificado {dateTime(a.gradedAt)}</span> : null}
                            </div>
                            <div className="text-right">
                              {score != null ? (
                                <div className={`text-base font-bold ${passed ? "text-emerald-700" : "text-rose-700"}`}>
                                  {score} <span className="text-xs font-medium text-slate-400">/100</span>
                                </div>
                              ) : <span className="text-xs text-slate-400">Sin puntaje</span>}
                            </div>
                          </div>

                          {/* Comentarios del evaluador por respuesta */}
                          {a.answers.length > 0 ? (
                            <div className="mt-2 rounded-md bg-amber-50/40 px-3 py-2 ring-1 ring-amber-200">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                Conceptos del evaluador
                              </p>
                              <ul className="mt-1 space-y-1.5 text-xs text-slate-700">
                                {a.answers.map((ans) => (
                                  <li key={ans.id}>
                                    {ans.manualScore != null ? (
                                      <span className="mr-1 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                        {Number(ans.manualScore.toString())}/100
                                      </span>
                                    ) : null}
                                    <span className="whitespace-pre-wrap">{ans.graderComment}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {/* Solicitudes de información adicional */}
                          {a.infoRequests.length > 0 ? (
                            <div className="mt-2 rounded-md bg-sky-50/40 px-3 py-2 ring-1 ring-sky-200">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                                Solicitudes de información adicional al candidato
                              </p>
                              <ul className="mt-1 space-y-2 text-xs text-slate-700">
                                {a.infoRequests.map((r) => (
                                  <li key={r.id}>
                                    <span className="mr-1 inline-flex items-center rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-900">
                                      {INFO_REQUEST_LABEL[r.status] ?? r.status}
                                    </span>
                                    <span className="font-semibold">Solicitud:</span>{" "}
                                    <span className="whitespace-pre-wrap">{r.message}</span>
                                    {r.candidateResponse ? (
                                      <div className="mt-1 rounded bg-white p-2 ring-1 ring-emerald-200">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                          Respuesta del candidato {r.respondedAt ? `· ${dateTime(r.respondedAt)}` : ""}
                                        </span>
                                        <p className="mt-0.5 whitespace-pre-wrap">{r.candidateResponse}</p>
                                      </div>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {/* Encuesta de satisfacción */}
                          {a.satisfactionSurvey ? (
                            <div className="mt-2 rounded-md bg-emerald-50/40 px-3 py-2 ring-1 ring-emerald-200">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                                Encuesta de satisfacción
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                {a.satisfactionSurvey.npsScore != null ? (
                                  <span className="rounded bg-white px-2 py-0.5 ring-1 ring-emerald-200">
                                    NPS <strong>{a.satisfactionSurvey.npsScore}/10</strong>
                                  </span>
                                ) : null}
                                {a.satisfactionSurvey.overallRating != null ? (
                                  <span className="rounded bg-white px-2 py-0.5 ring-1 ring-emerald-200">
                                    {"★".repeat(a.satisfactionSurvey.overallRating)}
                                    {"☆".repeat(5 - a.satisfactionSurvey.overallRating)}
                                  </span>
                                ) : null}
                                {a.satisfactionSurvey.allowFollowup ? (
                                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">
                                    Autoriza contacto
                                  </span>
                                ) : null}
                              </div>
                              {a.satisfactionSurvey.comment ? (
                                <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                                  <em>“{a.satisfactionSurvey.comment}”</em>
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Comité evaluador */}
              {e.reviews.length > 0 ? (
                <section className="px-5 py-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Concepto del comité evaluador
                  </h4>
                  <ul className="mt-2 space-y-3">
                    {e.reviews.map((r) => (
                      <li key={r.id} className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge tone={
                            r.decision === "APPROVED" ? "green"
                            : r.decision === "REJECTED" ? "red"
                            : r.decision === "REREVIEW" ? "amber" : "slate"
                          }>
                            {COMMITTEE_LABEL[r.decision] ?? r.decision}
                          </Badge>
                          <span className="text-[10px] text-slate-500">
                            Abierta {dateOnly(r.createdAt)}
                            {r.closedAt ? ` · Cerrada ${dateOnly(r.closedAt)}` : null}
                          </span>
                        </div>
                        {r.observations ? (
                          <div className="mt-2 rounded bg-white p-2 ring-1 ring-violet-200">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800">Observaciones</p>
                            <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-700">{r.observations}</p>
                          </div>
                        ) : null}
                        {r.votes.length > 0 ? (
                          <div className="mt-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800">
                              Votos de los miembros del comité
                            </p>
                            <ul className="mt-1 space-y-1.5">
                              {r.votes.map((v) => (
                                <li key={v.id} className="rounded bg-white px-2 py-1.5 text-xs ring-1 ring-slate-200">
                                  <span className="font-mono text-[10px] text-slate-500">{v.memberId.slice(-8)}</span>
                                  <span className={`mx-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    v.decision === "APPROVED" ? "bg-emerald-100 text-emerald-800"
                                    : v.decision === "REJECTED" ? "bg-rose-100 text-rose-800"
                                    : "bg-slate-100 text-slate-700"
                                  }`}>
                                    {COMMITTEE_LABEL[v.decision] ?? v.decision}
                                  </span>
                                  {v.conflictOfInterest ? (
                                    <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                      Conflicto de interés
                                    </span>
                                  ) : null}
                                  {v.signedAt ? (
                                    <span className="text-[10px] text-slate-400">firmó {dateTime(v.signedAt)}</span>
                                  ) : null}
                                  {v.comment ? (
                                    <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{v.comment}</p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
