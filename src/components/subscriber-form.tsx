"use client";

import { useActionState } from "react";
import { Field, Input, Select, FormError, SubmitButton } from "@/components/form";
import { createSubscriber } from "@/lib/actions/platform";
import type { ActionResult } from "@/lib/actions/schemes";

export function SubscriberForm({ plans }: { plans: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(createSubscriber, { ok: false });

  return (
    <form action={action} className="space-y-5">
      <FormError error={state.error} />

      <h3 className="text-sm font-semibold text-slate-700">Organización</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Razón social" htmlFor="legalName" required>
          <Input id="legalName" name="legalName" required placeholder="Organismo Certificador S.A.S." />
        </Field>
        <Field label="Nombre comercial" htmlFor="tradeName">
          <Input id="tradeName" name="tradeName" placeholder="Certizo" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Identificador (slug)" htmlFor="slug" required hint="minúsculas-y-guiones">
          <Input id="slug" name="slug" required placeholder="certizo" />
        </Field>
        <Field label="Correo de contacto" htmlFor="contactEmail">
          <Input id="contactEmail" name="contactEmail" type="email" placeholder="contacto@org.co" />
        </Field>
        <Field label="Estado inicial" htmlFor="status">
          <Select id="status" name="status" defaultValue="TRIAL">
            <option value="TRIAL">Prueba (trial)</option>
            <option value="ACTIVE">Activo</option>
          </Select>
        </Field>
      </div>
      <Field label="Plan" htmlFor="planId">
        <Select id="planId" name="planId" defaultValue="">
          <option value="">Sin plan</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </Field>

      <h3 className="pt-2 text-sm font-semibold text-slate-700">Administrador del suscriptor</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombres" htmlFor="adminFirstName" required>
          <Input id="adminFirstName" name="adminFirstName" required />
        </Field>
        <Field label="Apellidos" htmlFor="adminLastName" required>
          <Input id="adminLastName" name="adminLastName" required />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Correo del administrador" htmlFor="adminEmail" required>
          <Input id="adminEmail" name="adminEmail" type="email" required />
        </Field>
        <Field label="Contraseña inicial" htmlFor="adminPassword" required hint="Mínimo 8 caracteres.">
          <Input id="adminPassword" name="adminPassword" type="text" required minLength={8} />
        </Field>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingText="Creando…">Crear suscriptor</SubmitButton>
      </div>
    </form>
  );
}
