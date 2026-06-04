"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

const initial: LoginState = {};

/// Formulario de login. El campo "Identificador de organización" solo se
/// muestra cuando hay más de un suscriptor activo en la plataforma; lo
/// decide el server al cargar la página y se pasa por prop, para que
/// cuando RISKS sea el único organismo el usuario no vea ese campo.
export function LoginForm({ showOrgField }: { showOrgField: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const [showPwd, setShowPwd] = useState(false);

  return (
    <form action={action} className="space-y-5">
      {state.error ? (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-800 ring-1 ring-rose-200">
          <span aria-hidden className="mt-0.5 text-base leading-none">⚠️</span>
          <span>{state.error}</span>
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
          Correo electrónico
        </label>
        <div className="relative mt-1.5">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">✉</span>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="usuario@empresa.com"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-700 focus:ring-4 focus:ring-brand-100"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
            Contraseña
          </label>
          <a href="/recuperar" className="text-[11px] font-semibold text-brand-700 hover:text-brand-900 hover:underline">
            ¿Olvidó su contraseña?
          </a>
        </div>
        <div className="relative mt-1.5">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">🔒</span>
          <input
            id="password"
            name="password"
            type={showPwd ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-12 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-700 focus:ring-4 focus:ring-brand-100"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute inset-y-0 right-2 my-1 rounded-md px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPwd ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      {showOrgField ? (
        <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <summary className="cursor-pointer select-none text-xs font-semibold text-slate-600 hover:text-slate-900">
            ¿Pertenece a varios organismos? Indique el identificador
          </summary>
          <input
            name="org"
            type="text"
            placeholder="ej. risks-international"
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
          />
        </details>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-grad-navy group w-full rounded-xl px-4 py-3 text-sm font-bold"
      >
        <span className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition group-hover:opacity-100" aria-hidden />
        <span className="relative flex items-center justify-center gap-2">
          {pending ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Ingresando…</span>
            </>
          ) : (
            <>
              <span>Iniciar sesión</span>
              <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
            </>
          )}
        </span>
      </button>
    </form>
  );
}
