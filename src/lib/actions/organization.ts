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
