"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notify";
import { LEAD_KIND_LABELS, LEAD_STATUS_LABELS } from "@/lib/leads";
import type { ActionResult } from "@/lib/actions/schemes";

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

async function meta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

// Identifica el suscriptor "RISKS" por slug. Hoy es el único activo en la
// landing pública; mañana podemos resolverlo por subdominio o config.
async function resolveDefaultSubscriberId(): Promise<string | null> {
  const sub = await prisma.subscriber.findFirst({
    where: { slug: "risks", status: "ACTIVE" },
    select: { id: true },
  });
  return sub?.id ?? null;
}

const baseSchema = z.object({
  fullName: z.string().min(3, "Indique su nombre completo").max(160).optional().nullable(),
  email: z.string().email("Correo inválido").max(160),
  phone: z.string().max(40).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  company: z.string().max(160).optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  certificationOfInterest: z.string().max(160).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  suggestedDate: z.string().max(40).optional().nullable(),
  source: z.string().max(120).optional().nullable(),
  utmSource: z.string().max(120).optional().nullable(),
  utmMedium: z.string().max(120).optional().nullable(),
  utmCampaign: z.string().max(120).optional().nullable(),
  consent: z.string().optional().nullable(),
  kind: z.enum(["REGISTRATION", "INFORMATION", "ADVISORY"]).optional(),
});

/// Captura un lead desde la landing pública. Guarda en BD, notifica por correo
/// al admin del suscriptor y crea notificaciones in-app para todo el staff con
/// permiso LEAD_VIEW.
export async function createLead(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = baseSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: clean(formData.get("phone")),
    country: clean(formData.get("country")),
    company: clean(formData.get("company")),
    jobTitle: clean(formData.get("jobTitle")),
    certificationOfInterest: clean(formData.get("certificationOfInterest")),
    message: clean(formData.get("message")),
    suggestedDate: clean(formData.get("suggestedDate")),
    source: clean(formData.get("source")),
    utmSource: clean(formData.get("utm_source")),
    utmMedium: clean(formData.get("utm_medium")),
    utmCampaign: clean(formData.get("utm_campaign")),
    consent: clean(formData.get("consent")),
    kind: (clean(formData.get("kind")) ?? "REGISTRATION") as "REGISTRATION" | "INFORMATION" | "ADVISORY",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  if (!parsed.data.consent) {
    return { ok: false, error: "Debe autorizar el tratamiento de datos personales." };
  }

  const m = await meta();
  const subscriberId = await resolveDefaultSubscriberId();

  // Detectar SAGRILAFT_WAITLIST: si el usuario selecciona "notificarme", cambiar a WAITLIST kind
  let kind = parsed.data.kind ?? "REGISTRATION";
  let certOfInterest: string | null = parsed.data.certificationOfInterest ?? null;
  if (certOfInterest === "SAGRILAFT_WAITLIST") {
    kind = "INFORMATION"; // O crear un nuevo kind WAITLIST si existe en BD
    certOfInterest = "SAGRILAFT";
  } else if (certOfInterest === "NOT_SURE") {
    kind = "INFORMATION";
    certOfInterest = null;
  }

  // Honeypot anti-bot: si el campo oculto "website" viene con valor, descartamos en silencio.
  const honey = clean(formData.get("website"));
  if (honey) {
    return { ok: true };
  }

  const emailLower = parsed.data.email.toLowerCase();
  // Si fullName no viene (micro-form de email-only), usar email prefix como nombre temporal
  const fullName: string = (parsed.data.fullName?.trim()) || emailLower.split("@")[0].replace(/[.\-_]/g, " ");
  // Dedupe + tracking de visitas: si ya existe un lead con el mismo
  // correo y la misma intención (kind) en los últimos 60 días, sumamos
  // visita y refrescamos la huella en vez de duplicar la fila. Eso
  // permite al operador ver "este prospecto ya pidió info 3 veces".
  const existing = await prisma.lead.findFirst({
    where: {
      email: emailLower,
      OR: [{ subscriberId }, { subscriberId: null }],
    },
    orderBy: { createdAt: "desc" },
  });
  const dedupeWindow = 60 * 24 * 60 * 60 * 1000;
  const reusable = existing && Date.now() - existing.createdAt.getTime() < dedupeWindow;

  // Si el nombre del lead cambió en esta visita (p. ej. la primera vez
  // se llamó "Juan Perez" y ahora aparece como "Ines Curtain" con el
  // mismo correo), actualizamos al nombre más reciente — es el más
  // probable de ser el correcto desde el punto de vista del operador.
  // Para no perder trazabilidad, el nombre anterior queda en la
  // metadata del VISIT_TRACK.
  const nameChanged = reusable && fullName.trim().toLowerCase() !== existing!.fullName.trim().toLowerCase();

  const lead = reusable
    ? await prisma.lead.update({
        where: { id: existing.id },
        data: {
          // Refresca la huella + suma visita; conserva status y notas.
          lastSiteVisitAt: new Date(),
          siteVisitCount: { increment: 1 },
          // Tomamos el nombre más reciente (corrige el bug previo donde
          // un lead "merged" se quedaba con el primer nombre y el
          // operador no encontraba al prospecto que recién registró).
          fullName: fullName,
          // Permite actualizar campos comerciales si vienen nuevos datos.
          phone: parsed.data.phone ?? existing.phone,
          country: parsed.data.country ?? existing.country,
          company: parsed.data.company ?? existing.company,
          jobTitle: parsed.data.jobTitle ?? existing.jobTitle,
          certificationOfInterest: certOfInterest ?? existing.certificationOfInterest,
          message: parsed.data.message ?? existing.message,
          ip: m.ip,
          userAgent: m.userAgent,
          activities: {
            create: {
              type: "VISIT_TRACK",
              metadata: {
                kind, source: parsed.data.source ?? null, ip: m.ip ?? null,
                visitNumber: existing.siteVisitCount + 1,
                // Si el nombre cambió en este touch, dejamos rastro de
                // los dos nombres para que el operador del organismo
                // tenga el contexto de la fusión.
                ...(nameChanged
                  ? { fullNameChanged: { from: existing.fullName, to: fullName } }
                  : {}),
              },
            },
          },
        },
      })
    : await prisma.lead.create({
        data: {
          subscriberId,
          kind,
          fullName: fullName,
          email: emailLower,
          phone: parsed.data.phone,
          country: parsed.data.country,
          company: parsed.data.company,
          jobTitle: parsed.data.jobTitle,
          certificationOfInterest: certOfInterest,
          message: parsed.data.message,
          suggestedDate: parsed.data.suggestedDate ? new Date(parsed.data.suggestedDate) : null,
          source: parsed.data.source,
          utmSource: parsed.data.utmSource,
          utmMedium: parsed.data.utmMedium,
          utmCampaign: parsed.data.utmCampaign,
          ip: m.ip,
          userAgent: m.userAgent,
          consentAccepted: true,
          lastSiteVisitAt: new Date(),
          siteVisitCount: 1,
        },
      });

  // Notificación in-app a todo el staff con LEAD_VIEW.
  if (subscriberId) {
    const staff = await prisma.user.findMany({
      where: { subscriberId, type: "SUBSCRIBER", status: "ACTIVE" },
      include: { role: { select: { permissions: true } } },
    });
    const kindLabel = LEAD_KIND_LABELS[kind];
    // Si fue dedupe-update lo decimos explícitamente: el operador no se
    // confunde buscando un "lead nuevo" que en realidad es una nueva
    // visita de un prospecto que ya está en la tabla.
    const title = reusable
      ? `Nueva visita: ${fullName} (visita #${(existing!.siteVisitCount ?? 1) + 1})`
      : `Nuevo lead: ${fullName}`;
    const body = `${kindLabel}${certOfInterest ? ` · ${certOfInterest}` : ""}`;
    await Promise.all(
      staff
        .filter((u) => {
          const perms = (u.role?.permissions as string[] | undefined) ?? [];
          return (
            perms.includes("*") ||
            perms.includes("lead.*") ||
            perms.includes(PERMISSIONS.LEAD_VIEW) ||
            perms.includes(PERMISSIONS.LEAD_MANAGE)
          );
        })
        .map((u) => notifyUser(u.id, "lead.new", title, body)),
    );

    // Correo al contacto comercial del suscriptor.
    const sub = await prisma.subscriber.findUnique({
      where: { id: subscriberId },
      select: { contactEmail: true, tradeName: true, legalName: true },
    });
    const to = sub?.contactEmail;
    if (to) {
      const orgName = sub?.tradeName ?? sub?.legalName ?? "CIOC";
      const lines = [
        `Tipo: ${kindLabel}`,
        `Nombre: ${fullName}`,
        `Correo: ${parsed.data.email}`,
        parsed.data.phone ? `Teléfono: ${parsed.data.phone}` : null,
        parsed.data.country ? `País: ${parsed.data.country}` : null,
        parsed.data.company ? `Empresa: ${parsed.data.company}` : null,
        parsed.data.jobTitle ? `Cargo: ${parsed.data.jobTitle}` : null,
        certOfInterest ? `Certificación de interés: ${certOfInterest}` : null,
        parsed.data.suggestedDate ? `Fecha sugerida: ${parsed.data.suggestedDate}` : null,
        parsed.data.message ? `\nMensaje:\n${parsed.data.message}` : null,
      ].filter(Boolean);
      await sendEmail({
        subscriberId,
        to,
        subject: `[${orgName}] Nuevo lead — ${kindLabel}`,
        html: `<h2>Nuevo lead capturado</h2><pre style="font-family:ui-monospace,monospace;white-space:pre-wrap">${lines.join("\n")}</pre><p>Revíselo en el panel: <strong>/panel/leads</strong></p>`,
        text: lines.join("\n"),
      }).catch(() => undefined);
    }
  }

  return { ok: true, message: `lead:${lead.id}` };
}

const updateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "DISCARDED"]),
  notes: z.string().max(4000).optional().nullable(),
});

/// El staff actualiza el estado de un lead y agrega notas.
export async function updateLead(
  leadId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);
  const parsed = updateSchema.safeParse({
    status: formData.get("status"),
    notes: clean(formData.get("notes")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, OR: [{ subscriberId }, { subscriberId: null }] },
    select: { id: true, subscriberId: true, status: true },
  });
  if (!lead) return { ok: false, error: "Lead no encontrado." };

  const now = parsed.data.status !== "NEW" && lead.status === "NEW" ? new Date() : null;
  const statusChanged = parsed.data.status !== lead.status;
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes,
      // Asigna el suscriptor si estaba nulo (al primer toque)
      subscriberId: lead.subscriberId ?? subscriberId,
      contactedAt: now ?? undefined,
      contactedById: now ? ctx.userId : undefined,
      activities: statusChanged
        ? {
            create: {
              actorId: ctx.userId,
              type: "STATUS_CHANGE",
              comment: parsed.data.notes,
              metadata: { from: lead.status, to: parsed.data.status },
            },
          }
        : undefined,
    },
  });
  await audit(ctx, {
    action: "lead.update",
    entity: "Lead",
    entityId: leadId,
    subscriberId,
    after: { status: parsed.data.status },
  });
  revalidatePath("/panel/leads");
  return { ok: true, message: `Estado actualizado: ${LEAD_STATUS_LABELS[parsed.data.status]}` };
}

// ────────────────────────────────────────────────────────────────────
//  Edición de datos comerciales (sin tocar status).
// ────────────────────────────────────────────────────────────────────
const detailSchema = z.object({
  fullName: z.string().min(2).max(160),
  phone: z.string().max(40).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  company: z.string().max(160).optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  certificationOfInterest: z.string().max(160).optional().nullable(),
});

export async function updateLeadDetails(
  leadId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);
  const parsed = detailSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: clean(formData.get("phone")),
    country: clean(formData.get("country")),
    company: clean(formData.get("company")),
    jobTitle: clean(formData.get("jobTitle")),
    certificationOfInterest: clean(formData.get("certificationOfInterest")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, OR: [{ subscriberId }, { subscriberId: null }] },
    select: { id: true, subscriberId: true, fullName: true, phone: true, country: true, company: true, jobTitle: true, certificationOfInterest: true },
  });
  if (!lead) return { ok: false, error: "Lead no encontrado." };

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      ...parsed.data,
      subscriberId: lead.subscriberId ?? subscriberId,
    },
  });
  await audit(ctx, {
    action: "lead.detail.update", entity: "Lead", entityId: leadId, subscriberId,
    before: lead, after: parsed.data,
  });
  revalidatePath("/panel/leads");
  return { ok: true, message: "Datos actualizados." };
}

// ────────────────────────────────────────────────────────────────────
//  Seguimiento: anotación libre del operador.
// ────────────────────────────────────────────────────────────────────
const followSchema = z.object({
  type: z.enum(["NOTE", "CALL", "MEETING"]),
  comment: z.string().min(2, "Escriba el detalle del seguimiento.").max(2000),
});

export async function addLeadFollowUp(
  leadId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);
  const parsed = followSchema.safeParse({
    type: formData.get("type"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, OR: [{ subscriberId }, { subscriberId: null }] },
    select: { id: true },
  });
  if (!lead) return { ok: false, error: "Lead no encontrado." };

  await prisma.leadActivity.create({
    data: { leadId, actorId: ctx.userId, type: parsed.data.type, comment: parsed.data.comment },
  });
  await prisma.lead.update({
    where: { id: leadId },
    data: { notes: parsed.data.comment },
  });
  await audit(ctx, {
    action: "lead.followup", entity: "Lead", entityId: leadId, subscriberId,
    after: { type: parsed.data.type, comment: parsed.data.comment.slice(0, 80) },
  });
  revalidatePath("/panel/leads");
  return { ok: true, message: "Seguimiento registrado." };
}

// ────────────────────────────────────────────────────────────────────
//  Enviar correo personalizado al lead.
// ────────────────────────────────────────────────────────────────────
const emailSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(3).max(8000),
});

export async function sendLeadEmail(
  leadId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);
  const parsed = emailSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, OR: [{ subscriberId }, { subscriberId: null }] },
    select: { id: true, email: true, fullName: true },
  });
  if (!lead) return { ok: false, error: "Lead no encontrado." };

  const body = parsed.data.body.replace(/{nombre}/gi, lead.fullName);
  const html = `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;">${body
    .replace(/</g, "&lt;")
    .replace(/\n/g, "<br>")}</div>`;

  const result = await sendEmail({
    subscriberId, to: lead.email, subject: parsed.data.subject, html, text: body,
  });
  await prisma.leadActivity.create({
    data: {
      leadId, actorId: ctx.userId, type: "EMAIL_SENT",
      comment: parsed.data.subject,
      metadata: { provider: result.provider, messageId: result.id ?? null, ok: result.ok, error: result.error ?? null },
    },
  });
  await audit(ctx, {
    action: "lead.email.send", entity: "Lead", entityId: leadId, subscriberId,
    after: { subject: parsed.data.subject, ok: result.ok, messageId: result.id ?? null },
  });
  revalidatePath("/panel/leads");
  return result.ok
    ? { ok: true, message: "Correo enviado." }
    : { ok: false, error: `Falló el envío: ${result.error ?? "sin detalle"}` };
}

// ────────────────────────────────────────────────────────────────────
//  Cotización automática: arma un correo formal con el precio + el
//  proceso de la certificación de interés del lead, lo manda y deja
//  rastro en la bitácora.
// ────────────────────────────────────────────────────────────────────
export async function sendLeadQuote(leadId: string): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, OR: [{ subscriberId }, { subscriberId: null }] },
    select: { id: true, email: true, fullName: true, certificationOfInterest: true, company: true, jobTitle: true },
  });
  if (!lead) return { ok: false, error: "Lead no encontrado." };

  const { buildQuoteEmail } = await import("@/lib/lead-quote");
  const rendered = buildQuoteEmail({
    fullName: lead.fullName,
    company: lead.company,
    jobTitle: lead.jobTitle,
    interest: lead.certificationOfInterest,
  });

  const result = await sendEmail({
    subscriberId, to: lead.email,
    subject: rendered.subject, html: rendered.html, text: rendered.text,
  });
  await prisma.leadActivity.create({
    data: {
      leadId, actorId: ctx.userId, type: "QUOTE_SENT",
      comment: rendered.subject,
      metadata: {
        certification: lead.certificationOfInterest ?? null,
        provider: result.provider, messageId: result.id ?? null,
        ok: result.ok, error: result.error ?? null,
      },
    },
  });
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "CONTACTED",
      contactedAt: new Date(),
      contactedById: ctx.userId,
    },
  });
  await audit(ctx, {
    action: "lead.quote.send", entity: "Lead", entityId: leadId, subscriberId,
    after: { interest: lead.certificationOfInterest, ok: result.ok, messageId: result.id ?? null },
  });
  revalidatePath("/panel/leads");
  return result.ok
    ? { ok: true, message: "Cotización enviada al correo del lead." }
    : { ok: false, error: `Falló la cotización: ${result.error ?? "sin detalle"}` };
}

// ────────────────────────────────────────────────────────────────────
//  Log de "apertura de WhatsApp": al hacer clic en el botón WhatsApp
//  registramos la intención. El cliente abre wa.me directamente.
// ────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────
//  Importación masiva de leads (Excel pegado o CSV).
//  Cada fila se valida con el mismo zod schema base y se dedupea por
//  correo. Devuelve un resumen con created/updated/skipped y errores.
// ────────────────────────────────────────────────────────────────────
const importRowSchema = z.object({
  fullName: z.string().min(2, "nombre vacío").max(160),
  email: z.string().email("correo inválido").max(160),
  phone: z.string().max(40).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  company: z.string().max(160).optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  certificationOfInterest: z.string().max(160).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

export async function importLeadsBulk(
  rawRows: unknown,
): Promise<{
  ok: boolean;
  summary?: { received: number; created: number; updated: number; skipped: number; errors: string[] };
  error?: string;
}> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);
  if (!Array.isArray(rawRows)) return { ok: false, error: "Esperaba un arreglo de filas." };
  if (rawRows.length > 1000) return { ok: false, error: "Máximo 1000 filas por importación." };

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const parsed = importRowSchema.safeParse(rawRows[i]);
    if (!parsed.success) {
      skipped++;
      if (errors.length < 10) errors.push(`fila ${i + 1}: ${parsed.error.issues[0]?.message ?? "inválida"}`);
      continue;
    }
    const d = parsed.data;
    const emailLower = d.email.toLowerCase();
    try {
      const existing = await prisma.lead.findFirst({
        where: { email: emailLower, OR: [{ subscriberId }, { subscriberId: null }] },
        orderBy: { createdAt: "desc" },
      });
      const dedupeWindow = 60 * 24 * 60 * 60 * 1000;
      const reusable = existing && Date.now() - existing.createdAt.getTime() < dedupeWindow;

      if (reusable) {
        await prisma.lead.update({
          where: { id: existing.id },
          data: {
            fullName: d.fullName,
            phone: d.phone ?? existing.phone,
            country: d.country ?? existing.country,
            company: d.company ?? existing.company,
            jobTitle: d.jobTitle ?? existing.jobTitle,
            certificationOfInterest: d.certificationOfInterest ?? existing.certificationOfInterest,
            message: d.message ?? existing.message,
            subscriberId: existing.subscriberId ?? subscriberId,
            activities: {
              create: {
                actorId: ctx.userId,
                type: "NOTE",
                comment: "Lead actualizado desde importación masiva.",
                metadata: { source: "import" },
              },
            },
          },
        });
        updated++;
      } else {
        await prisma.lead.create({
          data: {
            subscriberId,
            kind: "INFORMATION",
            fullName: d.fullName,
            email: emailLower,
            phone: d.phone,
            country: d.country,
            company: d.company,
            jobTitle: d.jobTitle,
            certificationOfInterest: d.certificationOfInterest,
            message: d.message,
            source: "bulk-import",
            consentAccepted: false,
            siteVisitCount: 0,
            activities: {
              create: {
                actorId: ctx.userId,
                type: "NOTE",
                comment: "Lead creado por importación masiva.",
                metadata: { source: "import" },
              },
            },
          },
        });
        created++;
      }
    } catch (e) {
      skipped++;
      if (errors.length < 10) errors.push(`fila ${i + 1}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  await audit(ctx, {
    action: "lead.import", entity: "Lead", subscriberId,
    after: { received: rawRows.length, created, updated, skipped },
  });
  revalidatePath("/panel/leads");
  return { ok: true, summary: { received: rawRows.length, created, updated, skipped, errors } };
}

// ────────────────────────────────────────────────────────────────────
//  Envío masivo de correo a leads seleccionados.
// ────────────────────────────────────────────────────────────────────
const bulkEmailSchema = z.object({
  leadIds: z.array(z.string()).min(1, "Seleccione al menos un lead.").max(200, "Máximo 200 destinatarios."),
  subject: z.string().min(3).max(200),
  body: z.string().min(3).max(8000),
});

export async function sendBulkLeadEmail(args: {
  leadIds: string[];
  subject: string;
  body: string;
}): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);
  const parsed = bulkEmailSchema.safeParse(args);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const leads = await prisma.lead.findMany({
    where: { id: { in: parsed.data.leadIds }, OR: [{ subscriberId }, { subscriberId: null }] },
    select: { id: true, email: true, fullName: true },
  });
  if (leads.length === 0) return { ok: false, error: "No se encontraron destinatarios válidos." };

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Resend permite ~10 requests/segundo. Mantenemos al menos 120 ms
  // entre envíos para no agarrar 429 en lotes grandes. El primer envío
  // sale inmediato; el throttle aplica entre los siguientes.
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < leads.length; i++) {
    if (i > 0) await sleep(120);
    const l = leads[i];
    const body = parsed.data.body.replace(/{nombre}/gi, l.fullName);
    const html = `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;">${body
      .replace(/</g, "&lt;")
      .replace(/\n/g, "<br>")}</div>`;
    const result = await sendEmail({
      subscriberId, to: l.email, subject: parsed.data.subject, html, text: body,
    }).catch((e) => ({ ok: false, provider: "exception", error: e instanceof Error ? e.message : String(e) }));
    if (result.ok) sent++; else { failed++; if (errors.length < 5) errors.push(`${l.email}: ${"error" in result ? result.error : "sin detalle"}`); }
    await prisma.leadActivity.create({
      data: {
        leadId: l.id, actorId: ctx.userId, type: "EMAIL_SENT",
        comment: parsed.data.subject,
        metadata: { bulk: true, ok: result.ok, messageId: "id" in result ? result.id ?? null : null },
      },
    });
  }
  await audit(ctx, {
    action: "lead.bulk_email", entity: "Lead", subscriberId,
    after: { count: leads.length, sent, failed, subject: parsed.data.subject },
  });
  revalidatePath("/panel/leads");
  if (failed > 0) {
    return { ok: false, error: `Enviados: ${sent} · Fallaron: ${failed}. ${errors[0] ?? ""}` };
  }
  return { ok: true, message: `Correos enviados: ${sent}.` };
}

// ────────────────────────────────────────────────────────────────────
//  Log de WhatsApp masivo: cuando el operador procesa una lista, cada
//  enlace abierto se cuenta. El cliente abre los wa.me uno por uno.
// ────────────────────────────────────────────────────────────────────
export async function logBulkWhatsApp(leadIds: string[]): Promise<{ ok: boolean; count: number }> {
  try {
    const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, OR: [{ subscriberId }, { subscriberId: null }], phone: { not: null } },
      select: { id: true, phone: true },
    });
    await prisma.leadActivity.createMany({
      data: leads.map((l) => ({
        leadId: l.id, actorId: ctx.userId, type: "WHATSAPP_OPEN" as const,
        metadata: { bulk: true, phone: l.phone ?? null },
      })),
    });
    await audit(ctx, { action: "lead.bulk_whatsapp", entity: "Lead", subscriberId, after: { count: leads.length } });
    return { ok: true, count: leads.length };
  } catch {
    return { ok: false, count: 0 };
  }
}

export async function logLeadWhatsApp(leadId: string): Promise<{ ok: boolean }> {
  try {
    const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, OR: [{ subscriberId }, { subscriberId: null }] },
      select: { id: true, phone: true },
    });
    if (!lead) return { ok: false };
    await prisma.leadActivity.create({
      data: { leadId, actorId: ctx.userId, type: "WHATSAPP_OPEN", metadata: { phone: lead.phone ?? null } },
    });
    await audit(ctx, { action: "lead.whatsapp.open", entity: "Lead", entityId: leadId, subscriberId });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
