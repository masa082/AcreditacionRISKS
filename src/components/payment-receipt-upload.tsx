"use client";

import { useActionState } from "react";
import { uploadPaymentReceipt } from "@/lib/actions/enrollment";
import type { ActionResult } from "@/lib/actions/schemes";

/// Carga del SOPORTE de pago para un Payment PENDING (consignación).
/// El candidato adjunta su comprobante (PDF o imagen JPG/PNG) y opcional
/// una nota. Mientras esté pendiente de verificación, el botón principal
/// para avanzar al examen permanece bloqueado en la inscripción.
export function PaymentReceiptUpload({
  paymentId,
  hasReceipt,
  receiptName,
  bankingInfo,
  amount,
  currency,
}: {
  paymentId: string;
  hasReceipt: boolean;
  receiptName?: string | null;
  bankingInfo?: string | null;
  amount: string;
  currency: string;
}) {
  const bound = uploadPaymentReceipt.bind(null, paymentId);
  const [state, action, pending] = useActionState<ActionResult, FormData>(bound, { ok: false });

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50/40 p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-2xl">⏳</span>
        <div className="flex-1">
          <h3 className="text-base font-bold text-amber-900">Su pago está pendiente de verificación</h3>
          <p className="mt-1 text-sm text-amber-900">
            Para que el organismo confirme su pago y usted pueda avanzar al examen, por favor{" "}
            <strong>suba el soporte (comprobante) de su transferencia o consignación</strong>.
            Hasta que el SUSCRIPTOR verifique el soporte, esta inscripción <strong>no podrá avanzar</strong>.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-amber-200 bg-white p-3 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Recuerde transferir</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{amount} <span className="text-xs text-slate-500">{currency}</span> + IVA</div>
            </div>
            {bankingInfo ? (
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Cuenta destino</div>
                <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[10px] text-slate-700">{bankingInfo}</pre>
              </div>
            ) : null}
          </div>

          <ol className="mt-4 ml-4 list-decimal space-y-1 text-xs text-amber-900">
            <li>Realice la transferencia o consignación a la cuenta indicada.</li>
            <li>Tome foto/captura del comprobante (o descargue el PDF que da su banco).</li>
            <li>Adjúntelo aquí abajo. <strong>Formatos:</strong> PDF, JPG o PNG · <strong>máx 10 MB</strong>.</li>
            <li>El organismo lo verificará y le notificará por correo cuando esté aprobado.</li>
          </ol>

          {hasReceipt ? (
            <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              <strong>✓ Soporte cargado:</strong> {receiptName ?? "comprobante"}. Está en revisión por el
              organismo. Puede reemplazarlo si subió el archivo equivocado.
            </div>
          ) : null}

          <form action={action} className="mt-4 space-y-2">
            <label className="block text-xs">
              <span className="font-semibold text-slate-700">Comprobante de pago (PDF/JPG/PNG) *</span>
              <input
                type="file"
                name="file"
                required
                accept=".pdf,.jpg,.jpeg,.png"
                className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-800 hover:file:bg-brand-100"
              />
            </label>
            <label className="block text-xs">
              <span className="font-semibold text-slate-700">Notas para el organismo (opcional)</span>
              <input
                type="text"
                name="note"
                placeholder="Ej. transferencia desde Bancolombia · ref. interna 12345"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {pending ? "Cargando…" : hasReceipt ? "Reemplazar soporte" : "⬆ Subir soporte de pago"}
            </button>
            {state.error ? (
              <p className="rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700 ring-1 ring-rose-200">
                {state.error}
              </p>
            ) : null}
            {state.ok ? (
              <p className="rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 ring-1 ring-emerald-200">
                {state.message ?? "Soporte cargado."}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
