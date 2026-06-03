import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { SubscriberForm } from "@/components/subscriber-form";
import { PlanAssign } from "@/components/plan-assign";
import { setSubscriberStatus } from "@/lib/actions/platform";
import { dateOnly } from "@/lib/format";

export const metadata = { title: "Suscriptores" };

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "slate"> = {
  ACTIVE: "green",
  TRIAL: "amber",
  SUSPENDED: "red",
  CANCELLED: "slate",
};

export default async function SubscribersPage() {
  const [subs, plans] = await Promise.all([
    prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
      include: { plan: { select: { id: true, name: true } }, _count: { select: { users: true, candidates: true, certificates: true } } },
    }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthly: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Suscriptores" subtitle={`${subs.length} organización(es) en la plataforma.`} />

      <Card className="mb-6">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Nuevo suscriptor</h2></div>
        <div className="p-6">
          <SubscriberForm plans={plans} />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Organización</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Usuarios / Candidatos / Cert.</th>
                <th className="px-5 py-3">Creado</th>
                <th className="px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{s.tradeName ?? s.legalName}</div>
                    <div className="text-xs text-slate-400">/{s.slug}</div>
                  </td>
                  <td className="px-5 py-3"><PlanAssign subscriberId={s.id} plans={plans} current={s.plan?.id ?? null} /></td>
                  <td className="px-5 py-3"><Badge tone={STATUS_TONE[s.status] ?? "slate"}>{s.status}</Badge></td>
                  <td className="px-5 py-3 text-slate-600">{s._count.users} / {s._count.candidates} / {s._count.certificates}</td>
                  <td className="px-5 py-3 text-slate-500">{dateOnly(s.createdAt)}</td>
                  <td className="px-5 py-3">
                    {s.status === "SUSPENDED" || s.status === "CANCELLED" ? (
                      <form action={setSubscriberStatus.bind(null, s.id, "ACTIVE")}>
                        <button type="submit" className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">Activar</button>
                      </form>
                    ) : (
                      <form action={setSubscriberStatus.bind(null, s.id, "SUSPENDED")}>
                        <button type="submit" className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">Suspender</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
