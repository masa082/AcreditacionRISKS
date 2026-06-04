"use client";

import { useActionState, useState, useTransition } from "react";
import { Input, FormError } from "@/components/form";
import { setUserRole, setUserStatus, setUserPassword, updateTeamUser } from "@/lib/actions/team";
import type { ActionResult } from "@/lib/actions/schemes";

interface TeamMemberInitial {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export function TeamRowActions({
  userId,
  currentRoleId,
  status,
  roles,
  isSelf,
  initial,
}: {
  userId: string;
  currentRoleId: string | null;
  status: string;
  roles: { id: string; name: string }[];
  isSelf: boolean;
  /** Datos actuales del miembro para inicializar el formulario de edición. */
  initial: TeamMemberInitial;
}) {
  const [pending, start] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const pwAction = setUserPassword.bind(null, userId);
  const [pwState, pwFormAction] = useActionState<ActionResult, FormData>(pwAction, { ok: false });

  const editBound = updateTeamUser.bind(null, userId);
  const [editState, editFormAction] = useActionState<ActionResult, FormData>(editBound, { ok: false });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          defaultValue={currentRoleId ?? ""}
          disabled={pending || isSelf}
          onChange={(e) => start(() => setUserRole(userId, e.target.value))}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-brand-600 disabled:opacity-60"
          title={isSelf ? "No puede cambiar su propio rol" : "Cambiar rol"}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setEditOpen((v) => !v)}
          className="rounded-lg border border-brand-300 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
          title="Editar datos personales del usuario"
        >
          ✎ Editar
        </button>

        {!isSelf ? (
          status === "SUSPENDED" ? (
            <button type="button" disabled={pending} onClick={() => start(() => setUserStatus(userId, "ACTIVE"))} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">Activar</button>
          ) : (
            <button type="button" disabled={pending} onClick={() => start(() => setUserStatus(userId, "SUSPENDED"))} className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60">Suspender</button>
          )
        ) : null}

        <button type="button" onClick={() => setResetOpen((v) => !v)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">Clave</button>

        {resetOpen ? (
          <form action={pwFormAction} className="flex items-center gap-1">
            <Input name="password" type="text" required minLength={8} placeholder="Nueva clave" className="w-32 text-xs" />
            <button type="submit" className="rounded-lg bg-slate-700 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-800">OK</button>
          </form>
        ) : null}
        {pwState.error ? <FormError error={pwState.error} /> : null}
        {pwState.ok ? <span className="text-xs text-emerald-700">✓ clave actualizada</span> : null}
      </div>

      {editOpen ? (
        <form
          action={editFormAction}
          className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs">
              <span className="block text-slate-500">Nombres</span>
              <Input name="firstName" type="text" required defaultValue={initial.firstName} className="text-xs" />
            </label>
            <label className="text-xs">
              <span className="block text-slate-500">Apellidos</span>
              <Input name="lastName" type="text" required defaultValue={initial.lastName} className="text-xs" />
            </label>
            <label className="text-xs">
              <span className="block text-slate-500">Correo</span>
              <Input name="email" type="email" required defaultValue={initial.email} className="text-xs" />
            </label>
            <label className="text-xs">
              <span className="block text-slate-500">Teléfono</span>
              <Input name="phone" type="tel" defaultValue={initial.phone ?? ""} className="text-xs" />
            </label>
          </div>
          {editState.error ? (
            <p className="mt-2 rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700 ring-1 ring-rose-200">
              {editState.error}
            </p>
          ) : null}
          {editState.ok ? (
            <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 ring-1 ring-emerald-200">
              {editState.message ?? "Datos actualizados."}
            </p>
          ) : null}
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancelar
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
