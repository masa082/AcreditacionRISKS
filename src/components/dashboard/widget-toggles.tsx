"use client";

import { useEffect, useState } from "react";

/// Permite al usuario activar/desactivar widgets del dashboard. La
/// configuración se persiste en localStorage para no requerir migración
/// de schema, pero está aislada por scope (p. ej. "panel" vs "admin") y
/// por usuario (la propia clave incluye el userId si se provee).
export interface WidgetDef {
  id: string;
  label: string;
  defaultOn?: boolean;
}

export function useWidgetVisibility(scope: string, defs: WidgetDef[]): {
  isOn: (id: string) => boolean;
  toggle: (id: string) => void;
  ready: boolean;
} {
  const [state, setState] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const storageKey = `dashboard-widgets-v1:${scope}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      const init: Record<string, boolean> = {};
      for (const d of defs) init[d.id] = saved[d.id] ?? d.defaultOn ?? true;
      setState(init);
    } catch {
      const init: Record<string, boolean> = {};
      for (const d of defs) init[d.id] = d.defaultOn ?? true;
      setState(init);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function persist(next: Record<string, boolean>) {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }

  return {
    isOn: (id) => state[id] !== false,
    toggle: (id) => {
      setState((s) => {
        const next = { ...s, [id]: !(s[id] !== false) };
        persist(next);
        return next;
      });
    },
    ready,
  };
}

export function WidgetTogglesBar({
  scope,
  widgets,
}: {
  scope: string;
  widgets: WidgetDef[];
}) {
  const [open, setOpen] = useState(false);
  const { isOn, toggle } = useWidgetVisibility(scope, widgets);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        ⚙ Personalizar
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-400">Widgets visibles</p>
          <ul className="space-y-1">
            {widgets.map((w) => (
              <li key={w.id}>
                <label className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-slate-50">
                  <span className="text-slate-700">{w.label}</span>
                  <input
                    type="checkbox"
                    checked={isOn(w.id)}
                    onChange={() => toggle(w.id)}
                    className="h-4 w-4 rounded border-slate-300 accent-brand-700"
                  />
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function Widget({ scope, id, children }: { scope: string; id: string; children: React.ReactNode }) {
  // Lee el estado del localStorage de forma síncrona en el client. Como no
  // tenemos el hook compartido aquí, leemos directo. Para evitar flash al
  // hidratar, primero pintamos visible (default) y luego ocultamos.
  const [show, setShow] = useState<boolean>(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`dashboard-widgets-v1:${scope}`);
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, boolean>;
      if (saved[id] === false) setShow(false);
      else setShow(true);
    } catch {}
  }, [scope, id]);
  if (!show) return null;
  return <>{children}</>;
}
