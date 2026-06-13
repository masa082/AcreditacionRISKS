"use client";

/// Vista AGRUPADA POR CANDIDATO del panel de calificación.
///
/// Cada candidato es una tarjeta con sus datos (nombre, documento,
/// correo, teléfono), los accesos a la ficha y a la Hoja de Vida en
/// PDF — para que el evaluador revise el informe antes de calificar —
/// y la lista de intentos con su estado y la acción "Ver" / "Calificar".
///
/// Filtros: búsqueda libre (nombre, doc, examen, folio, esquema) y
/// estado del intento. Los contadores arriba reflejan los intentos
/// VISIBLES después de aplicar el filtro.

import Link from "next/link";
import { useMemo, useState } from "react";

export interface GradingAttemptRow {
  attemptId: string;
  enrollmentCode: string;
  schemeName: string | null;
  examName: string;
  status: string;
  scorePercent: number | null;
  passingScore: number;
  attemptNumber: number;
  submittedAtIso: string | null;
  gradedAtIso: string | null;
}

export interface CandidateGradingGroup {
  candidateId: string;
  fullName: string;
  documentLabel: string;
  email: string;
  phone: string | null;
  attempts: GradingAttemptRow[];
}

const STATUS_META: Record<
  string,
  { label: string; tone: "amber" | "sky" | "emerald" | "rose" | "violet" | "slate" }
> = {
  NOT_STARTED:       { label: "No iniciado",       tone: "slate" },
  IN_PROGRESS:       { label: "En curso",          tone: "sky" },
  SUBMITTED:         { label: "Enviado",           tone: "sky" },
  AUTO_GRADED:       { label: "Calificado (auto)", tone: "emerald" },
  MANUAL_GRADING:    { label: "Por calificar",     tone: "amber" },
  GRADED:            { label: "Calificado",        tone: "emerald" },
  PASSED:            { label: "Aprobó",            tone: "emerald" },
  FAILED:            { label: "No aprobó",         tone: "rose" },
  PENDING_COMMITTEE: { label: "En comité",         tone: "violet" },
  VOID:              { label: "Anulado",           tone: "slate" },
};

const TONE_CLASS: Record<
  "amber" | "sky" | "emerald" | "rose" | "violet" | "slate",
  string
> = {
  amber:   "bg-amber-50 text-amber-800 ring-amber-200",
  sky:     "bg-sky-50 text-sky-800 ring-sky-200",
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rose:    "bg-rose-50 text-rose-800 ring-rose-200",
  violet:  "bg-violet-50 text-violet-800 ring-violet-200",
  slate:   "bg-slate-100 text-slate-600 ring-slate-200",
};

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "slate" as const };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${TONE_CLASS[meta.tone]}`}>
      {meta.label}
    </span>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase() || "?";
}

function dateShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function GradingByCandidate({ groups }: { groups: CandidateGradingGroup[] }) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredGroups = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return groups
      .map((g) => {
        const attempts = g.attempts.filter((a) => {
          if (statusFilter && a.status !== statusFilter) return false;
          if (!ql) return true;
          const hay = [
            g.fullName,
            g.documentLabel,
            g.email,
            g.phone ?? "",
            a.examName,
            a.enrollmentCode,
            a.schemeName ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(ql);
        });
        return attempts.length > 0 ? { ...g, attempts } : null;
      })
      .filter((g): g is CandidateGradingGroup => g !== null);
  }, [groups, q, statusFilter]);

  const allFiltered = filteredGroups.flatMap((g) => g.attempts);
  const counters = {
    total: allFiltered.length,
    porCalificar: allFiltered.filter((a) => a.status === "MANUAL_GRADING").length,
    enCurso: allFiltered.filter((a) => a.status === "IN_PROGRESS").length,
    enComite: allFiltered.filter((a) => a.status === "PENDING_COMMITTEE").length,
    aprobaron: allFiltered.filter((a) => a.status === "PASSED").length,
    reprobaron: allFiltered.filter((a) => a.status === "FAILED").length,
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Buscar</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Candidato, documento, examen, folio o esquema…"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Estado</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-800 ring-1 ring-amber-200">Por calificar {counters.porCalificar}</span>
          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-sky-800 ring-1 ring-sky-200">En curso {counters.enCurso}</span>
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-violet-800 ring-1 ring-violet-200">En comité {counters.enComite}</span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-800 ring-1 ring-emerald-200">Aprobaron {counters.aprobaron}</span>
          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-rose-800 ring-1 ring-rose-200">No aprobaron {counters.reprobaron}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700 ring-1 ring-slate-200">Total {counters.total}</span>
        </div>
      </div>

      {/* Tarjetas por candidato */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          No hay intentos que coincidan con los filtros.
        </div>
      ) : (
        filteredGroups.map((g) => (
          <CandidateCard key={g.candidateId} group={g} />
        ))
      )}
    </div>
  );
}

function CandidateCard({ group }: { group: CandidateGradingGroup }) {
  const pending = group.attempts.filter((a) => a.status === "MANUAL_GRADING").length;
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Encabezado del candidato */}
      <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white shadow-sm">
          {initials(group.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-slate-900">{group.fullName}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            <span className="font-mono">{group.documentLabel}</span>
            <span className="mx-2 text-slate-300">·</span>
            <a href={`mailto:${group.email}`} className="hover:text-brand-700 hover:underline">{group.email}</a>
            {group.phone ? (
              <>
                <span className="mx-2 text-slate-300">·</span>
                <a href={`tel:${group.phone}`} className="hover:text-brand-700 hover:underline">{group.phone}</a>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pending > 0 ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200 animate-pulse">
              {pending} por calificar
            </span>
          ) : null}
          <Link
            href={`/panel/candidatos/${group.candidateId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            title="Abrir la ficha completa del candidato"
          >
            👤 Ficha del candidato
          </Link>
          <Link
            href={`/panel/candidatos/${group.candidateId}/cv`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800 shadow-sm hover:bg-brand-100"
            title="Abrir la Hoja de Vida del candidato en PDF (nueva pestaña)"
          >
            📄 Hoja de Vida (PDF)
          </Link>
        </div>
      </header>

      {/* Lista de intentos del candidato */}
      <ul className="divide-y divide-slate-100">
        {group.attempts.map((a) => (
          <li key={a.attemptId} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm hover:bg-slate-50/60">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={a.status} />
                <span className="font-semibold text-slate-800">{a.examName}</span>
                {a.schemeName ? <span className="text-xs text-slate-400">· {a.schemeName}</span> : null}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                Folio <span className="font-mono">{a.enrollmentCode}</span>
                <span className="mx-2 text-slate-300">·</span>
                Intento #{a.attemptNumber}
                {a.submittedAtIso ? (
                  <>
                    <span className="mx-2 text-slate-300">·</span>
                    Enviado {dateShort(a.submittedAtIso)}
                  </>
                ) : null}
                {a.gradedAtIso ? (
                  <>
                    <span className="mx-2 text-slate-300">·</span>
                    Calificado {dateShort(a.gradedAtIso)}
                  </>
                ) : null}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Calificación</div>
              <div className="text-base font-bold text-slate-800">
                {a.scorePercent != null ? (
                  <>
                    <span className={a.scorePercent >= a.passingScore ? "text-emerald-700" : "text-rose-700"}>
                      {a.scorePercent}
                    </span>
                    <span className="text-xs font-medium text-slate-400"> / 100</span>
                  </>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">mín. {a.passingScore}%</div>
            </div>
            <Link
              href={`/panel/calificacion/${a.attemptId}`}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                a.status === "MANUAL_GRADING"
                  ? "bg-amber-600 text-white shadow hover:bg-amber-700"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {a.status === "MANUAL_GRADING" ? "Calificar →" : "Ver"}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
