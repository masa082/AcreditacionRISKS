"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  saveAnswer,
  saveTextAnswer,
  uploadAnswerFile,
  submitAttempt,
  recordAttemptEvent,
  swapAttemptQuestion,
} from "@/lib/actions/attempt";
import type { ActionResult } from "@/lib/actions/schemes";
import { ExamWatermark } from "@/components/exam-watermark";
import {
  HonestyGate,
  MonitoringBanner,
  AntifraudHooks,
  FocusGuard,
  useQuestionTimer,
} from "@/components/exam-antifraud";

export interface RunnerQuestion {
  id: string; // attemptQuestionId
  sectionTitle: string | null;
  statement: string;
  contextText: string | null;
  options: { key: string; text: string }[];
  multiple: boolean;
  manual: boolean;
  /// Rúbrica de calificación (criterios + puntos). Se muestra al
  /// candidato durante la presentación para que sepa cómo será
  /// evaluado. Para preguntas no manuales viene null.
  rubric: { criterios: { nombre: string; puntos: number; descripcion?: string }[] } | null;
  saved: { key?: string; keys?: string[]; text?: string; fileName?: string };
}

function fmt(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/// Mini-formulario inline para que el candidato reporte una novedad
/// durante la prueba (corte de luz, internet inestable, duda, etc.).
/// Cada envío registra un AttemptEvent type=`incident_report` con el
/// texto en `details` — queda visible para el comité evaluador y el
/// equipo del organismo en la traza del intento.
function IncidentReporter({ attemptId }: { attemptId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, startTx] = useTransition();
  // El botón vive dentro del header sticky con `backdrop-blur`. Cualquier
  // ancestro con backdrop-filter ancla los `position: fixed` descendientes a
  // ese contenedor (no al viewport), por eso el modal aparecía atrapado en
  // la barra y dejaba ver el contenido detrás sin oscurecer. Lo renderizamos
  // por createPortal directamente en <body> para que el modal sí cubra toda
  // la pantalla y quede por encima del resto de overlays del examen.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  function send() {
    const detail = text.trim();
    if (!detail) return;
    startTx(async () => {
      await recordAttemptEvent(attemptId, "incident_report", { details: detail.slice(0, 600) });
      setSent(true);
      setText("");
      setTimeout(() => { setSent(false); setOpen(false); }, 1800);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100"
        title="Reporte una novedad durante la prueba (corte de luz, internet, duda, etc.)"
      >
        🚩 Reportar novedad
      </button>
      {open && mounted
        ? createPortal(
            <div role="dialog" aria-modal className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="border-b border-slate-200 bg-amber-50 px-5 py-3">
                  <h2 className="text-sm font-bold text-amber-900">🚩 Reportar novedad</h2>
                  <p className="text-[11px] text-amber-800">Su reporte queda registrado con fecha y hora en el expediente del intento.</p>
                </div>
                <div className="p-5">
                  {sent ? (
                    <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
                      ✓ Novedad registrada. Puede continuar con la prueba.
                    </p>
                  ) : (
                    <>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Describa la novedad
                      </label>
                      <textarea
                        rows={4}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Ej. Se cortó el internet por 30 segundos. Tuve que recargar la página."
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
                        maxLength={600}
                      />
                      <p className="mt-1 text-[10px] text-slate-400">Máximo 600 caracteres.</p>
                    </>
                  )}
                </div>
                {!sent ? (
                  <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
                    <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={busy || text.trim().length === 0}
                      onClick={send}
                      className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800 disabled:opacity-50"
                    >
                      {busy ? "Enviando…" : "Enviar reporte"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/// Tarjeta de Rúbrica de calificación que se muestra al candidato
/// durante la presentación de una pregunta manual (caso práctico,
/// abierta, archivo). Lista los criterios con sus puntos y, si la
/// rúbrica los incluye, la descripción de qué se espera para cada
/// criterio. El candidato sabe de antemano cómo será evaluado.
function RubricCard({
  rubric,
}: {
  rubric: { criterios: { nombre: string; puntos: number; descripcion?: string }[] };
}) {
  const total = rubric.criterios.reduce((acc, c) => acc + (Number(c.puntos) || 0), 0);
  return (
    <details
      className="mt-3 rounded-lg border border-brand-200 bg-brand-50/40 p-3 open:bg-brand-50/60"
      open
    >
      <summary className="cursor-pointer select-none text-sm font-semibold text-brand-900">
        📋 Rúbrica de calificación · esta evaluación se calificará así
        {total > 0 ? <span className="ml-2 text-xs font-medium text-brand-700">({total} pts)</span> : null}
      </summary>
      <ul className="mt-3 space-y-2">
        {rubric.criterios.map((c, i) => (
          <li
            key={i}
            className="rounded-md border border-brand-100 bg-white px-3 py-2 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-slate-800">{c.nombre}</span>
              <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-800">
                {c.puntos} pts
              </span>
            </div>
            {c.descripcion ? (
              <p className="mt-1 text-xs text-slate-600">{c.descripcion}</p>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-brand-700">
        La calificación final se asigna sobre 100. El evaluador puede pedirle información
        adicional antes de cerrar la nota.
      </p>
    </details>
  );
}

function ManualAnswer({
  attemptId,
  q,
  onFilled,
}: {
  attemptId: string;
  q: RunnerQuestion;
  onFilled: (id: string, filled: boolean) => void;
}) {
  const uploadAction = uploadAnswerFile.bind(null, attemptId, q.id);
  const [upState, upFormAction] = useActionState<ActionResult, FormData>(uploadAction, { ok: false });
  const [fileName, setFileName] = useState(q.saved.fileName ?? "");
  const [savingText, setSavingText] = useState(false);

  useEffect(() => {
    if (upState.ok) onFilled(q.id, true);
  }, [upState.ok, q.id, onFilled]);

  return (
    <div className="mt-3 space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Respuesta</label>
        <textarea
          name={`text-${q.id}`}
          rows={6}
          defaultValue={q.saved.text ?? ""}
          placeholder="Escriba aquí su desarrollo…"
          onBlur={async (e) => {
            setSavingText(true);
            await saveTextAnswer(attemptId, q.id, e.target.value);
            setSavingText(false);
            onFilled(q.id, e.target.value.trim().length > 0 || !!fileName);
          }}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <p className="mt-1 text-xs text-slate-400">{savingText ? "Guardando…" : "Se guarda al salir del campo."}</p>
      </div>
      <form action={upFormAction} className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
        <label className="block text-sm font-medium text-slate-700">Adjuntar evidencia (PDF/imagen)</label>
        {upState.error ? <p className="text-xs text-rose-600">{upState.error}</p> : null}
        {fileName || q.saved.fileName ? (
          <p className="text-xs text-emerald-700">Archivo cargado: {fileName || q.saved.fileName}</p>
        ) : null}
        <input
          type="file"
          name="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-800 hover:file:bg-brand-100"
        />
        <button type="submit" className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800">
          Subir archivo
        </button>
      </form>
    </div>
  );
}

export function ExamRunner({
  attemptId,
  dueAt,
  questions: initialQuestions,
  candidateCode,
  consentAccepted,
  swapsAllowed,
  swapsUsedInitial,
}: {
  attemptId: string;
  dueAt: string; // ISO
  questions: RunnerQuestion[];
  /** Código identificador del candidato para marca de agua/auditoría. */
  candidateCode?: string;
  /** Si el server YA tiene firma de consentimiento, no abre el modal. */
  consentAccepted?: boolean;
  /** Tope de cambios permitidos (Exam.questionSwapsAllowed). */
  swapsAllowed?: number;
  /** Cambios ya usados al cargar la página. */
  swapsUsedInitial?: number;
}) {
  // El runner mantiene en estado las preguntas para poder reemplazar una
  // pregunta in-place sin recargar la página tras un swap server-side.
  const [questions, setQuestions] = useState<RunnerQuestion[]>(initialQuestions);
  const [swapsUsed, setSwapsUsed] = useState(swapsUsedInitial ?? 0);
  const swapsCap = swapsAllowed ?? 0;
  const swapsRemaining = Math.max(0, swapsCap - swapsUsed);
  const wmToken = candidateCode || attemptId.slice(-12).toUpperCase();
  // ID de la pregunta visible — para medir tiempo por pregunta.
  // El runner mostraba todas las preguntas en una sola página; calculamos
  // cuál es la "activa" según el primer item visible en el viewport.
  const [activeQid, setActiveQid] = useState<string | null>(questions[0]?.id ?? null);
  useQuestionTimer({ attemptId, currentQuestionId: activeQid });
  const dueMs = useMemo(() => new Date(dueAt).getTime(), [dueAt]);
  const [now, setNow] = useState<number>(() => Date.now());
  const [answers, setAnswers] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const q of initialQuestions) init[q.id] = q.saved.keys ?? (q.saved.key ? [q.saved.key] : []);
    return init;
  });
  const [manualFilled, setManualFilled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const q of initialQuestions) if (q.manual) init[q.id] = !!(q.saved.text?.trim() || q.saved.fileName);
    return init;
  });
  const [swapBusy, setSwapBusy] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  /// Pide al server que reemplace la pregunta por otra del mismo banco
  /// (excluyendo las ya servidas). Si responde con la nueva pregunta, la
  /// inserta en sitio en el estado local — no recarga la página.
  const swap = useCallback(async (attemptQuestionId: string) => {
    if (swapsRemaining <= 0) return;
    if (!window.confirm(`¿Cambiar esta pregunta por otra del banco? Le quedarán ${swapsRemaining - 1} cambios.`)) return;
    setSwapBusy(attemptQuestionId);
    setSwapError(null);
    try {
      const res = await swapAttemptQuestion(attemptId, attemptQuestionId);
      if (!res.ok || !res.newQuestion) {
        setSwapError(res.error ?? "No se pudo cambiar la pregunta.");
        return;
      }
      const newQ = res.newQuestion;
      setQuestions((qs) =>
        qs.map((q) =>
          q.id === attemptQuestionId
            ? {
                ...q,
                statement: newQ.statement,
                options: newQ.options,
                multiple: newQ.multiple,
                manual: newQ.manual,
                contextText: newQ.contextText,
                rubric: newQ.rubric ?? null,
                saved: {},
              }
            : q,
        ),
      );
      setAnswers((a) => ({ ...a, [attemptQuestionId]: [] }));
      setManualFilled((m) => ({ ...m, [attemptQuestionId]: false }));
      setSwapsUsed((n) => n + 1);
    } catch (e) {
      setSwapError(e instanceof Error ? e.message : "Error inesperado al cambiar la pregunta.");
    } finally {
      setSwapBusy(null);
    }
  }, [attemptId, swapsRemaining]);
  const [saving, setSaving] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const submittedRef = useRef(false);
  const [incidents, setIncidents] = useState(0);

  const secondsLeft = Math.floor((dueMs - now) / 1000);

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    startSubmit(async () => {
      await submitAttempt(attemptId);
    });
  }, [attemptId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Las salidas de pantalla ahora las maneja <FocusGuard/> con UI
  // bloqueante y umbral de abandono — ver más abajo en el render.

  useEffect(() => {
    if (secondsLeft <= 0 && !submittedRef.current) doSubmit();
  }, [secondsLeft, doSubmit]);

  // ── Detección de pregunta visible para el tracker de tiempo ────────
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const items = document.querySelectorAll<HTMLElement>("[data-qid]");
    if (items.length === 0) return;
    const visibility = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.qid;
          if (!id) continue;
          visibility.set(id, e.intersectionRatio);
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const [id, r] of visibility) {
          if (r > bestRatio) { bestRatio = r; bestId = id; }
        }
        if (bestId && bestId !== activeQid) setActiveQid(bestId);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    items.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [questions, activeQid]);

  const persist = useCallback(
    async (aqId: string, keys: string[], multiple: boolean) => {
      setSaving(true);
      try {
        await saveAnswer(attemptId, aqId, multiple ? { keys } : { key: keys[0] ?? "" });
      } finally {
        setSaving(false);
      }
    },
    [attemptId],
  );

  function selectSingle(q: RunnerQuestion, key: string) {
    setAnswers((a) => ({ ...a, [q.id]: [key] }));
    void persist(q.id, [key], false);
  }
  function toggleMulti(q: RunnerQuestion, key: string) {
    setAnswers((a) => {
      const cur = new Set(a[q.id] ?? []);
      if (cur.has(key)) cur.delete(key);
      else cur.add(key);
      const next = [...cur];
      void persist(q.id, next, true);
      return { ...a, [q.id]: next };
    });
  }
  const onFilled = useCallback((id: string, filled: boolean) => {
    setManualFilled((m) => ({ ...m, [id]: filled }));
  }, []);

  const answered = questions.filter((q) =>
    q.manual ? manualFilled[q.id] : (answers[q.id] ?? []).length > 0,
  ).length;
  const lowTime = secondsLeft <= 300;

  return (
    <div className="relative mx-auto max-w-3xl pb-24">
      <ExamWatermark token={wmToken} />
      <HonestyGate attemptId={attemptId} candidateCode={wmToken} alreadyAccepted={consentAccepted} />
      <AntifraudHooks
        attemptId={attemptId}
        onIncident={() => {
          // Sumamos al contador visible para que el candidato sepa que
          // el incidente quedó registrado.
          setIncidents((n) => n + 1);
        }}
      />
      {/*
        Guardia de foco: oculta INMEDIATAMENTE el examen al cambiar de
        pestaña / abrir otra app + cuenta cada salida + cierra el intento
        como `forced_abandon` al llegar a 12.
      */}
      <FocusGuard
        attemptId={attemptId}
        maxIncidents={12}
        onAbandon={() => {
          // Auto-submit del intento. El backend marcará el ExamAttempt
          // como SUBMITTED y la traza incluirá `forced_abandon`.
          doSubmit();
        }}
      />
      <MonitoringBanner candidateCode={wmToken} />
      <div className="sticky top-0 z-10 -mx-6 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="text-sm text-slate-600">
          Respondidas <strong>{answered}</strong> / {questions.length}
          <span className="ml-3 text-xs text-slate-400">{saving ? "Guardando…" : "Guardado ✓"}</span>
          {incidents > 0 ? (
            <span className="ml-3 text-xs font-medium text-amber-600" title="Se registró que salió de la pantalla del examen">
              ⚠ Salidas de pantalla: {incidents}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {swapsCap > 0 ? (
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                swapsRemaining === 0
                  ? "bg-slate-100 text-slate-500 ring-slate-200"
                  : "bg-brand-50 text-brand-800 ring-brand-200"
              }`}
              title="Cambios de pregunta restantes"
            >
              🔄 Cambios: {swapsRemaining} / {swapsCap}
            </span>
          ) : null}
          <IncidentReporter attemptId={attemptId} />
          <div className={`rounded-lg px-3 py-1.5 font-mono text-sm font-semibold ${lowTime ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
            ⏱ {fmt(secondsLeft)}
          </div>
        </div>
      </div>

      {swapError ? (
        <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
          {swapError}
        </div>
      ) : null}

      <ol className="space-y-5">
        {questions.map((q, i) => {
          const sel = answers[q.id] ?? [];
          return (
            <li key={q.id} data-qid={q.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {q.sectionTitle ? (
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-700">{q.sectionTitle}</div>
                  ) : null}
                  {q.contextText ? (
                    <p className="mb-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{q.contextText}</p>
                  ) : null}
                  <p className="font-medium text-slate-900">
                    <span className="mr-2 text-slate-400">{i + 1}.</span>
                    {q.statement}
                  </p>
                </div>
                {swapsCap > 0 ? (
                  <button
                    type="button"
                    onClick={() => swap(q.id)}
                    disabled={swapsRemaining <= 0 || swapBusy !== null}
                    title={swapsRemaining > 0 ? `Cambiar esta pregunta por otra del banco (le quedan ${swapsRemaining})` : "Sin cambios disponibles"}
                    className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {swapBusy === q.id ? "Cambiando…" : `🔄 Cambiar (${swapsRemaining})`}
                  </button>
                ) : null}
              </div>

              {q.manual && q.rubric && q.rubric.criterios.length > 0 ? (
                <RubricCard rubric={q.rubric} />
              ) : null}

              {q.manual ? (
                <ManualAnswer attemptId={attemptId} q={q} onFilled={onFilled} />
              ) : (
                <div className="mt-3 space-y-2">
                  {q.options.map((o) => {
                    const checked = sel.includes(o.key);
                    return (
                      <label
                        key={o.key}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                          checked ? "border-brand-400 bg-brand-50 text-brand-900" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type={q.multiple ? "checkbox" : "radio"}
                          name={q.id}
                          checked={checked}
                          onChange={() => (q.multiple ? toggleMulti(q, o.key) : selectSingle(q, o.key))}
                          className="h-4 w-4"
                        />
                        <span>{o.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-sm text-slate-500">{answered} de {questions.length} respondidas</span>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (window.confirm(`¿Enviar el examen? Respondió ${answered} de ${questions.length} preguntas. Esta acción no se puede deshacer.`)) {
                doSubmit();
              }
            }}
            className="rounded-lg btn-grad-navy px-6 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            {submitting ? "Enviando…" : "Finalizar y enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
