"use client";

import { useActionState } from "react";
import { updateLead } from "@/lib/actions/leads";
import { LEAD_STATUS_LABELS } from "@/lib/leads";
import type { ActionResult } from "@/lib/actions/schemes";

export function LeadUpdateForm({
  leadId,
  currentStatus,
  currentNotes,
}: {
  leadId: string;
  currentStatus: string;
  currentNotes: string | null;
}) {
  const bound = updateLead.bind(null, leadId);
  const [state, action, pending] = useActionState<ActionResult, FormData>(bound, { ok: false });

  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
      <select
        name="status"
        defaultValue={currentStatus}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      >
        {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <input
        name="notes"
        defaultValue={currentNotes ?? ""}
        placeholder="Notas internas (opcional)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
      <button type="submit" disabled={pending} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-60">
        {pending ? "Guardando…" : "Actualizar"}
      </button>
      {state.error ? <p className="sm:col-span-3 text-xs text-rose-600">{state.error}</p> : null}
      {state.ok ? <p className="sm:col-span-3 text-xs text-emerald-700">{state.message ?? "Lead actualizado."}</p> : null}
    </form>
  );
}
