"use client";

import { Fragment, useEffect, useState } from "react";

/**
 * Modal de bitácora de correos para un candidato. Se abre al pulsar el
 * botón "📧 N" en la tabla de /panel/candidatos.
 *
 * Carga datos vía GET /api/candidates/{id}/emails (resumen) y, al hacer
 * clic en una fila, refetch con detail=1 para obtener el HTML completo
 * que se renderiza en una sección expandida.
 */

interface EmailRow {
  id: string;
  toEmail: string;
  subject: string;
  bodyPreview: string;
  bodyHtml?: string | null;
  kind: string;
  template: string | null;
  status: string;
  providerId: string | null;
  errorMessage: string | null;
  sentAt: string;
  groupId: string | null;
  sentBy: { firstName: string; lastName: string; email: string } | null;
}

const KIND_LABEL: Record<string, { label: string; tone: string }> = {
  BULK: { label: "Masivo", tone: "bg-brand-50 text-brand-800 ring-brand-100" },
  SCHEDULED: { label: "Programado", tone: "bg-violet-50 text-violet-800 ring-violet-100" },
  TRANSACTIONAL: { label: "Sistema", tone: "bg-slate-100 text-slate-700 ring-slate-200" },
};

export function EmailLogDialog({
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
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<EmailRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string>>({});

  // Carga inicial al abrir
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/candidates/${candidateId}/emails?limit=200`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        const data = (await r.json()) as { logs: EmailRow[] };
        setLogs(data.logs ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [open, candidateId]);

  // Al expandir una fila, si no tenemos su HTML aún, lo pedimos.
  const expandRow = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (details[id] != null) return; // ya cacheado
    try {
      const r = await fetch(`/api/candidates/${candidateId}/emails?limit=200&detail=1`);
      if (!r.ok) throw new Error(`Error ${r.status}`);
      const data = (await r.json()) as { logs: EmailRow[] };
      const map: Record<string, string> = {};
      for (const l of data.logs) {
        if (l.bodyHtml) map[l.id] = l.bodyHtml;
      }
      setDetails(map);
    } catch (e) {
      setDetails((d) => ({ ...d, [id]: `<p style="color:#b91c1c">Error al cargar: ${e instanceof Error ? e.message : "—"}</p>` }));
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="grid max-h-[92vh] w-full max-w-5xl grid-rows-[auto_1fr] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-brand-900">Bitácora de correos</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {candidateName} · <span className="font-mono">{candidateEmail}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-700">✕</button>
        </header>

        <div className="overflow-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">Cargando bitácora…</div>
          ) : error ? (
            <div className="m-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              📭 Este candidato aún no tiene correos registrados.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5">Fecha y hora</th>
                  <th className="px-4 py-2.5">Tipo</th>
                  <th className="px-4 py-2.5">Asunto</th>
                  <th className="px-4 py-2.5">Destinatario</th>
                  <th className="px-4 py-2.5">Enviado por</th>
                  <th className="px-4 py-2.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => {
                  const kind = KIND_LABEL[l.kind] ?? { label: l.kind, tone: "bg-slate-100 text-slate-700 ring-slate-200" };
                  const isOpen = expanded === l.id;
                  return (
                    <Fragment key={l.id}>
                      <tr
                        onClick={() => expandRow(l.id)}
                        className={`cursor-pointer hover:bg-brand-50/40 ${isOpen ? "bg-brand-50/50" : ""}`}
                      >
                        <td className="px-4 py-3 align-top text-[12px] text-slate-700">
                          {formatDateTime(l.sentAt)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${kind.tone}`}>
                            {kind.label}
                          </span>
                          {l.template ? (
                            <div className="mt-0.5 font-mono text-[10px] text-slate-400">{l.template}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-slate-800">{l.subject}</div>
                          <div className="mt-0.5 line-clamp-1 text-[11.5px] text-slate-500">{l.bodyPreview}</div>
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-[11px] text-slate-600">{l.toEmail}</td>
                        <td className="px-4 py-3 align-top text-[11.5px] text-slate-600">
                          {l.sentBy ? `${l.sentBy.firstName} ${l.sentBy.lastName}` : <span className="italic text-slate-400">sistema</span>}
                        </td>
                        <td className="px-4 py-3 align-top text-center">
                          {l.status === "SENT" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              ✓ Enviado
                            </span>
                          ) : (
                            <span
                              title={l.errorMessage ?? "Sin detalle"}
                              className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700"
                            >
                              ✗ Falló
                            </span>
                          )}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr>
                          <td colSpan={6} className="bg-slate-50 px-4 py-4">
                            <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
                              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <div className="border-b border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Contenido HTML enviado
                                </div>
                                <div
                                  className="prose max-w-none p-3 text-sm [&_a]:text-brand-700 [&_a]:underline"
                                  // El HTML viene del editor del propio panel y fue sanitizado al
                                  // guardarse (sanitizeEditorHtml). Renderizado en un sandbox visual.
                                  dangerouslySetInnerHTML={{
                                    __html: details[l.id] ?? l.bodyPreview.replace(/\n/g, "<br>"),
                                  }}
                                />
                              </div>
                              <aside className="space-y-2 text-[11.5px] text-slate-600">
                                <Field label="ID interno" value={l.id} mono />
                                {l.providerId ? <Field label="ID en Resend" value={l.providerId} mono /> : null}
                                {l.groupId ? <Field label="Grupo de envío" value={l.groupId} mono /> : null}
                                {l.errorMessage ? (
                                  <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Error</div>
                                    <div className="rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700">{l.errorMessage}</div>
                                  </div>
                                ) : null}
                              </aside>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
