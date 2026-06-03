"use client";

import { useActionState } from "react";
import { createLead } from "@/lib/actions/leads";
import type { ActionResult } from "@/lib/actions/schemes";

/** Micro-formulario en el hero: 3 campos (nombre + correo + cert).
 *  Crea un Lead instantáneo y le da al visitante una vía rápida sin pasar
 *  por el form completo de /registro. */
export function HeroMicroForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createLead, { ok: false });

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm">
        <div className="text-2xl">✅</div>
        <p className="mt-1 font-bold text-emerald-900">¡Gracias! Te contactaremos en breve.</p>
        <p className="mt-1 text-xs text-emerald-700">
          Mientras tanto, <a href="/registro?cert=sarlaft" className="font-semibold underline">crea tu cuenta</a> y avanza con tu certificación.
        </p>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-premium backdrop-blur"
    >
      <input type="hidden" name="kind" value="REGISTRATION" />
      <input type="hidden" name="source" value="hero-microform" />
      <div className="hidden" aria-hidden="true">
        <label>Sitio web<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gold-600">
        Recibe información en menos de 60 segundos
      </p>
      <div className="space-y-2">
        <input
          name="fullName"
          required
          maxLength={160}
          placeholder="Nombre y apellido"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <input
          name="email"
          required
          type="email"
          maxLength={160}
          placeholder="Correo electrónico"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <select
          name="certificationOfInterest"
          defaultValue="SARLAFT (Supertransporte)"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        >
          <option>SARLAFT (Supertransporte)</option>
          <option>SAGRILAFT (Supersociedades) · Próximamente</option>
        </select>
      </div>

      <label className="mt-3 flex items-start gap-2 text-[10px] text-slate-500">
        <input type="checkbox" name="consent" value="yes" required className="mt-0.5" />
        <span>Acepto la <a href="/privacidad" className="text-brand-800 underline">política de tratamiento de datos</a> y autorizo el contacto comercial.</span>
      </label>

      {state.error ? <p className="mt-2 text-xs text-rose-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 w-full rounded-lg bg-gradient-to-r from-brand-800 to-brand-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:from-brand-900 hover:to-brand-800 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Recibir información →"}
      </button>
      <p className="mt-2 text-center text-[10px] text-slate-400">
        Sin spam · 100 % confidencial · ISO/IEC 17024
      </p>
    </form>
  );
}
