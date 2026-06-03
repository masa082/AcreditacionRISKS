"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Textarea, FormError } from "@/components/form";
import { reviewDocument } from "@/lib/actions/documents";
import type { ActionResult } from "@/lib/actions/schemes";

function DecisionButton({ decision, label, className }: { decision: string; label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="decision" value={decision} disabled={pending} className={className}>
      {label}
    </button>
  );
}

export function DocumentReview({ documentId }: { documentId: string }) {
  const action = reviewDocument.bind(null, documentId);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <FormError error={state.error} />
      <Textarea name="notes" rows={2} placeholder="Observaciones (obligatorias para rechazar)" />
      <div className="flex gap-2">
        <DecisionButton
          decision="APPROVED"
          label="Aprobar"
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        />
        <DecisionButton
          decision="REJECTED"
          label="Rechazar"
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
        />
      </div>
    </form>
  );
}
