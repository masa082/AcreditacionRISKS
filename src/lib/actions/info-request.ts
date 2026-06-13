"use server";

/// Server actions del flujo "Solicitud de información adicional" durante
/// la calificación manual del Caso Práctico.
///
/// El equipo evaluador (admin del suscriptor + comité) puede crear una
/// solicitud desde el panel de calificación. Mientras la solicitud esté
/// en PENDING:
///   - El intento queda "en espera" — el candidato la ve en su portal y
///     puede responder con texto + archivo opcional.
///   - `finalizeManualGrading` NO se puede ejecutar (ver `grading.ts`).
///
/// Cuando el candidato responde:
///   - La solicitud pasa a ANSWERED.
///   - Se notifica al equipo por correo.
///   - El equipo decide si cerrar (DISMISSED) o re-solicitar nuevas.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction, requireCandidateAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import {
  sendInfoRequestToCandidateEmail,
  sendCandidateAnsweredInfoRequestEmail,
} from "@/lib/email";
import { getGradingTeamRecipients } from "@/lib/grading-team";
import { BRAND } from "@/lib/brand";

// ───────────────────────── Equipo ─────────────────────────

const createSchema = z.object({
  message: z.string().min(10, "Describa qué información necesita (mínimo 10 caracteres).").max(2000),
});

/// El equipo solicita información adicional al candidato. Crea el registro,
/// vuelve a marcar el intento en MANUAL_GRADING (si estaba en GRADED) y
/// notifica al candidato.
export async function createInfoRequest(
  attemptId: string,
  raw: { message: string },
): Promise<{ ok: boolean; error?: string }> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.GRADE_MANUAL);
  const parsed = createSchema.safeParse({ message: (raw.message ?? "").trim() });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { select: { name: true } },
      candidate: { select: { firstName: true, lastName: true, email: true } },
      enrollment: { select: { id: true, code: true } },
    },
  });
  if (!attempt || attempt.subscriberId !== subscriberId) {
    return { ok: false, error: "Intento no encontrado." };
  }
  if (attempt.status !== "MANUAL_GRADING") {
    return {
      ok: false,
      error: `Solo se pueden crear solicitudes en estado "Por calificar". Estado actual: ${attempt.status}.`,
    };
  }

  await prisma.attemptInfoRequest.create({
    data: {
      subscriberId,
      attemptId,
      requestedById: ctx.userId,
      message: parsed.data.message,
      status: "PENDING",
    },
  });
  await audit(ctx, {
    action: "attempt.info_request.create",
    entity: "ExamAttempt",
    entityId: attemptId,
    subscriberId,
    after: { messageLength: parsed.data.message.length },
  });

  try {
    if (attempt.candidate?.email) {
      await sendInfoRequestToCandidateEmail(subscriberId, attempt.candidate.email, {
        holderName: `${attempt.candidate.firstName} ${attempt.candidate.lastName}`.trim(),
        examName: attempt.exam.name,
        message: parsed.data.message,
        portalUrl: `${BRAND.appUrl}/portal/examen/${attemptId}/resultado`,
      });
    }
  } catch {
    /* email tolerante — el candidato verá la solicitud en el portal igualmente */
  }

  revalidatePath(`/panel/calificacion/${attemptId}`);
  revalidatePath(`/portal/examen/${attemptId}/resultado`);
  revalidatePath(`/portal/inscripcion/${attempt.enrollment.id}`);
  return { ok: true };
}

/// El equipo cierra una solicitud (sin esperar respuesta o porque ya la
/// recibió por otro canal). Pasa a DISMISSED.
export async function dismissInfoRequest(
  requestId: string,
  closingNote?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.GRADE_MANUAL);
  const req = await prisma.attemptInfoRequest.findUnique({
    where: { id: requestId },
    select: { id: true, subscriberId: true, attemptId: true, status: true },
  });
  if (!req || req.subscriberId !== subscriberId) {
    return { ok: false, error: "Solicitud no encontrada." };
  }
  if (req.status === "DISMISSED") return { ok: true };

  await prisma.attemptInfoRequest.update({
    where: { id: requestId },
    data: {
      status: "DISMISSED",
      closedById: ctx.userId,
      closedAt: new Date(),
      closingNote: closingNote?.slice(0, 1000) ?? null,
    },
  });
  await audit(ctx, {
    action: "attempt.info_request.dismiss",
    entity: "AttemptInfoRequest",
    entityId: requestId,
    subscriberId,
  });
  revalidatePath(`/panel/calificacion/${req.attemptId}`);
  revalidatePath(`/portal/examen/${req.attemptId}/resultado`);
  return { ok: true };
}

// ───────────────────────── Candidato ─────────────────────────

const respondSchema = z.object({
  response: z.string().min(1, "Escriba su respuesta.").max(4000),
  fileUrl: z.string().url().optional().nullable(),
  fileName: z.string().max(200).optional().nullable(),
});

/// El candidato responde una solicitud PENDING. Marca como ANSWERED y
/// notifica al equipo.
export async function respondToInfoRequest(
  requestId: string,
  raw: { response: string; fileUrl?: string | null; fileName?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const { candidateId, subscriberId } = await requireCandidateAction();
  const parsed = respondSchema.safeParse({
    response: (raw.response ?? "").trim(),
    fileUrl: raw.fileUrl ?? null,
    fileName: raw.fileName ?? null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const req = await prisma.attemptInfoRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      subscriberId: true,
      status: true,
      attemptId: true,
      attempt: {
        select: {
          candidateId: true,
          exam: { select: { name: true } },
          enrollment: { select: { id: true, code: true } },
        },
      },
    },
  });
  if (!req || req.attempt.candidateId !== candidateId) {
    return { ok: false, error: "Solicitud no encontrada." };
  }
  if (req.status !== "PENDING") {
    return { ok: false, error: "La solicitud ya fue respondida o cerrada." };
  }

  await prisma.attemptInfoRequest.update({
    where: { id: requestId },
    data: {
      status: "ANSWERED",
      candidateResponse: parsed.data.response,
      candidateFileUrl: parsed.data.fileUrl,
      candidateFileName: parsed.data.fileName,
      respondedAt: new Date(),
    },
  });

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { firstName: true, lastName: true },
    });
    const candidateName = candidate
      ? `${candidate.firstName} ${candidate.lastName}`.trim()
      : "Candidato";
    const recipients = await getGradingTeamRecipients(subscriberId);
    const panelUrl = `${BRAND.appUrl}/panel/calificacion/${req.attemptId}`;
    await Promise.all(
      recipients.map((r) =>
        sendCandidateAnsweredInfoRequestEmail(subscriberId, r.email, {
          candidateName,
          examName: req.attempt.exam.name,
          enrollmentCode: req.attempt.enrollment.code,
          panelUrl,
        }).catch(() => undefined),
      ),
    );
  } catch {
    /* email tolerante */
  }

  revalidatePath(`/portal/examen/${req.attemptId}/resultado`);
  revalidatePath(`/panel/calificacion/${req.attemptId}`);
  return { ok: true };
}
