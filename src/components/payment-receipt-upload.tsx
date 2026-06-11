"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadPaymentReceipt,
  requestPaymentReceiptUploadUrl,
  confirmPaymentReceiptUpload,
} from "@/lib/actions/enrollment";

/// Carga del SOPORTE de pago para un Payment PENDING (consignación).
///
/// Flujo presigned URL para bypassear el límite de body de Vercel:
///   1. Pide URL prefirmada PUT al bucket.
///   2. PUT directo al S3 desde el navegador (con barra de progreso).
///   3. Confirma al servidor (registra metadata + nota).
///
/// Fallback a POST clásico si el backend no tiene S3 (dev local).
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
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const file = fileRef.current?.files?.[0];
    const note = noteRef.current?.value ?? null;
    if (!file) {
      setError("Adjunte el comprobante de pago.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("El comprobante supera el tamaño máximo de 10 MB.");
      return;
    }

    startTransition(async () => {
      try {
        // 1. URL prefirmada.
        const req = await requestPaymentReceiptUploadUrl(paymentId, file.name, file.type, file.size);
        if (!req.ok) {
          setError(req.error ?? "No se pudo iniciar la subida.");
          return;
        }

        // 2a. Subida directa si hay URL.
        if (req.url && req.key && req.contentType) {
          await putToS3({ url: req.url, contentType: req.contentType, file, onProgress: setProgress });
          const confirm = await confirmPaymentReceiptUpload(paymentId, req.key, file.name, note);
          if (!confirm.ok) {
            setError(confirm.error ?? "Error al confirmar la subida.");
            return;
          }
          setMessage(confirm.message ?? "Soporte cargado.");
          setProgress(null);
          router.refresh();
          return;
        }

        // 2b. Fallback FormData.
        const fd = new FormData();
        fd.set("file", file);
        if (note) fd.set("note", note);
        const res = await uploadPaymentReceipt(paymentId, { ok: false }, fd);
        if (!res.ok) {
          setError(res.error ?? "No se pudo subir el comprobante.");
          return;
        }
        setMessage(res.message ?? "Soporte cargado.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
        setProgress(null);
      }
    });
  }

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

          <form onSubmit={handleSubmit} className="mt-4 space-y-2">
            <label className="block text-xs">
              <span className="font-semibold text-slate-700">Comprobante de pago (PDF/JPG/PNG) *</span>
              <input
                ref={fileRef}
                type="file"
                name="file"
                required
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={pending}
                className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-800 hover:file:bg-brand-100 disabled:opacity-50"
              />
            </label>
            <label className="block text-xs">
              <span className="font-semibold text-slate-700">Notas para el organismo (opcional)</span>
              <input
                ref={noteRef}
                type="text"
                name="note"
                placeholder="Ej. transferencia desde Bancolombia · ref. interna 12345"
                disabled={pending}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
              />
            </label>
            {progress !== null ? (
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
                  <div className="h-full rounded-full bg-amber-700 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[11px] text-amber-900">Subiendo… {progress}%</p>
              </div>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {pending
                ? progress !== null
                  ? "Subiendo…"
                  : "Procesando…"
                : hasReceipt
                ? "Reemplazar soporte"
                : "⬆ Subir soporte de pago"}
            </button>
            {error ? (
              <p className="rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700 ring-1 ring-rose-200">{error}</p>
            ) : null}
            {message ? (
              <p className="rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 ring-1 ring-emerald-200">
                {message}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

/// PUT del archivo directo al bucket S3 con la URL prefirmada (XHR para progreso).
function putToS3({
  url,
  contentType,
  file,
  onProgress,
}: {
  url: string;
  contentType: string;
  file: File;
  onProgress: (pct: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Subida fallida: HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Error de red durante la subida."));
    xhr.send(file);
  });
}
