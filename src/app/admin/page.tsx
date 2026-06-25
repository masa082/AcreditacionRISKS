import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePlatformPage } from "@/lib/guards";
import {
  resolveRange,
  getKpiBundle,
  tsNewCandidates,
  tsCertificatesIssued,
  tsRevenue,
  tsNewLeads,
  getFunnel,
  fmtNumber,
  fmtCurrency,
  pctDelta,
  type RangePreset,
} from "@/lib/metrics";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChart } from "@/components/dashboard/line-chart";
import { BarChart } from "@/components/dashboard/bar-chart";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { RangeSelector } from "@/components/dashboard/range-selector";
import { Widget, WidgetTogglesBar } from "@/components/dashboard/widget-toggles";

export const dynamic = 'force-dynamic';

export const metadata = { title: "Panel de plataforma" };

const DEFAULT_RANGE: RangePreset = "last-30d";
const KNOWN_RANGES = new Set([
  "this-week", "this-month", "this-quarter", "this-year",
  "last-week", "last-month", "last-quarter", "last-year",
  "last-7d", "last-30d", "last-90d", "last-12m",
]);

const COLORS = {
  primary: "#0b1d44",
  good: "#10b981",
  cyan: "#06b6d4",
  violet: "#8b5cf6",
  yoy: "#a78bfa",
};

const WIDGETS = [
  { id: "kpis",        label: "KPIs de plataforma",     defaultOn: true },
  { id: "growth",      label: "Crecimiento (suscriptores · candidatos · certs)", defaultOn: true },
  { id: "revenue",     label: "Ingresos consolidados",  defaultOn: true },
  { id: "topTenants",  label: "Top suscriptores",       defaultOn: true },
  { id: "subStatus",   label: "Estado de suscriptores", defaultOn: true },
  { id: "funnel",      label: "Embudo global",          defaultOn: true },
  { id: "plans",       label: "Distribución por plan",  defaultOn: true },
];

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requirePlatformPage();
  const sp = await searchParams;
  const preset: RangePreset = (sp.range && KNOWN_RANGES.has(sp.range) ? sp.range : DEFAULT_RANGE) as RangePreset;
  const range = resolveRange(preset);

  // Métricas globales: subscriberId = null
  const [
    kpi,
    tsRev, tsRevYoY,
    tsCand, tsCandYoY,
    tsCerts, tsCertsYoY,
    tsLeads,
    funnel,
    statusCounts,
    plans,
    topTenants,
    activeNow, allSubs,
  ] = await Promise.all([
    getKpiBundle(null, range),
    tsRevenue(null, range),
    tsRevenue(null, { ...range, from: range.yoyFrom, to: range.yoyTo }),
    tsNewCandidates(null, range),
    tsNewCandidates(null, { ...range, from: range.yoyFrom, to: range.yoyTo }),
    tsCertificatesIssued(null, range),
    tsCertificatesIssued(null, { ...range, from: range.yoyFrom, to: range.yoyTo }),
    tsNewLeads(null, range),
    getFunnel(null, range),
    prisma.subscriber.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.plan.findMany({
      select: { id: true, name: true, _count: { select: { subscribers: true } } },
      orderBy: { priceMonthly: "asc" },
    }),
    prisma.subscriber.findMany({
      include: {
        _count: {
          select: {
            candidates: true,
            certificates: { where: { issuedAt: { gte: range.from, lte: range.to }, type: "CERTIFICATION" } },
            payments: { where: { status: "APPROVED", paidAt: { gte: range.from, lte: range.to } } },
          },
        },
        plan: { select: { name: true } },
      },
    }),
    // suscriptores activos = ACTIVE+TRIAL (forman parte de la base atendida)
    prisma.subscriber.count({ where: { status: { in: ["ACTIVE", "TRIAL"] } } }),
    prisma.subscriber.count(),
  ]);

  function alignYoY<T extends { value: number }>(curr: T[], yoy: T[]): T[] {
    return curr.map((c, i) => ({ ...c, value: yoy[i]?.value ?? 0 } as T));
  }

  const k = kpi.current, p = kpi.previous, y = kpi.yoy;

  // Top suscriptores por ingresos del período (mediante una segunda query).
  const tenantRevenueRows = await prisma.payment.groupBy({
    by: ["subscriberId"],
    _sum: { amount: true },
    _count: { _all: true },
    where: { status: "APPROVED", paidAt: { gte: range.from, lte: range.to } },
  });
  const revBySub = new Map(tenantRevenueRows.map((r) => [r.subscriberId, { sum: Number(r._sum.amount ?? 0), count: r._count._all }]));
  const topByRevenue = [...topTenants]
    .map((s) => {
      const r = revBySub.get(s.id) ?? { sum: 0, count: 0 };
      return { ...s, revenue: r.sum, paidCount: r.count };
    })
    .sort((a, b) => b.revenue - a.revenue || b._count.certificates - a._count.certificates)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resumen de la plataforma</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Métricas globales del SaaS · período <strong className="text-slate-700">{range.label.toLowerCase()}</strong> ·{" "}
            <strong className="text-slate-700">{fmtNumber(activeNow)}</strong> suscriptores atendidos de {fmtNumber(allSubs)} totales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RangeSelector current={preset} />
          <WidgetTogglesBar scope="admin" widgets={WIDGETS} />
        </div>
      </header>

      <Widget scope="admin" id="kpis">
        <section>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Ingresos plataforma" value={k.paymentsApprovedAmount}
              prev={p.paymentsApprovedAmount} yoy={y.paymentsApprovedAmount}
              format="currency" currency="COP" icon="💰" accent="emerald"
              spark={tsRev.map((t) => t.value)}
            />
            <KpiCard
              label="Nuevos candidatos" value={k.candidatesNew}
              prev={p.candidatesNew} yoy={y.candidatesNew}
              icon="👥" accent="brand" spark={tsCand.map((t) => t.value)}
            />
            <KpiCard
              label="Certificados emitidos" value={k.certificatesIssued}
              prev={p.certificatesIssued} yoy={y.certificatesIssued}
              icon="🎓" accent="violet" spark={tsCerts.map((t) => t.value)}
            />
            <KpiCard
              label="Leads captados" value={k.leadsNew}
              prev={p.leadsNew} yoy={y.leadsNew}
              icon="🎯" accent="cyan" spark={tsLeads.map((t) => t.value)}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Conversión global" value={
                k.leadsNew ? Math.round((k.candidatesNew / k.leadsNew) * 100) : 0
              }
              hint={`${k.candidatesNew} candidatos / ${k.leadsNew} leads`}
              icon="🔁" accent="cyan"
            />
            <KpiCard
              label="Inscripciones pagadas" value={k.enrollmentsPaid}
              prev={p.enrollmentsPaid} yoy={y.enrollmentsPaid}
              icon="💳" accent="emerald"
            />
            <KpiCard
              label="Pendientes de pago" value={k.pendingPayment}
              prev={p.pendingPayment} icon="⏳" accent="amber" goodDirection="down"
            />
            <KpiCard
              label="Apelaciones abiertas" value={k.openAppeals}
              prev={p.openAppeals} icon="⚖" accent="rose" goodDirection="down"
            />
          </div>
        </section>
      </Widget>

      <Widget scope="admin" id="revenue">
        <LineChart
          title="Ingresos consolidados — actual vs año anterior"
          subtitle="Pagos aprobados en toda la plataforma"
          format="currency"
          currency="COP"
          series={[
            { key: "now", label: range.label, color: COLORS.good, data: tsRev },
            { key: "yoy", label: "Año anterior", color: COLORS.yoy, data: alignYoY(tsRev, tsRevYoY), dashed: true },
          ]}
        />
      </Widget>

      <div className="grid gap-4 lg:grid-cols-2">
        <Widget scope="admin" id="growth">
          <BarChart
            title="Candidatos captados — comparativo YoY"
            subtitle="Nuevos candidatos vs mismo período del año anterior"
            series={[
              { key: "now", label: range.label, color: COLORS.primary, data: tsCand },
              { key: "yoy", label: "Año anterior", color: COLORS.yoy, data: alignYoY(tsCand, tsCandYoY), dashed: true },
            ]}
          />
        </Widget>
        <Widget scope="admin" id="growth">
          <LineChart
            title="Certificados emitidos"
            subtitle="Volumen consolidado de toda la plataforma"
            series={[
              { key: "now", label: range.label, color: COLORS.violet, data: tsCerts },
              { key: "yoy", label: "Año anterior", color: COLORS.yoy, data: alignYoY(tsCerts, tsCertsYoY), dashed: true },
            ]}
          />
        </Widget>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget scope="admin" id="funnel">
          <FunnelChart
            title="Embudo global"
            subtitle="Leads → Candidatos → Pagados → Certificados"
            steps={funnel.map((s) => ({ key: s.key, label: s.label, value: s.value }))}
          />
        </Widget>
        <Widget scope="admin" id="subStatus">
          <DonutChart
            title="Estado de suscriptores"
            subtitle="Composición actual del SaaS"
            slices={statusCounts.map((g, i) => ({
              label: g.status,
              value: g._count._all,
              color: ["#10b981", "#f59e0b", "#ef4444", "#94a3b8"][i % 4],
            }))}
            centerLabel="Suscriptores"
          />
        </Widget>
        <Widget scope="admin" id="plans">
          <DonutChart
            title="Distribución por plan"
            subtitle="Cuántos suscriptores hay en cada plan"
            slices={plans.map((p, i) => ({
              label: p.name,
              value: p._count.subscribers,
              color: ["#0b1d44", "#1d4ed8", "#0ea5e9", "#06b6d4", "#10b981", "#a78bfa"][i % 6],
            }))}
            centerLabel="Planes"
          />
        </Widget>
      </div>

      <Widget scope="admin" id="topTenants">
        <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Top suscriptores del período</h3>
            <p className="text-xs text-slate-500">
              Por ingresos generados; con cantidad de certificados emitidos en el rango.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-2">Suscriptor</th>
                  <th className="px-5 py-2">Plan</th>
                  <th className="px-5 py-2 text-right">Ingresos</th>
                  <th className="px-5 py-2 text-right">Pagos</th>
                  <th className="px-5 py-2 text-right">Certificados</th>
                  <th className="px-5 py-2 text-right">Candidatos totales</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topByRevenue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-400">
                      Sin actividad en el período seleccionado.
                    </td>
                  </tr>
                ) : topByRevenue.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{s.tradeName ?? s.legalName}</div>
                      <div className="text-[10px] text-slate-400">/{s.slug}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{s.plan?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-700">{fmtCurrency(s.revenue)}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{fmtNumber(s.paidCount)}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{fmtNumber(s._count.certificates)}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{fmtNumber(s._count.candidates)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/suscriptores/${s.id}/usuarios`}
                        className="rounded-md border border-brand-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        Ver usuarios
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Widget>

      <p className="text-[10px] text-slate-400">
        Comparativo YoY: cuando el período seleccionado tuvo 0 ingresos el año pasado, el delta puede mostrarse como{" "}
        <code>{`${fmtPercent(pctDelta(100, 0))}`}</code> o &laquo;—&raquo;. Use al menos 30 días de historia para que los YoY sean significativos.
      </p>
    </div>
  );
}

function fmtPercent(n: number | null): string {
  if (n === null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(0)}%`;
}
