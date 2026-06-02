"use client";

import { useActionState } from "react";
import { Field, Input, Select, FormError, SubmitButton } from "@/components/form";
import { DIFFICULTY_LABELS } from "@/lib/question-types";
import type { ActionResult } from "@/lib/actions/schemes";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

export function SectionForm({
  action,
  banks,
}: {
  action: Action;
  banks: { id: string; code: string; name: string }[];
}) {
  const [state, formAction] = useActionState(action, { ok: false } as ActionResult);

  return (
    <form action={formAction} className="space-y-3">
      <FormError error={state.error} />
      <Field label="Título de la sección" required><Input name="title" required placeholder="Conocimientos generales" /></Field>
      <Field label="Banco de preguntas" required>
        <Select name="bankId" required defaultValue="">
          <option value="" disabled>Seleccione…</option>
          {banks.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="N.º preguntas" required><Input name="questionCount" type="number" min={1} max={200} required defaultValue={5} /></Field>
        <Field label="Dificultad">
          <Select name="difficulty" defaultValue="">
            <option value="">Cualquiera</option>
            {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Puntos/preg" hint="Opcional"><Input name="pointsPerQuestion" type="number" min={0} step="0.5" placeholder="1" /></Field>
      </div>
      <div className="flex justify-end"><SubmitButton>Agregar sección</SubmitButton></div>
    </form>
  );
}
