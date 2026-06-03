"use client";

import { useActionState } from "react";
import { registerReferrer, type ReferrerCreateResult } from "@/lib/actions/referrals";
import { BRAND } from "@/lib/brand";

const initial: ReferrerCreateResult = { ok: false };

export function ReferrerForm() {
  const [state, action, pending] = useActionState<ReferrerCreateResult, FormData>(registerReferrer, initial);

  if (state.ok && state.code) {
    const baseUrl = BRAND.appUrl.replace(/\/$/, "");
    const shareUrl = `${baseUrl}/r/${state.code}`;
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="text-3xl">🎉</div>
        <h3 className="mt-2 text-lg font-bold text-emerald-900">¡Su código de referido está listo!</h3>
        {state.message ? <p className="mt-1 text-xs text-emerald-700">{state.message}</p> : null}
        <div className="mt-4 rounded-xl border border-emerald-300 bg-white p-4">
          <div className="text-[10px] uppercase tracking-wider text-emerald-600">Su código</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-wider text-emerald-900">{state.code}</div>
          <div className="mt-3 text-[10px] uppercase tracking-wider text-emerald-600">Su enlace para compartir</div>
          <input
            readOnly
            defaultValue={shareUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="mt-1 w-full rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2 font-mono text-sm text-slate-800"
          />
          <p className="mt-3 text-xs text-emerald-700">
            Comparta este enlace por WhatsApp, correo o redes sociales. Cada persona que se certifique con su código le genera una recompensa del 10 % del programa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      {state.error ? (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{state.error}</div>
      ) : null}
      {/* Honeypot anti-bot */}
      <div className="hidden" aria-hidden="true">
        <label>Sitio web<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Nombre completo *</span>
          <input name="fullName" required maxLength={160} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Correo electrónico *</span>
          <input name="email" required type="email" maxLength={160} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Teléfono</span>
          <input name="phone" type="tel" maxLength={40} placeholder="+57 300 0000000" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Cédula / NIT</span>
          <input name="taxId" maxLength={40} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-semibold text-slate-700">Cuenta para pago de recompensas</span>
        <textarea
          name="bankAccountInfo"
          rows={3}
          maxLength={500}
          placeholder="Ej. Bancolombia · Ahorros · 1234567890 · Titular Juan Pérez"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <span className="mt-1 block text-[11px] text-slate-500">Opcional. La puede registrar después; sin estos datos no podemos pagarle la recompensa.</span>
      </label>
      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" name="consent" value="yes" required className="mt-0.5" />
        <span>Acepto la <a href="/privacidad" className="font-semibold text-brand-800 underline">Política de Tratamiento de Datos Personales</a> y los <a href="/terminos" className="font-semibold text-brand-800 underline">términos del programa de referidos</a>.</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:from-emerald-800 hover:to-emerald-700 disabled:opacity-60"
      >
        {pending ? "Generando código…" : "Generar mi código de referido"}
      </button>
    </form>
  );
}
