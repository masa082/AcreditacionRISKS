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
          candidate: { select: { firstName: true, lastName: true, documentNumber: true } },
          exam: { select: { name: true, passingScore: true } },
        },
      },
      attempt: { select: { scorePercent: true, passed: true, status: true } },
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

  return (
    <>
      <PageHeader
        title={`${review.enrollment.candidate?.firstName} ${review.enrollment.candidate?.lastName}`}
        subtitle={`${review.enrollment.exam?.name} · Folio ${review.enrollment.code}`}
        actions={
          <Link href="/panel/comite" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Volver</Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Calificación" value={pct != null ? `${pct}%` : "—"} tone={review.attempt?.passed ? "good" : "default"} />
        <StatTile label="Mínimo" value={`${Number(review.enrollment.exam?.passingScore.toString() ?? 0)}%`} />
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

      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-3"><h2 className="font-semibold text-slate-900">Votos</h2></div>
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
                      </div>
                      <div className="flex items-center gap-2">
                        {v.conflictOfInterest ? <Badge tone="amber">Conflicto de interés</Badge> : null}
                        <Badge tone={d.tone}>{d.label}</Badge>
                      </div>
                    </div>
                    {v.comment ? <p className="mt-1 text-sm text-slate-500">{v.comment}</p> : null}
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
    </>
  );
}
