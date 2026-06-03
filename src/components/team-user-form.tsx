"use client";

import { useActionState } from "react";
import { Field, Input, Select, FormError, SubmitButton } from "@/components/form";
import { createTeamUser } from "@/lib/actions/team";
import type { ActionResult } from "@/lib/actions/schemes";

export function TeamUserForm({ roles }: { roles: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(createTeamUser, { ok: false });

  return (
    <form action={action} className="space-y-4">
      <FormError error={state.error} />
      {state.ok ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Usuario creado.</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombres" htmlFor="firstName" required>
          <Input id="firstName" name="firstName" required />
        </Field>
        <Field label="Apellidos" htmlFor="lastName" required>
          <Input id="lastName" name="lastName" required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Correo electrónico" htmlFor="email" required>
          <Input id="email" name="email" type="email" required />
        </Field>
        <Field label="Rol" htmlFor="roleId" required>
          <Select id="roleId" name="roleId" required defaultValue={roles[0]?.id}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Contraseña inicial" htmlFor="password" required hint="Mínimo 8 caracteres. El usuario podrá cambiarla.">
        <Input id="password" name="password" type="text" required minLength={8} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingText="Creando…">Crear usuario</SubmitButton>
      </div>
    </form>
  );
}
