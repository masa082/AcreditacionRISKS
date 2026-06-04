"use client";

import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

/// Hook genérico: dado un array de filas, un mapa de "key → accessor"
/// y una llave inicial, devuelve las filas ordenadas + helpers para
/// pintar los headers clickables. Pensado para no requerir refactor de
/// la JSX de la tabla — basta con envolver el `<th>` con SortableHeader
/// y pasar las filas ordenadas al map.
export function useSortableRows<
  T,
  A extends Record<string, (row: T) => string | number | boolean | null | undefined>,
>(
  rows: T[],
  accessors: A,
  initial: SortState<Extract<keyof A, string>>,
): {
  sorted: T[];
  sort: SortState<Extract<keyof A, string>>;
  setSort: (key: Extract<keyof A, string>) => void;
} {
  type K = Extract<keyof A, string>;
  const [sort, setSortState] = useState<SortState<K>>(initial);

  const sorted = useMemo(() => {
    const acc = accessors[sort.key];
    const factor = sort.dir === "asc" ? 1 : -1;
    const norm = (v: unknown): string | number => {
      if (v === null || v === undefined) return sort.dir === "asc" ? Infinity : -Infinity;
      if (typeof v === "boolean") return v ? 1 : 0;
      if (typeof v === "number") return v;
      return String(v).toLowerCase();
    };
    return [...rows].sort((a, b) => {
      const va = norm(acc(a));
      const vb = norm(acc(b));
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
      return String(va).localeCompare(String(vb)) * factor;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort.key, sort.dir]);

  function setSort(key: K) {
    setSortState((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return { sorted, sort, setSort };
}

/// Header clickable de tabla que muestra label + flecha ▲ / ▼ / ↕
/// según el estado actual. Tipado genéricamente con la unión de keys
/// que admite la tabla concreta.
export function SortableHeader<K extends string>({
  label,
  sortKey,
  current,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: K;
  current: SortState<K>;
  onSort: (k: K) => void;
  className?: string;
}) {
  const active = current.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`group inline-flex items-center gap-1 text-left font-bold uppercase tracking-wider transition hover:text-brand-800 ${
        active ? "text-brand-800" : "text-slate-400"
      } ${className}`}
      title={`Ordenar por ${label}`}
    >
      {label}
      <span aria-hidden className="text-[8px] opacity-70 group-hover:opacity-100">
        {active ? (current.dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}
