"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Textarea, FormError } from "@/components/form";
import { reviewDocument } from "@/lib/actions/documents";
import type { ActionResult } from "@/lib/actions/schemes";

/**
 * Bloque de revisión de un documento por el suscriptor.
 *
 * Regla de negocio:
 *  - Para aprobar O rechazar, el revisor DEBE haber abierto el archivo
 *    al menos una vez. Esto evita aprobaciones a ciegas y deja huella
 *    en el flujo: el archivo se abrió ANTES de calificar.
 *  - La acción "abrir" se registra cuando el revisor hace clic en el
 *    botón "Abrir documento" (target="_blank") incluido en este mismo
 *    componente. Mientras no haya clic, los botones Aprobar/Rechazar
 *    permanecen deshabilitados y se muestra un aviso ámbar.
 *
 * El estado "viewed" vive en el cliente y se pierde al recargar — es
 * intencional. La regla es "vio el documento durante esta sesión de
 * revisión".
 */
function DecisionButton({
  decision,
  label,
  className,
  disabled,
}: {
  decision: string;
  label: string;
  className: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="decision"
      value={decision}
      disabled={disabled || pending}
      className={className}
    >
      {label}
    </button>
  );
}

export function DocumentReview({
  documentId,
  fileUrl,
  fileName,
}: {
  documentId: string;
  /** URL del archivo (e.g. `/api/files/{id}` o presigned). */
  fileUrl: string;
  /** Nombre legible del archivo, usado en el botón y como `download`. */
  fileName?: string | null;
}) {
  const action = reviewDocument.bind(null, documentId);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });
  const [viewed, setViewed] = useState(false);

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <FormError error={state.error} />

      {/* Visor del documento — el clic obligatorio para habilitar la calificación. */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-[12px] text-slate-600">
            <div className="font-semibold text-slate-800">
              {viewed ? "✓ Documento abierto" : "Abra el documento antes de calificar"}
            </div>
            <div className="truncate text-[11px] text-slate-500">
              {fileName ?? "Sin nombre de archivo"}
            </div>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setViewed(true)}
            onAuxClick={() => setViewed(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md btn-grad-navy px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition hover:shadow-premium"
          >
            🔍 Abrir documento ↗
          </a>
        </div>
        {!viewed ? (
          <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
            ⚠ Debe abrir el documento al menos una vez en una pestaña nueva antes de aprobarlo o rechazarlo.
          </p>
        ) : null}
      </div>

      <Textarea name="notes" rows={2} placeholder="Observaciones (obligatorias para rechazar)" />

      <div className="flex gap-2">
        <DecisionButton
          decision="APPROVED"
          label={viewed ? "✓ Aprobar" : "🔒 Aprobar"}
          disabled={!viewed}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <DecisionButton
          decision="REJECTED"
          label={viewed ? "✗ Rechazar" : "🔒 Rechazar"}
          disabled={!viewed}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {viewed ? (
          <span className="ml-auto self-center text-[11px] font-medium text-emerald-700">
            Listo para calificar
          </span>
        ) : null}
      </div>
    </form>
  );
}
