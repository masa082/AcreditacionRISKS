"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveAnswer, saveTextAnswer, uploadAnswerFile, submitAttempt, recordAttemptEvent } from "@/lib/actions/attempt";
import type { ActionResult } from "@/lib/actions/schemes";
import { ExamWatermark } from "@/components/exam-watermark";
import {
  HonestyGate,
  MonitoringBanner,
  AntifraudHooks,
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
  saved: { key?: string; keys?: string[]; text?: string; fileName?: string };
}

function fmt(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
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
  questions,
  candidateCode,
}: {
  attemptId: string;
  dueAt: string; // ISO
  questions: RunnerQuestion[];
  /** Código identificador del candidato para marca de agua/auditoría. */
  candidateCode?: string;
}) {
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
    for (const q of questions) init[q.id] = q.saved.keys ?? (q.saved.key ? [q.saved.key] : []);
    return init;
  });
  const [manualFilled, setManualFilled] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const q of questions) if (q.manual) init[q.id] = !!(q.saved.text?.trim() || q.saved.fileName);
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const submittedRef = useRef(false);
  const [incidents, setIncidents] = useState(0);
  const lastIncidentRef = useRef(0);

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

  // Antifraude básico: registra salidas de la pantalla del examen.
  useEffect(() => {
    function flag() {
      if (submittedRef.current) return;
      const ts = Date.now();
      if (ts - lastIncidentRef.current < 1500) return; // evita doble disparo
      lastIncidentRef.current = ts;
      setIncidents((n) => n + 1);
      void recordAttemptEvent(attemptId, "focus_lost");
    }
    function onVis() {
      if (document.hidden) flag();
    }
    window.addEventListener("blur", flag);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", flag);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [attemptId]);

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
      <HonestyGate attemptId={attemptId} candidateCode={wmToken} />
      <AntifraudHooks
        attemptId={attemptId}
        onIncident={() => {
          // Sumamos al contador visible para que el candidato sepa que
          // el incidente quedó registrado.
          setIncidents((n) => n + 1);
        }}
      />
      <MonitoringBanner candidateCode={wmToken} />
      <div className="sticky top-0 z-10 -mx-6 mb-6 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="text-sm text-slate-600">
          Respondidas <strong>{answered}</strong> / {questions.length}
          <span className="ml-3 text-xs text-slate-400">{saving ? "Guardando…" : "Guardado ✓"}</span>
          {incidents > 0 ? (
            <span className="ml-3 text-xs font-medium text-amber-600" title="Se registró que salió de la pantalla del examen">
              ⚠ Salidas de pantalla: {incidents}
            </span>
          ) : null}
        </div>
        <div className={`rounded-lg px-3 py-1.5 font-mono text-sm font-semibold ${lowTime ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
          ⏱ {fmt(secondsLeft)}
        </div>
      </div>

      <ol className="space-y-5">
        {questions.map((q, i) => {
          const sel = answers[q.id] ?? [];
          return (
            <li key={q.id} data-qid={q.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
            className="rounded-lg bg-brand-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:opacity-60"
          >
            {submitting ? "Enviando…" : "Finalizar y enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
