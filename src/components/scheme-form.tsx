"use client";

import { useActionState } from "react";
import { Field, Input, Textarea, FormError, SubmitButton } from "@/components/form";
import type { ActionResult } from "@/lib/actions/schemes";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

interface Initial {
  code?: string;
  name?: string;
  description?: string | null;
  scope?: string | null;
  normReference?: string | null;
  validityMonths?: number;
}

export function SchemeForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: Initial;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, { ok: false });

  return (
    <form action={formAction} className="space-y-5">
      <FormError error={state.error} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Código" htmlFor="code" required hint="Identificador único del esquema.">
          <Input id="code" name="code" required defaultValue={initial?.code} placeholder="ESQ-AUD-17024" />
        </Field>
        <Field label="Vigencia (meses)" htmlFor="validityMonths" required hint="Duración del certificado emitido.">
          <Input id="validityMonths" name="validityMonths" type="number" min={0} max={600} required defaultValue={initial?.validityMonths ?? 36} />
        </Field>
      </div>
      <Field label="Nombre" htmlFor="name" required>
        <Input id="name" name="name" required defaultValue={initial?.name} placeholder="Auditor Interno ISO 9001" />
      </Field>
      <Field label="Norma o referencia" htmlFor="normReference">
        <Input id="normReference" name="normReference" defaultValue={initial?.normReference ?? ""} placeholder="ISO/IEC 17024; ISO 19011" />
      </Field>
      <Field label="Descripción" htmlFor="description">
        <Textarea id="description" name="description" rows={3} defaultValue={initial?.description ?? ""} />
      </Field>
      <Field label="Alcance de la certificación" htmlFor="scope" hint="Qué competencias/actividades cubre la certificación.">
        <Textarea id="scope" name="scope" rows={3} defaultValue={initial?.scope ?? ""} />
      </Field>
      <div className="flex justify-end gap-2">
        <SubmitButton>{submitLabel ?? "Guardar esquema"}</SubmitButton>
      </div>
    </form>
  );
}
