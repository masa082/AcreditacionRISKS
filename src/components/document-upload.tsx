"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  submitDocument,
  requestDocumentUploadUrl,
  confirmDocumentUpload,
} from "@/lib/actions/enrollment";

/**
 * Subida de un documento requerido por el candidato.
 *
 * Flujo "presigned URL" (bypass del límite de Vercel ~4.5 MB):
 *   1. Pide al servidor una URL prefirmada PUT al bucket S3.
 *   2. Hace PUT del archivo DIRECTAMENTE al bucket desde el navegador.
 *      El archivo nunca pasa por el serverless de Vercel.
 *   3. Llama al servidor para confirmar la subida (registra metadata).
 *
 * Fallback automático:
 *   - Si el backend no tiene S3 configurado (dev local) usamos el
 *     método clásico de FormData → submitDocument.
 *   - Si la llamada de presigned URL falla por cualquier motivo, también
 *     caemos al método clásico para no bloquear al candidato.
 */

const STATUS_ES: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: "En revisión", cls: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Aprobado", cls: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Rechazado", cls: "bg-rose-100 text-rose-700" },
  PENDING: { label: "Pendiente", cls: "bg-slate-100 text-slate-600" },
};

const IMAGE_EXTS = ["jpg", "jpeg", "png"];
function isImage(name: string | null): boolean {
  if (!name) return false;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTS.includes(ext);
}

interface Submission {
  id: string;
  fileName: string | null;
  status: string;
  reviewNotes: string | null;
}

export function DocumentUpload({
  enrollmentId,
  doc,
  submission,
}: {
  enrollmentId: string;
  doc: { id: string; name: string; description?: string | null; required: boolean; acceptedTypes: string[] };
  submission?: Submission;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const badge = STATUS_ES[submission?.status ?? "PENDING"] ?? STATUS_ES.PENDING;
  const locked = submission?.status === "APPROVED";
  const accept = doc.acceptedTypes.length
    ? doc.acceptedTypes.map((t) => `.${t}`).join(",")
    : ".pdf,.jpg,.jpeg,.png";
  const fileUrl = submission ? `/api/files/${submission.id}` : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Adjunte un archivo.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo supera el tamaño máximo de 10 MB.");
      return;
    }

    startTransition(async () => {
      try {
        // 1. Pedimos URL prefirmada al servidor.
        const result = await requestDocumentUploadUrl(
          enrollmentId,
          doc.id,
          file.name,
          file.type,
          file.size,
        );
        if (!result.ok) {
          setError(result.error ?? "No se pudo iniciar la subida.");
          return;
        }

        // 2a. Si hay URL prefirmada (producción con S3), subida directa.
        if (result.url && result.key && result.contentType) {
          await putToS3({
            url: result.url,
            contentType: result.contentType,
            file,
            onProgress: setProgress,
          });
          // 3. Confirmamos en el servidor (registra metadata).
          const confirm = await confirmDocumentUpload(
            enrollmentId,
            doc.id,
            result.key,
            file.name,
          );
          if (!confirm.ok) {
            setError(confirm.error ?? "Error al confirmar la subida.");
            return;
          }
          setProgress(null);
          router.refresh();
          return;
        }

        // 2b. Fallback (dev local sin S3): mandamos por FormData.
        const fd = new FormData();
        fd.set("requiredDocumentId", doc.id);
        fd.set("file", file);
        const res = await submitDocument(enrollmentId, { ok: false }, fd);
        if (!res.ok) {
          setError(res.error ?? "No se pudo subir el archivo.");
          return;
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado.");
        setProgress(null);
      }
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-800">
            {doc.name}
            {doc.required ? <span className="text-rose-500"> *</span> : <span className="ml-1 text-xs text-slate-400">(opcional)</span>}
          </div>
          {doc.description ? <p className="text-xs text-slate-400">{doc.description}</p> : null}
          <p className="mt-0.5 text-xs text-slate-400">
            Formatos: {(doc.acceptedTypes.length ? doc.acceptedTypes : ["pdf", "jpg", "png"]).join(", ")} · máx 10 MB
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {submission && fileUrl ? (
        <div className="mt-3 flex items-center gap-3">
          {isImage(submission.fileName) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={doc.name} className="h-16 w-16 rounded border border-slate-200 object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded border border-slate-200 bg-slate-50 text-2xl">📄</span>
          )}
          <div className="min-w-0 text-xs">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-brand-700 hover:underline">
              {submission.fileName ?? "Ver documento"}
            </a>
            {submission.reviewNotes ? (
              <p className="mt-1 text-rose-600">Observación: {submission.reviewNotes}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {!locked && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            name="file"
            required
            accept={accept}
            disabled={pending}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-800 hover:file:bg-brand-100 disabled:opacity-50"
          />
          {progress !== null ? (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-700 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Subiendo… {progress}%
              </p>
            </div>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {pending
              ? progress !== null
                ? "Subiendo…"
                : "Procesando…"
              : submission
              ? "Reemplazar archivo"
              : "Adjuntar archivo"}
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * PUT del archivo directo al bucket S3 con la URL prefirmada.
 * Usa XHR (no fetch) porque XHR sí emite eventos de progreso fiables.
 */
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
