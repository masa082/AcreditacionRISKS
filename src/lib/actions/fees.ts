"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePlatformAction, requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/schemes";

const CONCEPTS = ["ENROLLMENT", "EXAM", "CERTIFICATION", "RECERTIFICATION", "RETAKE", "DUPLICATE", "OTHER"] as const;
type Concept = (typeof CONCEPTS)[number];

const updateSchema = z.object({
  amount: z.coerce.number().min(0, "El monto debe ser positivo").max(99999999),
  currency: z.string().min(3).max(8).default("COP"),
  label: z.string().min(2, "Indique una etiqueta").max(120),
  isActive: z.boolean().optional(),
});

const createSchema = z.object({
  subscriberId: z.string().min(1),
  schemeId: z.string().optional().nullable(),
  concept: z.enum(CONCEPTS),
  amount: z.coerce.number().min(0).max(99999999),
  currency: z.string().min(3).max(8).default("COP"),
  label: z.string().min(2).max(120),
});

/// Actualiza una tarifa existente (FeeConfig) — solo SUPERADMIN.
export async function updateFee(
  feeId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requirePlatformAction(PERMISSIONS.PLATFORM_BILLING);
  const parsed = updateSchema.safeParse({
    amount: formData.get("amount"),
    currency: formData.get("currency") ?? "COP",
    label: formData.get("label"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const fee = await prisma.feeConfig.findUnique({ where: { id: feeId } });
  if (!fee) return { ok: false, error: "Tarifa no encontrada." };

  const before = { amount: fee.amount.toString(), label: fee.label, isActive: fee.isActive };
  await prisma.feeConfig.update({
    where: { id: feeId },
    data: {
      amount: new Prisma.Decimal(parsed.data.amount),
      currency: parsed.data.currency,
      label: parsed.data.label,
      isActive: parsed.data.isActive ?? fee.isActive,
    },
  });
  await audit(ctx, {
    action: "fee.update",
    entity: "FeeConfig",
    entityId: fee.id,
    subscriberId: fee.subscriberId,
    before,
    after: { amount: parsed.data.amount, label: parsed.data.label, isActive: parsed.data.isActive },
  });
  revalidatePath("/admin/tarifas");
  revalidatePath("/panel/tarifas");
  return { ok: true, message: `Tarifa actualizada a ${parsed.data.amount.toLocaleString("es-CO")} ${parsed.data.currency}.` };
}

/// Crea una nueva tarifa para un esquema/concepto — solo SUPERADMIN.
export async function createFee(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requirePlatformAction(PERMISSIONS.PLATFORM_BILLING);
  const schemeId = (() => {
    const v = formData.get("schemeId");
    const s = typeof v === "string" ? v.trim() : "";
    return s.length ? s : null;
  })();
  const parsed = createSchema.safeParse({
    subscriberId: formData.get("subscriberId"),
    schemeId,
    concept: formData.get("concept"),
    amount: formData.get("amount"),
    currency: formData.get("currency") ?? "COP",
    label: formData.get("label"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  if (parsed.data.schemeId) {
    const scheme = await prisma.certificationScheme.findFirst({
      where: { id: parsed.data.schemeId, subscriberId: parsed.data.subscriberId },
      select: { id: true },
    });
    if (!scheme) return { ok: false, error: "El esquema seleccionado no pertenece al suscriptor." };
  }

  const fee = await prisma.feeConfig.create({
    data: {
      subscriberId: parsed.data.subscriberId,
      schemeId: parsed.data.schemeId,
      concept: parsed.data.concept as Concept,
      amount: new Prisma.Decimal(parsed.data.amount),
      currency: parsed.data.currency,
      label: parsed.data.label,
      isActive: true,
    },
  });
  await audit(ctx, {
    action: "fee.create",
    entity: "FeeConfig",
    entityId: fee.id,
    subscriberId: parsed.data.subscriberId,
    after: { concept: parsed.data.concept, amount: parsed.data.amount, schemeId: parsed.data.schemeId },
  });
  revalidatePath("/admin/tarifas");
  revalidatePath("/panel/tarifas");
  return { ok: true, message: "Tarifa creada." };
}

/// Elimina una tarifa — solo SUPERADMIN.
export async function deleteFee(feeId: string): Promise<void> {
  const ctx = await requirePlatformAction(PERMISSIONS.PLATFORM_BILLING);
  const fee = await prisma.feeConfig.findUnique({ where: { id: feeId } });
  if (!fee) return;
  await prisma.feeConfig.delete({ where: { id: feeId } });
  await audit(ctx, {
    action: "fee.delete",
    entity: "FeeConfig",
    entityId: feeId,
    subscriberId: fee.subscriberId,
    before: { concept: fee.concept, amount: fee.amount.toString() },
  });
  revalidatePath("/admin/tarifas");
  revalidatePath("/panel/tarifas");
}

/// Versión "para suscriptor": permite al admin del propio organismo editar
/// sus tarifas, dentro del scope de su suscriptor (sin necesidad de
/// SUPERADMIN). Util para que cada certificador autogestione sus precios.
export async function updateFeeBySubscriber(
  feeId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.PAYMENT_MANAGE);
  const parsed = updateSchema.safeParse({
    amount: formData.get("amount"),
    currency: formData.get("currency") ?? "COP",
    label: formData.get("label"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const fee = await prisma.feeConfig.findFirst({ where: { id: feeId, subscriberId } });
  if (!fee) return { ok: false, error: "Tarifa no encontrada o no pertenece a su organismo." };

  await prisma.feeConfig.update({
    where: { id: feeId },
    data: {
      amount: new Prisma.Decimal(parsed.data.amount),
      currency: parsed.data.currency,
      label: parsed.data.label,
      isActive: parsed.data.isActive ?? fee.isActive,
    },
  });
  await audit(ctx, {
    action: "fee.update",
    entity: "FeeConfig",
    entityId: fee.id,
    subscriberId,
    after: { amount: parsed.data.amount, label: parsed.data.label, isActive: parsed.data.isActive },
  });
  revalidatePath("/panel/tarifas");
  return { ok: true, message: "Tarifa actualizada." };
}
