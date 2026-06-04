"use client";

import { useEffect, useState } from "react";

/// Reloj con la hora legal colombiana (America/Bogota, UTC-5) y, si el
/// visitante está en otra zona horaria, también su hora local para
/// contextualizar. El reloj cambia segundo a segundo en el navegador del
/// usuario sin importar dónde esté, pero la hora colombiana siempre se
/// muestra correcta (conforme al Instituto Nacional de Metrología — INM).
const TZ_CO = "America/Bogota";

const DOW_SHORT: Record<string, string> = {
  Mon: "Lunes", Tue: "Martes", Wed: "Miércoles", Thu: "Jueves",
  Fri: "Viernes", Sat: "Sábado", Sun: "Domingo",
  // formatToParts puede devolver formas largas en es-CO; cubrimos también:
  lunes: "Lunes", martes: "Martes", miércoles: "Miércoles", jueves: "Jueves",
  viernes: "Viernes", sábado: "Sábado", domingo: "Domingo",
};

function fmtDate(now: Date, tz: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("es-CO", {
      timeZone: tz,
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const w = DOW_SHORT[parts.weekday as string] ?? (parts.weekday as string) ?? "";
  return `${w}, ${parts.day} de ${parts.month} de ${parts.year}`;
}

function fmtTime(now: Date, tz: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
}

function offsetLabel(tz: string, now: Date): string {
  // Obtiene el offset legible "UTC-5" para la zona dada en el momento now.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  })
    .formatToParts(now);
  const o = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  return o.replace("GMT", "UTC");
}

export function LegalTimeCO({ variant = "default" }: { variant?: "default" | "dark" | "compact" }) {
  const [now, setNow] = useState<Date | null>(null);
  const [userTz, setUserTz] = useState<string>(TZ_CO);

  useEffect(() => {
    try {
      setUserTz(Intl.DateTimeFormat().resolvedOptions().timeZone || TZ_CO);
    } catch {/* ignore */}
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <div className="inline-flex h-10 items-center text-xs text-slate-400">
        <span className="font-mono">--:--:--</span>
      </div>
    );
  }

  const isInCO = userTz === TZ_CO;
  const coTime = fmtTime(now, TZ_CO);
  const coDate = fmtDate(now, TZ_CO);
  const coOffset = offsetLabel(TZ_CO, now); // UTC-5
  const localTime = fmtTime(now, userTz);
  const localOffset = offsetLabel(userTz, now);

  if (variant === "compact") {
    return (
      <div className="space-y-2 text-center">
        <div>
          <div className="font-mono text-xs font-bold text-slate-700" suppressHydrationWarning>{coTime}</div>
          <div className="text-[9px] uppercase tracking-wide text-slate-400" suppressHydrationWarning>{coDate}</div>
          <div className="text-[8px] uppercase tracking-wider text-amber-700">Hora legal de Colombia · {coOffset}</div>
        </div>
        {!isInCO ? (
          <div className="border-t border-slate-100 pt-1.5">
            <div className="font-mono text-[10px] text-slate-500" suppressHydrationWarning>{localTime}</div>
            <div className="text-[8px] uppercase tracking-wide text-slate-400">Su hora · {localOffset}</div>
          </div>
        ) : null}
      </div>
    );
  }

  if (variant === "dark") {
    return (
      <div className="inline-flex flex-col gap-1 text-right text-xs">
        <div>
          <div className="font-mono text-base font-bold text-white" suppressHydrationWarning>{coTime}</div>
          <div className="text-[10px] text-slate-300" suppressHydrationWarning>{coDate}</div>
          <div className="text-[9px] uppercase tracking-wider text-amber-300">Hora legal colombiana · {coOffset}</div>
        </div>
        {!isInCO ? (
          <div className="mt-1 border-t border-slate-700 pt-1">
            <div className="font-mono text-xs text-slate-200" suppressHydrationWarning>{localTime}</div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400" suppressHydrationWarning>Su hora ({userTz} · {localOffset})</div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1 text-right text-xs">
      <div>
        <div className="font-mono text-base font-bold text-brand-900" suppressHydrationWarning>{coTime}</div>
        <div className="text-[10px] text-slate-500" suppressHydrationWarning>{coDate}</div>
        <div className="text-[9px] uppercase tracking-wider text-amber-700">Hora legal colombiana · {coOffset}</div>
      </div>
      {!isInCO ? (
        <div className="mt-1 border-t border-slate-200 pt-1">
          <div className="font-mono text-xs text-slate-700" suppressHydrationWarning>{localTime}</div>
          <div className="text-[9px] uppercase tracking-wider text-slate-400" suppressHydrationWarning>Su hora ({userTz} · {localOffset})</div>
        </div>
      ) : null}
    </div>
  );
}
