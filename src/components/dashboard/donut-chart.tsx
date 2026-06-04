import { fmtNumber } from "@/lib/metrics";
import { ChartShell } from "@/components/dashboard/line-chart";

/// Gráfico de dona segmentado con etiquetas y total al centro. Útil para
/// distribución por estado de Enrollment, tipo de candidato, etc.
export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

export function DonutChart({
  title,
  subtitle,
  slices,
  centerLabel,
  centerValue,
  size = 220,
  thickness = 28,
}: {
  title: string;
  subtitle?: string;
  slices: DonutSlice[];
  centerLabel?: string;
  centerValue?: string | number;
  size?: number;
  thickness?: number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <ChartShell title={title} subtitle={subtitle}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="block">
            <circle cx={size/2} cy={size/2} r={(size-thickness)/2} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
            {(() => {
              if (total === 0) return null;
              const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
              let acc = 0;
              return slices.map((s, i) => {
                const startAngle = (acc / total) * 360;
                acc += s.value;
                const endAngle = (acc / total) * 360;
                const [x0, y0] = polar(cx, cy, r, startAngle);
                const [x1, y1] = polar(cx, cy, r, endAngle);
                const large = endAngle - startAngle > 180 ? 1 : 0;
                const d = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
                return (
                  <path
                    key={i}
                    d={d}
                    stroke={s.color}
                    strokeWidth={thickness}
                    fill="none"
                  >
                    <title>{s.label}: {fmtNumber(s.value)} ({((s.value/total)*100).toFixed(1)}%)</title>
                  </path>
                );
              });
            })()}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">{centerLabel ?? "Total"}</div>
            <div className="text-2xl font-bold text-slate-900">
              {centerValue ?? fmtNumber(total)}
            </div>
          </div>
        </div>
        <ul className="grid w-full grid-cols-1 gap-1.5 text-xs sm:grid-cols-1">
          {slices.map((s, i) => {
            const pct = total ? (s.value / total) * 100 : 0;
            return (
              <li key={i} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                  <span className="text-slate-700">{s.label}</span>
                </span>
                <span className="font-semibold text-slate-900">
                  {fmtNumber(s.value)}{" "}
                  <span className="text-[10px] font-normal text-slate-400">({pct.toFixed(0)}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </ChartShell>
  );
}
