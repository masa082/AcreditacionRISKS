"use client";

import { useActionState } from "react";
import { Field, Input, Textarea, Select, FormError, SubmitButton } from "@/components/form";
import { createBank } from "@/lib/actions/banks";
import type { ActionResult } from "@/lib/actions/schemes";

export function BankForm({
  schemes,
}: {
  schemes: { id: string; code: string; name: string }[];
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(createBank, { ok: false });

  return (
    <form action={formAction} className="space-y-5">
      <FormError error={state.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Código" htmlFor="code" required>
          <Input id="code" name="code" required placeholder="BANK-AUD-02" />
        </Field>
        <Field label="Versión" htmlFor="version">
          <Input id="version" name="version" defaultValue="v1" />
        </Field>
      </div>
      <Field label="Nombre" htmlFor="name" required>
        <Input id="name" name="name" required placeholder="Banco Auditor Interno ISO 9001 v2" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Esquema asociado" htmlFor="schemeId">
          <Select id="schemeId" name="schemeId" defaultValue="">
            <option value="">— Sin esquema —</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Norma / referencia" htmlFor="normReference">
          <Input id="normReference" name="normReference" placeholder="ISO 19011" />
        </Field>
      </div>
      <Field label="Descripción" htmlFor="description">
        <Textarea id="description" name="description" rows={3} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>Crear banco</SubmitButton>
      </div>
    </form>
  );
}
