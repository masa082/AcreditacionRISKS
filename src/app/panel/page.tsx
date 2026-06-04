import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import {
  resolveRange,
  getKpiBundle,
  tsNewCandidates,
  tsCertificatesIssued,
  tsRevenue,
  tsAttemptsSubmitted,
  getFunnel,
  getEnrollmentStatus,
  getTopSchemes,
  getCandidatesStuck,
  fmtNumber,
  type RangePreset,
} from "@/lib/metrics";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineChart } from "@/components/dashboard/line-chart";
import { BarChart } from "@/components/dashboard/bar-chart";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { RangeSelector } from "@/components/dashboard/range-selector";
import { Widget, WidgetTogglesBar } from "@/components/dashboard/widget-toggles";

export const metadata = { title: "Panel del suscriptor" };

const DEFAULT_RANGE: RangePreset = "last-30d";
const KNOWN_RANGES = new Set([
  "this-week", "this-month", "this-quarter", "this-year",
  "last-week", "last-month", "last-quarter", "last-year",
  "last-7d", "last-30d", "last-90d", "last-12m",
]);

// Paleta consistente: navy (actual) + slate (anterior) + cyan (YoY)
const COLORS = {
  primary: "#0b1d44",
  secondary: "#0ea5e9",
  prev: "#94a3b8",
  yoy: "#a78bfa",
  warn: "#f59e0b",
  good: "#10b981",
  rose: "#f43f5e",
};

const STATUS_LABELS: Record<string, string> = {
  STARTED: "Iniciado", CONSENT_PENDING: "Consentimiento",
  DOCS_PENDING: "Documentos", PAYMENT_PENDING: "Pago pend.",
  SCHEDULING: "Por agendar", READY: "Listo", IN_PROGRESS: "Presentando",
  GRADING: "Calificando", COMMITTEE: "Comité", APPROVED: "Aprobado",
  REJECTED: "No aprobado", CERTIFIED: "Certificado", EXPIRED: "Vencido",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS = [
  "#0b1d44", "#1d4ed8", "#0ea5e9", "#06b6d4", "#10b981",
  "#a3e635", "#f59e0b", "#f97316", "#ef4444", "#a78bfa",
  "#ec4899", "#8b5cf6", "#64748b", "#0f172a",
];

const WIDGETS = [
  { id: "kpis",         label: "KPIs principales",      defaultOn: true },
  { id: "revenue",      label: "Ventas (línea + YoY)",  defaultOn: true },
  { id: "candidates",   label: "Crecimiento candidatos",defaultOn: true },
  { id: "certificates", label: "Certificados emitidos", defaultOn: true },
  { id: "funnel",       label: "Embudo de conversión",  defaultOn: true },
  { id: "status",       label: "Estado de inscripciones", defaultOn: true },
  { id: "schemes",      label: "Top esquemas",          defaultOn: true },
  { id: "operations",   label: "Operación + Alertas",   defaultOn: true },
];

export default async function SubscriberDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { subscriberId } = await requireSubscriberPage();
  const sp = await searchParams;
  const preset: RangePreset = (sp.range && KNOWN_RANGES.has(sp.range) ? sp.range : DEFAULT_RANGE) as RangePreset;
  const range = resolveRange(preset);

  // Trae todas las series y agregados en paralelo. Una sola tanda de
  // queries: si esto crece, conviene memoizar con React.cache.
  const [
    subscriber,
    kpi,
    tsRev, tsRevYoY,
    tsCand, tsCandYoY,
    tsCerts, tsCertsYoY,
    tsAttempts,
    funnel,
    statusGroups,
    schemes,
    stuck,
  ] = await Promise.all([
    prisma.subscriber.findUnique({ where: { id: subscriberId }, include: { plan: true } }),
    getKpiBundle(subscriberId, range),
    tsRevenue(subscriberId, range),
    tsRevenue(subscriberId, { ...range, from: range.yoyFrom, to: range.yoyTo }),
    tsNewCandidates(subscriberId, range),
    tsNewCandidates(subscriberId, { ...range, from: range.yoyFrom, to: range.yoyTo }),
    tsCertificatesIssued(subscriberId, range),
    tsCertificatesIssued(subscriberId, { ...range, from: range.yoyFrom, to: range.yoyTo }),
    tsAttemptsSubmitted(subscriberId, range),
    getFunnel(subscriberId, range),
    getEnrollmentStatus(subscriberId, range),
    getTopSchemes(subscriberId, range, 6),
    getCandidatesStuck(subscriberId, 7),
  ]);

  const orgName = subscriber?.tradeName ?? subscriber?.legalName ?? "Suscriptor";
  const k = kpi.current, p = kpi.previous, y = kpi.yoy;

  // Sparklines = serie cruda para KPI cards (sin YoY)
  const sparkRev = tsRev.map((t) => t.value);
  const sparkCand = tsCand.map((t) => t.value);
  const sparkCerts = tsCerts.map((t) => t.value);
  const sparkAttempts = tsAttempts.map((t) => t.value);

  // Alinear índices YoY con la longitud actual (resolveRange ya cuida la longitud).
  function alignYoY(curr: typeof tsRev, yoy: typeof tsRev): typeof tsRev {
    return curr.map((c, i) => ({ ...c, value: yoy[i]?.value ?? 0 }));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de {orgName}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Plan <strong className="text-slate-700">{subscriber?.plan?.name ?? "—"}</strong> ·
            operación de certificación · período <strong className="text-slate-700">{range.label.toLowerCase()}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RangeSelector current={preset} />
          <WidgetTogglesBar scope="panel" widgets={WIDGETS} />
        </div>
      </header>

      <Widget scope="panel" id="kpis">
        <section>
          <h2 className="sr-only">Indicadores principales</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Ingresos del período" value={k.paymentsApprovedAmount}
              prev={p.paymentsApprovedAmount} yoy={y.paymentsApprovedAmount}
              format="currency" currency="COP" icon="💰"
              accent="emerald" spark={sparkRev}
              hint="vs período anterior" yoyHint="vs año anterior"
            />
            <KpiCard
              label="Nuevos candidatos" value={k.candidatesNew}
              prev={p.candidatesNew} yoy={y.candidatesNew}
              icon="👥" accent="brand" spark={sparkCand}
            />
            <KpiCard
              label="Certificados emitidos" value={k.certificatesIssued}
              prev={p.certificatesIssued} yoy={y.certificatesIssued}
              icon="🎓" accent="violet" spark={sparkCerts}
            />
            <KpiCard
              label="Pruebas presentadas" value={k.attemptsSubmitted}
              prev={p.attemptsSubmitted} yoy={y.attemptsSubmitted}
              icon="📝" accent="cyan" spark={sparkAttempts}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Tasa de aprobación" value={
                k.attemptsSubmitted
                  ? Math.round((k.attemptsPassed / k.attemptsSubmitted) * 100)
                  : 0
              }
              hint={`${k.attemptsPassed} de ${k.attemptsSubmitted} pruebas`}
              icon="✓" accent="emerald"
            />
            <KpiCard
              label="Pendientes de pago" value={k.pendingPayment}
              prev={p.pendingPayment} icon="⏳" accent="amber" goodDirection="down"
            />
            <KpiCard
              label="Pendientes de calificar" value={k.pendingGrading}
              prev={p.pendingGrading} icon="📋" accent="amber" goodDirection="down"
            />
            <KpiCard
              label="Apelaciones abiertas" value={k.openAppeals}
              prev={p.openAppeals} icon="⚖" accent="rose" goodDirection="down"
            />
          </div>
        </section>
      </Widget>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget scope="panel" id="revenue">
          <div className="lg:col-span-3">
            <LineChart
              title="Ventas — comparativo vs año anterior"
              subtitle={`Ingresos por pagos aprobados · granularidad ${range.granularity}`}
              format="currency"
              currency="COP"
              series={[
                { key: "now", label: range.label, color: COLORS.primary, data: tsRev },
                { key: "yoy", label: "Año anterior", color: COLORS.yoy, data: alignYoY(tsRev, tsRevYoY), dashed: true },
              ]}
            />
          </div>
        </Widget>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Widget scope="panel" id="candidates">
          <BarChart
            title="Crecimiento de candidatos mes a mes"
            subtitle="Nuevos candidatos en el período (barra principal) vs mismo período del año anterior"
            series={[
              { key: "now", label: range.label, color: COLORS.primary, data: tsCand },
              { key: "yoy", label: "Año anterior", color: COLORS.yoy, data: alignYoY(tsCand, tsCandYoY), dashed: true },
            ]}
          />
        </Widget>
        <Widget scope="panel" id="certificates">
          <LineChart
            title="Certificados emitidos"
            subtitle="Evolución del volumen de certificados expedidos."
            series={[
              { key: "now", label: range.label, color: COLORS.good, data: tsCerts },
              { key: "yoy", label: "Año anterior", color: COLORS.yoy, data: alignYoY(tsCerts, tsCertsYoY), dashed: true },
            ]}
          />
        </Widget>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget scope="panel" id="funnel">
          <FunnelChart
            title="Embudo de conversión"
            subtitle="Del lead al certificado"
            steps={funnel.map((s) => ({ key: s.key, label: s.label, value: s.value }))}
          />
        </Widget>
        <Widget scope="panel" id="status">
          <DonutChart
            title="Inscripciones por estado"
            subtitle="Distribución dentro del período"
            slices={statusGroups.map((g, i) => ({
              label: STATUS_LABELS[g.status] ?? g.status,
              value: g.count,
              color: STATUS_COLORS[i % STATUS_COLORS.length],
            }))}
            centerLabel="Inscripciones"
          />
        </Widget>
        <Widget scope="panel" id="schemes">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Top esquemas del período</h3>
            <p className="text-xs text-slate-500">Inscripciones y certificados por esquema</p>
            <ul className="mt-3 space-y-2">
              {schemes.length === 0 ? (
                <li className="rounded bg-slate-50 px-3 py-2 text-center text-xs text-slate-400">
                  Sin actividad en el período.
                </li>
              ) : (
                schemes.map((s) => {
                  const total = s.enrollments + s.certs;
                  const max = Math.max(...schemes.map((x) => x.enrollments + x.certs), 1);
                  const pct = (total / max) * 100;
                  return (
                    <li key={s.name}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{s.name}</span>
                        <span className="text-slate-500">
                          {fmtNumber(s.enrollments)} insc. · <strong className="text-emerald-700">{fmtNumber(s.certs)}</strong> cert.
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-700" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </Widget>
      </div>

      <Widget scope="panel" id="operations">
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Alertas operativas</h3>
            <p className="text-xs text-slate-500">Acciones que requieren atención inmediata</p>
            <ul className="mt-3 space-y-2 text-sm">
              <AlertRow
                tone={stuck ? "warn" : "ok"}
                label={`Candidatos no atendidos (>7d)`}
                value={stuck}
                cta="/panel/candidatos"
                hint="Inscripciones en espera sin movimiento esta semana"
              />
              <AlertRow
                tone={k.pendingPayment ? "warn" : "ok"}
                label="Pagos pendientes de aprobación"
                value={k.pendingPayment}
                cta="/panel/pagos"
              />
              <AlertRow
                tone={k.pendingGrading ? "warn" : "ok"}
                label="Pruebas pendientes de calificar"
                value={k.pendingGrading}
                cta="/panel/calificacion"
              />
              <AlertRow
                tone={k.openAppeals ? "danger" : "ok"}
                label="Apelaciones abiertas"
                value={k.openAppeals}
                cta="/panel/apelaciones"
              />
              <AlertRow
                tone={k.certificatesExpiringSoon ? "warn" : "ok"}
                label="Certificados por vencer (90d)"
                value={k.certificatesExpiringSoon}
                cta="/panel/vencimientos"
              />
            </ul>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Accesos rápidos</h3>
            <p className="text-xs text-slate-500">Rutas frecuentes del operador</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <QuickLink href="/panel/candidatos" icon="👥" label="Candidatos 360°" />
              <QuickLink href="/panel/evaluaciones" icon="📝" label="Evaluaciones" />
              <QuickLink href="/panel/certificados" icon="🎓" label="Certificados" />
              <QuickLink href="/panel/agenda" icon="📅" label="Agenda" />
              <QuickLink href="/panel/leads" icon="🎯" label="Leads comerciales" />
              <QuickLink href="/panel/referidos" icon="🤝" label="Referidos" />
              <QuickLink href="/panel/tarifas" icon="💲" label="Tarifas" />
              <QuickLink href="/panel/organizacion" icon="🏢" label="Organización" />
            </div>
          </div>
        </section>
      </Widget>
    </div>
  );
}

function AlertRow({
  tone, label, value, cta, hint,
}: {
  tone: "ok" | "warn" | "danger";
  label: string;
  value: number;
  cta: string;
  hint?: string;
}) {
  const toneCls: Record<typeof tone, string> = {
    ok: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    warn: "bg-amber-50 text-amber-800 ring-amber-200",
    danger: "bg-rose-50 text-rose-800 ring-rose-200",
  };
  return (
    <li>
      <Link
        href={cta}
        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 hover:border-brand-300 hover:bg-brand-50/30"
      >
        <div>
          <div className="font-medium text-slate-800">{label}</div>
          {hint ? <div className="text-[10px] text-slate-500">{hint}</div> : null}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${toneCls[tone]}`}>
          {fmtNumber(value)}
        </span>
      </Link>
    </li>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm hover:border-brand-300 hover:bg-brand-50/40"
    >
      <span className="text-lg" aria-hidden>{icon}</span>
      <span className="font-medium text-slate-800">{label}</span>
    </Link>
  );
}
