"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, Input, Select, FormError, SubmitButton } from "@/components/form";
import { registerCandidate, type RegisterState } from "@/lib/actions/registration";

interface Org {
  slug: string;
  name: string;
}

export interface CertOption {
  slug: string;
  name: string;
  available: boolean;
  status: "AVAILABLE" | "COMING_SOON" | "ON_REQUEST";
}

const initial: RegisterState = { ok: false };

const STATUS_BADGE: Record<CertOption["status"], { label: string; cls: string }> = {
  AVAILABLE: { label: "Disponible", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  COMING_SOON: { label: "Próximamente", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  ON_REQUEST: { label: "Solicitar info", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export function RegisterForm({
  orgs,
  lockedOrg,
  certifications,
  preselectedCert,
}: {
  orgs: Org[];
  lockedOrg?: string;
  certifications?: CertOption[];
  preselectedCert?: string;
}) {
  const [state, action] = useActionState(registerCandidate, initial);
  const certs = certifications ?? [];
  const availableCerts = certs.filter((c) => c.available);
  const initialCert = preselectedCert ?? availableCerts[0]?.slug ?? "";
  const [selectedCert, setSelectedCert] = useState(initialCert);

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

      {certs.length > 0 ? (
        <Field
          label="Certificación de interés"
          htmlFor="certificationOfInterest"
          required
          hint="Su cuenta queda registrada para iniciar la inscripción a este programa."
        >
          <input type="hidden" name="certificationOfInterest" value={selectedCert} />
          <div className="space-y-2">
            {certs.map((c) => {
              const badge = STATUS_BADGE[c.status];
              const isSelected = selectedCert === c.slug;
              return (
                <button
                  type="button"
                  key={c.slug}
                  disabled={!c.available}
                  onClick={() => c.available && setSelectedCert(c.slug)}
                  className={`group flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
                    !c.available
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
                      : isSelected
                      ? "border-brand-700 bg-brand-50 ring-2 ring-brand-100"
                      : "border-slate-300 hover:border-brand-400 hover:bg-brand-50/40"
                  }`}
                >
                  <div>
                    <div className={`text-sm font-semibold ${isSelected ? "text-brand-900" : "text-slate-800"}`}>
                      {c.name}
                    </div>
                    {!c.available ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">Lanzamiento próximo · podrá inscribirse cuando se habilite.</p>
                    ) : null}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
      ) : null}

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
