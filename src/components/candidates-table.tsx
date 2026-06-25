"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CandidatesToolbar } from "@/components/candidates-toolbar";
import { EmailLogDialog } from "@/components/email-log-dialog";
import { IncidentsDialog } from "@/components/incidents-dialog";
import { PracticalCaseEnableDialog } from "@/components/practical-case-enable-dialog";

export interface CandidateRow {
  id: string;
  fullName: string;
  email: string;
  documentLabel: string;
  enrollments: number;
  lastStatus: string;
  lastStatusLabel: string;
  lastCreatedAt: string | null;
  paymentLabel: "approved" | "pending" | "rejected" | "none";
  paymentAmount: string | null;
  consentGiven: boolean;
  docsPending: number;
  docsApproved: number;
  docsRejected: number;
  /** Conteo por tipo de archivo, para mostrar iconos. */
  docsPdf: number;
  docsImg: number;
  /** Nombre del programa/esquema en el que está el candidato. */
  programName: string | null;
  /** Puntajes obtenidos por cada evaluación (máx. 2 visibles: Teórico/Caso). */
  scores: Array<{
    examShort: string;
    scorePercent: number | null;
    passed: boolean | null;
    status: string;
  }>;
  /** Enrollments deshabilitados (caso práctico) con información para habilitar. */
  disabledPracticalCases: Array<{ enrollmentId: string; examName: string }>;
  /** ¿Tiene certificado emitido (cualquier inscripción)? */
  hasCert: boolean;
  lastLoginLabel: string | null;
  lastLoginIp: string | null;
  loginCount: number;
  /** True si el candidato tiene una sesión activa (no revocada, no expirada). */
  isOnline: boolean;
  /** Conteo de correos en la bitácora (EmailLog) para este candidato. */
  emailsCount: number;
  /** Conteo de incidencias PENDIENTES (sin resolver). Cuando > 0, se
   *  muestra un badge rojo con el número en la columna "Alertas". */
  incidentsCount: number;
}

const PAYMENT_BADGE: Record<CandidateRow["paymentLabel"], { label: string; cls: string }> = {
  approved: { label: "✓ Aprobado", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "⏳ Pendiente", cls: "bg-amber-100 text-amber-700" },
  rejected: { label: "✗ Rechazado", cls: "bg-rose-100 text-rose-700" },
  none: { label: "—", cls: "bg-slate-100 text-slate-500" },
};

// Llaves de columnas ordenables. El orden por defecto es "fullName asc".
type SortKey =
  | "online" | "fullName" | "documentLabel" | "enrollments" | "lastStatus"
  | "payment" | "consent" | "docs" | "lastLogin" | "loginCount" | "emailsCount" | "incidentsCount";
type SortDir = "asc" | "desc";

const SORTERS: Record<SortKey, (r: CandidateRow) => number | string> = {
  online:        (r) => (r.isOnline ? 0 : 1),
  fullName:      (r) => r.fullName.toLowerCase(),
  documentLabel: (r) => r.documentLabel.toLowerCase(),
  enrollments:   (r) => r.enrollments,
  lastStatus:    (r) => r.lastStatusLabel.toLowerCase(),
  payment:       (r) => ["approved", "pending", "rejected", "none"].indexOf(r.paymentLabel),
  consent:       (r) => (r.consentGiven ? 0 : 1),
  docs:          (r) => -(r.docsApproved * 100 + r.docsPending * 10 + r.docsRejected),
  lastLogin:     (r) => r.lastLoginLabel ?? "",
  loginCount:    (r) => r.loginCount,
  emailsCount:   (r) => -r.emailsCount, // primero los que tienen más correos
  incidentsCount:(r) => -r.incidentsCount, // primero los que tienen alertas
};

function SortHeader({
  label, sortKey, current, onSort,
}: { label: string; sortKey: SortKey; current: { key: SortKey; dir: SortDir }; onSort: (k: SortKey) => void }) {
  const active = current.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`group inline-flex items-center gap-1 text-left font-bold uppercase tracking-wider transition hover:text-brand-800 ${
        active ? "text-brand-800" : "text-slate-400"
      }`}
      title={`Ordenar por ${label}`}
    >
      {label}
      <span aria-hidden className="text-[8px] opacity-70 group-hover:opacity-100">
        {active ? (current.dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}

export function CandidatesTable({ rows }: { rows: CandidateRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "fullName", dir: "asc" });
  const [onlyOnline, setOnlyOnline] = useState(false);
  // Modal abierto para ver bitácora de correos de un candidato concreto.
  const [emailFor, setEmailFor] = useState<CandidateRow | null>(null);
  // Modal abierto para ver incidencias del proceso del candidato.
  const [incidentsFor, setIncidentsFor] = useState<CandidateRow | null>(null);
  // Modal abierto para habilitar caso práctico.
  const [practicalCaseFor, setPracticalCaseFor] = useState<{ enrollmentId: string; candidateName: string; examName: string } | null>(null);

  function onSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  // Filtrado + ordenamiento en memoria sobre las filas ya entregadas por el server.
  const visible = useMemo(() => {
    let v = rows;
    if (onlyOnline) v = v.filter((r) => r.isOnline);
    const sorter = SORTERS[sort.key];
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...v].sort((a, b) => {
      const va = sorter(a), vb = sorter(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
      return String(va).localeCompare(String(vb)) * factor;
    });
  }, [rows, sort, onlyOnline]);

  const allChecked = useMemo(() => visible.length > 0 && visible.every((r) => selected.has(r.id)), [visible, selected]);
  const onlineCount = useMemo(() => rows.filter((r) => r.isOnline).length, [rows]);

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set([...selected].filter((id) => !visible.some((r) => r.id === id))));
    } else {
      setSelected(new Set([...selected, ...visible.map((r) => r.id)]));
    }
  }
  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <CandidatesToolbar selected={Array.from(selected)} allInView={visible.length} />

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition ${
          onlyOnline ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"
        }`}>
          <input
            type="checkbox"
            checked={onlyOnline}
            onChange={(e) => setOnlyOnline(e.target.checked)}
            className="h-3.5 w-3.5 accent-emerald-600"
          />
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-emerald-500" />
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" />
          </span>
          Solo en línea ({onlineCount})
        </label>
        <span className="text-slate-400">Haga clic en cualquier título de columna para ordenar.</span>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          {onlyOnline ? "No hay candidatos con sesión activa en este momento." : "No hay candidatos que coincidan con los filtros."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] tracking-wider">
                <th className="px-3 py-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                <th className="px-3 py-2">
                  <SortHeader label="● En línea" sortKey="online" current={sort} onSort={onSort} />
                </th>
                <th className="px-3 py-2"><SortHeader label="⚠ Alertas" sortKey="incidentsCount" current={sort} onSort={onSort} /></th>
                <th className="px-3 py-2"><SortHeader label="Candidato" sortKey="fullName" current={sort} onSort={onSort} /></th>
                <th className="px-3 py-2"><SortHeader label="Documento" sortKey="documentLabel" current={sort} onSort={onSort} /></th>
                <th className="px-3 py-2"><SortHeader label="Insc." sortKey="enrollments" current={sort} onSort={onSort} /></th>
                <th className="px-3 py-2 min-w-[280px]"><SortHeader label="Programa · estado · puntajes" sortKey="lastStatus" current={sort} onSort={onSort} /></th>
                <th className="px-3 py-2"><SortHeader label="Pago" sortKey="payment" current={sort} onSort={onSort} /></th>
                <th className="px-3 py-2"><SortHeader label="Autoriz." sortKey="consent" current={sort} onSort={onSort} /></th>
                <th className="px-3 py-2"><SortHeader label="Archivos" sortKey="docs" current={sort} onSort={onSort} /></th>
                <th className="px-3 py-2"><SortHeader label="📧 Email" sortKey="emailsCount" current={sort} onSort={onSort} /></th>
                <th className="px-3 py-2"><SortHeader label="Último ingreso" sortKey="lastLogin" current={sort} onSort={onSort} /></th>
                <th className="px-3 py-2"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IP</span></th>
                <th className="px-3 py-2 text-center"><SortHeader label="Logins" sortKey="loginCount" current={sort} onSort={onSort} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((c) => {
                const pay = PAYMENT_BADGE[c.paymentLabel];
                return (
                  <tr key={c.id} className={`hover:bg-slate-50 ${selected.has(c.id) ? "bg-brand-50/40" : ""}`}>
                    <td className="px-3 py-2 align-top">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    </td>
                    <td className="px-3 py-2 align-top" title={c.isOnline ? "Sesión activa ahora mismo" : "Sin sesión activa"}>
                      {c.isOnline ? (
                        <span className="relative inline-flex h-3 w-3" aria-label="En línea">
                          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
                          <span className="absolute inset-0 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                        </span>
                      ) : (
                        <span className="inline-block h-3 w-3 rounded-full bg-slate-300 ring-2 ring-slate-100" aria-label="Desconectado" />
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {c.incidentsCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setIncidentsFor(c)}
                          className="group relative inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 shadow-sm hover:bg-rose-100"
                          title={`${c.incidentsCount} incidencia(s) pendiente(s) — clic para ver detalle`}
                        >
                          <span aria-hidden className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                          </span>
                          ⚠ {c.incidentsCount}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIncidentsFor(c)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-slate-50"
                          title="Sin incidencias — clic para ver el historial"
                        >
                          ✓ 0
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Link href={`/panel/candidatos/${c.id}`} className="font-medium text-slate-800 hover:text-brand-800 hover:underline">
                        {c.fullName}
                      </Link>
                      <div className="text-[11px] text-slate-400">{c.email}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-slate-600">{c.documentLabel}</td>
                    <td className="px-3 py-2 align-top text-center text-xs text-slate-700">{c.enrollments}</td>
                    <td className="px-3 py-2 align-top text-xs">
                      {c.programName ? (
                        <div className="font-semibold text-brand-900" title={c.programName}>
                          {c.programName.length > 42 ? `${c.programName.slice(0, 42)}…` : c.programName}
                        </div>
                      ) : null}
                      <div className="text-slate-700">{c.lastStatusLabel}</div>
                      {c.lastCreatedAt ? <div className="text-[10px] text-slate-400">{c.lastCreatedAt}</div> : null}
                      {c.scores.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.scores.map((s, i) => {
                            const tone =
                              s.passed === true
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : s.passed === false
                                ? "bg-rose-50 text-rose-700 ring-rose-200"
                                : s.status === "PENDING_COMMITTEE" || s.status === "SUBMITTED"
                                ? "bg-blue-50 text-blue-700 ring-blue-200"
                                : "bg-slate-50 text-slate-500 ring-slate-200";
                            const label =
                              s.scorePercent != null
                                ? `${s.examShort}: ${s.scorePercent.toLocaleString("es-CO", {
                                    maximumFractionDigits: 1,
                                  })}%${s.passed === true ? " ✓" : s.passed === false ? " ✗" : ""}`
                                : s.status === "PENDING_COMMITTEE"
                                ? `${s.examShort}: en comité`
                                : s.status === "SUBMITTED"
                                ? `${s.examShort}: por calificar`
                                : s.status === "IN_PROGRESS"
                                ? `${s.examShort}: en curso`
                                : `${s.examShort}: pendiente`;
                            return (
                              <span
                                key={i}
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${tone}`}
                                title={`Estado del intento: ${s.status}`}
                              >
                                {label}
                              </span>
                            );
                          })}
                          {c.hasCert ? (
                            <Link
                              href={`/panel/candidatos/${c.id}/certificados`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-bold text-gold-700 ring-1 ring-gold-200 transition hover:bg-gold-100 hover:ring-gold-300"
                              title="Ver los certificados del candidato (abre en nueva pestaña)"
                            >
                              🎓 Certificado <span aria-hidden>↗</span>
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${pay.cls}`}>{pay.label}</span>
                      {c.paymentAmount ? <div className="mt-0.5 text-[10px] text-slate-500">{c.paymentAmount}</div> : null}
                    </td>
                    <td className="px-3 py-2 align-top text-center text-sm">
                      {c.consentGiven ? <span title="Autorizó tratamiento" className="text-emerald-600">✓</span> : <span title="Sin autorización" className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {c.docsPdf > 0 ? (
                            <span title={`${c.docsPdf} PDF`} className="inline-flex items-center gap-0.5 rounded bg-rose-50 px-1 py-0.5 ring-1 ring-rose-200 text-rose-700">
                              <span aria-hidden>📕</span><span className="font-semibold">{c.docsPdf}</span>
                            </span>
                          ) : null}
                          {c.docsImg > 0 ? (
                            <span title={`${c.docsImg} imagen(es)`} className="inline-flex items-center gap-0.5 rounded bg-cyan-50 px-1 py-0.5 ring-1 ring-cyan-200 text-cyan-700">
                              <span aria-hidden>🖼</span><span className="font-semibold">{c.docsImg}</span>
                            </span>
                          ) : null}
                          {c.docsPdf === 0 && c.docsImg === 0 ? <span className="text-slate-300">—</span> : null}
                        </div>
                        <div className="text-[10px] text-slate-500" title="Aprobados / En revisión / Rechazados">
                          <span className="text-emerald-700">{c.docsApproved}</span>
                          {" / "}
                          <span className="text-amber-700">{c.docsPending}</span>
                          {" / "}
                          <span className="text-rose-700">{c.docsRejected}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/panel/candidatos/${c.id}/documentos`}
                            className="rounded border border-brand-300 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 hover:bg-brand-50"
                            title="Abrir carpeta del candidato"
                          >
                            📁 Carpeta
                          </Link>
                          <a
                            href={`/panel/candidatos/${c.id}/cv`}
                            className="rounded border border-violet-300 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-50"
                            title="Descargar Hoja de Vida del Candidato"
                          >
                            ⬇ Informe
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <button
                        type="button"
                        onClick={() => setEmailFor(c)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                          c.emailsCount > 0
                            ? "border-brand-300 bg-brand-50 text-brand-800 hover:bg-brand-100"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                        title={c.emailsCount > 0 ? "Ver bitácora de correos enviados" : "Sin correos registrados"}
                      >
                        📧 <span className="font-bold">{c.emailsCount}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-600">
                      {c.lastLoginLabel ?? <span className="text-slate-300">Nunca</span>}
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-[10px] text-slate-500">{c.lastLoginIp ?? "—"}</td>
                    <td className="px-3 py-2 align-top text-center text-xs text-slate-700">{c.loginCount || "—"}</td>
                    <td className="px-3 py-2 align-top">
                      {c.disabledPracticalCases.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {c.disabledPracticalCases.map((pc) => (
                            <button
                              key={pc.enrollmentId}
                              type="button"
                              onClick={() => setPracticalCaseFor({
                                enrollmentId: pc.enrollmentId,
                                candidateName: c.fullName,
                                examName: pc.examName,
                              })}
                              className="rounded border border-green-300 bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700 hover:bg-green-100 w-full"
                              title={`Habilitar ${pc.examName}`}
                            >
                              🔄 Habilitar {pc.examName.includes('Teórico') || pc.examName.includes('Teorico') ? 'Examen Teórico' : 'Caso Práctico'}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {emailFor ? (
        <EmailLogDialog
          open={!!emailFor}
          candidateId={emailFor.id}
          candidateName={emailFor.fullName}
          candidateEmail={emailFor.email}
          onClose={() => setEmailFor(null)}
        />
      ) : null}
      {incidentsFor ? (
        <IncidentsDialog
          open={!!incidentsFor}
          candidateId={incidentsFor.id}
          candidateName={incidentsFor.fullName}
          candidateEmail={incidentsFor.email}
          onClose={() => setIncidentsFor(null)}
        />
      ) : null}
      {practicalCaseFor ? (
        <PracticalCaseEnableDialog
          open={!!practicalCaseFor}
          enrollmentId={practicalCaseFor.enrollmentId}
          candidateName={practicalCaseFor.candidateName}
          examName={practicalCaseFor.examName}
          onClose={() => setPracticalCaseFor(null)}
        />
      ) : null}
    </div>
  );
}
