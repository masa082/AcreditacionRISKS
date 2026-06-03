"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotState } from "@/lib/actions/password";

const initial: ForgotState = { ok: false };

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  if (state.ok) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">✉️</div>
        <p className="text-sm text-slate-600">{state.message}</p>
        {state.resetToken ? (
          <>
            <p className="text-xs text-slate-400">
              Entorno de demostración (sin servidor de correo): use el siguiente enlace para
              restablecer su contraseña.
            </p>
            <Link
              href={`/restablecer/${state.resetToken}`}
              className="inline-block rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
            >
              Restablecer mi contraseña
            </Link>
          </>
        ) : null}
        <div>
          <Link href="/login" className="text-sm text-brand-700 hover:underline">Volver a iniciar sesión</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{state.error}</div>
      ) : null}
      <div>
        <label className="block text-sm font-medium text-slate-700">Correo electrónico</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          placeholder="usuario@empresa.com"
        />
      </div>
      <details className="text-sm text-slate-500">
        <summary className="cursor-pointer select-none">¿Varias organizaciones? Indique el identificador</summary>
        <input
          name="org"
          type="text"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          placeholder="ej. risks"
        />
      </details>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar instrucciones"}
      </button>
      <div className="text-center">
        <Link href="/login" className="text-sm text-brand-700 hover:underline">Volver a iniciar sesión</Link>
      </div>
    </form>
  );
}
