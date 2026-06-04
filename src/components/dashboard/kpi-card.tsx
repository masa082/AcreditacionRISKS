import Link from "next/link";
import { fmtNumber, fmtPercent, pctDelta } from "@/lib/metrics";

/// Tarjeta de KPI con valor grande, delta vs período anterior + YoY y
/// un sparkline opcional. Apta para grids 2×N o 4×N.
export interface KpiCardProps {
  label: string;
  value: number;
  /// Valor del período anterior (para calcular delta y darle dirección).
  prev?: number;
  /// Valor del mismo período del año pasado (segundo delta opcional).
  yoy?: number;
  /// Formato del valor: número crudo o moneda. Por defecto número.
  format?: "number" | "currency";
  currency?: string;
  /// Pequeña hint debajo del delta (p. ej. "vs mes pasado").
  hint?: string;
  /// Hint adicional (p. ej. "vs mismo mes 2025").
  yoyHint?: string;
  /// Tono visual: por defecto verde/rojo automático según el delta. Si la
  /// métrica es "menos es mejor" (p. ej. apelaciones abiertas), use
  /// `goodDirection="down"` para invertir colores.
  goodDirection?: "up" | "down";
  /// Serie corta para el sparkline (últimos N puntos).
  spark?: number[];
  /// Icono decorativo (emoji o glifo).
  icon?: string;
  /// Color de acento de la tarjeta (CSS color).
  accent?: "brand" | "emerald" | "amber" | "rose" | "violet" | "cyan";
  /// Si está presente, la tarjeta entera se vuelve un Link a esta ruta:
  /// click → navega a la tabla/listado del que se sacó el dato (ya con
  /// los filtros del período aplicados como query params). Sin `href`,
  /// se renderiza como `<div>` no clickable (compat).
  href?: string;
  /// Texto opcional que aparece como microcopia ("Ver candidatos →").
  /// Si se omite y hay `href`, se infiere "Ver detalle →".
  hrefLabel?: string;
}

const ACCENT: Record<NonNullable<KpiCardProps["accent"]>, { ring: string; bg: string; ic: string; spark: string }> = {
  brand:   { ring: "ring-brand-100",   bg: "bg-brand-50",   ic: "text-brand-800",   spark: "stroke-brand-700"   },
  emerald: { ring: "ring-emerald-100", bg: "bg-emerald-50", ic: "text-emerald-700", spark: "stroke-emerald-600" },
  amber:   { ring: "ring-amber-100",   bg: "bg-amber-50",   ic: "text-amber-700",   spark: "stroke-amber-600"   },
  rose:    { ring: "ring-rose-100",    bg: "bg-rose-50",    ic: "text-rose-700",    spark: "stroke-rose-600"    },
  violet:  { ring: "ring-violet-100",  bg: "bg-violet-50",  ic: "text-violet-700",  spark: "stroke-violet-600"  },
  cyan:    { ring: "ring-cyan-100",    bg: "bg-cyan-50",    ic: "text-cyan-700",    spark: "stroke-cyan-600"    },
};

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data?.length) return null;
  const w = 96, h = 28, pad = 2;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-7 w-24 ${className ?? ""}`}>
      <polyline points={points} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({
  label, value, prev, yoy, format = "number", currency = "COP",
  hint = "vs período anterior", yoyHint = "vs año anterior",
  goodDirection = "up", spark, icon, accent = "brand",
  href, hrefLabel,
}: KpiCardProps) {
  const fmt = (n: number) =>
    format === "currency"
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
      : fmtNumber(n);

  const delta = prev !== undefined ? pctDelta(value, prev) : null;
  const yoyDelta = yoy !== undefined ? pctDelta(value, yoy) : null;
  const goodSign = goodDirection === "down" ? -1 : 1;

  function deltaCls(d: number | null): string {
    if (d === null || d === 0) return "text-slate-500 bg-slate-100";
    const positive = (d > 0 ? 1 : -1) * goodSign > 0;
    return positive
      ? "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200"
      : "text-rose-700 bg-rose-50 ring-1 ring-rose-200";
  }
  function arrow(d: number | null): string {
    if (d === null || d === 0) return "→";
    return d > 0 ? "↑" : "↓";
  }

  const a = ACCENT[accent];

  // Cuando se da `href`, la tarjeta es Link. El borde se torna brand al hover,
  // aparece una micro-flecha en la esquina inferior y un microcopy
  // ("Ver detalle →") para que el usuario sepa que es clickable.
  const isLink = Boolean(href);
  const containerCls = `group relative block overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition ${
    isLink
      ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-300"
      : "hover:shadow-md"
  }`;

  const inner = (
    <>
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full ${a.bg} opacity-60`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
          {icon ? <span className={`text-base ${a.ic}`} aria-hidden>{icon}</span> : null}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="text-3xl font-extrabold text-slate-900">{fmt(value)}</div>
          {spark?.length ? <Sparkline data={spark} className={a.spark} /> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          {delta !== null ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${deltaCls(delta)}`}>
              {arrow(delta)} {fmtPercent(delta)}
            </span>
          ) : null}
          <span className="text-[10px] text-slate-400">{hint}</span>
          {yoyDelta !== null ? (
            <>
              <span className="text-slate-300">·</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${deltaCls(yoyDelta)}`}>
                {arrow(yoyDelta)} {fmtPercent(yoyDelta)}
              </span>
              <span className="text-[10px] text-slate-400">{yoyHint}</span>
            </>
          ) : null}
        </div>
        {isLink ? (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
            <span className={`font-semibold ${a.ic} opacity-70 transition group-hover:opacity-100`}>
              {hrefLabel ?? "Ver detalle"}
            </span>
            <span
              aria-hidden
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition group-hover:bg-brand-50 group-hover:text-brand-700`}
            >
              →
            </span>
          </div>
        ) : null}
      </div>
    </>
  );

  if (isLink && href) {
    return (
      <Link href={href} className={containerCls} aria-label={`${label} — abrir detalle`}>
        {inner}
      </Link>
    );
  }
  return <div className={containerCls}>{inner}</div>;
}
