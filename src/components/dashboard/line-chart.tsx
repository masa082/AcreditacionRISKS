import { fmtNumber } from "@/lib/metrics";

export interface LineSeries {
  key: string;
  label: string;
  color: string;
  data: { bucket: string; value: number }[];
  /// Si true, la serie se renderiza como línea punteada (típico para período anterior).
  dashed?: boolean;
}

/// Gráfico de líneas/área con eje X categorizado y eje Y autoescalado.
/// Renderiza ≥2 series sincronizadas por índice — la primera define el eje
/// X y el área sombreada; las demás se trazan encima como líneas.
export function LineChart({
  title,
  subtitle,
  series,
  height = 280,
  format = "number",
  currency = "COP",
  showArea = true,
  href,
  hrefLabel,
}: {
  title: string;
  subtitle?: string;
  series: LineSeries[];
  height?: number;
  format?: "number" | "currency";
  currency?: string;
  showArea?: boolean;
  href?: string;
  hrefLabel?: string;
}) {
  if (!series.length || !series[0].data.length) {
    return (
      <ChartShell title={title} subtitle={subtitle} href={href} hrefLabel={hrefLabel}>
        <EmptyChart />
      </ChartShell>
    );
  }
  const primary = series[0];
  const n = primary.data.length;

  // Tomamos máximo entre todas las series para alinear escalas.
  const allValues = series.flatMap((s) => s.data.map((d) => d.value));
  const max = Math.max(...allValues, 1);
  const min = Math.min(0, ...allValues);

  const w = 800, h = height, padL = 56, padR = 16, padT = 18, padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const stepX = innerW / Math.max(1, n - 1);
  const scaleY = (v: number) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;

  // Ticks Y "limpios" (5 divisiones).
  const yTicks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);

  const fmt = (n: number) =>
    format === "currency"
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
      : fmtNumber(n);

  function buildPath(data: { value: number }[]): string {
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"}${(padL + i * stepX).toFixed(2)},${scaleY(d.value).toFixed(2)}`)
      .join(" ");
  }
  function buildArea(data: { value: number }[]): string {
    const top = buildPath(data);
    const x0 = padL.toFixed(2);
    const xN = (padL + (n - 1) * stepX).toFixed(2);
    const y0 = scaleY(min).toFixed(2);
    return `${top} L${xN},${y0} L${x0},${y0} Z`;
  }

  // Etiquetas X cada N para no saturar.
  const xLabelStep = Math.max(1, Math.ceil(n / 8));

  return (
    <ChartShell title={title} subtitle={subtitle} legend={series} href={href} hrefLabel={hrefLabel}>
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
        {/* Grid Y */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={padL} x2={w - padR}
              y1={scaleY(v)} y2={scaleY(v)}
              stroke="#e2e8f0" strokeDasharray="3 3"
            />
            <text x={padL - 8} y={scaleY(v) + 4} fontSize="10" textAnchor="end" fill="#64748b">
              {fmt(v)}
            </text>
          </g>
        ))}

        {/* Serie primaria con área */}
        {showArea ? (
          <path d={buildArea(primary.data)} fill={primary.color} fillOpacity={0.08} />
        ) : null}

        {/* Líneas */}
        {series.map((s) => (
          <path
            key={s.key}
            d={buildPath(s.data)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.dashed ? 1.5 : 2}
            strokeDasharray={s.dashed ? "5 4" : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Puntos de la serie primaria */}
        {primary.data.map((d, i) => (
          <circle
            key={i}
            cx={padL + i * stepX}
            cy={scaleY(d.value)}
            r={2.5}
            fill={primary.color}
          />
        ))}

        {/* Eje X */}
        {primary.data.map((d, i) =>
          i % xLabelStep === 0 || i === n - 1 ? (
            <text
              key={i}
              x={padL + i * stepX}
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

export function ChartShell({
  title,
  subtitle,
  legend,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: LineSeries[];
  /// Si está presente, en la cabecera del chart aparece un link
  /// "Ver detalle →" que lleva a la tabla con los mismos filtros.
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="flex items-start gap-3">
          {legend?.length ? (
            <ul className="flex flex-wrap items-center gap-3 text-[11px]">
              {legend.map((s) => (
                <li key={s.key} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-3 rounded-sm"
                    style={{ background: s.color, opacity: s.dashed ? 0.5 : 1 }}
                  />
                  <span className="text-slate-600">{s.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {href ? (
            <a
              href={href}
              className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-50"
            >
              {hrefLabel ?? "Ver detalle"} →
            </a>
          ) : null}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function EmptyChart() {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400">
      No hay datos para el rango seleccionado.
    </div>
  );
}
