"use client";

import { useActionState, useState } from "react";
import { Field, Input, Textarea, FormError, SubmitButton } from "@/components/form";
import { updateMarketingConfig } from "@/lib/actions/organization";
import type { ActionResult } from "@/lib/actions/schemes";

interface Guarantee { icon: string; title: string; desc: string }

export function MarketingConfigForm({ initial }: {
  initial: {
    slogan: string;
    whatsappNumber: string;
    whatsappMessage: string;
    socialProof: { professionalsCertified: string; companiesTrust: string; avgScore: string; daysToIssue: string };
    urgency: { enabled: boolean; text: string; ctaLabel: string; ctaHref: string };
    guarantees: Guarantee[];
    bankingInfo: string;
  };
}) {
  const [state, action] = useActionState<ActionResult, FormData>(updateMarketingConfig, { ok: false });
  const [guarantees, setGuarantees] = useState<Guarantee[]>(initial.guarantees);

  function updateG(i: number, field: keyof Guarantee, v: string) {
    setGuarantees((arr) => arr.map((g, idx) => (idx === i ? { ...g, [field]: v } : g)));
  }
  function addG() { setGuarantees((arr) => [...arr, { icon: "✓", title: "", desc: "" }]); }
  function removeG(i: number) { setGuarantees((arr) => arr.filter((_, idx) => idx !== i)); }

  return (
    <form action={action} className="space-y-6">
      <FormError error={state.error} />
      {state.ok ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">{state.message ?? "Configuración guardada."}</p> : null}
      <input type="hidden" name="guarantees" value={JSON.stringify(guarantees)} />

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Slogan e identidad</h3>
        <Field label="Slogan (visible en hero y CTA final)" htmlFor="slogan">
          <Input id="slogan" name="slogan" defaultValue={initial.slogan} maxLength={160} placeholder="Trabajamos para facilitar decisiones seguras" />
        </Field>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">WhatsApp flotante</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Número (código país sin +)" htmlFor="whatsappNumber" hint="Ej. 573001234567">
            <Input id="whatsappNumber" name="whatsappNumber" defaultValue={initial.whatsappNumber} maxLength={20} />
          </Field>
          <Field label="Mensaje predefinido" htmlFor="whatsappMessage">
            <Input id="whatsappMessage" name="whatsappMessage" defaultValue={initial.whatsappMessage} maxLength={500} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Social proof (sección de autoridad)</h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Profesionales certificados" htmlFor="spProfessionals">
            <Input id="spProfessionals" name="spProfessionals" defaultValue={initial.socialProof.professionalsCertified} placeholder="150+" maxLength={40} />
          </Field>
          <Field label="Empresas que confían" htmlFor="spCompanies">
            <Input id="spCompanies" name="spCompanies" defaultValue={initial.socialProof.companiesTrust} placeholder="+25" maxLength={40} />
          </Field>
          <Field label="Puntaje promedio" htmlFor="spAvgScore">
            <Input id="spAvgScore" name="spAvgScore" defaultValue={initial.socialProof.avgScore} placeholder="92%" maxLength={40} />
          </Field>
          <Field label="Días para emitir" htmlFor="spDaysToIssue">
            <Input id="spDaysToIssue" name="spDaysToIssue" defaultValue={initial.socialProof.daysToIssue} placeholder="≤ 5" maxLength={40} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Banner superior de urgencia</h3>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="urgencyEnabled" defaultChecked={initial.urgency.enabled} />
          Mostrar banner navy/dorado sobre el header
        </label>
        <Field label="Texto" htmlFor="urgencyText">
          <Input id="urgencyText" name="urgencyText" defaultValue={initial.urgency.text} maxLength={200} placeholder="🎓 Inscripciones abiertas · Cupos limitados" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Texto del botón" htmlFor="urgencyCtaLabel">
            <Input id="urgencyCtaLabel" name="urgencyCtaLabel" defaultValue={initial.urgency.ctaLabel} maxLength={40} placeholder="Asegurar mi lugar" />
          </Field>
          <Field label="URL del botón" htmlFor="urgencyCtaHref">
            <Input id="urgencyCtaHref" name="urgencyCtaHref" defaultValue={initial.urgency.ctaHref} maxLength={200} placeholder="/registro?cert=sarlaft" />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Garantías visibles ({guarantees.length})</h3>
        <p className="text-xs text-slate-500">Reaseguros que aparecen entre el proceso y la vista previa del examen. Use 4 para llenar la fila.</p>
        <ul className="space-y-3">
          {guarantees.map((g, i) => (
            <li key={i} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[60px_1fr_2fr_auto]">
              <input value={g.icon} onChange={(e) => updateG(i, "icon", e.target.value)} maxLength={4} placeholder="🔁" className="rounded border border-slate-300 px-2 py-1 text-center text-lg" />
              <input value={g.title} onChange={(e) => updateG(i, "title", e.target.value)} maxLength={80} placeholder="Título" className="rounded border border-slate-300 px-2 py-1 text-sm" />
              <input value={g.desc} onChange={(e) => updateG(i, "desc", e.target.value)} maxLength={240} placeholder="Descripción" className="rounded border border-slate-300 px-2 py-1 text-sm" />
              <button type="button" onClick={() => removeG(i)} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Quitar</button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addG} className="rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50">+ Agregar garantía</button>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Datos bancarios (visibles al candidato durante pago manual)</h3>
        <Field label="Información de cuenta" htmlFor="bankingInfo" hint="Banco, tipo de cuenta, número, titular y NIT. Aparece debajo del bloque ‘Pago en revisión’ en /portal/inscripcion.">
          <Textarea id="bankingInfo" name="bankingInfo" rows={4} defaultValue={initial.bankingInfo} maxLength={2000} placeholder="Ej. Bancolombia · Cuenta de Ahorros 12345678 · RISKS INTERNATIONAL S.A.S. · NIT 900000000-1" />
        </Field>
      </section>

      <div className="flex justify-end">
        <SubmitButton>Guardar configuración de marketing</SubmitButton>
      </div>
    </form>
  );
}
