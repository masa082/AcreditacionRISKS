"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotState } from "@/lib/actions/password";

const initial: ForgotState = { ok: false };

export interface OrgOption {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
}

/**
 * Formulario de solicitud de restablecimiento.
 *
 * Seguridad:
 *  - El server action NUNCA devuelve el resetToken al cliente. El enlace
 *    para definir contraseña viaja SOLO por correo a la dirección
 *    registrada. Esta UI tampoco intenta navegar al token — solo
 *    confirma que se envió el correo (mensaje genérico que no revela
 *    si la cuenta existe).
 *
 * UX:
 *  - El campo "organización" deja de ser un input libre de slug y pasa a
 *    ser un SELECT poblado con los suscriptores activos. El candidato
 *    elige por nombre comercial sin errores tipográficos.
 *  - El select queda OPCIONAL en la mayoría de casos: solo es obligatorio
 *    si el correo está en varias organizaciones a la vez (el backend lo
 *    pedirá explícitamente en ese caso).
 *  - Mensaje de éxito genérico y consistente con buenas prácticas de
 *    enumeración (no revela si el correo existe).
 */
export function ForgotForm({ orgs }: { orgs: OrgOption[] }) {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  if (state.ok) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl">
          ✉️
        </div>
        <h2 className="text-base font-bold text-brand-900">Revise su correo</h2>
        <p className="mx-auto max-w-sm text-sm text-slate-600">
          {state.message ??
            "Si existe una cuenta con ese correo, le enviamos las instrucciones a su bandeja de entrada."}
        </p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
          <strong className="block font-bold text-brand-900">¿No le llegó el correo en pocos minutos?</strong>
          Revise la carpeta de spam o promociones. Si no aparece, contacte al administrador de su
          organismo para que verifique su correo registrado.
        </div>
        <div>
          <Link href="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            ← Volver a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {state.error}
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          placeholder="usuario@empresa.com"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          El que usó al registrarse o uno alterno verificado.
        </p>
      </div>

      <div>
        <label htmlFor="org" className="block text-sm font-semibold text-slate-700">
          Organización
        </label>
        <select
          id="org"
          name="org"
          defaultValue={orgs.length === 1 ? orgs[0].id : ""}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">— Cualquiera / no estoy seguro —</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          Elija el organismo certificador donde se registró. Si su correo solo está en una
          organización, déjelo en automático.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg btn-grad-navy px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:shadow-premium disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar instrucciones por correo"}
      </button>

      <div className="text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          ← Volver a iniciar sesión
        </Link>
      </div>
    </form>
  );
}
