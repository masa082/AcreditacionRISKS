"use client";

import { useActionState } from "react";
import { Field, Input, FormError, SubmitButton } from "@/components/form";
import { updateOrganization, uploadOrgAsset } from "@/lib/actions/organization";
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

function BrandUpload({
  kind,
  label,
  hint,
  current,
}: {
  kind: "logo" | "signature";
  label: string;
  hint: string;
  current: string | null;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(uploadOrgAsset.bind(null, kind), { ok: false });
  return (
    <form action={action} className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <p className="text-xs text-slate-400">{hint}</p>
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt={label} className="h-16 w-auto rounded border border-slate-200 bg-white object-contain p-1" />
      ) : (
        <p className="text-xs text-slate-400">Sin imagen cargada.</p>
      )}
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-emerald-700">Imagen actualizada.</p> : null}
      <input
        type="file"
        name="file"
        accept=".png,.jpg,.jpeg"
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-800 hover:file:bg-brand-100"
      />
      <SubmitButton>Subir {kind === "logo" ? "logo" : "firma"}</SubmitButton>
    </form>
  );
}

export function OrganizationForm({ initial }: { initial: OrgInitial }) {
  const [state, action] = useActionState<ActionResult, FormData>(updateOrganization, { ok: false });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Logo y firma autorizada</h3>
        <p className="text-xs text-slate-500">Estas imágenes aparecen en los certificados y diplomas verificables. Use PNG con fondo transparente (máx. 10 MB).</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <BrandUpload kind="logo" label="Logo del organismo" hint="Encabezado del certificado." current={initial.logoUrl} />
          <BrandUpload kind="signature" label="Imagen de la firma" hint="Firma manuscrita escaneada." current={initial.signatureImageUrl} />
        </div>
      </section>

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
          <Field label="URL del logo" htmlFor="logoUrl" hint="Se completa al subir el logo arriba; puede pegar una URL externa.">
            <Input id="logoUrl" name="logoUrl" type="text" defaultValue={initial.logoUrl ?? ""} placeholder="https://…/logo.png" />
          </Field>
          <Field label="URL imagen de firma" htmlFor="signatureImageUrl" hint="Se completa al subir la firma arriba; puede pegar una URL externa.">
            <Input id="signatureImageUrl" name="signatureImageUrl" type="text" defaultValue={initial.signatureImageUrl ?? ""} placeholder="https://…/firma.png" />
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
    </div>
  );
}
