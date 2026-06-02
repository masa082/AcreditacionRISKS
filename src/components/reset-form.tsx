"use client";

import { useActionState } from "react";
import { resetPassword, type ResetState } from "@/lib/actions/password";

const initial: ResetState = { ok: false };

export function ResetForm({ token }: { token: string }) {
  const action = resetPassword.bind(null, token);
  const [state, formAction, pending] = useActionState<ResetState, FormData>(action, initial);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{state.error}</div>
      ) : null}
      <div>
        <label className="block text-sm font-medium text-slate-700">Nueva contraseña</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          placeholder="••••••••"
        />
        <p className="mt-1 text-xs text-slate-400">Mínimo 8 caracteres.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Confirmar contraseña</label>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Restablecer contraseña"}
      </button>
    </form>
  );
}
