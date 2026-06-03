"use client";

import { useActionState, useState } from "react";
import { Input, FormError, SubmitButton } from "@/components/form";
import { revokeCertificate } from "@/lib/actions/certificates";
import type { ActionResult } from "@/lib/actions/schemes";

export function RevokeForm({ certificateId }: { certificateId: string }) {
  const action = revokeCertificate.bind(null, certificateId);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-rose-600 hover:underline">
        Anular
      </button>
    );
  }
  return (
    <form action={formAction} className="flex items-center gap-2">
      <FormError error={state.error} />
      <Input name="reason" required placeholder="Motivo de la anulación" className="w-56 text-xs" />
      <SubmitButton pendingText="…">Confirmar</SubmitButton>
    </form>
  );
}
