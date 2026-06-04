"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CandidatesToolbar } from "@/components/candidates-toolbar";

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
  lastLoginLabel: string | null;
  lastLoginIp: string | null;
  loginCount: number;
}

const PAYMENT_BADGE: Record<CandidateRow["paymentLabel"], { label: string; cls: string }> = {
  approved: { label: "✓ Aprobado", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "⏳ Pendiente", cls: "bg-amber-100 text-amber-700" },
  rejected: { label: "✗ Rechazado", cls: "bg-rose-100 text-rose-700" },
  none: { label: "—", cls: "bg-slate-100 text-slate-500" },
};

export function CandidatesTable({ rows }: { rows: CandidateRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allChecked = useMemo(() => rows.length > 0 && rows.every((r) => selected.has(r.id)), [rows, selected]);

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
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
      <CandidatesToolbar selected={Array.from(selected)} allInView={rows.length} />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          No hay candidatos que coincidan con los filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                <th className="px-3 py-2">Candidato</th>
                <th className="px-3 py-2">Documento</th>
                <th className="px-3 py-2">Insc.</th>
                <th className="px-3 py-2">Último estado</th>
                <th className="px-3 py-2">Pago</th>
                <th className="px-3 py-2">Autoriz.</th>
                <th className="px-3 py-2">Archivos</th>
                <th className="px-3 py-2">Último ingreso</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2 text-center">Logins</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => {
                const pay = PAYMENT_BADGE[c.paymentLabel];
                return (
                  <tr key={c.id} className={`hover:bg-slate-50 ${selected.has(c.id) ? "bg-brand-50/40" : ""}`}>
                    <td className="px-3 py-2 align-top">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
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
                      <div className="text-slate-700">{c.lastStatusLabel}</div>
                      {c.lastCreatedAt ? <div className="text-[10px] text-slate-400">{c.lastCreatedAt}</div> : null}
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
                          {c.docsPdf === 0 && c.docsImg === 0 ? (
                            <span className="text-slate-300">—</span>
                          ) : null}
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
                            title="Abrir carpeta con todos los archivos del candidato"
                          >
                            📁 Carpeta
                          </Link>
                          <a
                            href={`/panel/candidatos/${c.id}/cv`}
                            className="rounded border border-violet-300 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-50"
                            title="Descargar Hoja de Vida del Candidato (PDF con datos, fotografía, documentos, resultados y pagos)"
                          >
                            ⬇ Informe
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-slate-600">
                      {c.lastLoginLabel ?? <span className="text-slate-300">Nunca</span>}
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-[10px] text-slate-500">{c.lastLoginIp ?? "—"}</td>
                    <td className="px-3 py-2 align-top text-center text-xs text-slate-700">{c.loginCount || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
