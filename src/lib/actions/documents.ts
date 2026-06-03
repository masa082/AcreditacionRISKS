"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { syncEnrollmentStatus } from "@/lib/enrollment";
import { notifyCandidate } from "@/lib/notify";
import type { ActionResult } from "@/lib/actions/schemes";

const reviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().max(1000).optional().nullable(),
});

/// Revisa (aprueba/rechaza) un documento entregado por un candidato.
export async function reviewDocument(
  documentId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.DOCUMENT_REVIEW);

  const parsed = reviewSchema.safeParse({
    decision: formData.get("decision"),
    notes: (() => {
      const s = formData.get("notes");
      const v = typeof s === "string" ? s.trim() : "";
      return v.length ? v : null;
    })(),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  if (parsed.data.decision === "REJECTED" && !parsed.data.notes) {
    return { ok: false, error: "Indique el motivo del rechazo." };
  }

  const doc = await prisma.candidateDocument.findUnique({
    where: { id: documentId },
    include: {
      enrollment: { select: { id: true, subscriberId: true, candidateId: true } },
      requiredDocument: { select: { name: true } },
    },
  });
  if (!doc || doc.enrollment.subscriberId !== subscriberId) {
    return { ok: false, error: "Documento no encontrado." };
  }

  await prisma.candidateDocument.update({
    where: { id: documentId },
    data: {
      status: parsed.data.decision,
      reviewNotes: parsed.data.notes,
      reviewedById: ctx.userId,
      reviewedAt: new Date(),
    },
  });

  await syncEnrollmentStatus(doc.enrollment.id);
  const docName = doc.requiredDocument?.name ?? "Documento";
  await notifyCandidate(
    doc.enrollment.candidateId,
    "document.reviewed",
    parsed.data.decision === "APPROVED" ? "Documento aprobado" : "Documento rechazado",
    parsed.data.decision === "APPROVED" ? docName : `${docName}: ${parsed.data.notes ?? "revise las observaciones"}`,
  );
  await audit(ctx, {
    action: `document.${parsed.data.decision.toLowerCase()}`,
    entity: "CandidateDocument",
    entityId: documentId,
    subscriberId,
    after: { decision: parsed.data.decision },
  });
  revalidatePath(`/panel/candidatos`);
  return { ok: true };
}
