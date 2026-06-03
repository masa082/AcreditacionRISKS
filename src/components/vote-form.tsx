"use client";

import { useActionState } from "react";
import { Field, Select, Textarea, FormError, SubmitButton } from "@/components/form";
import { castVote } from "@/lib/actions/committee";
import type { ActionResult } from "@/lib/actions/schemes";

export function VoteForm({
  reviewId,
  initial,
}: {
  reviewId: string;
  initial?: { decision?: string; conflict?: boolean; comment?: string | null };
}) {
  const action = castVote.bind(null, reviewId);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });

  return (
    <form action={formAction} className="space-y-4">
      <FormError error={state.error} />
      {state.ok ? <p className="text-sm text-emerald-700">Su voto quedó registrado.</p> : null}
      <Field label="Sentido del voto" htmlFor="decision" required>
        <Select id="decision" name="decision" required defaultValue={initial?.decision ?? "APPROVED"}>
          <option value="APPROVED">Aprobar certificación</option>
          <option value="REJECTED">Rechazar certificación</option>
          <option value="REREVIEW">Solicitar nueva revisión</option>
        </Select>
      </Field>
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" name="conflictOfInterest" defaultChecked={initial?.conflict} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
        <span>Declaro <strong>conflicto de interés</strong> en este caso (mi voto no se contabiliza).</span>
      </label>
      <Field label="Observaciones / sustento" htmlFor="comment">
        <Textarea id="comment" name="comment" rows={3} defaultValue={initial?.comment ?? ""} />
      </Field>
      <SubmitButton>Registrar voto</SubmitButton>
    </form>
  );
}
