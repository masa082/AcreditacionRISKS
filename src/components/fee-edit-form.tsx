"use client";

import { useActionState } from "react";
import { updateFee, updateFeeBySubscriber, deleteFee } from "@/lib/actions/fees";
import type { ActionResult } from "@/lib/actions/schemes";

export function FeeEditForm({
  feeId,
  currentAmount,
  currentCurrency,
  currentLabel,
  isActive,
  scope = "platform",
  allowDelete = false,
}: {
  feeId: string;
  currentAmount: string;
  currentCurrency: string;
  currentLabel: string;
  isActive: boolean;
  scope?: "platform" | "subscriber";
  allowDelete?: boolean;
}) {
  const fn = scope === "platform" ? updateFee : updateFeeBySubscriber;
  const bound = fn.bind(null, feeId);
  const [state, action, pending] = useActionState<ActionResult, FormData>(bound, { ok: false });

  async function onDelete() {
    if (!confirm("¿Eliminar esta tarifa? Esta acción no se puede deshacer.")) return;
    await deleteFee(feeId);
  }

  return (
    <form action={action} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_90px_120px_auto]">
      <input
        name="label"
        defaultValue={currentLabel}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        placeholder="Etiqueta visible"
      />
      <input
        name="amount"
        type="number"
        min={0}
        step="0.01"
        defaultValue={Number(currentAmount).toString()}
        className="rounded-lg border border-slate-300 px-3 py-2 text-right font-mono text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
      <input
        name="currency"
        defaultValue={currentCurrency}
        className="rounded-lg border border-slate-300 px-3 py-2 text-center text-sm uppercase outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
      <label className="flex items-center gap-2 px-2 text-xs text-slate-600">
        <input type="checkbox" name="isActive" defaultChecked={isActive} />
        Activa
      </label>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg btn-grad-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        {allowDelete && scope === "platform" ? (
          <button type="button" onClick={onDelete} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">
            Eliminar
          </button>
        ) : null}
      </div>
      {state.error ? <p className="sm:col-span-5 text-xs text-rose-600">{state.error}</p> : null}
      {state.ok ? <p className="sm:col-span-5 text-xs text-emerald-700">{state.message ?? "Tarifa actualizada."}</p> : null}
    </form>
  );
}
