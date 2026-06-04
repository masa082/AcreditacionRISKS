"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

/// Toolbar con búsqueda libre y filtros por estado, proveedor y rango de
/// fechas. Persiste en querystring; el server lee y filtra.
const STATUS_OPTIONS = [
  { value: "",         label: "Todos los estados" },
  { value: "PENDING",  label: "Pendientes" },
  { value: "APPROVED", label: "Aprobados" },
  { value: "REJECTED", label: "Rechazados" },
  { value: "EXPIRED",  label: "Vencidos" },
  { value: "REFUNDED", label: "Reembolsados" },
];

const PROVIDER_OPTIONS = [
  { value: "",         label: "Todos los proveedores" },
  { value: "rapyd",    label: "Rapyd (pasarela)" },
  { value: "manual",   label: "Manual (transferencia)" },
  { value: "mock",     label: "Mock / demo" },
  { value: "internal", label: "Interno (cubierto)" },
];

export function PaymentsToolbar({
  totalCount,
  filteredCount,
}: {
  totalCount: number;
  filteredCount: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  // Estado controlado local del input de búsqueda (debounced).
  const [q, setQ] = useState(sp.get("q") ?? "");
  useEffect(() => { setQ(sp.get("q") ?? ""); }, [sp]);

  function push(next: URLSearchParams) {
    start(() => router.push(`?${next.toString()}`, { scroll: false }));
  }
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page");
    push(next);
  }
  function clear() {
    setQ("");
    push(new URLSearchParams());
  }

  // Debounce 250ms del campo de búsqueda
  useEffect(() => {
    const id = setTimeout(() => {
      const cur = sp.get("q") ?? "";
      if (q !== cur) setParam("q", q);
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const status = sp.get("status") ?? "";
  const provider = sp.get("provider") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";

  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${pending ? "opacity-80" : ""}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <label className="block w-full text-xs sm:w-72">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Buscar</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Documento, nombre, folio, Ref. Rapyd…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block text-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</span>
            <select
              value={status}
              onChange={(e) => setParam("status", e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          <label className="block text-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Proveedor</span>
            <select
              value={provider}
              onChange={(e) => setParam("provider", e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {PROVIDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          <label className="block text-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Desde</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setParam("from", e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Hasta</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setParam("to", e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {filteredCount} de <strong className="text-slate-700">{totalCount}</strong> pagos
          </span>
          <button
            type="button"
            onClick={clear}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Limpiar
          </button>
          <a
            href={`/panel/pagos/export?${sp.toString()}`}
            className="rounded-lg btn-grad-navy px-3 py-1.5 text-xs font-semibold text-white"
            title="Exportar la vista actual a Excel/CSV"
          >
            ⬇ Exportar
          </a>
        </div>
      </div>
    </div>
  );
}
