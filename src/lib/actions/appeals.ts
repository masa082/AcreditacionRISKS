"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCandidateAction, requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { notifyCandidate } from "@/lib/notify";
import type { ActionResult } from "@/lib/actions/schemes";

const createSchema = z.object({
  type: z.enum(["APPEAL", "COMPLAINT", "REQUEST", "CORRECTION"]),
  subject: z.string().min(4, "Indique un asunto").max(160),
  body: z.string().min(10, "Describa su solicitud con más detalle").max(4000),
  enrollmentId: z.string().optional().nullable(),
});

/// El candidato presenta una apelación, queja, solicitud o corrección.
export async function createAppeal(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const parsed = createSchema.safeParse({
    type: formData.get("type"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    enrollmentId: (() => {
      const s = formData.get("enrollmentId");
      const v = typeof s === "string" ? s.trim() : "";
      return v.length ? v : null;
    })(),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  let enrollmentId: string | null = null;
  if (parsed.data.enrollmentId) {
    const enr = await prisma.enrollment.findFirst({ where: { id: parsed.data.enrollmentId, candidateId }, select: { id: true } });
    enrollmentId = enr?.id ?? null;
  }

  const appeal = await prisma.appeal.create({
    data: {
      subscriberId,
      candidateId,
      enrollmentId,
      type: parsed.data.type,
      subject: parsed.data.subject,
      body: parsed.data.body,
      status: "OPEN",
    },
  });
  await audit(ctx, { action: "appeal.create", entity: "Appeal", entityId: appeal.id, subscriberId, after: { type: parsed.data.type } });
  revalidatePath("/portal/apelaciones");
  return { ok: true };
}

const resolveSchema = z.object({
  status: z.enum(["IN_REVIEW", "RESOLVED", "REJECTED"]),
  resolution: z.string().max(4000).optional().nullable(),
});

/// El suscriptor atiende/resuelve una apelación o queja.
export async function resolveAppeal(
  appealId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.APPEAL_MANAGE);
  const parsed = resolveSchema.safeParse({
    status: formData.get("status"),
    resolution: (() => {
      const s = formData.get("resolution");
      const v = typeof s === "string" ? s.trim() : "";
      return v.length ? v : null;
    })(),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  if ((parsed.data.status === "RESOLVED" || parsed.data.status === "REJECTED") && !parsed.data.resolution) {
    return { ok: false, error: "Incluya la respuesta/resolución para cerrar el caso." };
  }

  const appeal = await prisma.appeal.findFirst({ where: { id: appealId, subscriberId }, select: { id: true, candidateId: true, subject: true } });
  if (!appeal) return { ok: false, error: "Caso no encontrado." };

  const closing = parsed.data.status === "RESOLVED" || parsed.data.status === "REJECTED";
  await prisma.appeal.update({
    where: { id: appealId },
    data: {
      status: parsed.data.status,
      resolution: parsed.data.resolution,
      resolvedById: closing ? ctx.userId : null,
      resolvedAt: closing ? new Date() : null,
    },
  });
  if (appeal.candidateId) {
    const label = parsed.data.status === "RESOLVED" ? "resuelta" : parsed.data.status === "REJECTED" ? "no procedente" : "en revisión";
    await notifyCandidate(appeal.candidateId, "appeal.update", `Su caso fue marcado como ${label}`, appeal.subject);
  }
  await audit(ctx, { action: "appeal.resolve", entity: "Appeal", entityId: appealId, subscriberId, after: { status: parsed.data.status } });
  revalidatePath("/panel/apelaciones");
  return { ok: true };
}
