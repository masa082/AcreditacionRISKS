"use client";

import { useActionState, useState } from "react";
import { enablePracticalCase } from "@/lib/actions/enrollment";
import type { ActionResult } from "@/lib/actions/schemes";

export function PracticalCaseEnableDialog({
  enrollmentId,
  candidateName,
  examName,
  open,
  onClose,
}: {
  enrollmentId: string;
  candidateName: string;
  examName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    async (formData) => {
      const result = await enablePracticalCase(enrollmentId, reason, sendEmail);
      if (result.ok) {
        setReason("");
        setSendEmail(true);
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
        <div className="border-b border-slate-200 bg-green-50 px-6 py-4">
          <h2 className="text-lg font-bold text-green-900">Habilitar caso práctico</h2>
          <p className="mt-1 text-sm text-green-800">
            {candidateName} · {examName}
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
              placeholder="Ej. Se corrigieron los errores técnicos que impedían la presentación."
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

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={pending}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-2 focus:ring-green-500"
              />
              <div>
                <span className="block text-sm font-medium text-slate-700">Enviar notificación por correo</span>
                <span className="block text-xs text-slate-500 mt-0.5">El candidato recibirá un correo informando que su caso práctico ha sido habilitado</span>
              </div>
            </label>
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
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {pending ? "Habilitando…" : "✓ Habilitar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
