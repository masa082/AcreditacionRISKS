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
  fullName: z.string().min(3, "Indique su nombre completo").max(160),
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
  const kind = parsed.data.kind ?? "REGISTRATION";

  // Honeypot anti-bot: si el campo oculto "website" viene con valor, descartamos en silencio.
  const honey = clean(formData.get("website"));
  if (honey) {
    return { ok: true };
  }

  const lead = await prisma.lead.create({
    data: {
      subscriberId,
      kind,
      fullName: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone,
      country: parsed.data.country,
      company: parsed.data.company,
      jobTitle: parsed.data.jobTitle,
      certificationOfInterest: parsed.data.certificationOfInterest,
      message: parsed.data.message,
      suggestedDate: parsed.data.suggestedDate ? new Date(parsed.data.suggestedDate) : null,
      source: parsed.data.source,
      utmSource: parsed.data.utmSource,
      utmMedium: parsed.data.utmMedium,
      utmCampaign: parsed.data.utmCampaign,
      ip: m.ip,
      userAgent: m.userAgent,
      consentAccepted: true,
    },
  });

  // Notificación in-app a todo el staff con LEAD_VIEW.
  if (subscriberId) {
    const staff = await prisma.user.findMany({
      where: { subscriberId, type: "SUBSCRIBER", status: "ACTIVE" },
      include: { role: { select: { permissions: true } } },
    });
    const kindLabel = LEAD_KIND_LABELS[kind];
    const title = `Nuevo lead: ${parsed.data.fullName}`;
    const body = `${kindLabel}${parsed.data.certificationOfInterest ? ` · ${parsed.data.certificationOfInterest}` : ""}`;
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
      const orgName = sub?.tradeName ?? sub?.legalName ?? "AcreditaPro";
      const lines = [
        `Tipo: ${kindLabel}`,
        `Nombre: ${parsed.data.fullName}`,
        `Correo: ${parsed.data.email}`,
        parsed.data.phone ? `Teléfono: ${parsed.data.phone}` : null,
        parsed.data.country ? `País: ${parsed.data.country}` : null,
        parsed.data.company ? `Empresa: ${parsed.data.company}` : null,
        parsed.data.jobTitle ? `Cargo: ${parsed.data.jobTitle}` : null,
        parsed.data.certificationOfInterest ? `Certificación de interés: ${parsed.data.certificationOfInterest}` : null,
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
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes,
      // Asigna el suscriptor si estaba nulo (al primer toque)
      subscriberId: lead.subscriberId ?? subscriberId,
      contactedAt: now ?? undefined,
      contactedById: now ? ctx.userId : undefined,
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
