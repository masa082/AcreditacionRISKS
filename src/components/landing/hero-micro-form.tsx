"use client";

import { useActionState } from "react";
import { createLead } from "@/lib/actions/leads";
import type { ActionResult } from "@/lib/actions/schemes";
import { t, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";

/** Micro-formulario en el hero: 3 campos (nombre + correo + cert).
 *  Crea un Lead instantáneo y le da al visitante una vía rápida sin pasar
 *  por el form completo de /registro.
 *
 *  Recibe `locale` como prop para que el componente pueda mostrar todas las
 *  cadenas (placeholders, CTA, mensajes de éxito) en el idioma del visitante.
 */
export function HeroMicroForm({ locale }: { locale?: Locale }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createLead, { ok: false });
  const tr = (k: string) => t(k, locale ?? DEFAULT_LOCALE);

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm">
        <div className="text-2xl">✅</div>
        <p className="mt-1 font-bold text-emerald-900">{tr("micro.success.title")}</p>
        <p className="mt-1 text-xs text-emerald-700">
          {tr("micro.success.body.before")}
          <a href="/registro?cert=sarlaft" className="font-semibold underline">{tr("micro.success.link")}</a>
          {tr("micro.success.body.after")}
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
        {tr("micro.eyebrow")}
      </p>
      <div className="space-y-2">
        <input
          name="email"
          required
          type="email"
          maxLength={160}
          placeholder={tr("micro.email")}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <select
          name="certificationOfInterest"
          defaultValue="SARLAFT"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        >
          <option value="SARLAFT">{tr("micro.cert.sarlaft")}</option>
          <option value="SAGRILAFT_WAITLIST">{tr("micro.cert.sagrilaft.waitlist")}</option>
          <option value="NOT_SURE">{tr("micro.cert.notsure")}</option>
        </select>
      </div>

      <label className="mt-3 flex items-start gap-2 text-[10px] text-slate-500">
        <input type="checkbox" name="consent" value="yes" required className="mt-0.5" />
        <span>
          {tr("micro.consent.before")}
          <a href="/privacidad" className="text-brand-800 underline">{tr("micro.consent.policy")}</a>
          {tr("micro.consent.after")}
        </span>
      </label>

      {state.error ? <p className="mt-2 text-xs text-rose-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 w-full rounded-lg bg-gradient-to-r from-brand-800 to-brand-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:from-brand-900 hover:to-brand-800 disabled:opacity-60"
      >
        {pending ? tr("micro.sending") : tr("micro.cta")}
      </button>
      <p className="mt-2 text-center text-[10px] text-slate-400">
        {tr("micro.fineprint")}
      </p>
    </form>
  );
}
