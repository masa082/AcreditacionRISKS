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

const sessionSchema = z
  .object({
    examId: z.string().min(1, "Seleccione una evaluación"),
    title: z.string().max(160).optional().nullable(),
    startsAt: z.coerce.date({ message: "Fecha y hora inválidas" }),
    durationMin: z.coerce.number().int().min(1).max(1440).optional().nullable(),
    capacity: z.coerce.number().int().min(0).max(10000),
    modality: z.enum(["ONLINE", "ONSITE"]),
    location: z.string().max(300).optional().nullable(),
    meetingLink: z.string().url("Enlace inválido").max(500).optional().nullable(),
  })
  .refine((d) => d.modality !== "ONSITE" || !!d.location, {
    message: "Indique el lugar para sesiones presenciales",
    path: ["location"],
  });

/// Crea una sesión/horario de examen (cupo) para agendamiento de candidatos.
export async function createSession(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.SCHEDULE_MANAGE);

  const parsed = sessionSchema.safeParse({
    examId: formData.get("examId"),
    title: clean(formData.get("title")),
    startsAt: formData.get("startsAt"),
    durationMin: clean(formData.get("durationMin")),
    capacity: formData.get("capacity"),
    modality: formData.get("modality"),
    location: clean(formData.get("location")),
    meetingLink: clean(formData.get("meetingLink")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const exam = await prisma.exam.findFirst({
    where: { id: parsed.data.examId, subscriberId },
    select: { id: true, durationMin: true },
  });
  if (!exam) return { ok: false, error: "Evaluación inválida." };
  if (parsed.data.startsAt < new Date()) {
    return { ok: false, error: "La sesión debe programarse en una fecha futura." };
  }

  const session = await prisma.examSession.create({
    data: {
      subscriberId,
      examId: exam.id,
      title: parsed.data.title,
      startsAt: parsed.data.startsAt,
      durationMin: parsed.data.durationMin ?? exam.durationMin,
      capacity: parsed.data.capacity,
      modality: parsed.data.modality,
      location: parsed.data.location,
      meetingLink: parsed.data.meetingLink,
    },
  });
  await audit(ctx, {
    action: "session.create",
    entity: "ExamSession",
    entityId: session.id,
    subscriberId,
    after: { examId: exam.id, startsAt: parsed.data.startsAt.toISOString() },
  });
  revalidatePath("/panel/agenda");
  return { ok: true };
}

/// Desactiva (cancela) una sesión y cancela sus reservas activas.
export async function cancelSession(sessionId: string): Promise<void> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.SCHEDULE_MANAGE);
  const session = await prisma.examSession.findUnique({ where: { id: sessionId }, select: { id: true, subscriberId: true } });
  if (!session || session.subscriberId !== subscriberId) return;

  await prisma.scheduleBooking.updateMany({
    where: { sessionId, status: { notIn: ["CANCELLED", "ATTENDED", "NO_SHOW"] } },
    data: { status: "CANCELLED" },
  });
  await prisma.examSession.update({ where: { id: sessionId }, data: { isActive: false } });
  await audit(ctx, { action: "session.cancel", entity: "ExamSession", entityId: sessionId, subscriberId });
  revalidatePath("/panel/agenda");
}
