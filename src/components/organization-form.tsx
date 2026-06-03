"use client";

import { useActionState } from "react";
import { Field, Input, FormError, SubmitButton } from "@/components/form";
import { updateOrganization } from "@/lib/actions/organization";
import type { ActionResult } from "@/lib/actions/schemes";

interface OrgInitial {
  legalName: string;
  tradeName: string | null;
  taxId: string | null;
  legalRepName: string | null;
  authorizedSigner: string | null;
  signatureImageUrl: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
}

export function OrganizationForm({ initial }: { initial: OrgInitial }) {
  const [state, action] = useActionState<ActionResult, FormData>(updateOrganization, { ok: false });

  return (
    <form action={action} className="space-y-5">
      <FormError error={state.error} />
      {state.ok ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Configuración guardada.</p> : null}

      <h3 className="text-sm font-semibold text-slate-700">Datos legales</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Razón social" htmlFor="legalName" required>
          <Input id="legalName" name="legalName" required defaultValue={initial.legalName} />
        </Field>
        <Field label="Nombre comercial" htmlFor="tradeName">
          <Input id="tradeName" name="tradeName" defaultValue={initial.tradeName ?? ""} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="NIT / Identificación tributaria" htmlFor="taxId">
          <Input id="taxId" name="taxId" defaultValue={initial.taxId ?? ""} />
        </Field>
        <Field label="Representante legal" htmlFor="legalRepName">
          <Input id="legalRepName" name="legalRepName" defaultValue={initial.legalRepName ?? ""} />
        </Field>
      </div>
      <Field label="Firma autorizada (texto en certificados)" htmlFor="authorizedSigner" hint="Aparece bajo la firma en el diploma.">
        <Input id="authorizedSigner" name="authorizedSigner" defaultValue={initial.authorizedSigner ?? ""} placeholder="Nombre — Director de Certificación" />
      </Field>

      <h3 className="pt-2 text-sm font-semibold text-slate-700">Marca</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="URL del logo" htmlFor="logoUrl">
          <Input id="logoUrl" name="logoUrl" type="url" defaultValue={initial.logoUrl ?? ""} placeholder="https://…/logo.png" />
        </Field>
        <Field label="URL imagen de firma" htmlFor="signatureImageUrl">
          <Input id="signatureImageUrl" name="signatureImageUrl" type="url" defaultValue={initial.signatureImageUrl ?? ""} placeholder="https://…/firma.png" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Color primario" htmlFor="primaryColor">
          <Input id="primaryColor" name="primaryColor" defaultValue={initial.primaryColor ?? ""} placeholder="#1e3a8a" />
        </Field>
        <Field label="Color secundario" htmlFor="secondaryColor">
          <Input id="secondaryColor" name="secondaryColor" defaultValue={initial.secondaryColor ?? ""} placeholder="#0ea5e9" />
        </Field>
      </div>

      <h3 className="pt-2 text-sm font-semibold text-slate-700">Contacto</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Correo de contacto" htmlFor="contactEmail">
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={initial.contactEmail ?? ""} />
        </Field>
        <Field label="Teléfono" htmlFor="contactPhone">
          <Input id="contactPhone" name="contactPhone" defaultValue={initial.contactPhone ?? ""} />
        </Field>
      </div>
      <Field label="Dirección" htmlFor="address">
        <Input id="address" name="address" defaultValue={initial.address ?? ""} />
      </Field>

      <div className="flex justify-end">
        <SubmitButton>Guardar configuración</SubmitButton>
      </div>
    </form>
  );
}
