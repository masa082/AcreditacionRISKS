"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { saveUpload, deleteByKey, IMAGE_EXTS, extFromName, MAX_UPLOAD_BYTES } from "@/lib/storage";
import type { ActionResult } from "@/lib/actions/schemes";

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

// Acepta una URL absoluta http(s) o una ruta interna de activo de marca (/api/brand/...).
const assetUrl = z
  .string()
  .max(500)
  .optional()
  .nullable()
  .refine((v) => !v || /^https?:\/\//i.test(v) || v.startsWith("/api/brand/"), "Enlace inválido");

const orgSchema = z.object({
  legalName: z.string().min(3, "Razón social requerida").max(160),
  tradeName: z.string().max(160).optional().nullable(),
  taxId: z.string().max(40).optional().nullable(),
  legalRepName: z.string().max(160).optional().nullable(),
  authorizedSigner: z.string().max(200).optional().nullable(),
  signatureImageUrl: assetUrl,
  logoUrl: assetUrl,
  primaryColor: z.string().max(20).optional().nullable(),
  secondaryColor: z.string().max(20).optional().nullable(),
  contactEmail: z.string().email("Correo inválido").optional().nullable(),
  contactPhone: z.string().max(40).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
});

/// Actualiza la configuración de marca y datos legales del suscriptor.
export async function updateOrganization(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.ORG_MANAGE);
  const parsed = orgSchema.safeParse({
    legalName: formData.get("legalName"),
    tradeName: clean(formData.get("tradeName")),
    taxId: clean(formData.get("taxId")),
    legalRepName: clean(formData.get("legalRepName")),
    authorizedSigner: clean(formData.get("authorizedSigner")),
    signatureImageUrl: clean(formData.get("signatureImageUrl")),
    logoUrl: clean(formData.get("logoUrl")),
    primaryColor: clean(formData.get("primaryColor")),
    secondaryColor: clean(formData.get("secondaryColor")),
    contactEmail: clean(formData.get("contactEmail")),
    contactPhone: clean(formData.get("contactPhone")),
    address: clean(formData.get("address")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  await prisma.subscriber.update({ where: { id: subscriberId }, data: parsed.data });
  await audit(ctx, { action: "org.update", entity: "Subscriber", entityId: subscriberId, subscriberId });
  revalidatePath("/panel/organizacion");
  return { ok: true };
}

// ----------------------------------------------------------------------------
//  Configuración de marketing editable: WhatsApp, social proof, banner
//  de urgencia, garantías, slogan, datos bancarios para pago manual.
// ----------------------------------------------------------------------------
const marketingSchema = z.object({
  slogan: z.string().max(160).optional().nullable(),
  whatsappNumber: z.string().max(20).optional().nullable(),
  whatsappMessage: z.string().max(500).optional().nullable(),
  spProfessionals: z.string().max(40).optional().nullable(),
  spCompanies: z.string().max(40).optional().nullable(),
  spAvgScore: z.string().max(40).optional().nullable(),
  spDaysToIssue: z.string().max(40).optional().nullable(),
  urgencyEnabled: z.string().optional().nullable(),
  urgencyText: z.string().max(200).optional().nullable(),
  urgencyCtaLabel: z.string().max(40).optional().nullable(),
  urgencyCtaHref: z.string().max(200).optional().nullable(),
  bankingInfo: z.string().max(2000).optional().nullable(),
  guarantees: z.string().max(4000).optional().nullable(), // JSON serializado
});

/// Actualiza Subscriber.marketingConfig. Permisos: ORG_MANAGE.
export async function updateMarketingConfig(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.ORG_MANAGE);
  const parsed = marketingSchema.safeParse({
    slogan: clean(formData.get("slogan")),
    whatsappNumber: clean(formData.get("whatsappNumber")),
    whatsappMessage: clean(formData.get("whatsappMessage")),
    spProfessionals: clean(formData.get("spProfessionals")),
    spCompanies: clean(formData.get("spCompanies")),
    spAvgScore: clean(formData.get("spAvgScore")),
    spDaysToIssue: clean(formData.get("spDaysToIssue")),
    urgencyEnabled: clean(formData.get("urgencyEnabled")),
    urgencyText: clean(formData.get("urgencyText")),
    urgencyCtaLabel: clean(formData.get("urgencyCtaLabel")),
    urgencyCtaHref: clean(formData.get("urgencyCtaHref")),
    bankingInfo: clean(formData.get("bankingInfo")),
    guarantees: clean(formData.get("guarantees")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  let guaranteesParsed: Array<{ icon: string; title: string; desc: string }> | undefined;
  if (parsed.data.guarantees) {
    try {
      const arr = JSON.parse(parsed.data.guarantees);
      if (Array.isArray(arr)) {
        guaranteesParsed = arr
          .filter((g: unknown): g is { icon?: string; title?: string; desc?: string } =>
            typeof g === "object" && g !== null,
          )
          .map((g) => ({
            icon: String((g as { icon?: string }).icon ?? "✓").slice(0, 4),
            title: String((g as { title?: string }).title ?? "").slice(0, 80),
            desc: String((g as { desc?: string }).desc ?? "").slice(0, 240),
          }))
          .filter((g) => g.title.length > 0 && g.desc.length > 0);
      }
    } catch {
      return { ok: false, error: "JSON de garantías inválido." };
    }
  }

  const marketingConfig = {
    slogan: parsed.data.slogan ?? null,
    whatsapp: {
      number: parsed.data.whatsappNumber ?? "",
      message: parsed.data.whatsappMessage ?? "",
    },
    socialProof: {
      professionalsCertified: parsed.data.spProfessionals ?? "",
      companiesTrust: parsed.data.spCompanies ?? "",
      avgScore: parsed.data.spAvgScore ?? "",
      daysToIssue: parsed.data.spDaysToIssue ?? "",
    },
    urgency: {
      enabled: parsed.data.urgencyEnabled === "on",
      text: parsed.data.urgencyText ?? "",
      ctaLabel: parsed.data.urgencyCtaLabel ?? "",
      ctaHref: parsed.data.urgencyCtaHref ?? "",
    },
    bankingInfo: parsed.data.bankingInfo ?? "",
    ...(guaranteesParsed ? { guarantees: guaranteesParsed } : {}),
  };

  await prisma.subscriber.update({
    where: { id: subscriberId },
    data: { marketingConfig },
  });
  await audit(ctx, {
    action: "org.marketing.update",
    entity: "Subscriber",
    entityId: subscriberId,
    subscriberId,
  });
  revalidatePath("/");
  revalidatePath("/panel/organizacion");
  return { ok: true, message: "Configuración de marketing actualizada." };
}

/// Sube directamente el logo o la firma autorizada del suscriptor (imagen) y la
/// publica en /api/brand para que aparezca en certificados y diplomas.
export async function uploadOrgAsset(
  kind: "logo" | "signature",
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.ORG_MANAGE);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Seleccione una imagen." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "La imagen supera el tamaño máximo permitido (10 MB)." };
  }
  const ext = extFromName(file.name);
  if (!IMAGE_EXTS.has(ext)) {
    return { ok: false, error: "Formato no válido. Use PNG o JPG." };
  }

  const { key } = await saveUpload(file, ["org", subscriberId, kind]);
  const url = `/api/brand/${key}`;

  // Borra el activo interno anterior, si lo había.
  const prev = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { logoUrl: true, signatureImageUrl: true },
  });
  const prevUrl = (kind === "logo" ? prev?.logoUrl : prev?.signatureImageUrl) ?? null;
  if (prevUrl && prevUrl.startsWith("/api/brand/")) {
    await deleteByKey(prevUrl.replace("/api/brand/", ""));
  }

  await prisma.subscriber.update({
    where: { id: subscriberId },
    data: kind === "logo" ? { logoUrl: url } : { signatureImageUrl: url },
  });
  await audit(ctx, { action: "org.asset.upload", entity: "Subscriber", entityId: subscriberId, subscriberId, after: { kind } });
  revalidatePath("/panel/organizacion");
  return { ok: true };
}

// ─── Configuración de la pasarela Rapyd por suscriptor ────────────────────
const rapydSchema = z.object({
  rapydEnabled: z.boolean(),
  rapydEnv: z.enum(["sandbox", "production"]),
  rapydAccessKey: z.string().max(120).optional().nullable(),
  rapydSecretKey: z.string().max(400).optional().nullable(),
  rapydMerchantNote: z.string().max(200).optional().nullable(),
});

/// Actualiza las credenciales Rapyd del suscriptor.
///
/// Solo lo puede invocar el admin del suscriptor (permiso ORG_MANAGE). El
/// SUPERADMIN tiene una acción equivalente en /admin/suscriptores.
///
/// Si la secret key llega vacía y ya hay una guardada, conservamos la
/// existente (la UI muestra solo los últimos 4 caracteres por seguridad).
export async function updateRapydConfig(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.ORG_MANAGE);
  const enabled = formData.get("rapydEnabled") === "on";
  const parsed = rapydSchema.safeParse({
    rapydEnabled: enabled,
    rapydEnv: (formData.get("rapydEnv") as string) || "sandbox",
    rapydAccessKey: clean(formData.get("rapydAccessKey")),
    rapydSecretKey: clean(formData.get("rapydSecretKey")),
    rapydMerchantNote: clean(formData.get("rapydMerchantNote")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const current = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { rapydAccessKey: true, rapydSecretKey: true, rapydEnabled: true, rapydEnv: true },
  });

  // Si el operador no escribió una nueva secret, conservamos la actual.
  const nextSecret = parsed.data.rapydSecretKey ?? current?.rapydSecretKey ?? null;
  const nextAccess = parsed.data.rapydAccessKey ?? current?.rapydAccessKey ?? null;

  if (parsed.data.rapydEnabled && (!nextAccess || !nextSecret)) {
    return { ok: false, error: "Para activar Rapyd debe proveer la Clave de acceso y la Clave secreta." };
  }

  await prisma.subscriber.update({
    where: { id: subscriberId },
    data: {
      rapydEnabled: parsed.data.rapydEnabled,
      rapydEnv: parsed.data.rapydEnv,
      rapydAccessKey: nextAccess,
      rapydSecretKey: nextSecret,
      rapydMerchantNote: parsed.data.rapydMerchantNote,
    },
  });
  await audit(ctx, {
    action: "org.rapyd.update",
    entity: "Subscriber",
    entityId: subscriberId,
    subscriberId,
    before: {
      rapydEnabled: current?.rapydEnabled,
      rapydEnv: current?.rapydEnv,
      // NUNCA loggeamos la secret en claro.
      rapydAccessKey: current?.rapydAccessKey,
    },
    after: {
      rapydEnabled: parsed.data.rapydEnabled,
      rapydEnv: parsed.data.rapydEnv,
      rapydAccessKey: nextAccess,
      secretChanged: !!parsed.data.rapydSecretKey,
    },
  });
  revalidatePath("/panel/organizacion");
  revalidatePath(`/admin/suscriptores/${subscriberId}`);
  return { ok: true, message: parsed.data.rapydEnabled ? "Rapyd activado." : "Configuración Rapyd guardada." };
}
