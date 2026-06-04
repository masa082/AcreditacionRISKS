"use client";

import { useActionState } from "react";
import { Field, Input, SubmitButton } from "@/components/form";
import {
  addCandidateEmailByAdmin,
  removeCandidateEmailByAdmin,
} from "@/lib/actions/candidates";
import type { ActionResult } from "@/lib/actions/schemes";

/// Tarjeta de gestión de correos alternos del CANDIDATO desde el panel del
/// administrador del suscriptor. Permite agregar/quitar correos para que el
/// candidato pueda iniciar sesión con cualquiera de ellos.
export function CandidateEmailsAdmin({
  candidateId,
  primaryEmail,
  alternateEmails,
}: {
  candidateId: string;
  primaryEmail: string;
  alternateEmails: string[];
}) {
  const addBound = addCandidateEmailByAdmin.bind(null, candidateId);
  const removeBound = removeCandidateEmailByAdmin.bind(null, candidateId);
  const [addState, addAction] = useActionState<ActionResult, FormData>(addBound, { ok: false });
  const [removeState, removeAction] = useActionState<ActionResult, FormData>(removeBound, { ok: false });

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        Correos electrónicos del candidato
      </h4>
      <p className="mt-0.5 text-[11px] text-slate-500">
        El candidato puede iniciar sesión con su correo principal o cualquiera de los alternos.
      </p>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs">
          <span className="font-medium text-slate-800">{primaryEmail}</span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-800 ring-1 ring-brand-100">
            Principal
          </span>
        </div>
        {alternateEmails.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-center text-[11px] text-slate-500">
            Sin correos alternos.
          </p>
        ) : (
          alternateEmails.map((e) => (
            <div
              key={e}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs"
            >
              <span className="text-slate-700">{e}</span>
              <form action={removeAction}>
                <input type="hidden" name="email" value={e} />
                <button
                  type="submit"
                  className="rounded border border-rose-300 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Quitar
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      {(addState.error || removeState.error) ? (
        <p className="mt-3 rounded-md bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700 ring-1 ring-rose-200">
          {addState.error || removeState.error}
        </p>
      ) : null}
      {(addState.ok || removeState.ok) ? (
        <p className="mt-3 rounded-md bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700 ring-1 ring-emerald-200">
          {addState.message || removeState.message || "Actualizado."}
        </p>
      ) : null}

      <form action={addAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Agregar correo alterno" htmlFor={`alt-${candidateId}`}>
          <Input id={`alt-${candidateId}`} name="email" type="email" required placeholder="otro@correo.com" />
        </Field>
        <SubmitButton pendingText="…">Agregar</SubmitButton>
      </form>
    </div>
  );
}
