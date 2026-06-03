"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea, FormError, SubmitButton } from "@/components/form";
import { createAppeal } from "@/lib/actions/appeals";
import type { ActionResult } from "@/lib/actions/schemes";

export function AppealForm({ enrollments }: { enrollments: { id: string; label: string }[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(createAppeal, { ok: false });

  return (
    <form action={action} className="space-y-4">
      <FormError error={state.error} />
      {state.ok ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Su caso fue registrado. Le notificaremos la respuesta.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="type" required>
          <Select id="type" name="type" required defaultValue="REQUEST">
            <option value="APPEAL">Apelación</option>
            <option value="COMPLAINT">Queja</option>
            <option value="REQUEST">Solicitud</option>
            <option value="CORRECTION">Corrección</option>
          </Select>
        </Field>
        {enrollments.length > 0 ? (
          <Field label="Relacionado con (opcional)" htmlFor="enrollmentId">
            <Select id="enrollmentId" name="enrollmentId" defaultValue="">
              <option value="">— Ninguno —</option>
              {enrollments.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>
      <Field label="Asunto" htmlFor="subject" required>
        <Input id="subject" name="subject" required placeholder="Resumen breve de su caso" />
      </Field>
      <Field label="Descripción" htmlFor="body" required>
        <Textarea id="body" name="body" rows={4} required placeholder="Describa su apelación, queja, solicitud o corrección…" />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingText="Enviando…">Enviar caso</SubmitButton>
      </div>
    </form>
  );
}
