"use client";

import { useState } from "react";

export interface PolicySection {
  id: string;
  title: string;
  /// Nodos React enriquecidos (párrafos, listas, etc.). Se renderizan tal cual.
  body: React.ReactNode;
}

/// Acordeón interactivo para la política de tratamiento de datos personales.
/// Permite expandir/contraer cada sección, expandir/contraer todo y copiar
/// el enlace ancla de cada sección al portapapeles (útil para citar
/// cláusulas específicas en correos a la administración).
export function PrivacyAccordion({ sections }: { sections: PolicySection[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set([sections[0]?.id].filter(Boolean) as string[]));

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function expandAll() {
    setOpen(new Set(sections.map((s) => s.id)));
  }
  function collapseAll() {
    setOpen(new Set());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          onClick={expandAll}
          className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Expandir todo
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Contraer todo
        </button>
        <span className="text-slate-400">
          {open.size} de {sections.length} secciones abiertas
        </span>
      </div>
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {sections.map((s, idx) => {
          const isOpen = open.has(s.id);
          return (
            <li key={s.id} id={s.id} className="scroll-mt-24">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggle(s.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-800 ring-1 ring-brand-100">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{s.title}</span>
                </span>
                <span
                  aria-hidden
                  className={`shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>
              {isOpen ? (
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/40 px-5 py-4 text-sm leading-relaxed text-slate-700">
                  {s.body}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
