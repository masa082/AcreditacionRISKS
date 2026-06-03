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

const orgSchema = z.object({
  legalName: z.string().min(3, "Razón social requerida").max(160),
  tradeName: z.string().max(160).optional().nullable(),
  taxId: z.string().max(40).optional().nullable(),
  legalRepName: z.string().max(160).optional().nullable(),
  authorizedSigner: z.string().max(200).optional().nullable(),
  signatureImageUrl: z.string().url("Enlace de firma inválido").max(500).optional().nullable(),
  logoUrl: z.string().url("Enlace de logo inválido").max(500).optional().nullable(),
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
