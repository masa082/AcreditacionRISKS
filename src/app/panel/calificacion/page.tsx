import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Calificación" };

export default async function GradingListPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.GRADE_MANUAL) && !can(ctx, PERMISSIONS.GRADE_VIEW)) redirect("/panel");

  const attempts = await prisma.examAttempt.findMany({
    where: { subscriberId, status: "MANUAL_GRADING" },
    orderBy: { submittedAt: "asc" },
    include: {
      exam: { select: { name: true } },
      candidate: { select: { firstName: true, lastName: true, documentNumber: true } },
      enrollment: { select: { code: true } },
    },
  });

  return (
    <>
      <PageHeader title="Calificación" subtitle={`${attempts.length} evaluación(es) pendiente(s) de calificación manual.`} />
      <Card>
        <div className="p-5">
          {attempts.length === 0 ? (
            <EmptyState>No hay evaluaciones pendientes de calificación manual.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {attempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/panel/calificacion/${a.id}`} className="font-medium text-slate-800 hover:text-brand-800 hover:underline">
                      {a.candidate.firstName} {a.candidate.lastName}
                    </Link>
                    <div className="text-xs text-slate-400">
                      {a.exam.name} · Folio {a.enrollment.code}
                      {a.submittedAt ? ` · enviado ${dateTime(a.submittedAt)}` : ""}
                    </div>
                  </div>
                  <Badge tone="amber">Por calificar</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
