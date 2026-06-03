"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { EnrollmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/schemes";

const gradeSchema = z.object({
  score: z.coerce.number().min(0),
  comment: z.string().max(2000).optional().nullable(),
});

/// Califica manualmente una respuesta (abierta / caso / archivo) con puntaje y comentario.
export async function gradeManualAnswer(
  answerId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.GRADE_MANUAL);
  const parsed = gradeSchema.safeParse({
    score: formData.get("score"),
    comment: (() => {
      const s = formData.get("comment");
      const v = typeof s === "string" ? s.trim() : "";
      return v.length ? v : null;
    })(),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const answer = await prisma.attemptAnswer.findUnique({
    where: { id: answerId },
    include: {
      attempt: { select: { subscriberId: true, id: true } },
      attemptQuestion: { select: { points: true } },
    },
  });
  if (!answer || answer.attempt.subscriberId !== subscriberId) {
    return { ok: false, error: "Respuesta no encontrada." };
  }
  const max = Number(answer.attemptQuestion.points.toString());
  if (parsed.data.score > max) {
    return { ok: false, error: `El puntaje no puede superar ${max}.` };
  }

  await prisma.attemptAnswer.update({
    where: { id: answerId },
    data: {
      manualScore: new Prisma.Decimal(parsed.data.score),
      finalScore: new Prisma.Decimal(parsed.data.score),
      graderComment: parsed.data.comment,
      gradedById: ctx.userId,
      status: "MANUALLY_SCORED",
    },
  });
  await audit(ctx, { action: "answer.grade", entity: "AttemptAnswer", entityId: answerId, subscriberId, after: { score: parsed.data.score } });
  revalidatePath(`/panel/calificacion/${answer.attempt.id}`);
  return { ok: true };
}

/// Finaliza la calificación de un intento: consolida puntaje y define el siguiente estado.
export async function finalizeManualGrading(attemptId: string): Promise<void> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.GRADE_MANUAL);
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: true, questions: { include: { answers: true } } },
  });
  if (!attempt || attempt.subscriberId !== subscriberId) return;
  if (attempt.status !== "MANUAL_GRADING") return;

  // Todas las respuestas manuales deben estar calificadas.
  const pending = attempt.questions.some((q) => {
    const snap = q.snapshot as { needsManual?: boolean };
    const ans = q.answers[0];
    return snap.needsManual && (!ans || ans.status !== "MANUALLY_SCORED");
  });
  if (pending) return; // aún faltan respuestas por calificar

  let rawScore = 0;
  for (const q of attempt.questions) {
    const ans = q.answers[0];
    if (ans?.finalScore != null) rawScore += Number(ans.finalScore.toString());
  }
  const maxScore = Number((attempt.maxScore ?? new Prisma.Decimal(0)).toString());
  const scorePercent = maxScore > 0 ? Math.round((rawScore / maxScore) * 10000) / 100 : 0;
  const passingScore = Number(attempt.exam.passingScore.toString());
  const passed = scorePercent >= passingScore;

  let attemptStatus: "PASSED" | "FAILED" | "PENDING_COMMITTEE";
  let enrollmentStatus: EnrollmentStatus;
  if (passed && attempt.exam.requireCommittee) {
    attemptStatus = "PENDING_COMMITTEE";
    enrollmentStatus = "COMMITTEE";
  } else if (passed) {
    attemptStatus = "PASSED";
    enrollmentStatus = attempt.exam.autoCertificate ? "CERTIFIED" : "APPROVED";
  } else {
    attemptStatus = "FAILED";
    enrollmentStatus = "REJECTED";
  }

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { status: attemptStatus, rawScore: new Prisma.Decimal(rawScore), scorePercent: new Prisma.Decimal(scorePercent), passed, gradedAt: new Date(), gradedById: ctx.userId },
  });
  await prisma.enrollment.update({ where: { id: attempt.enrollmentId }, data: { status: enrollmentStatus } });

  // Si pasa a comité, crear la revisión si no existe.
  if (attemptStatus === "PENDING_COMMITTEE") {
    const existing = await prisma.committeeReview.findFirst({ where: { enrollmentId: attempt.enrollmentId, attemptId } });
    if (!existing) {
      await prisma.committeeReview.create({
        data: { subscriberId, enrollmentId: attempt.enrollmentId, attemptId, decision: "PENDING" },
      });
    }
  }

  await audit(ctx, { action: "attempt.grade.finalize", entity: "ExamAttempt", entityId: attemptId, subscriberId, after: { scorePercent, passed, status: attemptStatus } });
  revalidatePath(`/panel/calificacion/${attemptId}`);
  revalidatePath("/panel/calificacion");
}
