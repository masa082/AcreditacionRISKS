"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { runBulkEmail, sanitizeEditorHtml, type BulkAttachment } from "@/lib/email/bulk";
import type { ActionResult } from "@/lib/actions/schemes";

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

const editSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional().nullable(),
  documentType: z.string().max(20).optional().nullable(),
  documentNumber: z.string().max(40).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  address: z.string().max(240).optional().nullable(),
});

/// El admin edita los datos personales/contacto del candidato. También sincroniza
/// el correo del User asociado para que pueda volver a loguearse.
export async function updateCandidate(
  candidateId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.CANDIDATE_MANAGE);
  const parsed = editSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: clean(formData.get("phone")),
    documentType: clean(formData.get("documentType")),
    documentNumber: clean(formData.get("documentNumber")),
    country: clean(formData.get("country")),
    city: clean(formData.get("city")),
    address: clean(formData.get("address")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, subscriberId } });
  if (!candidate) return { ok: false, error: "Candidato no encontrado." };

  const email = parsed.data.email.toLowerCase();
  const before = {
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    email: candidate.email,
    phone: candidate.phone,
    documentType: candidate.documentType,
    documentNumber: candidate.documentNumber,
  };
  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email,
      phone: parsed.data.phone,
      documentType: parsed.data.documentType,
      documentNumber: parsed.data.documentNumber,
      country: parsed.data.country,
      city: parsed.data.city,
      address: parsed.data.address,
    },
  });
  // Sincronizar el User asociado para mantener login funcional.
  if (candidate.userId) {
    await prisma.user.update({
      where: { id: candidate.userId },
      data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName, email },
    });
  }
  await audit(ctx, {
    action: "candidate.update",
    entity: "Candidate",
    entityId: candidateId,
    subscriberId,
    before,
    after: parsed.data,
  });
  revalidatePath(`/panel/candidatos/${candidateId}`);
  revalidatePath("/panel/candidatos");
  return { ok: true, message: "Datos del candidato actualizados." };
}

const altEmailSchema = z.object({ email: z.string().email("Correo inválido").max(190) });

/// El admin del suscriptor agrega un correo alterno a la cuenta del candidato.
/// Misma validación que el lado del titular: no duplicar el principal ni
/// colisionar con otro usuario del mismo suscriptor.
export async function addCandidateEmailByAdmin(
  candidateId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.CANDIDATE_MANAGE);
  const parsed = altEmailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const newEmail = parsed.data.email.toLowerCase();

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, subscriberId },
    select: { userId: true },
  });
  if (!candidate?.userId) return { ok: false, error: "Candidato sin usuario asociado." };

  const me = await prisma.user.findUnique({
    where: { id: candidate.userId },
    select: { email: true, additionalEmails: true },
  });
  if (!me) return { ok: false, error: "Usuario no encontrado." };
  if (me.email === newEmail) return { ok: false, error: "Ya es el correo principal del candidato." };
  if (me.additionalEmails.includes(newEmail)) return { ok: false, error: "Ese correo ya está agregado." };

  const collision = await prisma.user.findFirst({
    where: {
      subscriberId,
      NOT: { id: candidate.userId },
      OR: [{ email: newEmail }, { additionalEmails: { has: newEmail } }],
    },
    select: { id: true },
  });
  if (collision) return { ok: false, error: "Ese correo ya está en uso por otra cuenta de esta entidad." };

  await prisma.user.update({
    where: { id: candidate.userId },
    data: { additionalEmails: { set: [...me.additionalEmails, newEmail] } },
  });
  await audit(ctx, {
    action: "candidate.email.add",
    entity: "User",
    entityId: candidate.userId,
    subscriberId,
    after: { added: newEmail },
  });
  revalidatePath(`/panel/candidatos/${candidateId}`);
  return { ok: true, message: "Correo alterno agregado." };
}

/// El admin elimina un correo alterno del candidato.
export async function removeCandidateEmailByAdmin(
  candidateId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.CANDIDATE_MANAGE);
  const target = (formData.get("email") as string | null)?.toLowerCase().trim() ?? "";
  if (!target) return { ok: false, error: "Correo inválido." };

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, subscriberId },
    select: { userId: true },
  });
  if (!candidate?.userId) return { ok: false, error: "Candidato sin usuario asociado." };

  const me = await prisma.user.findUnique({
    where: { id: candidate.userId },
    select: { additionalEmails: true },
  });
  if (!me) return { ok: false, error: "Usuario no encontrado." };
  if (!me.additionalEmails.includes(target)) {
    return { ok: false, error: "Ese correo no está agregado al candidato." };
  }

  await prisma.user.update({
    where: { id: candidate.userId },
    data: { additionalEmails: { set: me.additionalEmails.filter((e) => e !== target) } },
  });
  await audit(ctx, {
    action: "candidate.email.remove",
    entity: "User",
    entityId: candidate.userId,
    subscriberId,
    after: { removed: target },
  });
  revalidatePath(`/panel/candidatos/${candidateId}`);
  return { ok: true, message: "Correo alterno eliminado." };
}

// Esquema del editor enriquecido. Acepta HTML del editor y attachments en
// base64. Si scheduledFor es un ISO válido y > now, se encola sin enviar.
const bulkEmailSchema = z.object({
  subject: z.string().min(3, "Indique un asunto").max(160),
  bodyHtml: z.string().min(10, "El mensaje debe tener al menos 10 caracteres").max(50_000),
  candidateIds: z.string().min(1, "Seleccione al menos un candidato"),
  scheduledFor: z.string().optional().nullable(),
  attachments: z.string().optional().nullable(), // JSON string de BulkAttachment[]
});

const MAX_RECIPIENTS = 200;
const MAX_TOTAL_ATTACHMENTS_BYTES = 12 * 1024 * 1024; // 12 MB

/// Envío de correo masivo a candidatos seleccionados.
///
/// Soporta:
///   - HTML enriquecido (editor WYSIWYG en el cliente, sanitizado server-side).
///   - Variables {nombre}, {apellido}, {nombre_completo}, {correo},
///     {documento}, {organismo}, {fecha} en asunto y cuerpo.
///   - Imágenes adjuntas (input file en el cliente → base64 → Resend).
///   - Programación: si scheduledFor está en el futuro, guarda en
///     ScheduledEmail (status PENDING) y el cron lo procesa cuando toque.
export async function sendBulkEmail(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.CANDIDATE_MANAGE);
  const parsed = bulkEmailSchema.safeParse({
    subject: formData.get("subject"),
    bodyHtml: formData.get("bodyHtml"),
    candidateIds: formData.get("candidateIds"),
    scheduledFor: formData.get("scheduledFor"),
    attachments: formData.get("attachments"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const ids = parsed.data.candidateIds.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "Seleccione al menos un candidato." };
  if (ids.length > MAX_RECIPIENTS) return { ok: false, error: `Máximo ${MAX_RECIPIENTS} destinatarios por envío.` };

  // Verifica que los IDs pertenecen al subscriber actual (defensa multitenant).
  const found = await prisma.candidate.count({
    where: { id: { in: ids }, subscriberId },
  });
  if (found === 0) return { ok: false, error: "No se encontraron destinatarios válidos." };

  // Sanitiza el HTML del editor.
  const safeHtml = sanitizeEditorHtml(parsed.data.bodyHtml);

  // Decodifica attachments (JSON con base64). Valida tamaño total.
  let attachments: BulkAttachment[] = [];
  if (parsed.data.attachments) {
    try {
      const raw = JSON.parse(parsed.data.attachments) as BulkAttachment[];
      if (!Array.isArray(raw)) throw new Error("formato inválido");
      let totalBytes = 0;
      for (const a of raw) {
        if (!a.filename || !a.contentBase64) continue;
        const bytes = Math.ceil((a.contentBase64.length * 3) / 4);
        totalBytes += bytes;
        if (totalBytes > MAX_TOTAL_ATTACHMENTS_BYTES) {
          return { ok: false, error: `Adjuntos exceden ${Math.round(MAX_TOTAL_ATTACHMENTS_BYTES / 1024 / 1024)} MB.` };
        }
        attachments.push({
          filename: a.filename.slice(0, 200),
          contentType: a.contentType,
          contentBase64: a.contentBase64,
        });
      }
    } catch {
      return { ok: false, error: "Adjuntos en formato inválido." };
    }
  }

  // Si está programado, encola y termina rápido.
  const scheduledFor = parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null;
  if (scheduledFor && !isNaN(scheduledFor.getTime()) && scheduledFor.getTime() > Date.now() + 30_000) {
    const sched = await prisma.scheduledEmail.create({
      data: {
        subscriberId,
        createdById: ctx.userId,
        subject: parsed.data.subject,
        bodyHtml: safeHtml,
        bodyText: "",
        recipientIds: ids,
        attachments: attachments as unknown as object,
        scheduledFor,
        status: "PENDING",
      },
    });
    await audit(ctx, {
      action: "candidate.bulk_email.scheduled",
      entity: "ScheduledEmail",
      entityId: sched.id,
      subscriberId,
      after: {
        subject: parsed.data.subject,
        recipients: ids.length,
        scheduledFor: scheduledFor.toISOString(),
      },
    });
    const when = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(scheduledFor);
    return { ok: true, message: `Programado · ${ids.length} destinatario(s) · ${when}.` };
  }

  // Envío inmediato.
  const result = await runBulkEmail({
    subscriberId,
    candidateIds: ids,
    subject: parsed.data.subject,
    bodyHtml: safeHtml,
    attachments,
  });

  await audit(ctx, {
    action: "candidate.bulk_email",
    entity: "Candidate",
    subscriberId,
    after: {
      subject: parsed.data.subject,
      recipients: result.total,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors.slice(0, 5),
    },
  });

  if (result.failed > 0) {
    return {
      ok: false,
      error: `Correos enviados: ${result.sent} · Fallaron: ${result.failed}. Motivo: ${result.errors[0] ?? "—"}`,
    };
  }
  return {
    ok: true,
    message: `Correos enviados: ${result.sent}${result.errors.length ? ` (aviso: ${result.errors[0]})` : ""}.`,
  };
}

// Cancela un correo programado (solo si aún está PENDING y pertenece al
// suscriptor del usuario actual).
export async function cancelScheduledEmail(id: string): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.CANDIDATE_MANAGE);
  const sched = await prisma.scheduledEmail.findFirst({ where: { id, subscriberId } });
  if (!sched) return { ok: false, error: "No encontrado" };
  if (sched.status !== "PENDING") return { ok: false, error: "Ya no es cancelable." };
  await prisma.scheduledEmail.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  await audit(ctx, { action: "candidate.bulk_email.cancelled", entity: "ScheduledEmail", entityId: id, subscriberId });
  return { ok: true, message: "Programación cancelada." };
}
