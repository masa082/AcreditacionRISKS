"use client";

import { useActionState } from "react";
import { Field, Select, Textarea, FormError, SubmitButton } from "@/components/form";
import { closeReview } from "@/lib/actions/committee";
import type { ActionResult } from "@/lib/actions/schemes";

export function CloseReviewForm({ reviewId }: { reviewId: string }) {
  const action = closeReview.bind(null, reviewId);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });

  return (
    <form action={formAction} className="space-y-4">
      <FormError error={state.error} />
      <Field label="Decisión final del comité" htmlFor="cdecision" required>
        <Select id="cdecision" name="decision" required defaultValue="APPROVED">
          <option value="APPROVED">Aprobar certificación</option>
          <option value="REJECTED">Rechazar certificación</option>
        </Select>
      </Field>
      <Field label="Observaciones del acta" htmlFor="observations">
        <Textarea id="observations" name="observations" rows={3} placeholder="Conclusiones de la sesión del comité…" />
      </Field>
      <SubmitButton pendingText="Cerrando…">Cerrar acta y aplicar decisión</SubmitButton>
    </form>
  );
}
