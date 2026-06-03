"use client";

import { useActionState } from "react";
import { Field, Input, Textarea, FormError, SubmitButton } from "@/components/form";
import { createRole, updateRole } from "@/lib/actions/roles";
import { PERMISSION_GROUPS } from "@/lib/permission-catalog";
import type { ActionResult } from "@/lib/actions/schemes";

interface RoleInitial {
  name: string;
  description: string | null;
  permissions: string[];
}

export function RoleForm({ roleId = null, initial }: { roleId?: string | null; initial?: RoleInitial }) {
  const action = roleId ? updateRole.bind(null, roleId) : createRole;
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });
  const checked = new Set(initial?.permissions ?? []);

  return (
    <form action={formAction} className="space-y-5">
      <FormError error={state.error} />
      {state.ok ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Rol guardado.</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {!roleId ? (
          <Field label="Clave" htmlFor="key" required hint="MAYÚSCULAS_Y_GUION_BAJO">
            <Input id="key" name="key" required placeholder="SUPERVISOR_REGIONAL" />
          </Field>
        ) : null}
        <Field label="Nombre" htmlFor={`rname-${roleId}`} required>
          <Input id={`rname-${roleId}`} name="name" required defaultValue={initial?.name} placeholder="Supervisor regional" />
        </Field>
      </div>
      <Field label="Descripción" htmlFor={`rdesc-${roleId}`}>
        <Textarea id={`rdesc-${roleId}`} name="description" rows={2} defaultValue={initial?.description ?? ""} />
      </Field>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-700">Permisos</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PERMISSION_GROUPS.map((g) => (
            <div key={g.module} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.label}</div>
              <div className="space-y-1.5">
                {g.permissions.map((p) => (
                  <label key={p.key} className="flex items-start gap-2 text-sm text-slate-600">
                    <input type="checkbox" name="permissions" value={p.key} defaultChecked={checked.has(p.key)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton>{roleId ? "Guardar cambios" : "Crear rol"}</SubmitButton>
      </div>
    </form>
  );
}
