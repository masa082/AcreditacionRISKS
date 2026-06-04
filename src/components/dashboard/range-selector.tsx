"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/// Selector de rango temporal del dashboard. Persiste su elección en el
/// querystring (`?range=this-month`) para que la URL sea linkeable y para
/// que los componentes server-side puedan leerla.
const PRESETS: { value: string; label: string }[] = [
  { value: "last-7d",      label: "7 días" },
  { value: "last-30d",     label: "30 días" },
  { value: "this-month",   label: "Mes" },
  { value: "last-90d",     label: "Trimestre" },
  { value: "this-year",    label: "Año" },
  { value: "last-12m",     label: "12 meses" },
];

export function RangeSelector({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function pick(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("range", value);
    start(() => {
      router.push(`?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <div className={`inline-flex rounded-lg bg-slate-100 p-0.5 ring-1 ring-slate-200 ${pending ? "opacity-70" : ""}`}>
      {PRESETS.map((p) => {
        const active = p.value === current;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => pick(p.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              active ? "bg-white text-brand-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
