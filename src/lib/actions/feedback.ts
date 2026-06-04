"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { requirePlatformAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { saveUpload, extFromName, MAX_UPLOAD_BYTES, IMAGE_EXTS } from "@/lib/storage";
import type { ActionResult } from "@/lib/actions/schemes";

const CATEGORY = ["SUGGESTION", "IMPROVEMENT", "DEVELOPMENT", "BUG", "PRAISE", "OTHER"] as const;
const STATUS = ["OPEN", "IN_REVIEW", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
const PRIORITY = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const submitSchema = z.object({
  category: z.enum(CATEGORY).default("SUGGESTION"),
  title: z.string().min(5, "Indique un título breve (al menos 5 caracteres)").max(140),
  message: z.string().min(10, "Describa con un poco más de detalle (al menos 10 caracteres)").max(4000),
  contextUrl: z.string().max(500).optional().nullable(),
  // Solo en flujos públicos (sin login) pedimos nombre/correo
  authorName: z.string().max(120).optional().nullable(),
  authorEmail: z.string().email("Correo inválido").max(190).optional().nullable(),
});

/// Cualquier usuario (incluso anónimo desde la landing pública) puede enviar
/// feedback. El ticket queda en estado OPEN para que el SUPERADMIN lo atienda.
/// Admite hasta 5 archivos adjuntos (capturas, fotos) por envío.
export async function submitFeedback(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult & { ticketNumber?: number }> {
  const parsed = submitSchema.safeParse({
    category: (formData.get("category") as string) || "SUGGESTION",
    title: formData.get("title"),
    message: formData.get("message"),
    contextUrl: typeof formData.get("contextUrl") === "string" ? (formData.get("contextUrl") as string).trim() || null : null,
    authorName: typeof formData.get("authorName") === "string" ? (formData.get("authorName") as string).trim() || null : null,
    authorEmail: typeof formData.get("authorEmail") === "string" ? (formData.get("authorEmail") as string).trim() || null : null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  // Resolvemos el autor: si hay sesión usamos sus datos; si no, exigimos
  // que el formulario público entregue nombre + correo.
  const ctx = await getCurrentUser();
  let authorName = d.authorName ?? "Visitante anónimo";
  let authorEmail = d.authorEmail ?? "";
  let authorRole: string | null = null;
  let userId: string | null = null;
  let subscriberId: string | null = null;

  if (ctx) {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, email: true, firstName: true, lastName: true, type: true, subscriberId: true },
    });
    if (user) {
      authorName = `${user.firstName} ${user.lastName}`.trim();
      authorEmail = user.email;
      authorRole = user.type;
      userId = user.id;
      subscriberId = user.subscriberId ?? null;
    }
  } else {
    if (!authorEmail) return { ok: false, error: "Indique su correo para que podamos responderle." };
    if (!authorName || authorName === "Visitante anónimo") {
      if (!d.authorName) return { ok: false, error: "Indique su nombre." };
      authorName = d.authorName;
    }
    authorRole = "VISITOR";
  }

  // Procesar adjuntos (máx 5, solo imágenes PNG/JPG)
  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 5) return { ok: false, error: "Máximo 5 archivos adjuntos por envío." };
  const attachments: string[] = [];
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return { ok: false, error: `El archivo ${file.name} supera el tamaño máximo de 10 MB.` };
    }
    const ext = extFromName(file.name);
    if (!IMAGE_EXTS.has(ext) && ext !== "pdf") {
      return { ok: false, error: `Formato no soportado en ${file.name}. Use PNG, JPG o PDF.` };
    }
    const { key } = await saveUpload(file, ["platform", "feedback", new Date().getFullYear().toString()]);
    attachments.push(key);
  }

  const h = await headers();
  const userAgent = h.get("user-agent") ?? null;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;

  const ticket = await prisma.feedbackTicket.create({
    data: {
      subscriberId,
      userId,
      authorName,
      authorEmail,
      authorRole,
      category: d.category,
      title: d.title,
      message: d.message,
      attachments,
      contextUrl: d.contextUrl,
      userAgent,
      ip,
      status: "OPEN",
      priority: d.category === "BUG" ? "HIGH" : "NORMAL",
    },
  });

  await audit(ctx ?? null, {
    action: "feedback.submit",
    entity: "FeedbackTicket",
    entityId: ticket.id,
    subscriberId,
    after: { category: d.category, attachments: attachments.length, ticketNumber: ticket.number },
  });
  revalidatePath("/admin/feedback");

  return { ok: true, message: `Ticket #${ticket.number} creado. Le responderemos al correo ${authorEmail}.`, ticketNumber: ticket.number };
}

const responseSchema = z.object({
  response: z.string().min(5, "La respuesta debe tener al menos 5 caracteres").max(4000),
  status: z.enum(STATUS).default("RESOLVED"),
});

/// SUPERADMIN responde al autor del ticket y actualiza el estado.
export async function respondFeedback(
  ticketId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requirePlatformAction(PERMISSIONS.SUBSCRIBER_MANAGE);
  const parsed = responseSchema.safeParse({
    response: formData.get("response"),
    status: (formData.get("status") as string) || "RESOLVED",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const ticket = await prisma.feedbackTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false, error: "Ticket no encontrado." };

  await prisma.feedbackTicket.update({
    where: { id: ticketId },
    data: {
      response: parsed.data.response,
      respondedAt: new Date(),
      respondedById: ctx.userId,
      status: parsed.data.status,
      closedAt: ["RESOLVED", "CLOSED"].includes(parsed.data.status) ? new Date() : null,
    },
  });
  await audit(ctx, {
    action: "feedback.respond",
    entity: "FeedbackTicket",
    entityId: ticketId,
    after: { status: parsed.data.status },
  });
  revalidatePath("/admin/feedback");
  revalidatePath(`/admin/feedback/${ticketId}`);
  return { ok: true, message: "Respuesta enviada." };
}

/// Cambia solo el estado/prioridad/notas internas (sin notificar al autor).
export async function updateFeedbackMeta(
  ticketId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requirePlatformAction(PERMISSIONS.SUBSCRIBER_MANAGE);
  const status = formData.get("status") as string | null;
  const priority = formData.get("priority") as string | null;
  const internalNotes = (formData.get("internalNotes") as string | null) ?? undefined;

  if (status && !STATUS.includes(status as typeof STATUS[number])) {
    return { ok: false, error: "Estado inválido." };
  }
  if (priority && !PRIORITY.includes(priority as typeof PRIORITY[number])) {
    return { ok: false, error: "Prioridad inválida." };
  }

  const before = await prisma.feedbackTicket.findUnique({ where: { id: ticketId } });
  if (!before) return { ok: false, error: "Ticket no encontrado." };

  await prisma.feedbackTicket.update({
    where: { id: ticketId },
    data: {
      status: (status as typeof STATUS[number] | null) ?? undefined,
      priority: (priority as typeof PRIORITY[number] | null) ?? undefined,
      internalNotes: internalNotes ?? undefined,
      closedAt: status && ["RESOLVED", "CLOSED"].includes(status) ? new Date() : null,
    },
  });
  await audit(ctx, {
    action: "feedback.update",
    entity: "FeedbackTicket",
    entityId: ticketId,
    before: { status: before.status, priority: before.priority },
    after: { status, priority },
  });
  revalidatePath("/admin/feedback");
  revalidatePath(`/admin/feedback/${ticketId}`);
  return { ok: true, message: "Ticket actualizado." };
}
