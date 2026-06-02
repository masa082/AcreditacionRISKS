"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LIST,
  DIFFICULTY_LABELS,
  type QuestionTypeKey,
} from "@/lib/question-types";
import { createQuestion, updateQuestion, type QuestionInput } from "@/lib/actions/questions";

interface OptionRow {
  text: string;
  isCorrect: boolean;
  matchLeft: string;
  matchRight: string;
}
interface RubricRow {
  nombre: string;
  puntos: number;
}

export interface QuestionInitial {
  id: string;
  code: string;
  type: QuestionTypeKey;
  statement: string;
  contextText?: string | null;
  mediaUrl?: string | null;
  points: number;
  partialScoring: boolean;
  difficulty: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  competencyId?: string | null;
  topicId?: string | null;
  normReference?: string | null;
  tags: string[];
  suggestedTimeSec?: number | null;
  isCritical: boolean;
  feedback?: string | null;
  options: OptionRow[];
  trueFalseAnswer?: boolean | null;
  scaleConfig?: { min: number; max: number; minLabel?: string | null; maxLabel?: string | null } | null;
  rubric?: { criterios: RubricRow[] } | null;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

export function QuestionEditor({
  bankId,
  competencies,
  topics,
  initial,
}: {
  bankId: string;
  competencies: { id: string; code: string; name: string }[];
  topics: { id: string; code: string; name: string }[];
  initial?: QuestionInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const [type, setType] = useState<QuestionTypeKey>(initial?.type ?? "SINGLE_CHOICE");
  const [code, setCode] = useState(initial?.code ?? "");
  const [statement, setStatement] = useState(initial?.statement ?? "");
  const [contextText, setContextText] = useState(initial?.contextText ?? "");
  const [mediaUrl, setMediaUrl] = useState(initial?.mediaUrl ?? "");
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [partialScoring, setPartialScoring] = useState(initial?.partialScoring ?? false);
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "INTERMEDIATE");
  const [competencyId, setCompetencyId] = useState(initial?.competencyId ?? "");
  const [topicId, setTopicId] = useState(initial?.topicId ?? "");
  const [normReference, setNormReference] = useState(initial?.normReference ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [suggestedTimeSec, setSuggestedTimeSec] = useState<number | "">(initial?.suggestedTimeSec ?? "");
  const [isCritical, setIsCritical] = useState(initial?.isCritical ?? false);
  const [feedback, setFeedback] = useState(initial?.feedback ?? "");
  const [trueFalse, setTrueFalse] = useState<boolean>(initial?.trueFalseAnswer ?? true);

  const [options, setOptions] = useState<OptionRow[]>(
    initial?.options?.length
      ? initial.options
      : [
          { text: "", isCorrect: false, matchLeft: "", matchRight: "" },
          { text: "", isCorrect: false, matchLeft: "", matchRight: "" },
        ],
  );
  const [scale, setScale] = useState({
    min: initial?.scaleConfig?.min ?? 1,
    max: initial?.scaleConfig?.max ?? 5,
    minLabel: initial?.scaleConfig?.minLabel ?? "",
    maxLabel: initial?.scaleConfig?.maxLabel ?? "",
  });
  const [rubric, setRubric] = useState<RubricRow[]>(
    initial?.rubric?.criterios ?? [{ nombre: "", puntos: 1 }],
  );

  const meta = QUESTION_TYPES[type];

  function setOpt(i: number, patch: Partial<OptionRow>) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function addOpt() {
    setOptions((p) => [...p, { text: "", isCorrect: false, matchLeft: "", matchRight: "" }]);
  }
  function removeOpt(i: number) {
    setOptions((p) => (p.length > 2 ? p.filter((_, idx) => idx !== i) : p));
  }
  function moveOpt(i: number, dir: -1 | 1) {
    setOptions((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const copy = [...p];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  function selectSingleCorrect(i: number) {
    setOptions((p) => p.map((o, idx) => ({ ...o, isCorrect: idx === i })));
  }

  function submit() {
    setError(undefined);
    const input: QuestionInput = {
      bankId,
      code: code.trim(),
      type,
      statement: statement.trim(),
      contextText: meta.hasContext ? contextText.trim() || null : null,
      mediaUrl: meta.hasMedia ? mediaUrl.trim() || null : null,
      points: Number(points),
      partialScoring: type === "MULTIPLE_CHOICE" ? partialScoring : false,
      difficulty,
      competencyId: competencyId || null,
      topicId: topicId || null,
      normReference: normReference.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      suggestedTimeSec: suggestedTimeSec === "" ? null : Number(suggestedTimeSec),
      isCritical,
      feedback: feedback.trim() || null,
      options:
        meta.editor === "choice"
          ? options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i }))
          : meta.editor === "matching"
            ? options.map((o, i) => ({ text: o.matchLeft, matchLeft: o.matchLeft, matchRight: o.matchRight, order: i, isCorrect: false }))
            : meta.editor === "ordering"
              ? options.map((o, i) => ({ text: o.text, order: i, isCorrect: false }))
              : [],
      trueFalseAnswer: meta.editor === "trueFalse" ? trueFalse : null,
      scaleConfig: meta.editor === "scale" ? { ...scale, minLabel: scale.minLabel || null, maxLabel: scale.maxLabel || null } : null,
      rubric:
        meta.editor === "text" && rubric.some((r) => r.nombre.trim())
          ? { criterios: rubric.filter((r) => r.nombre.trim()).map((r) => ({ nombre: r.nombre, puntos: Number(r.puntos) })) }
          : null,
    };

    startTransition(async () => {
      const res = initial
        ? await updateQuestion(initial.id, input)
        : await createQuestion(input);
      if (res.ok) {
        router.push(`/panel/preguntas/${bankId}`);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo guardar la pregunta.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      {/* Tipo */}
      <div>
        <label className="block text-sm font-medium text-slate-700">Tipo de pregunta</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as QuestionTypeKey)}
          disabled={!!initial}
          className={`mt-1 ${inputCls}`}
        >
          {QUESTION_TYPE_LIST.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">{meta.description}{!meta.autoGraded ? " · Calificación manual." : ""}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Código *</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="Q-007" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Puntaje *</label>
          <input type="number" min={0} step="0.5" value={points} onChange={(e) => setPoints(Number(e.target.value))} className={`mt-1 ${inputCls}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Dificultad</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className={`mt-1 ${inputCls}`}>
            {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {meta.hasContext ? (
        <div>
          <label className="block text-sm font-medium text-slate-700">Texto del caso</label>
          <textarea value={contextText} onChange={(e) => setContextText(e.target.value)} rows={4} className={`mt-1 ${inputCls}`} placeholder="Describa el caso práctico…" />
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-medium text-slate-700">Enunciado *</label>
        <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={3} className={`mt-1 ${inputCls}`} placeholder="Escriba la pregunta…" />
      </div>

      {meta.hasMedia ? (
        <div>
          <label className="block text-sm font-medium text-slate-700">URL del insumo multimedia</label>
          <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="https://… (imagen, audio o video)" />
        </div>
      ) : null}

      {/* Editor por tipo */}
      {(meta.editor === "choice") && (
        <ChoiceEditor
          options={options}
          multi={meta.multiCorrect ?? false}
          onText={(i, v) => setOpt(i, { text: v })}
          onToggle={(i) => (meta.multiCorrect ? setOpt(i, { isCorrect: !options[i].isCorrect }) : selectSingleCorrect(i))}
          onAdd={addOpt}
          onRemove={removeOpt}
          partialScoring={partialScoring}
          setPartialScoring={meta.multiCorrect ? setPartialScoring : undefined}
        />
      )}

      {meta.editor === "trueFalse" && (
        <div>
          <label className="block text-sm font-medium text-slate-700">Respuesta correcta</label>
          <div className="mt-2 flex gap-3">
            {[true, false].map((v) => (
              <button key={String(v)} type="button" onClick={() => setTrueFalse(v)}
                className={`rounded-lg border px-4 py-2 text-sm ${trueFalse === v ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-300 text-slate-600"}`}>
                {v ? "Verdadero" : "Falso"}
              </button>
            ))}
          </div>
        </div>
      )}

      {meta.editor === "matching" && (
        <MatchingEditor options={options} onLeft={(i, v) => setOpt(i, { matchLeft: v })} onRight={(i, v) => setOpt(i, { matchRight: v })} onAdd={addOpt} onRemove={removeOpt} />
      )}

      {meta.editor === "ordering" && (
        <OrderingEditor options={options} onText={(i, v) => setOpt(i, { text: v })} onMove={moveOpt} onAdd={addOpt} onRemove={removeOpt} />
      )}

      {meta.editor === "scale" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-slate-700">Mínimo</label><input type="number" value={scale.min} onChange={(e) => setScale({ ...scale, min: Number(e.target.value) })} className={`mt-1 ${inputCls}`} /></div>
            <div><label className="block text-sm text-slate-700">Máximo</label><input type="number" value={scale.max} onChange={(e) => setScale({ ...scale, max: Number(e.target.value) })} className={`mt-1 ${inputCls}`} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-slate-700">Etiqueta mínima</label><input value={scale.minLabel} onChange={(e) => setScale({ ...scale, minLabel: e.target.value })} className={`mt-1 ${inputCls}`} placeholder="En desacuerdo" /></div>
            <div><label className="block text-sm text-slate-700">Etiqueta máxima</label><input value={scale.maxLabel} onChange={(e) => setScale({ ...scale, maxLabel: e.target.value })} className={`mt-1 ${inputCls}`} placeholder="De acuerdo" /></div>
          </div>
        </div>
      )}

      {meta.editor === "text" && (
        <RubricEditor rubric={rubric} setRubric={setRubric} />
      )}

      {meta.editor === "fileOnly" && (
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
          El candidato cargará un archivo como respuesta. La calificación es manual por un evaluador.
        </div>
      )}

      {/* Clasificación */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Competencia</label>
          <select value={competencyId} onChange={(e) => setCompetencyId(e.target.value)} className={`mt-1 ${inputCls}`}>
            <option value="">—</option>
            {competencies.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Tema</label>
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className={`mt-1 ${inputCls}`}>
            <option value="">—</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.code} · {t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Norma / referencia</label>
          <input value={normReference} onChange={(e) => setNormReference(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="ISO 19011" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Tiempo sugerido (seg)</label>
          <input type="number" min={0} value={suggestedTimeSec} onChange={(e) => setSuggestedTimeSec(e.target.value === "" ? "" : Number(e.target.value))} className={`mt-1 ${inputCls}`} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Etiquetas</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="auditoría, iso9001" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Retroalimentación / explicación</label>
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} className={`mt-1 ${inputCls}`} />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isCritical} onChange={(e) => setIsCritical(e.target.checked)} />
        Marcar como pregunta crítica
      </label>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={() => router.push(`/panel/preguntas/${bankId}`)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
        <button type="button" onClick={submit} disabled={pending} className="rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-60">
          {pending ? "Guardando…" : initial ? "Guardar cambios" : "Crear pregunta"}
        </button>
      </div>
    </div>
  );
}

function ChoiceEditor({
  options, multi, onText, onToggle, onAdd, onRemove, partialScoring, setPartialScoring,
}: {
  options: OptionRow[]; multi: boolean;
  onText: (i: number, v: string) => void; onToggle: (i: number) => void;
  onAdd: () => void; onRemove: (i: number) => void;
  partialScoring: boolean; setPartialScoring?: (v: boolean) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        Opciones {multi ? "(marque todas las correctas)" : "(marque la correcta)"}
      </label>
      <div className="mt-2 space-y-2">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type={multi ? "checkbox" : "radio"} checked={o.isCorrect} onChange={() => onToggle(i)} className="h-4 w-4" />
            <input value={o.text} onChange={(e) => onText(i, e.target.value)} className={inputCls} placeholder={`Opción ${i + 1}`} />
            <button type="button" onClick={() => onRemove(i)} className="rounded px-2 py-1 text-sm text-rose-600 hover:bg-rose-50">✕</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} className="mt-2 text-sm font-medium text-brand-700 hover:underline">+ Agregar opción</button>
      {setPartialScoring ? (
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={partialScoring} onChange={(e) => setPartialScoring(e.target.checked)} />
          Permitir calificación parcial (proporcional a aciertos)
        </label>
      ) : null}
    </div>
  );
}

function MatchingEditor({
  options, onLeft, onRight, onAdd, onRemove,
}: {
  options: OptionRow[];
  onLeft: (i: number, v: string) => void; onRight: (i: number, v: string) => void;
  onAdd: () => void; onRemove: (i: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">Parejas (columna A ↔ columna B)</label>
      <div className="mt-2 space-y-2">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={o.matchLeft} onChange={(e) => onLeft(i, e.target.value)} className={inputCls} placeholder="Concepto A" />
            <span className="text-slate-400">↔</span>
            <input value={o.matchRight} onChange={(e) => onRight(i, e.target.value)} className={inputCls} placeholder="Definición B" />
            <button type="button" onClick={() => onRemove(i)} className="rounded px-2 py-1 text-sm text-rose-600 hover:bg-rose-50">✕</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} className="mt-2 text-sm font-medium text-brand-700 hover:underline">+ Agregar pareja</button>
    </div>
  );
}

function OrderingEditor({
  options, onText, onMove, onAdd, onRemove,
}: {
  options: OptionRow[];
  onText: (i: number, v: string) => void; onMove: (i: number, dir: -1 | 1) => void;
  onAdd: () => void; onRemove: (i: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">Elementos en el orden correcto (de arriba hacia abajo)</label>
      <div className="mt-2 space-y-2">
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-center text-sm font-semibold text-slate-400">{i + 1}</span>
            <input value={o.text} onChange={(e) => onText(i, e.target.value)} className={inputCls} placeholder={`Elemento ${i + 1}`} />
            <button type="button" onClick={() => onMove(i, -1)} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">↑</button>
            <button type="button" onClick={() => onMove(i, 1)} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">↓</button>
            <button type="button" onClick={() => onRemove(i)} className="rounded px-2 py-1 text-sm text-rose-600 hover:bg-rose-50">✕</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} className="mt-2 text-sm font-medium text-brand-700 hover:underline">+ Agregar elemento</button>
    </div>
  );
}

function RubricEditor({ rubric, setRubric }: { rubric: RubricRow[]; setRubric: (r: RubricRow[]) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">Rúbrica de evaluación (opcional)</label>
      <div className="mt-2 space-y-2">
        {rubric.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={r.nombre} onChange={(e) => setRubric(rubric.map((x, idx) => idx === i ? { ...x, nombre: e.target.value } : x))} className={inputCls} placeholder="Criterio" />
            <input type="number" min={0} step="0.5" value={r.puntos} onChange={(e) => setRubric(rubric.map((x, idx) => idx === i ? { ...x, puntos: Number(e.target.value) } : x))} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Pts" />
            <button type="button" onClick={() => setRubric(rubric.length > 1 ? rubric.filter((_, idx) => idx !== i) : rubric)} className="rounded px-2 py-1 text-sm text-rose-600 hover:bg-rose-50">✕</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setRubric([...rubric, { nombre: "", puntos: 1 }])} className="mt-2 text-sm font-medium text-brand-700 hover:underline">+ Agregar criterio</button>
    </div>
  );
}
