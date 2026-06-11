"use client";

import { Fragment, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveIncidentAction, resolveAllForCandidateAction } from "@/lib/actions/incidents";

interface Incident {
  id: string;
  category: string;
  severity: string;
  message: string;
  context: unknown;
  resolvedAt: string | null;
  resolution: string | null;
  resolvedBy: { firstName: string; lastName: string } | null;
  createdAt: string;
}

const CATEGORY_LABEL: Record<string, { label: string; emoji: string; tone: string }> = {
  DOCUMENT_UPLOAD: { label: "Subida de documento", emoji: "📂", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  PAYMENT: { label: "Pago", emoji: "💳", tone: "bg-rose-50 text-rose-800 ring-rose-200" },
  CONSENT: { label: "Habeas data", emoji: "🔐", tone: "bg-violet-50 text-violet-800 ring-violet-200" },
  EXAM: { label: "Examen", emoji: "📝", tone: "bg-blue-50 text-blue-800 ring-blue-200" },
  OTHER: { label: "Otro", emoji: "⚠", tone: "bg-slate-100 text-slate-700 ring-slate-200" },
};

/**
 * Modal con la bitácora de incidencias del candidato.
 *
 * UX:
 *  - Las pendientes (rojo/ámbar) salen arriba; las resueltas (verde tenue) abajo.
 *  - Click en una fila pendiente expande para mostrar el contexto técnico
 *    completo (key del archivo, IP, userAgent, etc.).
 *  - Botón "Marcar como resuelta" individual.
 *  - Botón "Resolver todas" arriba para liberar el badge de un golpe.
 */
export function IncidentsDialog({
  candidateId,
  candidateName,
  candidateEmail,
  open,
  onClose,
}: {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/candidates/${candidateId}/incidents`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { incidents: Incident[] };
        setIncidents(data.incidents ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [open, candidateId]);

  const pendingCount = incidents.filter((i) => !i.resolvedAt).length;

  function reloadAndRefresh() {
    fetch(`/api/candidates/${candidateId}/incidents`)
      .then(async (r) => {
        if (r.ok) {
          const data = (await r.json()) as { incidents: Incident[] };
          setIncidents(data.incidents ?? []);
        }
      })
      .finally(() => router.refresh());
  }

  function handleResolveOne(id: string) {
    startTransition(async () => {
      const r = await resolveIncidentAction(id);
      if (!r.ok) setError(r.error ?? "No se pudo resolver");
      else reloadAndRefresh();
    });
  }

  function handleResolveAll() {
    if (!confirm("¿Marcar TODAS las incidencias pendientes como resueltas?")) return;
    startTransition(async () => {
      const r = await resolveAllForCandidateAction(candidateId);
      if (!r.ok) setError(r.error ?? "No se pudo resolver");
      else reloadAndRefresh();
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="grid max-h-[92vh] w-full max-w-3xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-brand-900">
              ⚠ Incidencias del proceso
              {pendingCount > 0 ? (
                <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                  {pendingCount} pendiente(s)
                </span>
              ) : null}
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {candidateName} · <span className="font-mono">{candidateEmail}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-700">✕</button>
        </header>

        <div className="overflow-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">Cargando…</div>
          ) : error ? (
            <div className="m-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : incidents.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              ✓ Este candidato no tiene incidencias registradas.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {incidents.map((i) => {
                const cat = CATEGORY_LABEL[i.category] ?? CATEGORY_LABEL.OTHER;
                const isOpen = expanded === i.id;
                const isResolved = !!i.resolvedAt;
                return (
                  <Fragment key={i.id}>
                    <li
                      onClick={() => setExpanded(isOpen ? null : i.id)}
                      className={`cursor-pointer px-5 py-3 transition ${
                        isResolved
                          ? "bg-white opacity-70 hover:bg-slate-50"
                          : i.severity === "WARN"
                          ? "bg-amber-50/30 hover:bg-amber-50/60"
                          : "bg-rose-50/30 hover:bg-rose-50/60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl" aria-hidden>{cat.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${cat.tone}`}>
                              {cat.label}
                            </span>
                            {isResolved ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                ✓ Resuelta
                              </span>
                            ) : i.severity === "WARN" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                Aviso
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                                Error
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">{formatDateTime(i.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-sm text-slate-800">{i.message}</p>
                          {isResolved && i.resolvedAt ? (
                            <p className="mt-1 text-[11px] text-emerald-700">
                              ✓ Resuelta {formatDateTime(i.resolvedAt)}
                              {i.resolvedBy ? ` por ${i.resolvedBy.firstName} ${i.resolvedBy.lastName}` : ""}
                              {i.resolution ? ` · ${i.resolution}` : ""}
                            </p>
                          ) : null}
                        </div>
                        {!isResolved ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={(e) => { e.stopPropagation(); handleResolveOne(i.id); }}
                            className="shrink-0 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Marcar resuelta
                          </button>
                        ) : null}
                      </div>
                      {isOpen ? (
                        <div className="mt-3 rounded-md bg-slate-50 p-3 ring-1 ring-slate-200">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contexto técnico</div>
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] text-slate-700">
                            {JSON.stringify(i.context, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </li>
                  </Fragment>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-slate-200 px-6 py-3">
          <span className="text-[11px] text-slate-500">
            Las incidencias se registran automáticamente cuando un candidato falla al subir documentos o reportar un pago.
          </span>
          {pendingCount > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={handleResolveAll}
              className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              {pending ? "Resolviendo…" : `✓ Resolver todas (${pendingCount})`}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
