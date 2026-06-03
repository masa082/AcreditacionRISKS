"use client";

import { useActionState, useState } from "react";
import { approvePaymentManually, rejectPayment } from "@/lib/actions/payments";
import type { ActionResult } from "@/lib/actions/schemes";

export function PaymentApproveForm({
  paymentId,
  defaultRef,
}: {
  paymentId: string;
  defaultRef: string | null;
}) {
  const bound = approvePaymentManually.bind(null, paymentId);
  const [state, action, pending] = useActionState<ActionResult, FormData>(bound, { ok: false });
  return (
    <form action={action} className="mt-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="font-semibold text-slate-700">Referencia / N.º comprobante</span>
          <input
            name="providerRef"
            defaultValue={defaultRef ?? ""}
            placeholder="Ej. 1234567890 (banco/cuenta/transferencia)"
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-slate-700">Notas (opcional)</span>
          <input
            name="notes"
            placeholder="Comentario interno"
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Aprobando…" : "✓ Aprobar pago"}
      </button>
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-emerald-700">{state.message ?? "Pago aprobado."}</p> : null}
    </form>
  );
}

export function PaymentRejectForm({ paymentId }: { paymentId: string }) {
  const [open, setOpen] = useState(false);
  const bound = rejectPayment.bind(null, paymentId);
  const [state, action, pending] = useActionState<ActionResult, FormData>(bound, { ok: false });
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
      >
        Rechazar pago
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 space-y-2 rounded-lg border border-rose-200 bg-rose-50/40 p-3">
      <label className="block text-xs">
        <span className="font-semibold text-slate-700">Motivo del rechazo *</span>
        <textarea
          name="reason"
          required
          rows={2}
          minLength={5}
          maxLength={500}
          placeholder="Ej. No se identifica la transferencia / monto incorrecto / cuenta diferente."
          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
        />
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
          {pending ? "Procesando…" : "Confirmar rechazo"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">
          Cancelar
        </button>
      </div>
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-emerald-700">{state.message ?? "Pago rechazado."}</p> : null}
    </form>
  );
}
