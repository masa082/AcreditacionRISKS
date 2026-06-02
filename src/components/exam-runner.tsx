"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveAnswer, submitAttempt } from "@/lib/actions/attempt";

export interface RunnerQuestion {
  id: string; // attemptQuestionId
  sectionTitle: string | null;
  statement: string;
  contextText: string | null;
  options: { key: string; text: string }[];
  multiple: boolean;
  saved: { key?: string; keys?: string[] };
}

function fmt(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function ExamRunner({
  attemptId,
  dueAt,
  durationMin,
  questions,
}: {
  attemptId: string;
  dueAt: string; // ISO
  durationMin: number;
  questions: RunnerQuestion[];
}) {
  const dueMs = useMemo(() => new Date(dueAt).getTime(), [dueAt]);
  const [now, setNow] = useState<number>(() => Date.now());
  const [answers, setAnswers] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const q of questions) {
      init[q.id] = q.saved.keys ?? (q.saved.key ? [q.saved.key] : []);
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const submittedRef = useRef(false);

  const secondsLeft = Math.floor((dueMs - now) / 1000);

  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    startSubmit(async () => {
      await submitAttempt(attemptId);
    });
  }, [attemptId]);

  // Reloj
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-envío al expirar
  useEffect(() => {
    if (secondsLeft <= 0 && !submittedRef.current) doSubmit();
  }, [secondsLeft, doSubmit]);

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

  const answered = questions.filter((q) => (answers[q.id] ?? []).length > 0).length;
  const lowTime = secondsLeft <= 300;

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <div className="sticky top-0 z-10 -mx-6 mb-6 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="text-sm text-slate-600">
          Respondidas <strong>{answered}</strong> / {questions.length}
          <span className="ml-3 text-xs text-slate-400">{saving ? "Guardando…" : "Guardado ✓"}</span>
        </div>
        <div className={`rounded-lg px-3 py-1.5 font-mono text-sm font-semibold ${lowTime ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
          ⏱ {fmt(secondsLeft)}
        </div>
      </div>

      <ol className="space-y-5">
        {questions.map((q, i) => {
          const sel = answers[q.id] ?? [];
          return (
            <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
