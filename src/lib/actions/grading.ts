"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { EnrollmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { sendExamScoreEmail } from "@/lib/email";
import { BRAND } from "@/lib/brand";
import type { ActionResult } from "@/lib/actions/schemes";

const gradeSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  comment: z.string().max(2000).optional().nullable(),
});

/// Califica manualmente una respuesta (abierta / caso / archivo) con
/// puntaje 0–100 y comentario.
///
/// La nota humana es 0–100 (legible para el evaluador). Internamente
/// reescalamos al `points` de la pregunta para que el cálculo agregado
/// del intento (rawScore / maxScore = scorePercent) siga siendo correcto
/// con preguntas de pesos distintos.
///
///   manualScore = nota humana (0–100)
///   finalScore  = manualScore * points / 100
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
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "El puntaje debe estar entre 0 y 100." };
  }

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
  const points = Number(answer.attemptQuestion.points.toString());
  const humanScore = parsed.data.score;          // 0..100
  const scaledFinal = (humanScore * points) / 100;

  await prisma.attemptAnswer.update({
    where: { id: answerId },
    data: {
      manualScore: new Prisma.Decimal(humanScore),
      finalScore: new Prisma.Decimal(scaledFinal),
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
    include: {
      exam: true,
      questions: { include: { answers: true } },
      candidate: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!attempt || attempt.subscriberId !== subscriberId) return;
  if (attempt.status !== "MANUAL_GRADING") return;

  // No se puede consolidar la calificación mientras existan solicitudes
  // de información adicional pendientes — el examen queda en espera de
  // la respuesta del candidato.
  const pendingInfo = await prisma.attemptInfoRequest.count({
    where: { attemptId, status: "PENDING" },
  });
  if (pendingInfo > 0) return;

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
  let nextStep: "COMMITTEE" | "CERTIFIED" | "APPROVED" | "REJECTED";
  if (passed && attempt.exam.requireCommittee) {
    attemptStatus = "PENDING_COMMITTEE";
    enrollmentStatus = "COMMITTEE";
    nextStep = "COMMITTEE";
  } else if (passed && attempt.exam.autoCertificate) {
    attemptStatus = "PASSED";
    enrollmentStatus = "CERTIFIED";
    nextStep = "CERTIFIED";
  } else if (passed) {
    attemptStatus = "PASSED";
    enrollmentStatus = "APPROVED";
    nextStep = "APPROVED";
  } else {
    attemptStatus = "FAILED";
    enrollmentStatus = "REJECTED";
    nextStep = "REJECTED";
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
      await audit(ctx, {
        action: "committee.review.create",
        entity: "CommitteeReview",
        entityId: attempt.enrollmentId,
        subscriberId,
        after: { trigger: "grading.finalize", scorePercent, passingScore },
      });
    }
  }

  // Notificar al candidato con su puntaje final tras la revisión manual.
  // Tolerante a fallos de SMTP/Resend para no bloquear el cierre del intento.
  try {
    if (attempt.candidate?.email) {
      await sendExamScoreEmail(subscriberId, attempt.candidate.email, {
        holderName: `${attempt.candidate.firstName} ${attempt.candidate.lastName}`.trim(),
        examName: attempt.exam.name,
        scorePercent,
        passingScore,
        passed,
        nextStep,
        portalUrl: `${BRAND.appUrl}/portal/inscripcion/${attempt.enrollmentId}`,
      });
    }
  } catch { /* email tolerante */ }

  await audit(ctx, {
    action: "attempt.grade.finalize",
    entity: "ExamAttempt",
    entityId: attemptId,
    subscriberId,
    after: { scorePercent, passingScore, passed, status: attemptStatus, nextStep },
  });
  revalidatePath(`/panel/calificacion/${attemptId}`);
  revalidatePath("/panel/calificacion");
}
