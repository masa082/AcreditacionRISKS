"use client";

import { useActionState } from "react";
import { Field, Input, Select, FormError, SubmitButton } from "@/components/form";
import { createCompetency, createTopic } from "@/lib/actions/banks";
import type { ActionResult } from "@/lib/actions/schemes";

export function CompetencyForm() {
  const [state, action] = useActionState<ActionResult, FormData>(createCompetency, { ok: false });
  return (
    <form action={action} className="space-y-3">
      <FormError error={state.error} />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Código" required><Input name="code" required placeholder="C3" /></Field>
        <div className="col-span-2">
          <Field label="Nombre" required><Input name="name" required placeholder="Informe de auditoría" /></Field>
        </div>
      </div>
      <div className="flex justify-end"><SubmitButton>Agregar competencia</SubmitButton></div>
    </form>
  );
}

export function TopicForm({ competencies }: { competencies: { id: string; code: string; name: string }[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(createTopic, { ok: false });
  return (
    <form action={action} className="space-y-3">
      <FormError error={state.error} />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Código" required><Input name="code" required placeholder="T3" /></Field>
        <div className="col-span-2">
          <Field label="Nombre" required><Input name="name" required placeholder="Estructura del informe" /></Field>
        </div>
      </div>
      <Field label="Competencia (opcional)">
        <Select name="competencyId" defaultValue="">
          <option value="">—</option>
          {competencies.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
        </Select>
      </Field>
      <div className="flex justify-end"><SubmitButton>Agregar tema</SubmitButton></div>
    </form>
  );
}
