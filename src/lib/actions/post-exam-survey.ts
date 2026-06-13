"use server";

/// Acciones que el candidato dispara al ver el resultado de un examen
/// (especialmente el Caso Práctico). Cubre dos cosas:
///
/// 1. `submitSatisfactionSurvey` — guarda la encuesta de satisfacción
///    (NPS, estrellas, comentario) ligada al intento. Si el candidato
///    responde dos veces, sobreescribe en lugar de duplicar (upsert
///    por attemptId).
/// 2. `submitPostExamReferrals` — recibe hasta 3 contactos referidos
///    (nombre + correo + teléfono) y crea Leads con
///    source = "referral_post_exam" y origen = el candidato que refiere.
///    Los Leads quedan disponibles para el equipo comercial.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCandidateAction } from "@/lib/guards";

const surveySchema = z.object({
  npsScore: z.number().int().min(0).max(10).nullable(),
  overallRating: z.number().int().min(1).max(5).nullable(),
  difficultyRating: z.number().int().min(1).max(5).nullable(),
  clarityRating: z.number().int().min(1).max(5).nullable(),
  platformRating: z.number().int().min(1).max(5).nullable(),
  comment: z.string().max(1000).optional().nullable(),
  allowFollowup: z.boolean().default(false),
});

export type SurveyInput = z.infer<typeof surveySchema>;

export async function submitSatisfactionSurvey(
  attemptId: string,
  raw: SurveyInput,
): Promise<{ ok: boolean; error?: string }> {
  const { candidateId, subscriberId } = await requireCandidateAction();
  const parsed = surveySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      candidateId: true,
      enrollmentId: true,
      exam: { select: { type: true } },
    },
  });
  if (!attempt || attempt.candidateId !== candidateId) {
    return { ok: false, error: "Intento no encontrado." };
  }

  const data = parsed.data;
  const allNull =
    data.npsScore == null &&
    data.overallRating == null &&
    data.difficultyRating == null &&
    data.clarityRating == null &&
    data.platformRating == null &&
    !(data.comment ?? "").trim();
  if (allNull) {
    return { ok: false, error: "Responda al menos una pregunta antes de enviar." };
  }

  await prisma.satisfactionSurvey.upsert({
    where: { attemptId },
    create: {
      subscriberId,
      candidateId,
      enrollmentId: attempt.enrollmentId,
      attemptId,
      examType: attempt.exam.type,
      npsScore: data.npsScore,
      overallRating: data.overallRating,
      difficultyRating: data.difficultyRating,
      clarityRating: data.clarityRating,
      platformRating: data.platformRating,
      comment: data.comment?.trim() || null,
      allowFollowup: data.allowFollowup,
    },
    update: {
      npsScore: data.npsScore,
      overallRating: data.overallRating,
      difficultyRating: data.difficultyRating,
      clarityRating: data.clarityRating,
      platformRating: data.platformRating,
      comment: data.comment?.trim() || null,
      allowFollowup: data.allowFollowup,
    },
  });
  revalidatePath(`/portal/examen/${attemptId}/resultado`);
  return { ok: true };
}

const referralSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional().nullable(),
});

export type ReferralLeadInput = z.infer<typeof referralSchema>;

export async function submitPostExamReferrals(
  attemptId: string,
  raw: ReferralLeadInput[],
): Promise<{ ok: boolean; created: number; error?: string }> {
  const { candidateId, subscriberId } = await requireCandidateAction();
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { id: true, candidateId: true, enrollment: { select: { id: true, scheme: { select: { name: true } } } } },
  });
  if (!attempt || attempt.candidateId !== candidateId) {
    return { ok: false, created: 0, error: "Intento no encontrado." };
  }

  // Filtrar filas vacías y deduplicar por email
  const cleaned: ReferralLeadInput[] = [];
  const seenEmails = new Set<string>();
  for (const item of raw) {
    const parsed = referralSchema.safeParse({
      fullName: (item?.fullName ?? "").trim(),
      email: (item?.email ?? "").trim().toLowerCase(),
      phone: (item?.phone ?? "").trim() || null,
    });
    if (!parsed.success) continue;
    if (seenEmails.has(parsed.data.email)) continue;
    seenEmails.add(parsed.data.email);
    cleaned.push(parsed.data);
  }
  if (cleaned.length === 0) {
    return { ok: false, created: 0, error: "Incluya al menos un contacto válido (nombre + correo)." };
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { firstName: true, lastName: true, email: true },
  });
  const referrerName = candidate ? `${candidate.firstName} ${candidate.lastName}`.trim() : "(referente)";
  const referrerEmail = candidate?.email ?? "—";
  const schemeName = attempt.enrollment?.scheme?.name ?? null;

  let created = 0;
  for (const r of cleaned) {
    try {
      await prisma.lead.create({
        data: {
          subscriberId,
          kind: "REGISTRATION",
          fullName: r.fullName,
          email: r.email,
          phone: r.phone ?? null,
          certificationOfInterest: schemeName,
          source: "referral_post_exam",
          consentAccepted: true,
          notes: `Referido por ${referrerName} (${referrerEmail}) — intento ${attemptId}`,
        },
      });
      created += 1;
    } catch {
      // Si ya existe un lead con ese email + subscriber, lo ignoramos
      // silenciosamente y seguimos con el resto.
    }
  }
  revalidatePath(`/portal/examen/${attemptId}/resultado`);
  return { ok: true, created };
}
