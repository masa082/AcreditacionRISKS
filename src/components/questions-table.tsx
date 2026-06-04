"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { duplicateQuestion, deleteQuestion } from "@/lib/actions/questions";

export interface QuestionRow {
  id: string;
  code: string;
  statement: string;
  typeLabel: string;
  type: string;
  difficultyLabel: string;
  difficulty: string;
  points: number;
  status: string;
  statusLabel: string;
  isCritical: boolean;
  tags: string[];
  appearances: number;
  correctRate: number | null; // 0..100, null si nunca se ha respondido
  answersCount: number;
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  INACTIVE: "bg-slate-100 text-slate-500",
};

const DIFFICULTY_TONE: Record<string, string> = {
  BASIC: "bg-cyan-50 text-cyan-700",
  INTERMEDIATE: "bg-brand-50 text-brand-700",
  ADVANCED: "bg-rose-50 text-rose-700",
};

export function QuestionsTable({
  bankId,
  rows,
  knownTags,
  canEdit,
  canCreate,
}: {
  bankId: string;
  rows: QuestionRow[];
  knownTags: string[];
  canEdit: boolean;
  canCreate: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function updateParam(name: string, value: string) {
    const u = new URLSearchParams(sp.toString());
    if (value) u.set(name, value);
    else u.delete(name);
    startTransition(() => router.push(`/panel/preguntas/${bankId}?${u.toString()}`));
  }

  async function onDuplicate(id: string) {
    setBusyId(id);
    try {
      await duplicateQuestion(id);
    } finally {
      setBusyId(null);
    }
  }
  async function onDelete(id: string, code: string, status: string) {
    if (status !== "DRAFT" && status !== "REJECTED") {
      alert(`Solo se pueden eliminar preguntas en estado Borrador o Rechazada. Esta está ${status}.`);
      return;
    }
    if (!confirm(`¿Eliminar definitivamente la pregunta ${code}?`)) return;
    setBusyId(id);
    try {
      await deleteQuestion(id);
    } finally {
      setBusyId(null);
    }
  }

  const allTags = useMemo(() => Array.from(new Set(knownTags)).sort(), [knownTags]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          defaultValue={sp.get("q") ?? ""}
          onKeyDown={(e) => { if (e.key === "Enter") updateParam("q", (e.target as HTMLInputElement).value); }}
          placeholder="🔍 Buscar en enunciado, código o tags — Enter"
          className="min-w-[260px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={sp.get("type") ?? ""}
          onChange={(e) => updateParam("type", e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Tipo: todos</option>
          <option value="SINGLE_CHOICE">Opción única</option>
          <option value="MULTIPLE_CHOICE">Selección múltiple</option>
          <option value="TRUE_FALSE">Verdadero/Falso</option>
          <option value="OPEN_TEXT">Texto abierto</option>
          <option value="CASE_STUDY">Caso práctico</option>
          <option value="FILE_UPLOAD">Carga de archivo</option>
          <option value="MATCHING">Emparejamiento</option>
          <option value="ORDERING">Ordenamiento</option>
          <option value="FILL_BLANK">Completar</option>
          <option value="SCALE">Escala</option>
        </select>
        <select
          value={sp.get("status") ?? ""}
          onChange={(e) => updateParam("status", e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Estado: todos</option>
          <option value="DRAFT">Borrador</option>
          <option value="IN_REVIEW">En revisión</option>
          <option value="APPROVED">Aprobada</option>
          <option value="REJECTED">Rechazada</option>
          <option value="INACTIVE">Inactiva</option>
        </select>
        <select
          value={sp.get("difficulty") ?? ""}
          onChange={(e) => updateParam("difficulty", e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Dificultad: todas</option>
          <option value="BASIC">Básico</option>
          <option value="INTERMEDIATE">Intermedio</option>
          <option value="ADVANCED">Avanzado</option>
        </select>
        <select
          value={sp.get("tag") ?? ""}
          onChange={(e) => updateParam("tag", e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Etiqueta: todas</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          type="button"
          onClick={() => startTransition(() => router.push(`/panel/preguntas/${bankId}`))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
        >
          Limpiar
        </button>
        {pending ? <span className="text-xs text-slate-500">Actualizando…</span> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2 min-w-[240px]">Enunciado</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Etiquetas</th>
              <th className="px-3 py-2 text-center">Dificultad</th>
              <th className="px-3 py-2 text-center" title="Veces que apareció en evaluaciones">Apariciones</th>
              <th className="px-3 py-2 text-center" title="Respuestas registradas">Respuestas</th>
              <th className="px-3 py-2 text-center" title="Promedio de calificación obtenida (% del valor)">% Aciertos</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 align-top">
                  <Link href={`/panel/preguntas/${bankId}/pregunta/${q.id}`} className="font-mono text-xs font-semibold text-brand-800 hover:underline">
                    {q.code}
                  </Link>
                  {q.isCritical ? <span className="ml-1 text-rose-500" title="Pregunta crítica">●</span> : null}
                </td>
                <td className="px-3 py-2 align-top">
                  <Link href={`/panel/preguntas/${bankId}/pregunta/${q.id}`} className="block max-w-md truncate text-slate-700 hover:text-brand-800" title={q.statement}>
                    {q.statement}
                  </Link>
                </td>
                <td className="px-3 py-2 align-top text-xs text-slate-600">{q.typeLabel}</td>
                <td className="px-3 py-2 align-top">
                  <div className="flex max-w-[180px] flex-wrap gap-1">
                    {q.tags.length === 0 ? <span className="text-xs text-slate-300">—</span> : q.tags.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">{t}</span>
                    ))}
                    {q.tags.length > 4 ? <span className="text-[10px] text-slate-500">+{q.tags.length - 4}</span> : null}
                  </div>
                </td>
                <td className="px-3 py-2 align-top text-center">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${DIFFICULTY_TONE[q.difficulty] ?? "bg-slate-100 text-slate-600"}`}>{q.difficultyLabel}</span>
                </td>
                <td className="px-3 py-2 align-top text-center font-semibold text-slate-700">{q.appearances}</td>
                <td className="px-3 py-2 align-top text-center text-slate-600">{q.answersCount}</td>
                <td className="px-3 py-2 align-top text-center">
                  {q.correctRate === null ? (
                    <span className="text-xs text-slate-300">—</span>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      q.correctRate >= 75 ? "bg-emerald-100 text-emerald-700"
                      : q.correctRate >= 50 ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                    }`}>{q.correctRate}%</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_TONE[q.status] ?? "bg-slate-100 text-slate-600"}`}>{q.statusLabel}</span>
                </td>
                <td className="px-3 py-2 align-top text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/panel/preguntas/${bankId}/pregunta/${q.id}`} className="rounded border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100" title="Ver / Editar">✎</Link>
                    {canCreate ? (
                      <button type="button" disabled={busyId === q.id} onClick={() => onDuplicate(q.id)} className="rounded border border-brand-200 bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-50" title="Duplicar pregunta">⎘</button>
                    ) : null}
                    {canEdit ? (
                      <button type="button" disabled={busyId === q.id} onClick={() => onDelete(q.id, q.code, q.status)} className="rounded border border-rose-200 bg-white px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50" title="Eliminar (solo borrador/rechazada)">✕</button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No hay preguntas que coincidan con los filtros.
          </div>
        ) : null}
      </div>
    </div>
  );
}
