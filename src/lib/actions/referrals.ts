"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { generateReferralCode } from "@/lib/referrals";
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

async function resolveDefaultSubscriberId(): Promise<string | null> {
  const sub = await prisma.subscriber.findFirst({
    where: { slug: "risks", status: "ACTIVE" },
    select: { id: true },
  });
  return sub?.id ?? null;
}

const registerSchema = z.object({
  fullName: z.string().min(3, "Indique su nombre completo").max(160),
  email: z.string().email("Correo inválido").max(160),
  phone: z.string().max(40).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  bankAccountInfo: z.string().max(500).optional().nullable(),
  taxId: z.string().max(40).optional().nullable(),
  consent: z.string().optional().nullable(),
});

export interface ReferrerCreateResult extends ActionResult {
  code?: string;
}

/// Registro público de referidor. Devuelve el código en `code` para que
/// la página de confirmación lo muestre y permita copiar el link a compartir.
export async function registerReferrer(
  _prev: ReferrerCreateResult,
  formData: FormData,
): Promise<ReferrerCreateResult> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: clean(formData.get("phone")),
    country: clean(formData.get("country")),
    bankAccountInfo: clean(formData.get("bankAccountInfo")),
    taxId: clean(formData.get("taxId")),
    consent: clean(formData.get("consent")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  if (!parsed.data.consent) {
    return { ok: false, error: "Debe autorizar el tratamiento de datos personales." };
  }
  // Honeypot
  if (clean(formData.get("website"))) return { ok: true };

  const email = parsed.data.email.toLowerCase();
  const subscriberId = await resolveDefaultSubscriberId();
  const m = await meta();

  // Si ya existe un referidor con ese correo, devolvemos su mismo código.
  const existing = await prisma.referrer.findFirst({
    where: { email, subscriberId },
    select: { code: true },
  });
  if (existing) {
    return { ok: true, code: existing.code, message: "Ya teníamos un código activo para usted; le devolvemos el mismo." };
  }

  // Genera código único (reintenta hasta 5 veces si colisiona).
  let code = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.referrer.findUnique({ where: { code }, select: { id: true } });
    if (!exists) break;
    code = generateReferralCode();
  }

  const referrer = await prisma.referrer.create({
    data: {
      subscriberId,
      code,
      fullName: parsed.data.fullName,
      email,
      phone: parsed.data.phone,
      country: parsed.data.country,
      bankAccountInfo: parsed.data.bankAccountInfo,
      taxId: parsed.data.taxId,
      ip: m.ip,
      userAgent: m.userAgent,
      consentAccepted: true,
    },
  });

  await audit(null, {
    action: "referrer.register",
    entity: "Referrer",
    entityId: referrer.id,
    subscriberId,
    after: { code, email },
  });
  return { ok: true, code, message: "Su código de referido fue generado." };
}

/// Crea un Referral PENDING ligando un código de referidor a una Enrollment
/// recién creada. Si el código no existe, retorna ok:false silenciosamente
/// (la inscripción ya está creada igualmente).
export async function attachReferralCode(opts: {
  code: string;
  candidateId: string;
  enrollmentId: string;
  subscriberId: string;
}): Promise<{ ok: boolean }> {
  if (!opts.code) return { ok: false };
  const referrer = await prisma.referrer.findFirst({
    where: { code: opts.code.trim().toUpperCase(), status: "ACTIVE" },
    select: { id: true, subscriberId: true },
  });
  if (!referrer) return { ok: false };

  // No permitir auto-referidos: si el referidor existe con el mismo email
  // que el candidato, ignoramos.
  const candidate = await prisma.candidate.findUnique({ where: { id: opts.candidateId }, select: { email: true } });
  const sameEmail = candidate?.email && await prisma.referrer.findFirst({
    where: { id: referrer.id, email: candidate.email },
    select: { id: true },
  });
  if (sameEmail) return { ok: false };

  // ¿Ya hay un referral activo para esta inscripción?
  const existing = await prisma.referral.findFirst({
    where: { enrollmentId: opts.enrollmentId, status: { in: ["PENDING", "CONFIRMED", "PAID"] } },
    select: { id: true },
  });
  if (existing) return { ok: false };

  await prisma.referral.create({
    data: {
      subscriberId: opts.subscriberId,
      referrerId: referrer.id,
      candidateId: opts.candidateId,
      enrollmentId: opts.enrollmentId,
      status: "PENDING",
    },
  });
  return { ok: true };
}

/// Cuando un Payment pasa a APPROVED, el Referral asociado a esa Enrollment
/// se confirma y se calcula la recompensa real. Llamada desde
/// payEnrollment (mock) y desde el webhook Rapyd.
export async function confirmReferralByEnrollment(enrollmentId: string, paidAmount: number, currency: string, paymentId: string): Promise<void> {
  const referral = await prisma.referral.findFirst({
    where: { enrollmentId, status: "PENDING" },
    select: { id: true, rewardPercent: true },
  });
  if (!referral) return;
  const reward = Number((paidAmount * Number(referral.rewardPercent.toString()) / 100).toFixed(2));
  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      paymentId,
      rewardAmount: new Prisma.Decimal(reward),
      currency,
    },
  });
}

const markPaidSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
});

/// El admin del organismo registra que ya pagó la recompensa al referidor.
export async function markReferralPaid(
  referralId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.REFERRAL_MANAGE);
  const parsed = markPaidSchema.safeParse({
    notes: clean(formData.get("notes")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const referral = await prisma.referral.findFirst({ where: { id: referralId, subscriberId } });
  if (!referral) return { ok: false, error: "Referido no encontrado." };
  if (referral.status !== "CONFIRMED") return { ok: false, error: "Solo se pueden pagar referidos confirmados." };

  await prisma.referral.update({
    where: { id: referralId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paidById: ctx.userId,
      notes: parsed.data.notes,
    },
  });
  await audit(ctx, {
    action: "referral.pay",
    entity: "Referral",
    entityId: referralId,
    subscriberId,
    after: { paidById: ctx.userId, notes: parsed.data.notes },
  });
  revalidatePath("/panel/referidos");
  return { ok: true, message: "Marcado como pagado." };
}
