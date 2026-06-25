import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { PlanForm } from "@/components/plan-form";
import { money } from "@/lib/format";

export const dynamic = 'force-dynamic';

export const metadata = { title: "Planes" };

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({ orderBy: { priceMonthly: "asc" }, include: { _count: { select: { subscribers: true } } } });

  return (
    <>
      <PageHeader title="Planes comerciales" subtitle="Defina los planes del SaaS y sus límites." />

      <Card className="mb-6">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Nuevo plan</h2></div>
        <div className="p-6"><PlanForm /></div>
      </Card>

      <div className="space-y-3">
        {plans.map((p) => (
          <Card key={p.id}>
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <span className="font-semibold text-slate-900">{p.name}</span>
                  <span className="ml-2 font-mono text-xs text-slate-400">{p.key}</span>
                  {!p.isActive ? <Badge tone="slate">Inactivo</Badge> : null}
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>{money(p.priceMonthly)}/mes</span>
                  <span>{p._count.subscribers} suscriptor(es)</span>
                  <span className="text-xs text-brand-700">Editar ▾</span>
                </div>
              </summary>
              <div className="border-t border-slate-200 p-6">
                <PlanForm
                  planId={p.id}
                  initial={{
                    key: p.key,
                    name: p.name,
                    description: p.description,
                    priceMonthly: Number(p.priceMonthly.toString()),
                    priceYearly: Number(p.priceYearly.toString()),
                    maxUsers: p.maxUsers,
                    maxCandidates: p.maxCandidates,
                    maxExams: p.maxExams,
                    isActive: p.isActive,
                  }}
                />
              </div>
            </details>
          </Card>
        ))}
      </div>
    </>
  );
}
