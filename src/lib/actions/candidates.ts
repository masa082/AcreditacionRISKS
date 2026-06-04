"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
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

const bulkEmailSchema = z.object({
  subject: z.string().min(3, "Indique un asunto").max(160),
  body: z.string().min(10, "El mensaje debe tener al menos 10 caracteres").max(8000),
  candidateIds: z.string().min(1, "Seleccione al menos un candidato"),
});

/// Envío de correo masivo a candidatos seleccionados. Limita a 100 destinatarios
/// por seguridad y registra cada envío en el AuditLog.
export async function sendBulkEmail(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.CANDIDATE_MANAGE);
  const parsed = bulkEmailSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    candidateIds: formData.get("candidateIds"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const ids = parsed.data.candidateIds.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "Seleccione al menos un candidato." };
  if (ids.length > 100) return { ok: false, error: "Máximo 100 destinatarios por envío." };

  const recipients = await prisma.candidate.findMany({
    where: { id: { in: ids }, subscriberId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  if (recipients.length === 0) return { ok: false, error: "No se encontraron destinatarios válidos." };

  const sub = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { tradeName: true, legalName: true },
  });
  const orgName = sub?.tradeName ?? sub?.legalName ?? "CIOC";

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const r of recipients) {
    // Personalización mínima: {nombre}
    const personalBody = parsed.data.body.replace(/{nombre}/gi, r.firstName);
    const result = await sendEmail({
      subscriberId,
      to: r.email,
      subject: parsed.data.subject,
      text: personalBody,
      html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;">${personalBody.replace(/</g, "&lt;").replace(/\n/g, "<br>")}<hr><small>Mensaje enviado por ${orgName}</small></div>`,
    }).catch((e) => ({ ok: false, provider: "exception", error: e instanceof Error ? e.message : String(e) }));
    if (result.ok) {
      sent++;
      // Si el provider devolvió un warning (auto-fallback a sandbox) lo
      // anotamos sin marcar como falla.
      if ("error" in result && result.error) errors.push(`${r.email}: ${result.error}`);
    } else {
      failed++;
      errors.push(`${r.email}: ${"error" in result && result.error ? result.error : "fallo sin detalle"}`);
    }
  }

  await audit(ctx, {
    action: "candidate.bulk_email",
    entity: "Candidate",
    subscriberId,
    after: { subject: parsed.data.subject, recipients: recipients.length, sent, failed, errors: errors.slice(0, 5) },
  });

  if (failed > 0) {
    const firstError = errors[0] ?? "Motivo no disponible";
    return {
      ok: false,
      error: `Correos enviados: ${sent} · Fallaron: ${failed}. Motivo: ${firstError}`,
    };
  }
  return {
    ok: true,
    message: `Correos enviados: ${sent}${errors.length ? ` (con aviso: ${errors[0]})` : ""}.`,
  };
}
