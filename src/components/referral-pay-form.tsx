"use client";

import { useActionState, useState } from "react";
import { markReferralPaid } from "@/lib/actions/referrals";
import type { ActionResult } from "@/lib/actions/schemes";

export function ReferralPayForm({ referralId }: { referralId: string }) {
  const [open, setOpen] = useState(false);
  const bound = markReferralPaid.bind(null, referralId);
  const [state, action, pending] = useActionState<ActionResult, FormData>(bound, { ok: false });
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
      >
        Marcar como pagado
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
      <label className="block text-xs">
        <span className="font-semibold text-slate-700">Notas / referencia de pago</span>
        <input
          name="notes"
          maxLength={1000}
          placeholder="Ej. Transferencia Bancolombia 1234 · 03/06/2026"
          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
          {pending ? "Guardando…" : "Confirmar pago"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
      </div>
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-emerald-700">{state.message ?? "Actualizado."}</p> : null}
    </form>
  );
}
