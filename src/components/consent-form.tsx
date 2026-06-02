"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/form";
import { giveConsent } from "@/lib/actions/enrollment";
import type { ActionResult } from "@/lib/actions/schemes";

interface Purpose {
  key: string;
  label: string;
  description?: string | null;
  required: boolean;
}

export function ConsentForm({
  enrollmentId,
  policy,
  purposes,
}: {
  enrollmentId: string;
  policy: { title: string; content: string; version: string };
  purposes: Purpose[];
}) {
  const action = giveConsent.bind(null, enrollmentId);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });

  const requiredPurposes = purposes.filter((p) => p.required);
  const optionalPurposes = purposes.filter((p) => !p.required);

  return (
    <form action={formAction} className="space-y-5">
      <FormError error={state.error} />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-800">{policy.title}</div>
        <div className="text-xs text-slate-400">Versión {policy.version}</div>
        <p className="mt-2 max-h-48 overflow-auto whitespace-pre-line text-sm text-slate-600">
          {policy.content}
        </p>
      </div>

      {requiredPurposes.length > 0 && (
        <div>
          <div className="text-sm font-medium text-slate-700">Finalidades del tratamiento</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {requiredPurposes.map((p) => (
              <li key={p.key} className="flex items-center gap-2">
                <span className="text-emerald-600">●</span> {p.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {optionalPurposes.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-700">Finalidades opcionales</div>
          {optionalPurposes.map((p) => (
            <label key={p.key} className="flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" name={`purpose_${p.key}`} defaultChecked className="mt-0.5 h-4 w-4 rounded border-slate-300" />
              <span>{p.label}{p.description ? ` — ${p.description}` : ""}</span>
            </label>
          ))}
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" name="accept" required className="mt-0.5 h-4 w-4 rounded border-slate-300" />
        <span>
          He leído y <strong>autorizo</strong> el tratamiento de mis datos personales
          conforme a esta política.
        </span>
      </label>

      <SubmitButton pendingText="Registrando…">Aceptar y continuar</SubmitButton>
    </form>
  );
}
