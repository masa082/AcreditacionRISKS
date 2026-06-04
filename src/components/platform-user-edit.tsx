"use client";

import { useActionState, useState } from "react";
import { Input, Select } from "@/components/form";
import { updateUserByPlatform } from "@/lib/actions/platform";
import type { ActionResult } from "@/lib/actions/schemes";

/// Tarjeta de edición de un usuario por parte del SUPERADMIN. Aparece colapsada
/// y se expande al hacer clic en "Editar". Permite cambiar nombre, apellidos,
/// correo, teléfono y estado del usuario.
export function PlatformUserEdit({
  userId,
  initial,
}: {
  userId: string;
  initial: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    status: "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION";
  };
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionResult, FormData>(updateUserByPlatform, { ok: false });

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-brand-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
      >
        ✎ Editar
      </button>
      {open ? (
        <form action={action} className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <input type="hidden" name="userId" value={userId} />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs">
              <span className="block text-slate-500">Nombres</span>
              <Input name="firstName" required defaultValue={initial.firstName} className="text-xs" />
            </label>
            <label className="text-xs">
              <span className="block text-slate-500">Apellidos</span>
              <Input name="lastName" required defaultValue={initial.lastName} className="text-xs" />
            </label>
            <label className="text-xs">
              <span className="block text-slate-500">Correo</span>
              <Input name="email" type="email" required defaultValue={initial.email} className="text-xs" />
            </label>
            <label className="text-xs">
              <span className="block text-slate-500">Teléfono</span>
              <Input name="phone" type="tel" defaultValue={initial.phone ?? ""} className="text-xs" />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="block text-slate-500">Estado</span>
              <Select name="status" defaultValue={initial.status} className="text-xs">
                <option value="ACTIVE">Activo</option>
                <option value="SUSPENDED">Suspendido</option>
                <option value="PENDING_VERIFICATION">Pendiente de verificación</option>
              </Select>
            </label>
          </div>
          {state.error ? (
            <p className="mt-2 rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700 ring-1 ring-rose-200">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 ring-1 ring-emerald-200">
              {state.message ?? "Datos actualizados."}
            </p>
          ) : null}
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cerrar
            </button>
            <button type="submit" className="rounded-md btn-grad-navy px-3 py-1 text-xs font-semibold text-white">
              Guardar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
