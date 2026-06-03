"use client";

import { useActionState } from "react";
import { Field, Input, FormError, SubmitButton } from "@/components/form";
import { changeOwnPassword } from "@/lib/actions/account";
import type { ActionResult } from "@/lib/actions/schemes";

export function ChangePasswordForm() {
  const [state, action] = useActionState<ActionResult, FormData>(changeOwnPassword, { ok: false });

  return (
    <form action={action} className="space-y-4">
      <FormError error={state.error} />
      {state.ok ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Contraseña actualizada.</p> : null}
      <Field label="Contraseña actual" htmlFor="current" required>
        <Input id="current" name="current" type="password" required autoComplete="current-password" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nueva contraseña" htmlFor="password" required hint="Mínimo 8 caracteres.">
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label="Confirmar" htmlFor="confirm" required>
          <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Actualizar contraseña</SubmitButton>
      </div>
    </form>
  );
}
