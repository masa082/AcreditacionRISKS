"use client";

import { useActionState, useState } from "react";
import { attachPaymentReceiptByAdmin } from "@/lib/actions/payments";
import type { ActionResult } from "@/lib/actions/schemes";

/// Permite al SUSCRIPTOR cargar el SOPORTE de pago de un Payment cuando el
/// candidato realizó la transferencia/consignación directa y el organismo
/// recibió el dinero en banco sin que el candidato subiera el comprobante
/// por el portal. Con un checkbox puede aprobar el pago en el mismo paso.
export function PaymentAdminReceipt({
  paymentId,
  defaultProviderRef,
  status,
}: {
  paymentId: string;
  defaultProviderRef: string | null;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const bound = attachPaymentReceiptByAdmin.bind(null, paymentId);
  const [state, action, pending] = useActionState<ActionResult, FormData>(bound, { ok: false });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-violet-300 px-2 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-50"
      >
        📎 Cargar soporte
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-3">
      <p className="text-[11px] font-semibold text-violet-900">
        Cargar soporte de pago (organismo)
      </p>
      <p className="text-[10px] text-violet-800">
        Use esta opción cuando el candidato consignó directamente al banco y no subió el
        comprobante. El soporte queda asociado al pago y queda en el historial de auditoría.
      </p>
      <label className="block text-[11px]">
        <span className="font-semibold text-slate-700">Comprobante (PDF/JPG/PNG) *</span>
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          className="mt-1 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-violet-100 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-violet-800 hover:file:bg-violet-200"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-[11px]">
          <span className="font-semibold text-slate-700">Ref. / N.º transacción</span>
          <input
            type="text"
            name="providerRef"
            defaultValue={defaultProviderRef ?? ""}
            placeholder="Ej. 1234567890"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
        </label>
        <label className="block text-[11px]">
          <span className="font-semibold text-slate-700">Nota interna</span>
          <input
            type="text"
            name="note"
            placeholder="Ej. consignación verificada en Bancolombia"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
          />
        </label>
      </div>
      {status === "PENDING" ? (
        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-2 py-1.5 text-[11px]">
          <input
            type="checkbox"
            name="andApprove"
            defaultChecked
            className="mt-0.5 h-3.5 w-3.5 accent-emerald-700"
          />
          <span className="text-emerald-900">
            <strong>Aprobar el pago al guardar</strong> — marca el Payment como APPROVED y libera al candidato.
          </span>
        </label>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-violet-700 px-3 py-1 text-[11px] font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
        >
          {pending ? "Cargando…" : "Cargar soporte"}
        </button>
      </div>
      {state.error ? <p className="rounded bg-rose-50 px-2 py-1 text-[10px] text-rose-700 ring-1 ring-rose-200">{state.error}</p> : null}
      {state.ok ? <p className="rounded bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700 ring-1 ring-emerald-200">{state.message ?? "Soporte cargado."}</p> : null}
    </form>
  );
}
