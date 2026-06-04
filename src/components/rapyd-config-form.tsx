"use client";

import { useActionState } from "react";
import { Field, Input, Select, FormError, SubmitButton } from "@/components/form";
import { updateRapydConfig } from "@/lib/actions/organization";
import { updateRapydConfigForSubscriber } from "@/lib/actions/platform";
import type { ActionResult } from "@/lib/actions/schemes";

interface RapydInitial {
  rapydEnabled: boolean;
  rapydEnv: string;
  rapydAccessKey: string | null;
  rapydSecretKey: string | null;
  rapydMerchantNote: string | null;
}

/// Tarjeta de configuración de la pasarela Rapyd. Editable por:
///   - El admin del propio suscriptor (variant="self") → usa updateRapydConfig.
///   - El SUPERADMIN sobre cualquier suscriptor (variant="platform" + subscriberId).
///
/// La Secret Key se muestra enmascarada (últimos 4 caracteres). Para
/// conservarla, deje el campo "Nueva clave secreta" vacío. Para rotarla,
/// pegue la nueva — sustituye a la anterior y queda registrado en AuditLog.
export function RapydConfigForm({
  initial,
  variant,
  subscriberId,
}: {
  initial: RapydInitial;
  variant: "self" | "platform";
  subscriberId?: string;
}) {
  const action =
    variant === "platform" ? updateRapydConfigForSubscriber : updateRapydConfig;
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });

  const maskedSecret = initial.rapydSecretKey
    ? `••••••••••••${initial.rapydSecretKey.slice(-4)}`
    : "(no configurada)";

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <span aria-hidden>💳</span> Pasarela Rapyd
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Configure las claves de su cuenta Rapyd para recibir pagos en línea (tarjeta, PSE,
            transferencia, billeteras). Cuando esté activa, los candidatos serán redirigidos al
            Hosted Checkout de Rapyd al pagar su inscripción.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${
            initial.rapydEnabled
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-slate-100 text-slate-600 ring-slate-200"
          }`}
        >
          {initial.rapydEnabled ? "Activa" : "Inactiva"}
        </span>
      </header>

      <form action={formAction} className="space-y-4">
        <FormError error={state.error} />
        {state.ok ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
            {state.message ?? "Configuración guardada."}
          </p>
        ) : null}

        {variant === "platform" && subscriberId ? (
          <input type="hidden" name="subscriberId" value={subscriberId} />
        ) : null}

        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm">
          <input
            type="checkbox"
            name="rapydEnabled"
            defaultChecked={initial.rapydEnabled}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <strong className="text-slate-800">Activar cobros por Rapyd</strong>
            <span className="block text-xs text-slate-500">
              Cuando esté activa, los nuevos pagos del flujo de inscripción se procesarán por Rapyd
              en lugar de quedar en aprobación manual.
            </span>
          </span>
        </label>

        <Field label="Ambiente" htmlFor="rapydEnv" hint="Use sandbox para pruebas y production para cobros reales.">
          <Select id="rapydEnv" name="rapydEnv" defaultValue={initial.rapydEnv ?? "sandbox"}>
            <option value="sandbox">sandbox (pruebas)</option>
            <option value="production">production (cobros reales)</option>
          </Select>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Clave de acceso (Access Key)"
            htmlFor="rapydAccessKey"
            hint="Empieza con 'rak_'. La encuentra en el Dashboard de Rapyd → Developers → Credentials."
          >
            <Input
              id="rapydAccessKey"
              name="rapydAccessKey"
              type="text"
              autoComplete="off"
              defaultValue={initial.rapydAccessKey ?? ""}
              placeholder="rak_..."
            />
          </Field>
          <Field
            label="Nueva clave secreta (Secret Key)"
            htmlFor="rapydSecretKey"
            hint={`Actual: ${maskedSecret}. Deje vacío para conservarla.`}
          >
            <Input
              id="rapydSecretKey"
              name="rapydSecretKey"
              type="password"
              autoComplete="new-password"
              placeholder="Pegar nueva rsk_... solo si desea rotarla"
            />
          </Field>
        </div>

        <Field label="Nota interna" htmlFor="rapydMerchantNote" hint="Opcional. P. ej. número de cuenta o referencia interna.">
          <Input
            id="rapydMerchantNote"
            name="rapydMerchantNote"
            type="text"
            defaultValue={initial.rapydMerchantNote ?? ""}
            placeholder="—"
          />
        </Field>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>URL del webhook (configúrela en Rapyd):</strong>
          <br />
          <code className="block break-all rounded bg-white/60 px-2 py-1 font-mono text-[11px] text-amber-900 ring-1 ring-amber-200">
            https://www.okacreditado.com/api/payments/rapyd/webhook
          </code>
          En el Dashboard de Rapyd → Developers → Webhooks, agregue esa URL con los eventos
          PAYMENT_COMPLETED, PAYMENT_FAILED, PAYMENT_EXPIRED y PAYMENT_REFUNDED.
        </div>

        <div className="flex items-center justify-end">
          <SubmitButton pendingText="Guardando…">Guardar configuración</SubmitButton>
        </div>
      </form>
    </section>
  );
}
