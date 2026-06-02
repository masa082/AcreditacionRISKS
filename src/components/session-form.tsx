"use client";

import { useActionState } from "react";
import { Field, Input, Select, FormError, SubmitButton } from "@/components/form";
import { createSession } from "@/lib/actions/agenda";
import type { ActionResult } from "@/lib/actions/schemes";

interface ExamOption {
  id: string;
  name: string;
}

export function SessionForm({ exams }: { exams: ExamOption[] }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(createSession, { ok: false });

  return (
    <form action={formAction} className="space-y-4">
      <FormError error={state.error} />
      {state.ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
          Sesión creada correctamente.
        </p>
      ) : null}

      <Field label="Evaluación" htmlFor="examId" required>
        <Select id="examId" name="examId" required defaultValue={exams[0]?.id}>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha y hora" htmlFor="startsAt" required>
          <Input id="startsAt" name="startsAt" type="datetime-local" required />
        </Field>
        <Field label="Duración (min)" htmlFor="durationMin" hint="Por defecto usa la del examen.">
          <Input id="durationMin" name="durationMin" type="number" min={1} max={1440} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Modalidad" htmlFor="modality" required>
          <Select id="modality" name="modality" required defaultValue="ONLINE">
            <option value="ONLINE">En línea</option>
            <option value="ONSITE">Presencial</option>
          </Select>
        </Field>
        <Field label="Cupos" htmlFor="capacity" required hint="0 = ilimitado.">
          <Input id="capacity" name="capacity" type="number" min={0} max={10000} defaultValue={0} required />
        </Field>
      </div>

      <Field label="Lugar" htmlFor="location" hint="Obligatorio para sesiones presenciales.">
        <Input id="location" name="location" placeholder="Sede / dirección" />
      </Field>
      <Field label="Enlace de reunión" htmlFor="meetingLink" hint="Para sesiones en línea (Meet, Zoom…).">
        <Input id="meetingLink" name="meetingLink" type="url" placeholder="https://…" />
      </Field>

      <Field label="Título (opcional)" htmlFor="title">
        <Input id="title" name="title" placeholder="Jornada de evaluación — mañana" />
      </Field>

      <div className="flex justify-end">
        <SubmitButton pendingText="Creando…">Crear sesión</SubmitButton>
      </div>
    </form>
  );
}
