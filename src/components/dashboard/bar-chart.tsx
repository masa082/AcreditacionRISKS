import { fmtNumber } from "@/lib/metrics";
import { ChartShell, EmptyChart, type LineSeries } from "@/components/dashboard/line-chart";

/// Gráfico de barras agrupadas. Cada bucket muestra N barras (una por serie).
/// Pensado para comparar "este año" vs "año anterior" lado a lado.
export function BarChart({
  title,
  subtitle,
  series,
  height = 280,
  format = "number",
  currency = "COP",
}: {
  title: string;
  subtitle?: string;
  series: LineSeries[];
  height?: number;
  format?: "number" | "currency";
  currency?: string;
}) {
  if (!series.length || !series[0].data.length) {
    return (
      <ChartShell title={title} subtitle={subtitle}>
        <EmptyChart />
      </ChartShell>
    );
  }
  const primary = series[0];
  const n = primary.data.length;
  const allValues = series.flatMap((s) => s.data.map((d) => d.value));
  const max = Math.max(...allValues, 1);
  const min = 0;

  const w = 800, h = height, padL = 56, padR = 16, padT = 18, padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const groupW = innerW / n;
  const gap = 6;
  const barW = Math.max(2, (groupW - gap * (series.length + 1)) / series.length);
  const scaleY = (v: number) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;
  const yTicks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);
  const xLabelStep = Math.max(1, Math.ceil(n / 8));

  const fmt = (n: number) =>
    format === "currency"
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
      : fmtNumber(n);

  return (
    <ChartShell title={title} subtitle={subtitle} legend={series}>
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
        {/* Grid Y */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={scaleY(v)} y2={scaleY(v)} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={padL - 8} y={scaleY(v) + 4} fontSize="10" textAnchor="end" fill="#64748b">{fmt(v)}</text>
          </g>
        ))}

        {/* Barras agrupadas */}
        {primary.data.map((_, bIdx) => {
          const x0 = padL + bIdx * groupW + gap;
          return series.map((s, sIdx) => {
            const v = s.data[bIdx]?.value ?? 0;
            const yTop = scaleY(v);
            const yBase = scaleY(min);
            const xBar = x0 + sIdx * (barW + gap);
            return (
              <rect
                key={`${bIdx}-${sIdx}`}
                x={xBar}
                y={yTop}
                width={barW}
                height={Math.max(0, yBase - yTop)}
                fill={s.color}
                fillOpacity={s.dashed ? 0.45 : 0.95}
                rx={2}
              >
                <title>
                  {s.label} — {primary.data[bIdx].bucket}: {fmt(v)}
                </title>
              </rect>
            );
          });
        })}

        {/* Eje X */}
        {primary.data.map((d, i) =>
          i % xLabelStep === 0 || i === n - 1 ? (
            <text
              key={i}
              x={padL + i * groupW + groupW / 2}
              y={h - padB + 16}
              fontSize="10"
              textAnchor="middle"
              fill="#64748b"
            >
              {d.bucket.replace(/^\d{4}-/, "").replace("W", "S")}
            </text>
          ) : null,
        )}
      </svg>
    </ChartShell>
  );
}
