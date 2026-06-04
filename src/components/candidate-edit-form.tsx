"use client";

import { useActionState, useState } from "react";
import { updateCandidate } from "@/lib/actions/candidates";
import type { ActionResult } from "@/lib/actions/schemes";

export interface CandidateEditInitial {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
}

export function CandidateEditForm({ candidateId, initial }: { candidateId: string; initial: CandidateEditInitial }) {
  const [open, setOpen] = useState(false);
  const bound = updateCandidate.bind(null, candidateId);
  const [state, action, pending] = useActionState<ActionResult, FormData>(bound, { ok: false });

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50">
        ✎ Editar datos
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 space-y-3 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="font-semibold text-slate-700">Nombres *</span>
          <input name="firstName" required defaultValue={initial.firstName} maxLength={80} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-slate-700">Apellidos *</span>
          <input name="lastName" required defaultValue={initial.lastName} maxLength={80} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-slate-700">Correo *</span>
          <input name="email" required type="email" defaultValue={initial.email} maxLength={160} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-slate-700">Teléfono</span>
          <input name="phone" defaultValue={initial.phone ?? ""} maxLength={40} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-slate-700">Tipo doc.</span>
          <select name="documentType" defaultValue={initial.documentType ?? "CC"} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm">
            <option value="CC">Cédula de ciudadanía</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="TI">Tarjeta de identidad</option>
            <option value="NIT">NIT</option>
          </select>
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-slate-700">N° documento</span>
          <input name="documentNumber" defaultValue={initial.documentNumber ?? ""} maxLength={40} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-slate-700">País</span>
          <input name="country" defaultValue={initial.country ?? ""} maxLength={80} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
        </label>
        <label className="block text-xs">
          <span className="font-semibold text-slate-700">Ciudad</span>
          <input name="city" defaultValue={initial.city ?? ""} maxLength={80} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
        </label>
        <label className="block text-xs sm:col-span-2">
          <span className="font-semibold text-slate-700">Dirección</span>
          <input name="address" defaultValue={initial.address ?? ""} maxLength={240} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
        </label>
      </div>
      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-emerald-700">{state.message ?? "Guardado."}</p> : null}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-brand-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-900 disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">Cerrar</button>
      </div>
    </form>
  );
}
