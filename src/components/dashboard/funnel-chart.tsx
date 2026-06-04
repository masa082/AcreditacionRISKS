import { fmtNumber } from "@/lib/metrics";
import { ChartShell } from "@/components/dashboard/line-chart";

/// Embudo de conversión vertical con tasa de conversión entre pasos.
/// Cada barra está proporcional al valor máximo del embudo (el primer paso).
export interface FunnelStep {
  key: string;
  label: string;
  value: number;
  color?: string;
}

const COLORS = ["#0b1d44", "#1e3a8a", "#1d4ed8", "#0ea5e9", "#06b6d4", "#10b981"];

export function FunnelChart({
  title,
  subtitle,
  steps,
  href,
  hrefLabel,
}: {
  title: string;
  subtitle?: string;
  steps: FunnelStep[];
  href?: string;
  hrefLabel?: string;
}) {
  const top = Math.max(steps[0]?.value ?? 0, 1);
  return (
    <ChartShell title={title} subtitle={subtitle} href={href} hrefLabel={hrefLabel}>
      <ul className="space-y-3">
        {steps.map((s, i) => {
          const pct = (s.value / top) * 100;
          const prev = i > 0 ? steps[i - 1].value : null;
          const stepRate = prev && prev > 0 ? (s.value / prev) * 100 : null;
          const c = s.color ?? COLORS[i % COLORS.length];
          return (
            <li key={s.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{s.label}</span>
                <span className="text-slate-500">
                  <strong className="text-slate-900">{fmtNumber(s.value)}</strong>
                  {stepRate !== null ? (
                    <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {stepRate.toFixed(0)}% del paso previo
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="relative h-7 overflow-hidden rounded-md bg-slate-100">
                <div
                  className="absolute left-0 top-0 h-full rounded-md"
                  style={{ width: `${Math.max(2, pct)}%`, background: c }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-700">
                  {pct.toFixed(0)}% del total
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </ChartShell>
  );
}
