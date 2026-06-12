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
  buildSnapshot,
  publicSnapshot,
  gradeAnswer,
  type QuestionSnapshot,
} from "@/lib/exam-attempt";
import { saveUpload, extFromName, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { issuePresentationCertificate } from "@/lib/certificate";
import { sendExamScoreEmail } from "@/lib/email";
import { BRAND } from "@/lib/brand";
import { EXAM_CONSENT_TEXT } from "@/lib/exam-consent";
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
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "El archivo supera el tamaño máximo de 100 MB." };
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

/// Registra un evento de proctoring/antifraude del intento.
/// Tipos soportados (ver hooks del exam-runner):
///   focus_lost | blur | resume | fullscreen_exit | paste
///   print_screen | copy | cut | context_menu | dev_tools
///   question_time | question_change
///   screen_record_attempt | recording_warning_shown | abandonment_warning
///   forced_abandon | beforeunload_attempt
export async function recordAttemptEvent(
  attemptId: string,
  type: string,
  metadata?: { questionId?: string; ms?: number; details?: string },
): Promise<{ ok: boolean }> {
  const { candidateId } = await requireCandidateAction();
  const allowed = [
    "focus_lost", "blur", "resume", "fullscreen_exit", "paste",
    "print_screen", "copy", "cut", "context_menu", "dev_tools",
    "question_time", "question_change",
    // Reporte de novedad del candidato durante la presentación
    // (corte de luz, internet inestable, dudas, etc.). Texto en `details`.
    "incident_report",
    // Antifraude reforzado (sesión de evaluación):
    "screen_record_attempt",      // Cmd+Shift+5 (macOS), Win+G (Windows Game Bar), etc.
    "recording_warning_shown",    // Se mostró advertencia de no-grabación
    "abandonment_warning",        // Advertencia "no salir de la sesión" mostrada
    "beforeunload_attempt",       // Intento de cerrar la pestaña/navegar fuera
    "forced_abandon",             // Auto-cierre por superar el tope de infracciones
  ];
  if (!allowed.includes(type)) return { ok: false };
  const attempt = await loadOwnedAttempt(candidateId, attemptId);
  if (attempt.status !== "IN_PROGRESS") return { ok: false };
  const meta = await reqMeta();
  const data: Record<string, unknown> = {};
  if (metadata?.questionId) data.questionId = metadata.questionId;
  if (metadata?.ms !== undefined) data.ms = metadata.ms;
  if (metadata?.details) data.details = metadata.details;
  await prisma.attemptEvent.create({
    data: {
      attemptId, type, ip: meta.ip,
      data: Object.keys(data).length ? (data as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
  return { ok: true };
}

// ----------------------------------------------------------------------------
//  Consentimiento previo del candidato (server-side, con audit log).
// ----------------------------------------------------------------------------
// El texto canónico del consentimiento vive en src/lib/exam-consent.ts (no en
// este archivo "use server", donde Next.js no permite exportar strings).
// Se importa al inicio del archivo y se snapshotea en cada intento.

/// Registra el consentimiento del candidato para iniciar la prueba.
/// Marca consentAcceptedAt + snapshot del texto + audit log. Sin
/// consentimiento el runner del examen NO debe permitir interacción
/// (ver gate cliente y validación servidor en saveAnswer).
export async function acceptExamConsent(
  attemptId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const attempt = await loadOwnedAttempt(candidateId, attemptId);
  if (attempt.status !== "IN_PROGRESS") {
    return { ok: false, error: "El intento no está en curso." };
  }
  if (attempt.consentAcceptedAt) {
    // Idempotente: si ya lo aceptó, no auditamos de nuevo.
    return { ok: true };
  }
  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { consentAcceptedAt: new Date(), consentText: EXAM_CONSENT_TEXT },
  });
  const meta = await reqMeta();
  await prisma.attemptEvent.create({
    data: { attemptId, type: "consent_accepted", ip: meta.ip },
  });
  await audit(ctx, {
    action: "attempt.consent.accept",
    entity: "ExamAttempt",
    entityId: attemptId,
    subscriberId,
    after: { acceptedAt: new Date().toISOString() },
  });
  return { ok: true };
}

// ----------------------------------------------------------------------------
//  Cambiar una pregunta del intento por otra del mismo banco.
//
//  El candidato tiene un cupo (exam.questionSwapsAllowed, default 5) para
//  pedir reemplazo de pregunta durante la presentación. Cada cambio:
//   - Trae OTRA pregunta APPROVED del MISMO banco/sección, excluyendo TODAS
//     las que ya hayan aparecido en este intento (las sirvió inicialmente o
//     las trajo un swap previo) — sin repeticiones.
//   - Reemplaza el AttemptQuestion en sitio (mismo `order`), regenera el
//     snapshot público.
//   - Borra cualquier AttemptAnswer previa para esa pregunta (empieza limpio).
//   - Incrementa swapsUsed + audita la acción.
//   - Marca evento `question_change` con metadata para trazabilidad.
// ----------------------------------------------------------------------------
export async function swapAttemptQuestion(
  attemptId: string,
  attemptQuestionId: string,
): Promise<{ ok: boolean; error?: string; newQuestion?: { statement: string; options: { key: string; text: string }[]; multiple: boolean; manual: boolean; contextText: string | null } }> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { select: { questionSwapsAllowed: true, randomizeOptions: true } },
      questions: { select: { id: true, questionId: true, sectionTitle: true, order: true, points: true } },
    },
  });
  if (!attempt || attempt.candidateId !== candidateId) return { ok: false, error: "Intento no encontrado." };
  if (attempt.status !== "IN_PROGRESS") return { ok: false, error: "El intento no está en curso." };

  if (!attempt.consentAcceptedAt) {
    return { ok: false, error: "Debe aceptar el consentimiento antes de pedir un cambio." };
  }

  const allowed = attempt.exam.questionSwapsAllowed ?? 0;
  if (allowed <= 0) return { ok: false, error: "Este examen no permite cambio de preguntas." };
  if (attempt.swapsUsed >= allowed) {
    return { ok: false, error: `Ya usó sus ${allowed} cambios disponibles.` };
  }

  const aq = attempt.questions.find((q) => q.id === attemptQuestionId);
  if (!aq) return { ok: false, error: "Pregunta no encontrada en el intento." };

  // Cargamos la pregunta original para saber a qué banco/sección pertenecía.
  const originalQuestion = await prisma.question.findUnique({
    where: { id: aq.questionId },
    select: { bankId: true, difficulty: true, topicId: true },
  });
  if (!originalQuestion) return { ok: false, error: "No se pudo determinar el banco origen." };

  // Excluir TODAS las preguntas ya servidas en este intento.
  const usedQuestionIds = attempt.questions.map((q) => q.questionId);

  // Buscar un reemplazo del MISMO banco (y misma dificultad/topic si aplica)
  // que NO esté en la lista de usadas.
  const pool = await prisma.question.findMany({
    where: {
      subscriberId,
      bankId: originalQuestion.bankId ?? undefined,
      status: "APPROVED",
      id: { notIn: usedQuestionIds },
      ...(originalQuestion.difficulty ? { difficulty: originalQuestion.difficulty } : {}),
      ...(originalQuestion.topicId ? { topicId: originalQuestion.topicId } : {}),
    },
    include: { options: true },
  });

  if (pool.length === 0) {
    return {
      ok: false,
      error: "No hay más preguntas disponibles en el banco que cumplan el filtro. No se descuenta el cupo.",
    };
  }

  // Selección aleatoria simple sobre el pool.
  const newQ = pool[Math.floor(Math.random() * pool.length)];

  // Construimos el snapshot completo (mismo helper que usa startAttempt para
  // mantener consistencia: tipos, opciones, claves correctas).
  const snapshot = buildSnapshot(newQ, attempt.exam.randomizeOptions);

  // Reemplazo atómico + bump del contador + limpiar respuesta previa.
  await prisma.$transaction([
    prisma.attemptAnswer.deleteMany({ where: { attemptQuestionId } }),
    prisma.attemptQuestion.update({
      where: { id: attemptQuestionId },
      data: {
        questionId: newQ.id,
        points: aq.points,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.examAttempt.update({
      where: { id: attemptId },
      data: { swapsUsed: { increment: 1 } },
    }),
    prisma.attemptEvent.create({
      data: {
        attemptId,
        type: "question_change",
        data: {
          attemptQuestionId,
          oldQuestionId: aq.questionId,
          newQuestionId: newQ.id,
          remaining: allowed - (attempt.swapsUsed + 1),
        } as Prisma.InputJsonValue,
      },
    }),
  ]);

  await audit(ctx, {
    action: "attempt.question.swap",
    entity: "ExamAttempt",
    entityId: attemptId,
    subscriberId,
    after: {
      attemptQuestionId,
      oldQuestionId: aq.questionId,
      newQuestionId: newQ.id,
      swapsUsed: attempt.swapsUsed + 1,
      swapsAllowed: allowed,
    },
  });

  // Snapshot PÚBLICO (sin la respuesta correcta) para refrescar la pregunta
  // en el cliente sin recargar la página.
  const pub = publicSnapshot(snapshot);
  return {
    ok: true,
    newQuestion: {
      statement: pub.statement,
      options: pub.options,
      multiple: pub.multiple,
      manual: pub.manual,
      contextText: pub.contextText,
    },
  };
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
  // Defensa en profundidad: el modal cliente impide interactuar sin firmar,
  // pero igualmente verificamos aquí que el consentimiento esté registrado
  // antes de calificar y cerrar el intento. Sin firma → error (no se debe
  // calificar ni notificar a un candidato que no aceptó las reglas).
  if (!attempt.consentAcceptedAt) {
    throw new Error("CONSENT_REQUIRED");
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
  // Para el email + email-template usamos un "nextStep" legible.
  let nextStep: "COMMITTEE" | "CERTIFIED" | "APPROVED" | "REJECTED" | "MANUAL_GRADING";

  if (needsManual) {
    attemptStatus = "MANUAL_GRADING";
    enrollmentStatus = "GRADING";
    passed = null;
    nextStep = "MANUAL_GRADING";
  } else {
    passed = scorePercent >= passingScore;
    if (passed) {
      // Política operativa: toda aprobación de prueba teórica pasa por el
      // comité para revisar historia laboral y documentos del candidato.
      // El flag requireCommittee del examen permite excepción (por ejemplo
      // evaluaciones diagnósticas o de prueba), pero el default es true.
      if (attempt.exam.requireCommittee) {
        attemptStatus = "PENDING_COMMITTEE";
        enrollmentStatus = "COMMITTEE";
        nextStep = "COMMITTEE";
      } else if (attempt.exam.autoCertificate) {
        attemptStatus = "PASSED";
        enrollmentStatus = "CERTIFIED";
        nextStep = "CERTIFIED";
      } else {
        attemptStatus = "PASSED";
        enrollmentStatus = "APPROVED";
        nextStep = "APPROVED";
      }
    } else {
      attemptStatus = "FAILED";
      enrollmentStatus = "REJECTED";
      nextStep = "REJECTED";
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

  // Si pasó la prueba y aplica comité, garantizar que exista la revisión
  // para que el panel del comité la vea en su bandeja inmediatamente.
  if (attemptStatus === "PENDING_COMMITTEE") {
    const existing = await prisma.committeeReview.findFirst({
      where: { enrollmentId: attempt.enrollmentId, attemptId },
      select: { id: true },
    });
    if (!existing) {
      await prisma.committeeReview.create({
        data: { subscriberId, enrollmentId: attempt.enrollmentId, attemptId, decision: "PENDING" },
      });
      await audit(ctx, {
        action: "committee.review.create",
        entity: "CommitteeReview",
        entityId: attempt.enrollmentId,
        subscriberId,
        after: { trigger: "attempt.submit", scorePercent, passingScore },
      });
    }
  }

  // Constancia de presentación del examen (no debe romper el envío).
  try {
    await issuePresentationCertificate(attemptId);
  } catch {
    /* la constancia se puede reintentar después */
  }

  // Notificación al candidato con su puntaje (0–100) y siguiente paso.
  // No queremos que un fallo del proveedor de correo rompa el cierre del
  // intento, así que va envuelto en try.
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (candidate?.email) {
      await sendExamScoreEmail(subscriberId, candidate.email, {
        holderName: `${candidate.firstName} ${candidate.lastName}`.trim(),
        examName: attempt.exam.name,
        scorePercent,
        passingScore,
        passed,
        nextStep,
        portalUrl: `${BRAND.appUrl}/portal/inscripcion/${attempt.enrollmentId}`,
      });
    }
  } catch {
    /* el correo se reintenta de oficio o por acción del operador */
  }

  await audit(ctx, {
    action: "attempt.submit",
    entity: "ExamAttempt",
    entityId: attemptId,
    subscriberId,
    after: { scorePercent, passingScore, passed, status: attemptStatus, nextStep },
  });
  revalidatePath(`/portal/inscripcion/${attempt.enrollmentId}`);
  redirect(`/portal/examen/${attemptId}/resultado`);
}
