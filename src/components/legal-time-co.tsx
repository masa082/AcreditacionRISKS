"use client";

import { useEffect, useState } from "react";

/// Reloj con la hora legal colombiana (America/Bogota, UTC-5).
/// La hora se calcula con Intl.DateTimeFormat fijando timeZone="America/Bogota",
/// así sale correcta sin importar dónde esté el navegador del usuario.
/// Conforme a la hora oficial publicada por el Instituto Nacional de Metrología (INM).
const TZ = "America/Bogota";

const DOW: Record<string, string> = {
  Mon: "Lunes", Tue: "Martes", Wed: "Miércoles", Thu: "Jueves",
  Fri: "Viernes", Sat: "Sábado", Sun: "Domingo",
};

function format(now: Date): { date: string; time: string } {
  // Fecha tipo "Miércoles, 04 de junio de 2026"
  const dateFmt = new Intl.DateTimeFormat("es-CO", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const parts = Object.fromEntries(dateFmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekday = DOW[parts.weekday?.slice(0, 3) as keyof typeof DOW] ?? parts.weekday ?? "";
  const day = parts.day ?? "";
  const month = parts.month ?? "";
  const year = parts.year ?? "";
  const date = `${weekday}, ${day} de ${month} de ${year}`;

  const timeFmt = new Intl.DateTimeFormat("es-CO", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const time = timeFmt.format(now);
  return { date, time };
}

export function LegalTimeCO({ variant = "default" }: { variant?: "default" | "dark" | "compact" }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    // Estado pre-hidratación: reservar espacio para evitar layout shift.
    return (
      <div className="inline-flex h-10 items-center gap-2 text-xs text-slate-400">
        <span className="font-mono">--:--:--</span>
      </div>
    );
  }

  const { date, time } = format(now);

  if (variant === "compact") {
    return (
      <div className="text-center">
        <div className="font-mono text-xs font-bold text-slate-700" suppressHydrationWarning>{time}</div>
        <div className="text-[9px] uppercase tracking-wide text-slate-400" suppressHydrationWarning>{date}</div>
        <div className="mt-0.5 text-[8px] uppercase tracking-wider text-slate-400">Hora legal de Colombia</div>
      </div>
    );
  }

  if (variant === "dark") {
    return (
      <div className="inline-flex flex-col text-right text-xs">
        <span className="font-mono text-base font-bold text-white" suppressHydrationWarning>{time}</span>
        <span className="text-[10px] text-slate-300" suppressHydrationWarning>{date}</span>
        <span className="text-[9px] uppercase tracking-wider text-amber-300">Hora legal colombiana · UTC-5</span>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col text-right text-xs">
      <span className="font-mono text-base font-bold text-brand-900" suppressHydrationWarning>{time}</span>
      <span className="text-[10px] text-slate-500" suppressHydrationWarning>{date}</span>
      <span className="text-[9px] uppercase tracking-wider text-slate-400">Hora legal colombiana · UTC-5</span>
    </div>
  );
}
