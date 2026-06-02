"use client";

import { useActionState } from "react";
import { Field, Input, FormError, SubmitButton } from "@/components/form";
import { updateCandidateProfile, changePassword } from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/schemes";

interface Initial {
  firstName: string;
  lastName: string;
  email: string;
  documentType: string | null;
  documentNumber: string | null;
  phone: string | null;
  birthDate: string | null; // YYYY-MM-DD
  country: string | null;
  city: string | null;
  address: string | null;
}

function Ok({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
      Cambios guardados.
    </div>
  );
}

export function ProfileForm({ initial }: { initial: Initial }) {
  const [state, action] = useActionState<ActionResult, FormData>(updateCandidateProfile, { ok: false });
  const [pwState, pwAction] = useActionState<ActionResult, FormData>(changePassword, { ok: false });

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-5">
        <FormError error={state.error} />
        <Ok show={state.ok} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombres" htmlFor="firstName" required>
            <Input id="firstName" name="firstName" required defaultValue={initial.firstName} />
          </Field>
          <Field label="Apellidos" htmlFor="lastName" required>
            <Input id="lastName" name="lastName" required defaultValue={initial.lastName} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Correo electrónico" htmlFor="email" hint="No editable. Contacte a soporte para cambiarlo.">
            <Input id="email" value={initial.email} disabled readOnly />
          </Field>
          <Field label="Documento" htmlFor="doc" hint="No editable.">
            <Input id="doc" value={`${initial.documentType ?? ""} ${initial.documentNumber ?? ""}`.trim()} disabled readOnly />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Teléfono" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={initial.phone ?? ""} placeholder="+57 300 000 0000" />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="birthDate">
            <Input id="birthDate" name="birthDate" type="date" defaultValue={initial.birthDate ?? ""} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="País" htmlFor="country">
            <Input id="country" name="country" defaultValue={initial.country ?? ""} placeholder="Colombia" />
          </Field>
          <Field label="Ciudad" htmlFor="city">
            <Input id="city" name="city" defaultValue={initial.city ?? ""} placeholder="Bogotá" />
          </Field>
        </div>

        <Field label="Dirección" htmlFor="address">
          <Input id="address" name="address" defaultValue={initial.address ?? ""} />
        </Field>

        <div className="flex justify-end">
          <SubmitButton>Guardar cambios</SubmitButton>
        </div>
      </form>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="mb-4 font-semibold text-slate-900">Cambiar contraseña</h3>
        <form action={pwAction} className="space-y-4">
          <FormError error={pwState.error} />
          <Ok show={pwState.ok} />
          <Field label="Contraseña actual" htmlFor="current" required>
            <Input id="current" name="current" type="password" required autoComplete="current-password" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
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
      </div>
    </div>
  );
}
