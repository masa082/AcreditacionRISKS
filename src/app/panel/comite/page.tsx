import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { dateOnly } from "@/lib/format";

export const metadata = { title: "Comité evaluador" };

export default async function CommitteeListPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.COMMITTEE_REVIEW) && !can(ctx, PERMISSIONS.COMMITTEE_DECIDE)) redirect("/panel");

  const reviews = await prisma.committeeReview.findMany({
    where: { subscriberId, closedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      enrollment: {
        select: {
          code: true,
          exam: { select: { name: true } },
          candidate: { select: { firstName: true, lastName: true } },
        },
      },
      _count: { select: { votes: true } },
    },
  });

  return (
    <>
      <PageHeader title="Comité evaluador" subtitle={`${reviews.length} caso(s) pendiente(s) de decisión.`} />
      <Card>
        <div className="p-5">
          {reviews.length === 0 ? (
            <EmptyState>No hay casos pendientes en el comité evaluador.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reviews.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/panel/comite/${r.id}`} className="font-medium text-slate-800 hover:text-brand-800 hover:underline">
                      {r.enrollment.candidate?.firstName} {r.enrollment.candidate?.lastName}
                    </Link>
                    <div className="text-xs text-slate-400">
                      {r.enrollment.exam?.name} · Folio {r.enrollment.code} · creado {dateOnly(r.createdAt)}
                    </div>
                  </div>
                  <Badge tone="blue">{r._count.votes} voto(s)</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
