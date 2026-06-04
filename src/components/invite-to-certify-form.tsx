"use client";

import { useActionState } from "react";
import { createLead } from "@/lib/actions/leads";
import type { ActionResult } from "@/lib/actions/schemes";

/// Pequeño formulario embebido en /verificar para invitar a un colega a
/// certificarse. Reusa createLead con kind=REGISTRATION y source=verificar-invite.
export function InviteToCertifyForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createLead, { ok: false });

  if (state.ok) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-sm">
        <div className="text-2xl">✅</div>
        <p className="mt-2 font-bold text-emerald-900">¡Listo! Le enviaremos la información a su contacto.</p>
        <p className="mt-1 text-xs text-emerald-700">Gracias por recomendar a RISKS INTERNATIONAL.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="kind" value="REGISTRATION" />
      <input type="hidden" name="source" value="verificar-invite" />
      <div className="hidden" aria-hidden="true">
        <label>Sitio web<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-700">Nombre del referido *</span>
          <input
            name="fullName"
            required
            maxLength={160}
            placeholder="Su colega o conocido"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-700">Correo del referido *</span>
          <input
            name="email"
            required
            type="email"
            maxLength={160}
            placeholder="correo@ejemplo.com"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] font-semibold text-slate-700">Teléfono (opcional)</span>
        <input
          name="phone"
          type="tel"
          maxLength={40}
          placeholder="+57 300 000 0000"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
      </label>

      <label className="block">
        <span className="text-[11px] font-semibold text-slate-700">Programa de interés</span>
        <select
          name="certificationOfInterest"
          defaultValue="SARLAFT (Supertransporte)"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        >
          <option>SARLAFT (Supertransporte)</option>
          <option>SAGRILAFT (Supersociedades) · Próximamente</option>
          <option>Aún no sabe / Necesita asesoría</option>
        </select>
      </label>

      <label className="block">
        <span className="text-[11px] font-semibold text-slate-700">Mensaje (opcional)</span>
        <textarea
          name="message"
          rows={2}
          maxLength={500}
          placeholder="Cuéntenos brevemente por qué se la recomienda."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
      </label>

      <label className="flex items-start gap-2 text-[11px] text-slate-600">
        <input type="checkbox" name="consent" value="yes" required className="mt-0.5" />
        <span>
          Declaro que cuento con autorización del referido para compartir sus datos y acepto la <a href="/privacidad" className="font-semibold text-brand-800 underline">política de tratamiento de datos</a>.
        </span>
      </label>

      {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-900 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar información al referido"}
      </button>
    </form>
  );
}
