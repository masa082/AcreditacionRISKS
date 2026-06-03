"use client";

import { useActionState } from "react";
import { Field, Select, Textarea, FormError, SubmitButton } from "@/components/form";
import { resolveAppeal } from "@/lib/actions/appeals";
import type { ActionResult } from "@/lib/actions/schemes";

export function AppealResolveForm({
  appealId,
  currentStatus,
  resolution,
}: {
  appealId: string;
  currentStatus: string;
  resolution: string | null;
}) {
  const action = resolveAppeal.bind(null, appealId);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
      <FormError error={state.error} />
      {state.ok ? <p className="text-xs text-emerald-700">Caso actualizado.</p> : null}
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <Field label="Estado" htmlFor={`st-${appealId}`} required>
          <Select id={`st-${appealId}`} name="status" required defaultValue={currentStatus === "OPEN" ? "IN_REVIEW" : currentStatus}>
            <option value="IN_REVIEW">En revisión</option>
            <option value="RESOLVED">Resuelto</option>
            <option value="REJECTED">No procedente</option>
          </Select>
        </Field>
        <Field label="Respuesta / resolución" htmlFor={`res-${appealId}`}>
          <Textarea id={`res-${appealId}`} name="resolution" rows={2} defaultValue={resolution ?? ""} placeholder="Obligatoria para resolver o rechazar." />
        </Field>
      </div>
      <SubmitButton>Actualizar caso</SubmitButton>
    </form>
  );
}
