import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, StatTile } from "@/components/ui";
import { VoteForm } from "@/components/vote-form";
import { CloseReviewForm } from "@/components/close-review-form";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Revisión de comité" };

const DECISION: Record<string, { label: string; tone: "green" | "red" | "amber" | "slate" }> = {
  APPROVED: { label: "Aprobar", tone: "green" },
  REJECTED: { label: "Rechazar", tone: "red" },
  REREVIEW: { label: "Nueva revisión", tone: "amber" },
  PENDING: { label: "Pendiente", tone: "slate" },
};

const DOC_STATUS: Record<string, { label: string; tone: "green" | "red" | "amber" | "slate" }> = {
  SUBMITTED: { label: "Enviado", tone: "slate" },
  APPROVED: { label: "Aprobado", tone: "green" },
  REJECTED: { label: "Rechazado", tone: "red" },
  PENDING: { label: "Pendiente", tone: "amber" },
};

/// Mapea las acciones del audit log a etiquetas legibles para el comité.
const AUDIT_LABELS: Record<string, { label: string; tone: "slate" | "green" | "red" | "amber" }> = {
  "committee.review.create": { label: "Caso abierto para revisión", tone: "slate" },
  "committee.vote": { label: "Voto registrado", tone: "amber" },
  "committee.decide": { label: "Decisión final emitida", tone: "green" },
  "attempt.submit": { label: "Candidato envió la evaluación", tone: "slate" },
  "attempt.grade.finalize": { label: "Calificación finalizada", tone: "slate" },
};

export default async function CommitteeReviewPage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = await params;
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.COMMITTEE_REVIEW) && !can(ctx, PERMISSIONS.COMMITTEE_DECIDE)) redirect("/panel");

  const review = await prisma.committeeReview.findUnique({
    where: { id: reviewId },
    include: {
      enrollment: {
        select: {
          id: true,
          code: true,
          candidateId: true,
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              documentNumber: true,
              email: true,
              phone: true,
              profile: true,
              createdAt: true,
            },
          },
          exam: { select: { name: true, passingScore: true } },
          documents: {
            include: { requiredDocument: { select: { name: true, code: true } } },
            orderBy: { uploadedAt: "desc" },
          },
        },
      },
      attempt: {
        select: {
          scorePercent: true,
          passed: true,
          status: true,
          submittedAt: true,
        },
      },
      votes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!review || review.subscriberId !== subscriberId) notFound();

  const memberIds = [...new Set(review.votes.map((v) => v.memberId))];
  const members = memberIds.length
    ? await prisma.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } } })
    : [];
  const memberById = new Map(members.map((m) => [m.id, m]));
  const myVote = review.votes.find((v) => v.memberId === ctx.userId);
  const validVotes = review.votes.filter((v) => !v.conflictOfInterest);
  const closed = !!review.closedAt;

  const canVote = can(ctx, PERMISSIONS.COMMITTEE_REVIEW);
  const canDecide = can(ctx, PERMISSIONS.COMMITTEE_DECIDE);
  const pct = review.attempt?.scorePercent != null ? Number(review.attempt.scorePercent.toString()) : null;
  const minScore = Number(review.enrollment.exam?.passingScore.toString() ?? 0);
  const candidate = review.enrollment.candidate;
  const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}`.trim() : "Candidato";
  const docs = review.enrollment.documents;

  // Resumen de historia laboral desde el JSON profile del candidato.
  // El editor del candidato/operador guarda aquí: experience, education,
  // certifications, knowledge — usamos lo que esté disponible.
  const profile = (candidate?.profile ?? {}) as Record<string, unknown>;
  const experience = Array.isArray(profile.experience) ? (profile.experience as Array<Record<string, string>>) : [];
  const education = Array.isArray(profile.education) ? (profile.education as Array<Record<string, string>>) : [];

  // Audit log de esta revisión: actos del comité + envío del examen.
  const auditEntries = await prisma.auditLog.findMany({
    where: {
      subscriberId,
      OR: [
        { entity: "CommitteeReview", entityId: review.id },
        { entity: "CommitteeReview", entityId: review.enrollmentId },
        { entity: "ExamAttempt", entityId: review.attemptId ?? "" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      action: true,
      createdAt: true,
      after: true,
      actorId: true,
    },
  });
  const actorIds = [...new Set(auditEntries.map((e) => e.actorId).filter(Boolean))] as string[];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true } })
    : [];
  const actorById = new Map(actors.map((a) => [a.id, a]));

  return (
    <>
      <PageHeader
        title={candidateName}
        subtitle={`${review.enrollment.exam?.name} · Folio ${review.enrollment.code}`}
        actions={
          <Link href="/panel/comite" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Volver</Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Calificación" value={pct != null ? `${pct} / 100` : "—"} tone={review.attempt?.passed ? "good" : "default"} />
        <StatTile label="Umbral mínimo" value={`${minScore}%`} />
        <StatTile label="Documentos" value={docs.length} />
        <StatTile label="Votos válidos" value={validVotes.length} />
      </div>

      {closed ? (
        <Card className="mt-6 border-l-4 border-l-brand-600 p-5">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Decisión del comité:</span>
            <Badge tone={DECISION[review.decision]?.tone ?? "slate"}>{DECISION[review.decision]?.label ?? review.decision}</Badge>
            <span className="text-xs text-slate-400">{review.closedAt ? dateTime(review.closedAt) : ""}</span>
          </div>
          {review.observations ? <p className="mt-2 text-sm text-slate-600">{review.observations}</p> : null}
        </Card>
      ) : null}

      {/* ───────────────────── DATOS DEL CANDIDATO ───────────────────── */}
      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-900">Datos del candidato</h2>
        </div>
        <div className="grid gap-4 p-5 text-sm text-slate-700 sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Documento</div>
            <div className="font-mono">{candidate?.documentNumber ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Correo</div>
            <div className="break-all">{candidate?.email ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Teléfono</div>
            <div>{candidate?.phone ?? "—"}</div>
          </div>
        </div>
        {candidate?.id ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/40 px-5 py-3 text-sm">
            <Link
              href={`/panel/candidatos/${candidate.id}/cv`}
              target="_blank"
              className="inline-flex items-center gap-1 rounded-lg btn-grad-navy px-3 py-1.5 text-xs font-bold"
            >
              ⬇ Descargar Hoja de Vida (PDF)
            </Link>
            <Link
              href={`/panel/candidatos/${candidate.id}/documentos`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-300"
            >
              📁 Ver carpeta visual completa
            </Link>
            <span className="ml-auto text-xs text-slate-400">
              Candidato desde {candidate.createdAt ? dateTime(candidate.createdAt) : "—"}
            </span>
          </div>
        ) : null}
      </Card>

      {/* ───────────────────── HISTORIA LABORAL ───────────────────── */}
      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-900">Historia laboral declarada por el candidato</h2>
          <p className="text-xs text-slate-500">Información reportada en su perfil. La Hoja de Vida (PDF) contiene el detalle completo.</p>
        </div>
        <div className="p-5">
          {experience.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-3 text-center text-sm text-slate-500">
              El candidato no ha registrado experiencia laboral en su perfil.
              Revise el detalle directamente en la <Link href={`/panel/candidatos/${candidate?.id}/cv`} target="_blank" className="font-semibold text-brand-700 hover:underline">Hoja de Vida en PDF</Link>.
            </p>
          ) : (
            <ul className="space-y-3">
              {experience.map((e, i) => (
                <li key={i} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-slate-900">{e.role ?? e.title ?? e.position ?? "—"}</span>
                    <span className="text-xs text-slate-400">{e.from ?? ""}{e.from && e.to ? " — " : ""}{e.to ?? (e.current ? "Actualmente" : "")}</span>
                  </div>
                  <div className="text-xs text-slate-600">{e.company ?? e.employer ?? "—"}</div>
                  {e.description ? <p className="mt-1 text-xs text-slate-500">{e.description}</p> : null}
                </li>
              ))}
            </ul>
          )}

          {education.length > 0 ? (
            <>
              <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Formación académica</h3>
              <ul className="mt-2 space-y-2">
                {education.map((ed, i) => (
                  <li key={i} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                    <div className="font-semibold text-slate-900">{ed.title ?? ed.degree ?? "—"}</div>
                    <div className="text-xs text-slate-600">{ed.institution ?? "—"} · {ed.year ?? ed.from ?? ""}</div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </Card>

      {/* ───────────────────── DOCUMENTOS CARGADOS ───────────────────── */}
      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-900">Documentos cargados ({docs.length})</h2>
          <p className="text-xs text-slate-500">Toda la documentación que sustenta esta certificación. Haga clic para abrir y revisar.</p>
        </div>
        <div className="p-5">
          {docs.length === 0 ? (
            <p className="rounded-lg bg-rose-50 px-3 py-3 text-center text-sm text-rose-700 ring-1 ring-rose-200">
              ⚠ El candidato no ha cargado documentos en esta inscripción.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {docs.map((d) => {
                const tone = DOC_STATUS[d.status]?.tone ?? "slate";
                const label = DOC_STATUS[d.status]?.label ?? d.status;
                // Patrón consistente con el resto del panel:
                // los documentos se sirven autenticados por su id.
                const href = `/api/files/${d.id}`;
                return (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800">
                        {d.requiredDocument?.name ?? d.fileName ?? "Documento"}
                      </div>
                      <div className="font-mono text-xs text-slate-400">
                        {d.requiredDocument?.code ? `${d.requiredDocument.code} · ` : ""}
                        Cargado {dateTime(d.uploadedAt)}
                      </div>
                      {d.reviewNotes ? (
                        <p className="mt-1 text-xs text-slate-500">Nota: {d.reviewNotes}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={tone}>{label}</Badge>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-brand-800 hover:border-brand-300 hover:bg-brand-50"
                        >
                          Abrir →
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {/* ───────────────────── VOTOS ───────────────────── */}
      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-3"><h2 className="font-semibold text-slate-900">Votos del comité</h2></div>
        <div className="p-5">
          {review.votes.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay votos registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {review.votes.map((v) => {
                const m = memberById.get(v.memberId);
                const d = DECISION[v.decision] ?? { label: v.decision, tone: "slate" as const };
                return (
                  <li key={v.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-sm font-medium text-slate-800">{m ? `${m.firstName} ${m.lastName}` : "Miembro"}</span>
                        {m?.role?.name ? <span className="ml-2 text-xs text-slate-400">{m.role.name}</span> : null}
                        {v.signedAt ? <span className="ml-2 text-xs text-slate-400">· firmó {dateTime(v.signedAt)}</span> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {v.conflictOfInterest ? <Badge tone="amber">Conflicto de interés</Badge> : null}
                        <Badge tone={d.tone}>{d.label}</Badge>
                      </div>
                    </div>
                    {v.comment ? <p className="mt-1 rounded-md bg-slate-50 p-2 text-sm text-slate-700">{v.comment}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {!closed && canVote ? (
        <Card className="mt-6 p-5">
          <h2 className="mb-4 font-semibold text-slate-900">{myVote ? "Actualizar mi voto" : "Emitir mi voto"}</h2>
          <VoteForm reviewId={review.id} initial={myVote ? { decision: myVote.decision, conflict: myVote.conflictOfInterest, comment: myVote.comment } : undefined} />
        </Card>
      ) : null}

      {!closed && canDecide ? (
        <Card className="mt-6 p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Decisión final del comité</h2>
          <CloseReviewForm reviewId={review.id} />
        </Card>
      ) : null}

      {/* ───────────────────── TRAZABILIDAD / AUDIT LOG ───────────────────── */}
      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-900">Trazabilidad de la revisión</h2>
          <p className="text-xs text-slate-500">
            Log completo de cada acción que ha tocado este caso: envío del examen, calificación,
            votos, decisión final. Inmutable por política ISO/IEC 17024.
          </p>
        </div>
        <div className="p-5">
          {auditEntries.length === 0 ? (
            <p className="text-sm text-slate-400">Sin eventos registrados aún.</p>
          ) : (
            <ol className="relative ml-3 space-y-3 border-l-2 border-slate-200 pl-5">
              {auditEntries.map((e) => {
                const label = AUDIT_LABELS[e.action] ?? { label: e.action, tone: "slate" as const };
                const actor = e.actorId ? actorById.get(e.actorId) : null;
                const after = (e.after ?? null) as Record<string, unknown> | null;
                return (
                  <li key={e.id} className="relative">
                    <span
                      className={`absolute -left-[27px] top-1 grid h-4 w-4 place-items-center rounded-full ring-2 ring-white ${
                        label.tone === "green" ? "bg-emerald-500" :
                        label.tone === "red" ? "bg-rose-500" :
                        label.tone === "amber" ? "bg-amber-500" : "bg-slate-400"
                      }`}
                    />
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-800">{label.label}</span>
                      <span className="text-xs text-slate-400">{dateTime(e.createdAt)}</span>
                      {actor ? (
                        <span className="text-xs text-slate-500">
                          · por <b className="font-semibold text-slate-700">{actor.firstName} {actor.lastName}</b>
                        </span>
                      ) : null}
                    </div>
                    {after ? (
                      <pre className="mt-1 max-w-full overflow-x-auto rounded-md bg-slate-50 p-2 text-[11px] leading-snug text-slate-600">
                        {JSON.stringify(after, null, 2)}
                      </pre>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </Card>
    </>
  );
}
