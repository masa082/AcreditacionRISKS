"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SortableHeader, useSortableRows } from "@/components/sortable";

export interface GradingRow {
  attemptId: string;
  candidateName: string;
  documentNumber: string | null;
  enrollmentCode: string;
  examName: string;
  status: string;          // AttemptStatus
  scorePercent: number | null;
  passingScore: number;
  attemptNumber: number;
  startedAtIso: string | null;
  submittedAtIso: string | null;
  gradedAtIso: string | null;
}

/**
 * Mapeo de AttemptStatus → etiqueta legible + tono visual.
 * - PENDIENTE / EN CURSO: el candidato presentando.
 * - POR CALIFICAR: hay respuestas manuales esperando evaluador.
 * - APROBÓ ≥ 80 %: superó; puede pasar a comité.
 * - NO APROBÓ: rechazado.
 * - EN COMITÉ: aprobó la prueba, comité revisa documentos.
 * - ANULADO: el intento fue invalidado.
 */
const STATUS_META: Record<string, { label: string; tone: "amber" | "sky" | "emerald" | "rose" | "violet" | "slate" }> = {
  NOT_STARTED:       { label: "No iniciado",        tone: "slate" },
  IN_PROGRESS:       { label: "En curso",           tone: "sky" },
  SUBMITTED:         { label: "Enviado",            tone: "sky" },
  AUTO_GRADED:       { label: "Calificado (auto)",  tone: "emerald" },
  MANUAL_GRADING:    { label: "Por calificar",      tone: "amber" },
  GRADED:            { label: "Calificado",         tone: "emerald" },
  PASSED:            { label: "Aprobó",             tone: "emerald" },
  FAILED:            { label: "No aprobó",          tone: "rose" },
  PENDING_COMMITTEE: { label: "En comité",          tone: "violet" },
  VOID:              { label: "Anulado",            tone: "slate" },
};

const TONE_CLASS: Record<"amber" | "sky" | "emerald" | "rose" | "violet" | "slate", string> = {
  amber:   "bg-amber-50 text-amber-800 ring-amber-200",
  sky:     "bg-sky-50 text-sky-800 ring-sky-200",
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rose:    "bg-rose-50 text-rose-800 ring-rose-200",
  violet:  "bg-violet-50 text-violet-800 ring-violet-200",
  slate:   "bg-slate-100 text-slate-600 ring-slate-200",
};

export function GradingTable({ rows }: { rows: GradingRow[] }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!ql) return true;
      return (
        r.candidateName.toLowerCase().includes(ql) ||
        (r.documentNumber ?? "").toLowerCase().includes(ql) ||
        r.examName.toLowerCase().includes(ql) ||
        r.enrollmentCode.toLowerCase().includes(ql)
      );
    });
  }, [rows, q, statusFilter]);

  const accessors = {
    candidate:   (r: GradingRow) => r.candidateName,
    document:    (r: GradingRow) => r.documentNumber ?? "",
    exam:        (r: GradingRow) => r.examName,
    enrollment:  (r: GradingRow) => r.enrollmentCode,
    attempt:     (r: GradingRow) => r.attemptNumber,
    status:      (r: GradingRow) => STATUS_META[r.status]?.label ?? r.status,
    score:       (r: GradingRow) => r.scorePercent ?? -1,
    submittedAt: (r: GradingRow) => (r.submittedAtIso ? new Date(r.submittedAtIso).getTime() : 0),
    gradedAt:    (r: GradingRow) => (r.gradedAtIso ? new Date(r.gradedAtIso).getTime() : 0),
  } as const;
  const { sorted, sort, setSort } = useSortableRows(filtered, accessors, { key: "submittedAt", dir: "asc" });

  // Conteos para los chips arriba de la toolbar.
  const counts = {
    total: rows.length,
    manual: rows.filter((r) => r.status === "MANUAL_GRADING").length,
    inProgress: rows.filter((r) => r.status === "IN_PROGRESS" || r.status === "NOT_STARTED").length,
    passed: rows.filter((r) => r.status === "PASSED").length,
    committee: rows.filter((r) => r.status === "PENDING_COMMITTEE").length,
    failed: rows.filter((r) => r.status === "FAILED").length,
  };

  return (
    <>
      {/* Toolbar: buscador, filtro y conteos rápidos */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex-1 min-w-[220px]">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Buscar</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Candidato, documento, examen o folio…"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-1.5 text-[11px]">
          <Chip tone="amber"  label="Por calificar" value={counts.manual} />
          <Chip tone="sky"    label="En curso"      value={counts.inProgress} />
          <Chip tone="violet" label="En comité"     value={counts.committee} />
          <Chip tone="emerald" label="Aprobaron"    value={counts.passed} />
          <Chip tone="rose"   label="No aprobaron"  value={counts.failed} />
          <Chip tone="slate"  label="Total"         value={counts.total} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-[10px]">
              <th className="px-3 py-2 text-left"><SortableHeader label="Candidato" sortKey="candidate" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Documento" sortKey="document" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Evaluación" sortKey="exam" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Folio" sortKey="enrollment" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-center"><SortableHeader label="Intento" sortKey="attempt" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Estado" sortKey="status" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-right"><SortableHeader label="Calificación" sortKey="score" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Enviado" sortKey="submittedAt" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-left"><SortableHeader label="Calificado" sortKey="gradedAt" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-12 text-center text-sm text-slate-400">
                  No hay candidatos para el filtro actual.
                </td>
              </tr>
            ) : sorted.map((r) => {
              const meta = STATUS_META[r.status] ?? { label: r.status, tone: "slate" as const };
              const tone = TONE_CLASS[meta.tone];
              const showScore = r.scorePercent != null && ["AUTO_GRADED","GRADED","PASSED","FAILED","PENDING_COMMITTEE"].includes(r.status);
              const passedColor =
                r.scorePercent != null && r.scorePercent >= r.passingScore
                  ? "text-emerald-700"
                  : r.scorePercent != null
                  ? "text-rose-700"
                  : "text-slate-400";
              const actionable = r.status === "MANUAL_GRADING";
              return (
                <tr key={r.attemptId} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{r.candidateName}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                    {r.documentNumber ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{r.examName}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{r.enrollmentCode}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-xs text-slate-600">#{r.attemptNumber}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tone}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {showScore ? (
                      <div>
                        <div className={`font-mono text-sm font-bold ${passedColor}`}>
                          {Math.round((r.scorePercent ?? 0) * 100) / 100} / 100
                        </div>
                        <div className="text-[10px] text-slate-400">mín. {r.passingScore}%</div>
                      </div>
                    ) : r.status === "MANUAL_GRADING" ? (
                      <span className="text-[11px] italic text-amber-600">esperando evaluador</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{fmt(r.submittedAtIso)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{fmt(r.gradedAtIso)}</td>
                  <td className="px-3 py-2.5 text-center">
                    {actionable ? (
                      <Link
                        href={`/panel/calificacion/${r.attemptId}`}
                        className="rounded-md btn-grad-navy px-2.5 py-1 text-[11px] font-bold text-white"
                      >
                        Calificar →
                      </Link>
                    ) : (
                      <Link
                        href={`/panel/calificacion/${r.attemptId}`}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-800 hover:border-brand-300 hover:bg-brand-50"
                      >
                        Ver
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota",
  });
}

function Chip({ tone, label, value }: { tone: keyof typeof TONE_CLASS; label: string; value: number }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${TONE_CLASS[tone]}`}>
      {label} <strong className="font-mono">{value}</strong>
    </span>
  );
}
