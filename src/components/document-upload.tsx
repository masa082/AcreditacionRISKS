"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/form";
import { submitDocument } from "@/lib/actions/enrollment";
import type { ActionResult } from "@/lib/actions/schemes";

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
  const action = submitDocument.bind(null, enrollmentId);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, { ok: false });

  const badge = STATUS_ES[submission?.status ?? "PENDING"] ?? STATUS_ES.PENDING;
  const locked = submission?.status === "APPROVED";
  const accept = doc.acceptedTypes.length
    ? doc.acceptedTypes.map((t) => `.${t}`).join(",")
    : ".pdf,.jpg,.jpeg,.png";
  const fileUrl = submission ? `/api/files/${submission.id}` : null;

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
        <form action={formAction} className="mt-3 space-y-2">
          <FormError error={state.error} />
          <input type="hidden" name="requiredDocumentId" value={doc.id} />
          <input
            type="file"
            name="file"
            required
            accept={accept}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-800 hover:file:bg-brand-100"
          />
          <SubmitButton pendingText="Subiendo…">
            {submission ? "Reemplazar archivo" : "Adjuntar archivo"}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
