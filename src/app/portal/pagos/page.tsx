import Link from "next/link";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { money, dateTime } from "@/lib/format";

export const metadata = { title: "Mis pagos" };

const PAY_STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "slate" }> = {
  APPROVED: { label: "Aprobado", tone: "green" },
  PENDING: { label: "Pendiente", tone: "amber" },
  REJECTED: { label: "Rechazado", tone: "red" },
  EXPIRED: { label: "Expirado", tone: "slate" },
  REFUNDED: { label: "Reembolsado", tone: "slate" },
};

export default async function CandidatePaymentsPage() {
  const { candidateId, subscriberId } = await requireCandidatePage();

  const enrollments = await prisma.enrollment.findMany({
    where: { candidateId },
    select: { id: true },
  });
  const payments = await prisma.payment.findMany({
    where: { subscriberId, enrollmentId: { in: enrollments.map((e) => e.id) } },
    orderBy: { createdAt: "desc" },
    include: { enrollment: { select: { code: true, exam: { select: { name: true } } } } },
  });

  return (
    <>
      <PageHeader title="Mis pagos" subtitle="Historial de pagos de sus procesos de certificación." />
      <Card>
        <div className="p-5">
          {payments.length === 0 ? (
            <EmptyState>
              Aún no registra pagos.{" "}
              <Link href="/portal/evaluaciones" className="text-brand-700 hover:underline">
                Inscríbase en una evaluación
              </Link>
              .
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-4 font-medium">Concepto</th>
                    <th className="py-2 pr-4 font-medium">Folio</th>
                    <th className="py-2 pr-4 font-medium">Monto</th>
                    <th className="py-2 pr-4 font-medium">Fecha</th>
                    <th className="py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => {
                    const st = PAY_STATUS[p.status] ?? { label: p.status, tone: "slate" as const };
                    return (
                      <tr key={p.id}>
                        <td className="py-3 pr-4 text-slate-700">{p.description ?? p.enrollment?.exam?.name ?? p.concept}</td>
                        <td className="py-3 pr-4 text-slate-500">{p.enrollment?.code ?? "—"}</td>
                        <td className="py-3 pr-4 font-medium text-slate-800">{money(p.amount, p.currency)}</td>
                        <td className="py-3 pr-4 text-slate-500">{p.paidAt ? dateTime(p.paidAt) : dateTime(p.createdAt)}</td>
                        <td className="py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
