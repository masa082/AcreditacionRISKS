"use client";

import { useActionState } from "react";
import { Field, Input, Textarea, FormError, SubmitButton } from "@/components/form";
import { upsertPlan } from "@/lib/actions/platform";
import type { ActionResult } from "@/lib/actions/schemes";

interface PlanInitial {
  key: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  maxCandidates: number;
  maxExams: number;
  isActive: boolean;
}

export function PlanForm({ planId = null, initial }: { planId?: string | null; initial?: PlanInitial }) {
  const action = upsertPlan.bind(null, planId);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });

  return (
    <form action={formAction} className="space-y-4">
      <FormError error={state.error} />
      {state.ok ? <p className="text-sm text-emerald-700">Plan guardado.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Clave" htmlFor={`key-${planId}`} required hint="No editable tras crear.">
          <Input id={`key-${planId}`} name="key" required defaultValue={initial?.key} readOnly={!!planId} placeholder="pro" />
        </Field>
        <Field label="Nombre" htmlFor={`name-${planId}`} required>
          <Input id={`name-${planId}`} name="name" required defaultValue={initial?.name} placeholder="Profesional" />
        </Field>
      </div>
      <Field label="Descripción" htmlFor={`desc-${planId}`}>
        <Textarea id={`desc-${planId}`} name="description" rows={2} defaultValue={initial?.description ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Precio mensual (COP)" htmlFor={`pm-${planId}`} required>
          <Input id={`pm-${planId}`} name="priceMonthly" type="number" min={0} required defaultValue={initial?.priceMonthly ?? 0} />
        </Field>
        <Field label="Precio anual (COP)" htmlFor={`py-${planId}`} required>
          <Input id={`py-${planId}`} name="priceYearly" type="number" min={0} required defaultValue={initial?.priceYearly ?? 0} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Máx. usuarios" htmlFor={`mu-${planId}`} required>
          <Input id={`mu-${planId}`} name="maxUsers" type="number" min={1} required defaultValue={initial?.maxUsers ?? 5} />
        </Field>
        <Field label="Máx. candidatos" htmlFor={`mc-${planId}`} required>
          <Input id={`mc-${planId}`} name="maxCandidates" type="number" min={1} required defaultValue={initial?.maxCandidates ?? 100} />
        </Field>
        <Field label="Máx. evaluaciones" htmlFor={`me-${planId}`} required>
          <Input id={`me-${planId}`} name="maxExams" type="number" min={1} required defaultValue={initial?.maxExams ?? 10} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} className="h-4 w-4 rounded border-slate-300" />
        Plan activo (visible para asignar)
      </label>
      <div className="flex justify-end">
        <SubmitButton>{planId ? "Guardar cambios" : "Crear plan"}</SubmitButton>
      </div>
    </form>
  );
}
