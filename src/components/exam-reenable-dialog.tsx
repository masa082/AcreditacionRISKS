"use client";

import { useActionState, useState } from "react";
import { reenabledExam } from "@/lib/actions/exams";
import type { ActionResult } from "@/lib/actions/schemes";

export function ExamReenableDialog({
  examId,
  examName,
  open,
  onClose,
}: {
  examId: string;
  examName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    async (formData) => {
      const result = await reenabledExam(examId, reason);
      if (result.ok) {
        setReason("");
        onClose();
      }
      return result;
    },
    { ok: false }
  );

  if (!open) return null;

  const reasonLength = reason.length;
  const isValid = reasonLength >= 10 && reasonLength <= 500;

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-amber-50 px-6 py-4">
          <h2 className="text-lg font-bold text-amber-900">Habilitar de nuevo</h2>
          <p className="mt-1 text-sm text-amber-800">
            {examName}
          </p>
        </div>

        <form action={action} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Motivo de habilitación *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Se corrigieron los errores identificados en el caso práctico. Se validó con el comité evaluador."
              maxLength={500}
              rows={4}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Mínimo 10 caracteres, máximo 500</span>
              <span className={reasonLength < 10 ? "text-rose-600 font-semibold" : "text-slate-500"}>
                {reasonLength}/500
              </span>
            </div>
            {state.error ? (
              <p className="mt-2 text-sm text-rose-600">{state.error}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid || pending}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {pending ? "Habilitando…" : "✓ Habilitar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
