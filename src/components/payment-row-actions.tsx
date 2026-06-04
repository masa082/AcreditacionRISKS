"use client";

import { useState } from "react";
import { PaymentApproveForm, PaymentRejectForm } from "@/components/payment-review-forms";
import { PaymentAdminReceipt } from "@/components/payment-admin-receipt";

/// Acciones por fila de la tabla de pagos. Por defecto muestra tres botones:
///   - Aprobar
///   - Rechazar
///   - Cargar soporte  (el organismo adjunta el comprobante; puede aprobar
///                      en el mismo paso si todavía está PENDING).
/// Cada uno despliega su propio formulario inline.
export function PaymentRowActions({
  paymentId,
  providerRef,
  status,
}: {
  paymentId: string;
  providerRef: string | null;
  status: string;
}) {
  const [open, setOpen] = useState<"approve" | "reject" | "receipt" | null>(null);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {status === "PENDING" ? (
          <button
            type="button"
            onClick={() => setOpen((v) => (v === "approve" ? null : "approve"))}
            className="rounded-md border border-emerald-300 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            ✓ Aprobar
          </button>
        ) : null}
        {status === "PENDING" ? (
          <button
            type="button"
            onClick={() => setOpen((v) => (v === "reject" ? null : "reject"))}
            className="rounded-md border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
          >
            ✕ Rechazar
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((v) => (v === "receipt" ? null : "receipt"))}
          className="rounded-md border border-violet-300 px-2 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-50"
        >
          📎 Soporte
        </button>
      </div>
      {open === "approve" ? (
        <PaymentApproveForm paymentId={paymentId} defaultRef={providerRef} />
      ) : null}
      {open === "reject" ? (
        <PaymentRejectForm paymentId={paymentId} />
      ) : null}
      {open === "receipt" ? (
        <PaymentAdminReceipt paymentId={paymentId} defaultProviderRef={providerRef} status={status} />
      ) : null}
    </div>
  );
}
