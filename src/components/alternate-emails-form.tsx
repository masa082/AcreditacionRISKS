"use client";

import { useActionState } from "react";
import { Field, Input, SubmitButton } from "@/components/form";
import {
  addCandidateAlternateEmail,
  removeCandidateAlternateEmail,
} from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/schemes";

/// Tarjeta de gestión de correos alternos para el TITULAR (Mi perfil del candidato).
/// Permite agregar un correo y eliminarlos. El login acepta cualquiera de los
/// correos verificados de la cuenta.
export function AlternateEmailsForm({
  primaryEmail,
  alternateEmails,
}: {
  primaryEmail: string;
  alternateEmails: string[];
}) {
  const [addState, addAction] = useActionState<ActionResult, FormData>(
    addCandidateAlternateEmail,
    { ok: false },
  );
  const [removeState, removeAction] = useActionState<ActionResult, FormData>(
    removeCandidateAlternateEmail,
    { ok: false },
  );

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Correos electrónicos de mi cuenta</h2>
          <p className="text-xs text-slate-500">
            Puede iniciar sesión con cualquiera de los correos verificados. Solo el principal recibe las
            notificaciones obligatorias del proceso.
          </p>
        </div>
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <div>
            <span className="font-medium text-slate-800">{primaryEmail}</span>
            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 ring-1 ring-brand-100">
              Principal
            </span>
          </div>
        </div>
        {alternateEmails.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-3 text-center text-xs text-slate-500">
            Aún no tiene correos alternos agregados.
          </p>
        ) : (
          alternateEmails.map((e) => (
            <div
              key={e}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="font-medium text-slate-700">{e}</span>
              <form action={removeAction}>
                <input type="hidden" name="email" value={e} />
                <button
                  type="submit"
                  className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Quitar
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      {addState.error ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {addState.error}
        </p>
      ) : null}
      {addState.ok ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-emerald-200">
          Correo alterno agregado.
        </p>
      ) : null}
      {removeState.error ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {removeState.error}
        </p>
      ) : null}

      <form action={addAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Agregar otro correo" htmlFor="newAlt" hint="Lo podrá usar para iniciar sesión.">
          <Input id="newAlt" name="email" type="email" placeholder="otro@correo.com" required />
        </Field>
        <SubmitButton pendingText="Guardando…">Agregar correo</SubmitButton>
      </form>
    </section>
  );
}
