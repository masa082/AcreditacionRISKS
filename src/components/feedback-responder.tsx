"use client";

import { useActionState, useState } from "react";
import { respondFeedback, updateFeedbackMeta } from "@/lib/actions/feedback";
import type { ActionResult } from "@/lib/actions/schemes";

/// Panel lateral para que el SUPERADMIN responda el ticket de feedback,
/// cambie su estado y prioridad o agregue notas internas. La respuesta
/// queda guardada y, una vez asignada, no se sobreescribe automáticamente
/// (se mantiene el historial en la vista principal).
export function FeedbackResponder({
  ticketId,
  currentStatus,
  currentPriority,
  currentNotes,
  alreadyResponded,
}: {
  ticketId: string;
  currentStatus: string;
  currentPriority: string;
  currentNotes: string | null;
  alreadyResponded: boolean;
}) {
  const [tab, setTab] = useState<"respond" | "meta">(alreadyResponded ? "meta" : "respond");
  const respond = respondFeedback.bind(null, ticketId);
  const update = updateFeedbackMeta.bind(null, ticketId);
  const [rState, rAction, rPending] = useActionState<ActionResult, FormData>(respond, { ok: false });
  const [mState, mAction, mPending] = useActionState<ActionResult, FormData>(update, { ok: false });

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setTab("respond")}
          className={`rounded-t-md px-3 py-1.5 font-semibold ${tab === "respond" ? "bg-violet-100 text-violet-800" : "text-slate-600 hover:bg-slate-50"}`}
        >
          {alreadyResponded ? "Editar respuesta" : "Responder"}
        </button>
        <button
          type="button"
          onClick={() => setTab("meta")}
          className={`rounded-t-md px-3 py-1.5 font-semibold ${tab === "meta" ? "bg-violet-100 text-violet-800" : "text-slate-600 hover:bg-slate-50"}`}
        >
          Estado / notas
        </button>
      </div>

      {tab === "respond" ? (
        <form action={rAction} className="mt-3 space-y-3">
          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Respuesta al autor</span>
            <textarea
              name="response"
              required
              minLength={5}
              maxLength={4000}
              rows={6}
              placeholder="Cuéntele al autor qué hicieron con su feedback. Esta respuesta se le envía por correo."
              className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Estado al guardar</span>
            <select
              name="status"
              defaultValue="RESOLVED"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="RESOLVED">Resuelto</option>
              <option value="IN_PROGRESS">En atención</option>
              <option value="IN_REVIEW">En revisión</option>
              <option value="CLOSED">Cerrado</option>
            </select>
          </label>
          {rState.error ? (
            <p className="rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700 ring-1 ring-rose-200">{rState.error}</p>
          ) : null}
          {rState.ok ? (
            <p className="rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 ring-1 ring-emerald-200">
              {rState.message ?? "Respuesta enviada."}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={rPending}
            className="w-full rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60"
          >
            {rPending ? "Enviando…" : "Enviar respuesta"}
          </button>
        </form>
      ) : (
        <form action={mAction} className="mt-3 space-y-3">
          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Estado</span>
            <select
              name="status"
              defaultValue={currentStatus}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="OPEN">Abierto</option>
              <option value="IN_REVIEW">En revisión</option>
              <option value="IN_PROGRESS">En atención</option>
              <option value="RESOLVED">Resuelto</option>
              <option value="CLOSED">Cerrado</option>
            </select>
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Prioridad</span>
            <select
              name="priority"
              defaultValue={currentPriority}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="LOW">Baja</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </label>
          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Notas internas (no visibles al autor)</span>
            <textarea
              name="internalNotes"
              defaultValue={currentNotes ?? ""}
              rows={4}
              className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          {mState.error ? (
            <p className="rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700 ring-1 ring-rose-200">{mState.error}</p>
          ) : null}
          {mState.ok ? (
            <p className="rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 ring-1 ring-emerald-200">
              {mState.message ?? "Actualizado."}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={mPending}
            className="w-full rounded-lg bg-brand-800 px-4 py-2 text-sm font-bold text-white hover:bg-brand-900 disabled:opacity-60"
          >
            {mPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      )}
    </div>
  );
}
