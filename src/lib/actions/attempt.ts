"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import type { EnrollmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCandidateAction } from "@/lib/guards";
import { audit } from "@/lib/audit";
import {
  buildAttemptQuestions,
  gradeAnswer,
  type QuestionSnapshot,
} from "@/lib/exam-attempt";
import { saveUpload, extFromName, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { issuePresentationCertificate } from "@/lib/certificate";
import type { ActionResult } from "@/lib/actions/schemes";

const FINISHED = ["SUBMITTED", "AUTO_GRADED", "MANUAL_GRADING", "GRADED", "PASSED", "FAILED", "PENDING_COMMITTEE", "VOID"];

async function reqMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

// ----------------------------------------------------------------------------
//  Iniciar o reanudar la presentación del examen de una inscripción.
// ----------------------------------------------------------------------------
export async function startAttempt(enrollmentId: string): Promise<void> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { exam: true },
  });
  if (!enrollment || enrollment.candidateId !== candidateId) throw new Error("NOT_FOUND");
  const exam = enrollment.exam;
  if (!exam || exam.status !== "PUBLISHED") throw new Error("La evaluación no está disponible.");
  if (!["READY", "IN_PROGRESS"].includes(enrollment.status)) {
    throw new Error("La inscripción aún no está lista para presentar.");
  }

  const attempts = await prisma.examAttempt.findMany({
    where: { enrollmentId },
    orderBy: { attemptNumber: "desc" },
  });
  const inProgress = attempts.find((a) => a.status === "IN_PROGRESS" || a.status === "NOT_STARTED");
  if (inProgress) redirect(`/portal/examen/${inProgress.id}`);

  const finished = attempts.filter((a) => FINISHED.includes(a.status));
  if (finished.length >= exam.attemptsAllowed) {
    redirect(`/portal/examen/${finished[0].id}/resultado`);
  }

  const questions = await buildAttemptQuestions(exam.id);
  if (questions.length === 0) throw new Error("La evaluación no tiene preguntas disponibles.");

  const meta = await reqMeta();
  const maxScore = questions.reduce((a, q) => a.plus(q.points), new Prisma.Decimal(0));
  const dueAt = new Date(Date.now() + exam.durationMin * 60 * 1000);

  const attempt = await prisma.examAttempt.create({
    data: {
      subscriberId,
      enrollmentId,
      examId: exam.id,
      candidateId,
      attemptNumber: attempts.length + 1,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      dueAt,
      maxScore,
      ip: meta.ip,
      userAgent: meta.userAgent,
      lastSavedAt: new Date(),
      questions: {
        create: questions.map((q) => ({
          questionId: q.questionId,
          order: q.order,
          points: q.points,
          sectionTitle: q.sectionTitle,
          snapshot: q.snapshot as unknown as Prisma.InputJsonValue,
        })),
      },
      events: { create: { type: "started", ip: meta.ip } },
    },
  });

  if (enrollment.status !== "IN_PROGRESS") {
    await prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: "IN_PROGRESS" } });
  }
  await audit(ctx, { action: "attempt.start", entity: "ExamAttempt", entityId: attempt.id, subscriberId, after: { examId: exam.id, questions: questions.length } });
  redirect(`/portal/examen/${attempt.id}`);
}

async function loadOwnedAttempt(candidateId: string, attemptId: string) {
  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.candidateId !== candidateId) throw new Error("NOT_FOUND");
  return attempt;
}

// ----------------------------------------------------------------------------
//  Autoguardar la respuesta de una pregunta.
// ----------------------------------------------------------------------------
export async function saveAnswer(
  attemptId: string,
  attemptQuestionId: string,
  response: { key?: string; keys?: string[] },
): Promise<{ ok: boolean }> {
  const { candidateId } = await requireCandidateAction();
  const attempt = await loadOwnedAttempt(candidateId, attemptId);
  if (attempt.status !== "IN_PROGRESS") return { ok: false };
  if (attempt.dueAt && attempt.dueAt.getTime() + 5000 < Date.now()) return { ok: false };

  const aq = await prisma.attemptQuestion.findUnique({ where: { id: attemptQuestionId }, select: { id: true, attemptId: true } });
  if (!aq || aq.attemptId !== attemptId) return { ok: false };

  const clean: Prisma.InputJsonValue = response.keys
    ? { keys: response.keys }
    : { key: response.key ?? "" };

  await prisma.attemptAnswer.upsert({
    where: { attemptQuestionId },
    create: { attemptId, attemptQuestionId, response: clean, status: "PENDING" },
    update: { response: clean, status: "PENDING" },
  });
  await prisma.examAttempt.update({ where: { id: attemptId }, data: { lastSavedAt: new Date() } });
  return { ok: true };
}

/// Autoguardar el texto de una respuesta abierta / caso práctico.
export async function saveTextAnswer(
  attemptId: string,
  attemptQuestionId: string,
  text: string,
): Promise<{ ok: boolean }> {
  const { candidateId } = await requireCandidateAction();
  const attempt = await loadOwnedAttempt(candidateId, attemptId);
  if (attempt.status !== "IN_PROGRESS") return { ok: false };
  if (attempt.dueAt && attempt.dueAt.getTime() + 5000 < Date.now()) return { ok: false };

  const aq = await prisma.attemptQuestion.findUnique({ where: { id: attemptQuestionId }, select: { id: true, attemptId: true } });
  if (!aq || aq.attemptId !== attemptId) return { ok: false };

  const existing = await prisma.attemptAnswer.findUnique({ where: { attemptQuestionId }, select: { response: true } });
  const prevResp = (existing?.response ?? {}) as Record<string, unknown>;
  const response: Prisma.InputJsonValue = { ...prevResp, text: text.slice(0, 20000) };

  await prisma.attemptAnswer.upsert({
    where: { attemptQuestionId },
    create: { attemptId, attemptQuestionId, response, status: "PENDING" },
    update: { response, status: "PENDING" },
  });
  await prisma.examAttempt.update({ where: { id: attemptId }, data: { lastSavedAt: new Date() } });
  return { ok: true };
}

/// Adjuntar un archivo de evidencia (PDF/imagen) a una respuesta.
export async function uploadAnswerFile(
  attemptId: string,
  attemptQuestionId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { candidateId, subscriberId } = await requireCandidateAction();
  const attempt = await loadOwnedAttempt(candidateId, attemptId);
  if (attempt.status !== "IN_PROGRESS") return { ok: false, error: "El examen ya no admite cambios." };
  if (attempt.dueAt && attempt.dueAt.getTime() + 5000 < Date.now()) return { ok: false, error: "El tiempo del examen finalizó." };

  const aq = await prisma.attemptQuestion.findUnique({ where: { id: attemptQuestionId }, select: { id: true, attemptId: true } });
  if (!aq || aq.attemptId !== attemptId) return { ok: false, error: "Pregunta inválida." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Adjunte un archivo." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "El archivo supera el tamaño máximo de 10 MB." };
  const ext = extFromName(file.name);
  if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) return { ok: false, error: "Formato no permitido (PDF/JPG/PNG)." };

  const { key } = await saveUpload(file, [subscriberId, "attempts", attemptId, attemptQuestionId]);
  const existing = await prisma.attemptAnswer.findUnique({ where: { attemptQuestionId }, select: { response: true } });
  await prisma.attemptAnswer.upsert({
    where: { attemptQuestionId },
    create: { attemptId, attemptQuestionId, fileUrl: key, response: { fileName: file.name } as Prisma.InputJsonValue, status: "PENDING" },
    update: { fileUrl: key, response: { ...((existing?.response ?? {}) as Record<string, unknown>), fileName: file.name } as Prisma.InputJsonValue },
  });
  await prisma.examAttempt.update({ where: { id: attemptId }, data: { lastSavedAt: new Date() } });
  revalidatePath(`/portal/examen/${attemptId}`);
  return { ok: true };
}

/// Registra un evento de proctoring/antifraude del intento (p. ej. salida de pantalla).
export async function recordAttemptEvent(
  attemptId: string,
  type: string,
): Promise<{ ok: boolean }> {
  const { candidateId } = await requireCandidateAction();
  const allowed = ["focus_lost", "blur", "resume", "fullscreen_exit", "paste"];
  if (!allowed.includes(type)) return { ok: false };
  const attempt = await loadOwnedAttempt(candidateId, attemptId);
  if (attempt.status !== "IN_PROGRESS") return { ok: false };
  const meta = await reqMeta();
  await prisma.attemptEvent.create({ data: { attemptId, type, ip: meta.ip } });
  return { ok: true };
}

// ----------------------------------------------------------------------------
//  Enviar y calificar automáticamente el intento.
// ----------------------------------------------------------------------------
export async function submitAttempt(attemptId: string): Promise<void> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: true, questions: { include: { answers: true } } },
  });
  if (!attempt || attempt.candidateId !== candidateId) throw new Error("NOT_FOUND");
  if (attempt.status !== "IN_PROGRESS") {
    redirect(`/portal/examen/${attemptId}/resultado`);
  }

  const passingScore = Number(attempt.exam.passingScore.toString());
  let rawScore = 0;
  let needsManual = false;

  for (const aq of attempt.questions) {
    const snapshot = aq.snapshot as unknown as QuestionSnapshot;
    const points = Number(aq.points.toString());
    const answer = aq.answers[0];
    const auto = gradeAnswer(snapshot, answer?.response, points);
    if (auto === null) {
      needsManual = true;
      await prisma.attemptAnswer.upsert({
        where: { attemptQuestionId: aq.id },
        create: { attemptId, attemptQuestionId: aq.id, response: (answer?.response ?? Prisma.JsonNull) as Prisma.InputJsonValue, status: "NEEDS_REVIEW" },
        update: { status: "NEEDS_REVIEW" },
      });
    } else {
      rawScore += auto;
      await prisma.attemptAnswer.upsert({
        where: { attemptQuestionId: aq.id },
        create: { attemptId, attemptQuestionId: aq.id, response: (answer?.response ?? Prisma.JsonNull) as Prisma.InputJsonValue, autoScore: new Prisma.Decimal(auto), finalScore: new Prisma.Decimal(auto), status: "AUTO_SCORED" },
        update: { autoScore: new Prisma.Decimal(auto), finalScore: new Prisma.Decimal(auto), status: "AUTO_SCORED" },
      });
    }
  }

  const maxScore = Number((attempt.maxScore ?? new Prisma.Decimal(0)).toString());
  const scorePercent = maxScore > 0 ? Math.round((rawScore / maxScore) * 10000) / 100 : 0;
  const meta = await reqMeta();

  let enrollmentStatus: EnrollmentStatus;
  let attemptStatus: "MANUAL_GRADING" | "PASSED" | "FAILED" | "PENDING_COMMITTEE";
  let passed: boolean | null;

  if (needsManual) {
    attemptStatus = "MANUAL_GRADING";
    enrollmentStatus = "GRADING";
    passed = null;
  } else {
    passed = scorePercent >= passingScore;
    if (passed) {
      if (attempt.exam.requireCommittee) {
        attemptStatus = "PENDING_COMMITTEE";
        enrollmentStatus = "COMMITTEE";
      } else {
        attemptStatus = "PASSED";
        enrollmentStatus = attempt.exam.autoCertificate ? "CERTIFIED" : "APPROVED";
      }
    } else {
      attemptStatus = "FAILED";
      enrollmentStatus = "REJECTED";
    }
  }

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      status: attemptStatus,
      submittedAt: new Date(),
      gradedAt: needsManual ? null : new Date(),
      rawScore: new Prisma.Decimal(rawScore),
      scorePercent: new Prisma.Decimal(scorePercent),
      passed,
      events: { create: { type: "submit", ip: meta.ip, data: { scorePercent } as Prisma.InputJsonValue } },
    },
  });
  await prisma.enrollment.update({ where: { id: attempt.enrollmentId }, data: { status: enrollmentStatus } });

  // Constancia de presentación del examen (no debe romper el envío).
  try {
    await issuePresentationCertificate(attemptId);
  } catch {
    /* la constancia se puede reintentar después */
  }

  await audit(ctx, {
    action: "attempt.submit",
    entity: "ExamAttempt",
    entityId: attemptId,
    subscriberId,
    after: { scorePercent, passed, status: attemptStatus },
  });
  revalidatePath(`/portal/inscripcion/${attempt.enrollmentId}`);
  redirect(`/portal/examen/${attemptId}/resultado`);
}
