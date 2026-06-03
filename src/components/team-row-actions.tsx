"use client";

import { useActionState, useState, useTransition } from "react";
import { Input, FormError } from "@/components/form";
import { setUserRole, setUserStatus, setUserPassword } from "@/lib/actions/team";
import type { ActionResult } from "@/lib/actions/schemes";

export function TeamRowActions({
  userId,
  currentRoleId,
  status,
  roles,
  isSelf,
}: {
  userId: string;
  currentRoleId: string | null;
  status: string;
  roles: { id: string; name: string }[];
  isSelf: boolean;
}) {
  const [pending, start] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const pwAction = setUserPassword.bind(null, userId);
  const [pwState, pwFormAction] = useActionState<ActionResult, FormData>(pwAction, { ok: false });

  return (
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
  );
}
