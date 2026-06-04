"use client";

import { useState } from "react";
import { PaymentApproveForm, PaymentRejectForm } from "@/components/payment-review-forms";

/// Acciones por fila de la tabla de pagos. Por defecto solo muestra los
/// botones "Aprobar" y "Rechazar"; al pulsar uno se despliega el formulario
/// inline debajo de la fila para no llenar la tabla.
export function PaymentRowActions({
  paymentId,
  providerRef,
}: {
  paymentId: string;
  providerRef: string | null;
}) {
  const [open, setOpen] = useState<"approve" | "reject" | null>(null);
  return (
    <div>
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => (v === "approve" ? null : "approve"))}
          className="rounded-md border border-emerald-300 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          ✓ Aprobar
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => (v === "reject" ? null : "reject"))}
          className="rounded-md border border-rose-300 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
        >
          ✕ Rechazar
        </button>
      </div>
      {open === "approve" ? (
        <PaymentApproveForm paymentId={paymentId} defaultRef={providerRef} />
      ) : null}
      {open === "reject" ? (
        <PaymentRejectForm paymentId={paymentId} />
      ) : null}
    </div>
  );
}
