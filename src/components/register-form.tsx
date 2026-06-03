"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Input, Select, FormError, SubmitButton } from "@/components/form";
import { registerCandidate, type RegisterState } from "@/lib/actions/registration";

interface Org {
  slug: string;
  name: string;
}

const initial: RegisterState = { ok: false };

export function RegisterForm({
  orgs,
  lockedOrg,
}: {
  orgs: Org[];
  lockedOrg?: string;
}) {
  const [state, action] = useActionState(registerCandidate, initial);

  if (state.ok) {
    const href = `/activar/${state.activationToken}`;
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
          ✉️
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Revise su correo</h2>
        <p className="text-sm text-slate-500">
          Le enviamos un enlace para validar su cuenta. En este entorno de
          demostración no hay servidor de correo, por lo que puede activar su
          cuenta directamente con el siguiente botón.
        </p>
        <Link
          href={href}
          className="inline-block rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
        >
          Activar mi cuenta ahora
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <FormError error={state.error} />

      {lockedOrg ? (
        <input type="hidden" name="org" value={lockedOrg} />
      ) : (
        <Field label="Entidad certificadora" htmlFor="org" required hint="Organización ante la cual se certificará.">
          <Select id="org" name="org" required defaultValue={orgs[0]?.slug}>
            {orgs.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombres" htmlFor="firstName" required>
          <Input id="firstName" name="firstName" required autoComplete="given-name" />
        </Field>
        <Field label="Apellidos" htmlFor="lastName" required>
          <Input id="lastName" name="lastName" required autoComplete="family-name" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tipo de documento" htmlFor="documentType" required>
          <Select id="documentType" name="documentType" required defaultValue="CC">
            <option value="CC">Cédula de ciudadanía</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="TI">Tarjeta de identidad</option>
            <option value="NIT">NIT</option>
          </Select>
        </Field>
        <Field label="Número de documento" htmlFor="documentNumber" required>
          <Input id="documentNumber" name="documentNumber" required inputMode="numeric" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Correo electrónico" htmlFor="email" required>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Teléfono" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+57 300 000 0000" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contraseña" htmlFor="password" required hint="Mínimo 8 caracteres.">
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label="Confirmar contraseña" htmlFor="confirm" required>
          <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" name="acceptPolicy" className="mt-0.5 h-4 w-4 rounded border-slate-300" />
        <span>
          Autorizo el tratamiento de mis datos personales conforme a la política
          de la entidad certificadora, con fines de evaluación y certificación.
        </span>
      </label>

      <div className="flex items-center justify-between">
        <Link href="/login" className="text-sm text-brand-700 hover:underline">
          Ya tengo cuenta
        </Link>
        <SubmitButton pendingText="Creando cuenta…">Crear cuenta</SubmitButton>
      </div>
    </form>
  );
}
