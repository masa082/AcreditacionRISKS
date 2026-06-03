"use client";

import { useActionState } from "react";
import { createLead } from "@/lib/actions/leads";
import { CERTIFICATIONS } from "@/lib/brand";
import type { ActionResult } from "@/lib/actions/schemes";

interface LeadFormProps {
  kind: "REGISTRATION" | "INFORMATION" | "ADVISORY";
  source?: string;
  defaultCertification?: string;
  variant?: "full" | "short" | "advisory";
}

const KIND_TITLES: Record<string, { submit: string; success: string }> = {
  REGISTRATION: { submit: "Quiero certificarme", success: "¡Gracias! Nuestro equipo te contactará pronto." },
  INFORMATION: { submit: "Solicitar información", success: "Recibimos tu solicitud. Nos pondremos en contacto." },
  ADVISORY: { submit: "Agendar asesoría", success: "Confirmamos la solicitud. Te contactaremos para coordinar la asesoría." },
};

export function LeadForm({ kind, source, defaultCertification, variant = "full" }: LeadFormProps) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createLead, { ok: false });
  const cfg = KIND_TITLES[kind];

  if (state.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="text-3xl">✅</div>
        <h3 className="mt-2 text-lg font-bold text-emerald-900">{cfg.success}</h3>
        <p className="mt-1 text-sm text-emerald-700">Mientras tanto, puedes <a href="/registro" className="font-semibold underline">crear tu cuenta</a> y avanzar.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      {source ? <input type="hidden" name="source" value={source} /> : null}
      {/* Honeypot anti-bot */}
      <div className="hidden" aria-hidden="true">
        <label>Sitio web<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      {state.error ? (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{state.error}</div>
      ) : null}

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
          <input name="phone" type="tel" maxLength={40} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">País</span>
          <input name="country" maxLength={80} placeholder="Colombia" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>
      </div>

      {variant !== "short" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Empresa</span>
            <input name="company" maxLength={160} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Cargo</span>
            <input name="jobTitle" maxLength={120} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
        </div>
      ) : null}

      <label className="block">
        <span className="text-xs font-semibold text-slate-700">Certificación de interés</span>
        <select name="certificationOfInterest" defaultValue={defaultCertification ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
          <option value="">Indique si lo desea</option>
          {CERTIFICATIONS.map((c) => (
            <option key={c.slug} value={c.shortName}>{c.shortName}</option>
          ))}
        </select>
      </label>

      {variant === "advisory" ? (
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Fecha sugerida para la asesoría</span>
          <input name="suggestedDate" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>
      ) : null}

      {variant !== "short" ? (
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">Mensaje</span>
          <textarea name="message" rows={3} maxLength={2000} placeholder="Cuéntanos brevemente cómo podemos ayudarte." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>
      ) : null}

      <label className="flex items-start gap-2 text-xs text-slate-600">
        <input type="checkbox" name="consent" value="yes" required className="mt-0.5" />
        <span>Acepto la <a href="/privacidad" className="font-semibold text-brand-800 underline">Política de Tratamiento de Datos Personales</a> y autorizo a {`RISKS INTERNATIONAL`} a contactarme con fines comerciales relacionados con esta solicitud.</span>
      </label>

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gradient-to-r from-brand-800 to-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:from-brand-900 hover:to-brand-700 disabled:opacity-60">
        {pending ? "Enviando…" : cfg.submit}
      </button>
    </form>
  );
}
