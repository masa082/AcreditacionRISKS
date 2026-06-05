"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { SortableHeader, useSortableRows } from "@/components/sortable";
import {
  updateLead,
  updateLeadDetails,
  addLeadFollowUp,
  sendLeadEmail,
  sendLeadQuote,
  logLeadWhatsApp,
  sendBulkLeadEmail,
  logBulkWhatsApp,
} from "@/lib/actions/leads";
import { LeadsImport } from "@/components/leads-import";
import { LEAD_KIND_LABELS, LEAD_STATUS_LABELS } from "@/lib/leads";
import type { ActionResult } from "@/lib/actions/schemes";

export interface LeadRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  country: string | null;
  company: string | null;
  jobTitle: string | null;
  certificationOfInterest: string | null;
  message: string | null;
  notes: string | null;
  kind: "REGISTRATION" | "INFORMATION" | "ADVISORY";
  status: "NEW" | "CONTACTED" | "CONVERTED" | "DISCARDED";
  source: string | null;
  siteVisitCount: number;
  lastSiteVisitAtIso: string | null;
  createdAtIso: string;
  contactedAtIso: string | null;
}

interface LeadActivityRow {
  id: string;
  type: string;
  comment: string | null;
  metadata: Record<string, unknown>;
  createdAtIso: string;
  actorName: string | null;
}

/** Considera "en línea" si la última visita es < 5 minutos. */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const STATUS_TONE: Record<LeadRow["status"], { bg: string; text: string; ring: string }> = {
  NEW:       { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200" },
  CONTACTED: { bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200" },
  CONVERTED: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  DISCARDED: { bg: "bg-slate-100",  text: "text-slate-500",   ring: "ring-slate-200" },
};

export function LeadsTable({
  rows,
  whatsappTemplate,
}: {
  rows: LeadRow[];
  /** Mensaje base para wa.me. {nombre} se sustituye por el nombre del lead. */
  whatsappTemplate: string;
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | LeadRow["status"]>("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [activeLead, setActiveLead] = useState<{ row: LeadRow; tab: "email" | "quote" | "edit" | "follow" } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<null | "email" | "whatsapp">(null);

  function toggleSel(id: string) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toggleAll(ids: string[]) {
    setSelected((s) => {
      const all = ids.every((id) => s.has(id));
      const n = new Set(s);
      if (all) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  }

  const now = Date.now();
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (onlineOnly) {
        const last = r.lastSiteVisitAtIso ? new Date(r.lastSiteVisitAtIso).getTime() : 0;
        if (now - last > ONLINE_WINDOW_MS) return false;
      }
      if (!ql) return true;
      return (
        r.fullName.toLowerCase().includes(ql) ||
        r.email.toLowerCase().includes(ql) ||
        (r.company ?? "").toLowerCase().includes(ql) ||
        (r.certificationOfInterest ?? "").toLowerCase().includes(ql) ||
        (r.phone ?? "").toLowerCase().includes(ql)
      );
    });
  }, [rows, q, statusFilter, onlineOnly, now]);

  // Sorting con el helper compartido del proyecto.
  const accessors = {
    online: (r: LeadRow) => (r.lastSiteVisitAtIso && now - new Date(r.lastSiteVisitAtIso).getTime() < ONLINE_WINDOW_MS ? 1 : 0),
    status: (r: LeadRow) => r.status,
    name: (r: LeadRow) => r.fullName,
    company: (r: LeadRow) => r.company ?? "",
    interest: (r: LeadRow) => r.certificationOfInterest ?? "",
    country: (r: LeadRow) => r.country ?? "",
    source: (r: LeadRow) => r.source ?? "",
    visits: (r: LeadRow) => r.siteVisitCount,
    lastVisit: (r: LeadRow) => (r.lastSiteVisitAtIso ? new Date(r.lastSiteVisitAtIso).getTime() : 0),
    createdAt: (r: LeadRow) => new Date(r.createdAtIso).getTime(),
  } as const;
  const { sorted, sort, setSort } = useSortableRows(filtered, accessors, { key: "createdAt", dir: "asc" });

  const visibleIds = sorted.map((r) => r.id);
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someChecked = visibleIds.some((id) => selected.has(id));
  const selectedRows = rows.filter((r) => selected.has(r.id));

  return (
    <>
      {/* Toolbar de filtros */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex-1 min-w-[220px]">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Buscar</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, correo, empresa, interés…"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="NEW">Nuevos</option>
            <option value="CONTACTED">En contacto</option>
            <option value="CONVERTED">Convertidos</option>
            <option value="DISCARDED">Descartados</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} />
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Solo en línea (5 min)
          </span>
        </label>
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-800 transition hover:bg-brand-100"
        >
          ⬆ Importar leads
        </button>
        <div className="ml-auto text-xs text-slate-500">
          {sorted.length} de {rows.length} lead{sorted.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Barra de acción masiva: aparece cuando hay selección */}
      {selected.size > 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3">
          <div className="text-sm font-semibold text-brand-900">
            {selected.size} lead(s) seleccionado(s)
            <button onClick={() => setSelected(new Set())} className="ml-3 text-xs font-medium text-brand-700 underline">
              Limpiar selección
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkMode("email")}
              className="rounded-md btn-grad-navy px-3 py-1.5 text-xs font-bold"
            >
              📧 Enviar correo masivo
            </button>
            <button
              onClick={() => setBulkMode("whatsapp")}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              💬 WhatsApp masivo
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-[10px]">
              <th className="px-2 py-2 text-center">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todos los visibles"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
                  onChange={() => toggleAll(visibleIds)}
                />
              </th>
              <th className="px-3 py-2 text-left"><SortableHeader label="● En línea" sortKey="online" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Estado" sortKey="status" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Lead" sortKey="name" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Empresa" sortKey="company" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Interés" sortKey="interest" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="País" sortKey="country" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Origen" sortKey="source" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-right"><SortableHeader label="Visitas" sortKey="visits" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Última visita" sortKey="lastVisit" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Creado" sortKey="createdAt" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-12 text-center text-sm text-slate-400">
                  Sin leads para el filtro actual.
                </td>
              </tr>
            ) : sorted.map((r) => {
              const lastMs = r.lastSiteVisitAtIso ? new Date(r.lastSiteVisitAtIso).getTime() : 0;
              const online = lastMs > 0 && now - lastMs < ONLINE_WINDOW_MS;
              const tone = STATUS_TONE[r.status];
              return (
                <tr key={r.id} className={selected.has(r.id) ? "bg-brand-50/40" : "hover:bg-slate-50/60"}>
                  <td className="px-2 py-2.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${r.fullName}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggleSel(r.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {online ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                        <span className="relative inline-flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </span>
                        En línea
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />
                        Offline
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}>
                      {LEAD_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-slate-900">{r.fullName}</div>
                    <div className="text-xs text-slate-500">
                      <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a>
                      {r.phone ? <> · <a href={`tel:${r.phone}`} className="hover:underline">{r.phone}</a></> : null}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">{LEAD_KIND_LABELS[r.kind]}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-slate-800">{r.company ?? <span className="text-slate-300">—</span>}</div>
                    {r.jobTitle ? <div className="text-[11px] text-slate-500">{r.jobTitle}</div> : null}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{r.certificationOfInterest ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2.5 text-slate-700">{r.country ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-500">{r.source ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-brand-800">{r.siteVisitCount}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{r.lastSiteVisitAtIso ? fmt(r.lastSiteVisitAtIso) : "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{fmt(r.createdAtIso)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <IconButton title="Enviar correo" onClick={() => setActiveLead({ row: r, tab: "email" })}>📧</IconButton>
                      <IconButton title="Cotización automática" onClick={() => setActiveLead({ row: r, tab: "quote" })}>💰</IconButton>
                      <WhatsAppButton row={r} template={whatsappTemplate} />
                      <IconButton title="Seguimiento" onClick={() => setActiveLead({ row: r, tab: "follow" })}>📝</IconButton>
                      <IconButton title="Editar" onClick={() => setActiveLead({ row: r, tab: "edit" })}>✏️</IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeLead ? (
        <LeadDrawer
          row={activeLead.row}
          tab={activeLead.tab}
          onClose={() => setActiveLead(null)}
        />
      ) : null}

      {showImport ? <LeadsImport onClose={() => setShowImport(false)} /> : null}

      {bulkMode === "email" ? (
        <BulkEmailDrawer
          rows={selectedRows}
          onClose={() => setBulkMode(null)}
          onDone={() => { setBulkMode(null); setSelected(new Set()); }}
        />
      ) : null}
      {bulkMode === "whatsapp" ? (
        <BulkWhatsAppDrawer
          rows={selectedRows}
          template={whatsappTemplate}
          onClose={() => setBulkMode(null)}
        />
      ) : null}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
//  Acciones masivas
// ────────────────────────────────────────────────────────────────────

function BulkEmailDrawer({
  rows, onClose, onDone,
}: { rows: LeadRow[]; onClose: () => void; onDone: () => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, startTx] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function fire() {
    if (subject.trim().length < 3 || body.trim().length < 3) {
      setResult({ ok: false, error: "Asunto y cuerpo son obligatorios." }); return;
    }
    startTx(async () => {
      const r = await sendBulkLeadEmail({ leadIds: rows.map((x) => x.id), subject, body });
      setResult(r);
      if (r.ok) setTimeout(onDone, 1200);
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal>
      <button onClick={onClose} className="flex-1 bg-slate-950/40 backdrop-blur-sm" />
      <aside className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Correo masivo</p>
              <h2 className="text-lg font-bold text-slate-900">A {rows.length} lead(s)</h2>
              <p className="text-xs text-slate-500">Use <code className="rounded bg-slate-200 px-1">{"{nombre}"}</code> en el cuerpo para personalizar el saludo de cada destinatario.</p>
            </div>
            <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">Cerrar ✕</button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
          <details className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold">Ver destinatarios ({rows.length})</summary>
            <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto font-mono">
              {rows.map((r) => <li key={r.id}>{r.fullName} &lt;{r.email}&gt;</li>)}
            </ul>
          </details>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Asunto *</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cuerpo *</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} placeholder="Hola {nombre}, …" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <ActionFeedback state={result} />
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs">Cancelar</button>
          <button disabled={busy} onClick={fire} className="rounded-md btn-grad-navy px-4 py-1.5 text-xs font-bold disabled:opacity-50">
            {busy ? "Enviando…" : `📧 Enviar a ${rows.length}`}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function BulkWhatsAppDrawer({
  rows, template, onClose,
}: { rows: LeadRow[]; template: string; onClose: () => void }) {
  const [msg, setMsg] = useState(template);
  const withPhone = rows.filter((r) => !!r.phone);
  const withoutPhone = rows.length - withPhone.length;
  const [logged, setLogged] = useState(false);

  async function logOnce() {
    if (logged) return;
    setLogged(true);
    await logBulkWhatsApp(withPhone.map((r) => r.id)).catch(() => undefined);
  }

  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal>
      <button onClick={onClose} className="flex-1 bg-slate-950/40 backdrop-blur-sm" />
      <aside className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">WhatsApp masivo</p>
              <h2 className="text-lg font-bold text-slate-900">{withPhone.length} con teléfono</h2>
              {withoutPhone > 0 ? (
                <p className="text-[11px] text-amber-700">{withoutPhone} lead(s) seleccionado(s) no tienen teléfono; serán omitidos.</p>
              ) : null}
            </div>
            <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">Cerrar ✕</button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mensaje plantilla</span>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <span className="mt-1 block text-[10px] text-slate-400">Use <code>{"{nombre}"}</code> para personalizar el saludo.</span>
          </label>
          <p className="rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-900 ring-1 ring-amber-200">
            WhatsApp Web no permite envío masivo automatizado por la API gratuita. Generamos los enlaces wa.me personalizados — usted los abre uno por uno (o usa &ldquo;Abrir todos&rdquo; para que el navegador despache cada uno en una pestaña).
          </p>
          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Enlaces personalizados ({withPhone.length})
            </div>
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {withPhone.map((r) => {
                const phone = (r.phone ?? "").replace(/[^\d]/g, "");
                const text = encodeURIComponent(msg.replace(/{nombre}/gi, r.fullName.split(" ")[0]));
                const url = `https://wa.me/${phone}?text=${text}`;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <span>
                      <span className="font-semibold text-slate-800">{r.fullName}</span>
                      <span className="ml-2 text-slate-500">· {r.phone}</span>
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={logOnce}
                      className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      💬 Abrir
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <footer className="flex justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            onClick={() => {
              logOnce();
              for (const r of withPhone) {
                const phone = (r.phone ?? "").replace(/[^\d]/g, "");
                const text = encodeURIComponent(msg.replace(/{nombre}/gi, r.fullName.split(" ")[0]));
                window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
              }
            }}
            disabled={withPhone.length === 0}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
          >
            🚀 Abrir todos ({withPhone.length})
          </button>
          <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs">Cerrar</button>
        </footer>
      </aside>
    </div>
  );
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
}

function IconButton({
  title, onClick, children,
}: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-base transition hover:border-brand-300 hover:bg-brand-50"
    >
      {children}
    </button>
  );
}

function WhatsAppButton({ row, template }: { row: LeadRow; template: string }) {
  const [busy, startTx] = useTransition();
  function open() {
    if (!row.phone) {
      window.alert("Este lead no registró teléfono.");
      return;
    }
    const phone = row.phone.replace(/[^\d]/g, "");
    const msg = encodeURIComponent(template.replace(/{nombre}/gi, row.fullName.split(" ")[0]));
    startTx(async () => {
      await logLeadWhatsApp(row.id).catch(() => undefined);
      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    });
  }
  return (
    <button
      type="button"
      title="Abrir WhatsApp"
      onClick={open}
      disabled={busy || !row.phone}
      className="grid h-8 w-8 place-items-center rounded-md border border-emerald-200 bg-emerald-50 text-base transition hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-40"
    >
      💬
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────
//  Drawer con las 4 acciones (email, quote, edit, follow-up)
// ────────────────────────────────────────────────────────────────────
function LeadDrawer({
  row, tab, onClose,
}: { row: LeadRow; tab: "email" | "quote" | "edit" | "follow"; onClose: () => void }) {
  const [currentTab, setTab] = useState(tab);

  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal>
      <button type="button" aria-label="Cerrar" onClick={onClose} className="flex-1 bg-slate-950/40 backdrop-blur-sm" />
      <aside className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lead</p>
              <h2 className="text-lg font-bold text-slate-900">{row.fullName}</h2>
              <p className="text-xs text-slate-500">{row.email}{row.phone ? ` · ${row.phone}` : ""}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50">Cerrar ✕</button>
          </div>
          <nav className="mt-4 flex gap-1">
            <Tab active={currentTab === "email"} onClick={() => setTab("email")}>📧 Correo</Tab>
            <Tab active={currentTab === "quote"} onClick={() => setTab("quote")}>💰 Cotización</Tab>
            <Tab active={currentTab === "follow"} onClick={() => setTab("follow")}>📝 Seguimiento</Tab>
            <Tab active={currentTab === "edit"} onClick={() => setTab("edit")}>✏️ Editar</Tab>
          </nav>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          {currentTab === "email" ? <EmailTab row={row} /> : null}
          {currentTab === "quote" ? <QuoteTab row={row} /> : null}
          {currentTab === "follow" ? <FollowTab row={row} /> : null}
          {currentTab === "edit" ? <EditTab row={row} /> : null}
        </div>
      </aside>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-brand-800 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function EmailTab({ row }: { row: LeadRow }) {
  const [state, action] = useActionState<ActionResult, FormData>(sendLeadEmail.bind(null, row.id), { ok: false });
  return (
    <form action={action} className="space-y-3 text-sm">
      <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
        Destinatario: <strong>{row.email}</strong>. Use <code className="rounded bg-slate-200 px-1">{"{nombre}"}</code> en el cuerpo para personalizar el saludo.
      </p>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Asunto</span>
        <input name="subject" required maxLength={200} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mensaje</span>
        <textarea name="body" required rows={8} placeholder="Hola {nombre}, …" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <ActionFeedback state={state} />
      <SubmitRow label="Enviar correo" />
    </form>
  );
}

function QuoteTab({ row }: { row: LeadRow }) {
  const [busy, startTx] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  function fire() {
    startTx(async () => {
      const r = await sendLeadQuote(row.id);
      setResult(r);
    });
  }
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
        Le enviará a <strong>{row.email}</strong> un correo formal con la cotización y el proceso de la certificación de interés:
        {" "}<b>{row.certificationOfInterest ?? "(general — panorama de programas)"}</b>.
      </div>
      <ul className="space-y-1.5 text-xs text-slate-600">
        <li>• Precio del programa + IVA, vigencia, duración, modalidad, norma de referencia.</li>
        <li>• Proceso completo de 6 pasos (registro → diploma con QR).</li>
        <li>• Botón &ldquo;Iniciar mi inscripción&rdquo; → /registro?cert=&lt;slug&gt;.</li>
        <li>• Marca el lead como <b>CONTACTED</b> y deja registro en la bitácora.</li>
      </ul>
      <ActionFeedback state={result} />
      <button
        type="button"
        disabled={busy}
        onClick={fire}
        className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-bold disabled:opacity-50"
      >
        {busy ? "Enviando cotización…" : "💰 Enviar cotización automática"}
      </button>
    </div>
  );
}

function FollowTab({ row }: { row: LeadRow }) {
  const [statusState, statusAction] = useActionState<ActionResult, FormData>(updateLead.bind(null, row.id), { ok: false });
  const [followState, followAction] = useActionState<ActionResult, FormData>(addLeadFollowUp.bind(null, row.id), { ok: false });
  return (
    <div className="space-y-6 text-sm">
      <form action={statusAction} className="space-y-3 rounded-lg border border-slate-200 p-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cambiar estado</h3>
        <div className="flex gap-2">
          <select name="status" defaultValue={row.status} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="NEW">Nuevo</option>
            <option value="CONTACTED">En contacto</option>
            <option value="CONVERTED">Convertido</option>
            <option value="DISCARDED">Descartado</option>
          </select>
          <input name="notes" defaultValue={row.notes ?? ""} placeholder="Nota corta (opcional)" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-lg btn-grad-navy px-3 py-2 text-xs font-bold">Guardar</button>
        </div>
        <ActionFeedback state={statusState} />
      </form>

      <form action={followAction} className="space-y-3 rounded-lg border border-slate-200 p-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Registrar seguimiento</h3>
        <div className="flex gap-2">
          <select name="type" defaultValue="NOTE" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="NOTE">Nota</option>
            <option value="CALL">Llamada</option>
            <option value="MEETING">Reunión / asesoría</option>
          </select>
          <input name="comment" required placeholder="Detalle del seguimiento" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-lg btn-grad-navy px-3 py-2 text-xs font-bold">Anotar</button>
        </div>
        <ActionFeedback state={followState} />
      </form>

      {row.notes ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Última nota</div>
          <p className="mt-1">{row.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function EditTab({ row }: { row: LeadRow }) {
  const [state, action] = useActionState<ActionResult, FormData>(updateLeadDetails.bind(null, row.id), { ok: false });
  return (
    <form action={action} className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre completo" name="fullName" defaultValue={row.fullName} required />
        <Field label="Teléfono" name="phone" defaultValue={row.phone ?? ""} />
        <Field label="País" name="country" defaultValue={row.country ?? ""} />
        <Field label="Empresa" name="company" defaultValue={row.company ?? ""} />
        <Field label="Cargo" name="jobTitle" defaultValue={row.jobTitle ?? ""} />
        <Field label="Interés" name="certificationOfInterest" defaultValue={row.certificationOfInterest ?? ""} hint="Ej. SARLAFT, SAGRILAFT, Compliance LA/FT" />
      </div>
      <ActionFeedback state={state} />
      <SubmitRow label="Guardar cambios" />
    </form>
  );
}

function Field({
  label, name, defaultValue, required, hint,
}: { label: string; name: string; defaultValue?: string; required?: boolean; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}{required ? " *" : ""}</span>
      <input name={name} defaultValue={defaultValue} required={required} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      {hint ? <span className="mt-1 block text-[10px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

function ActionFeedback({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (state.ok && state.message) {
    return <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">{state.message}</p>;
  }
  if (!state.ok && state.error) {
    return <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800 ring-1 ring-rose-200">{state.error}</p>;
  }
  return null;
}

function SubmitRow({ label }: { label: string }) {
  return (
    <div className="flex justify-end">
      <button className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-bold">{label}</button>
    </div>
  );
}

/** Componente solo para que TypeScript no se queje del unused type. */
export type { LeadActivityRow };
