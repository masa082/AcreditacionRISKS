"use client";

import { useActionState } from "react";
import { createFee } from "@/lib/actions/fees";
import type { ActionResult } from "@/lib/actions/schemes";

interface SubscriberOption {
  id: string;
  name: string;
  schemes: { id: string; name: string }[];
}

const CONCEPTS = [
  { value: "ENROLLMENT", label: "Inscripción" },
  { value: "EXAM", label: "Examen / Programa" },
  { value: "CERTIFICATION", label: "Certificación" },
  { value: "RECERTIFICATION", label: "Recertificación" },
  { value: "RETAKE", label: "Reintento de examen" },
  { value: "DUPLICATE", label: "Duplicado de certificado" },
  { value: "OTHER", label: "Otro" },
];

export function FeeCreateForm({ subscribers }: { subscribers: SubscriberOption[] }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createFee, { ok: false });
  // Para Select dependiente cliente: el usuario elige subscriber y se filtran sus esquemas.
  // Por simplicidad, mostramos todos los pares <subscriber|scheme> juntos.
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <select
        name="subscriberId"
        required
        defaultValue=""
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      >
        <option value="" disabled>Suscriptor…</option>
        {subscribers.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select
        name="schemeId"
        defaultValue=""
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      >
        <option value="">(Sin esquema · tarifa global)</option>
        {subscribers.flatMap((s) =>
          s.schemes.map((sch) => (
            <option key={sch.id} value={sch.id}>
              {s.name} · {sch.name}
            </option>
          )),
        )}
      </select>
      <select
        name="concept"
        required
        defaultValue="EXAM"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      >
        {CONCEPTS.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <input
        name="label"
        required
        placeholder="Etiqueta (Ej: Inscripción al programa)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
      />
      <div className="flex gap-2">
        <input
          name="amount"
          required
          type="number"
          min={0}
          step="0.01"
          placeholder="Monto"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right font-mono text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <input
          name="currency"
          defaultValue="COP"
          className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-center text-sm uppercase outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 lg:col-span-5"
      >
        {pending ? "Creando…" : "+ Agregar tarifa"}
      </button>
      {state.error ? <p className="text-xs text-rose-600 lg:col-span-5">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-emerald-700 lg:col-span-5">{state.message ?? "Tarifa creada."}</p> : null}
    </form>
  );
}
