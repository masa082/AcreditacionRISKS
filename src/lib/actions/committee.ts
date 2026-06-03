"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/schemes";

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

const voteSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "REREVIEW"]),
  conflictOfInterest: z.boolean(),
  comment: z.string().max(2000).optional().nullable(),
});

/// Registra (o actualiza) el voto de un miembro del comité.
export async function castVote(
  reviewId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.COMMITTEE_REVIEW);
  const parsed = voteSchema.safeParse({
    decision: formData.get("decision"),
    conflictOfInterest: formData.get("conflictOfInterest") === "on",
    comment: clean(formData.get("comment")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const review = await prisma.committeeReview.findUnique({ where: { id: reviewId }, select: { id: true, subscriberId: true, closedAt: true } });
  if (!review || review.subscriberId !== subscriberId) return { ok: false, error: "Revisión no encontrada." };
  if (review.closedAt) return { ok: false, error: "La revisión ya está cerrada." };
  if (parsed.data.decision !== "REREVIEW" && !parsed.data.conflictOfInterest && !parsed.data.comment) {
    return { ok: false, error: "Incluya una observación que sustente su voto." };
  }

  await prisma.committeeVote.upsert({
    where: { reviewId_memberId: { reviewId, memberId: ctx.userId } },
    create: {
      reviewId,
      memberId: ctx.userId,
      decision: parsed.data.decision,
      conflictOfInterest: parsed.data.conflictOfInterest,
      comment: parsed.data.comment,
      signedAt: new Date(),
    },
    update: {
      decision: parsed.data.decision,
      conflictOfInterest: parsed.data.conflictOfInterest,
      comment: parsed.data.comment,
      signedAt: new Date(),
    },
  });
  await audit(ctx, { action: "committee.vote", entity: "CommitteeReview", entityId: reviewId, subscriberId, after: { decision: parsed.data.decision, conflictOfInterest: parsed.data.conflictOfInterest } });
  revalidatePath(`/panel/comite/${reviewId}`);
  return { ok: true };
}

const closeSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  observations: z.string().max(4000).optional().nullable(),
});

/// Cierra la revisión con la decisión final del comité y actualiza la inscripción.
export async function closeReview(
  reviewId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.COMMITTEE_DECIDE);
  const parsed = closeSchema.safeParse({
    decision: formData.get("decision"),
    observations: clean(formData.get("observations")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const review = await prisma.committeeReview.findUnique({
    where: { id: reviewId },
    include: { enrollment: { select: { id: true } }, attempt: { select: { id: true } }, votes: true },
  });
  if (!review || review.subscriberId !== subscriberId) return { ok: false, error: "Revisión no encontrada." };
  if (review.closedAt) return { ok: false, error: "La revisión ya está cerrada." };

  const validVotes = review.votes.filter((v) => !v.conflictOfInterest);
  if (validVotes.length === 0) {
    return { ok: false, error: "Debe existir al menos un voto sin conflicto de interés antes de decidir." };
  }

  await prisma.committeeReview.update({
    where: { id: reviewId },
    data: { decision: parsed.data.decision, observations: parsed.data.observations, closedAt: new Date() },
  });

  const approved = parsed.data.decision === "APPROVED";
  await prisma.enrollment.update({ where: { id: review.enrollmentId }, data: { status: approved ? "APPROVED" : "REJECTED" } });
  if (review.attemptId) {
    await prisma.examAttempt.update({ where: { id: review.attemptId }, data: { status: approved ? "PASSED" : "FAILED", passed: approved } });
  }

  await audit(ctx, { action: "committee.decide", entity: "CommitteeReview", entityId: reviewId, subscriberId, after: { decision: parsed.data.decision } });
  revalidatePath(`/panel/comite/${reviewId}`);
  revalidatePath("/panel/comite");
  return { ok: true };
}
