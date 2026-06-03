"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { notifyCandidate } from "@/lib/notify";
import { syncEnrollmentStatus } from "@/lib/enrollment";
import type { ActionResult } from "@/lib/actions/schemes";

const approveSchema = z.object({
  providerRef: z.string().max(120).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * Aprueba manualmente un pago PENDING. Pensado para flujos sin pasarela
 * automática (transferencia bancaria, consignación, PSE manual). El admin
 * verifica el comprobante, registra la referencia y aprueba.
 */
export async function approvePaymentManually(
  paymentId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.PAYMENT_MANAGE);
  const parsed = approveSchema.safeParse({
    providerRef: typeof formData.get("providerRef") === "string" ? (formData.get("providerRef") as string).trim() : null,
    notes: typeof formData.get("notes") === "string" ? (formData.get("notes") as string).trim() : null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, subscriberId },
    include: { enrollment: { select: { id: true, candidateId: true, code: true } } },
  });
  if (!payment) return { ok: false, error: "Pago no encontrado." };
  if (payment.status === "APPROVED") return { ok: true, message: "El pago ya estaba aprobado." };
  if (payment.status === "REJECTED" || payment.status === "REFUNDED") {
    return { ok: false, error: `No se puede aprobar un pago en estado ${payment.status}.` };
  }

  const before = { status: payment.status, providerRef: payment.providerRef };
  const ref = parsed.data.providerRef && parsed.data.providerRef.length > 0
    ? parsed.data.providerRef
    : payment.providerRef;
  const existingMeta = (payment.metadata as Prisma.JsonObject | null) ?? {};

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "APPROVED",
      providerRef: ref,
      paidAt: new Date(),
      metadata: {
        ...existingMeta,
        awaitingManualApproval: false,
        approvedManuallyBy: ctx.userId,
        approvedAt: new Date().toISOString(),
        approvalNotes: parsed.data.notes ?? null,
      } as Prisma.InputJsonValue,
    },
  });

  if (payment.enrollment) {
    await syncEnrollmentStatus(payment.enrollment.id);
  }

  if (payment.enrollment?.candidateId) {
    await notifyCandidate(
      payment.enrollment.candidateId,
      "payment.approved",
      "Su pago fue aprobado",
      `El pago de su inscripción ${payment.enrollment.code ?? ""} fue verificado y aprobado. Ya puede continuar con su proceso.`,
    );
  }

  await audit(ctx, {
    action: "payment.approve.manual",
    entity: "Payment",
    entityId: paymentId,
    subscriberId,
    before,
    after: { status: "APPROVED", providerRef: ref, notes: parsed.data.notes },
  });
  revalidatePath("/panel/pagos");
  revalidatePath(`/portal/inscripcion/${payment.enrollment?.id ?? ""}`);
  revalidatePath("/portal/pagos");
  return { ok: true, message: "Pago aprobado." };
}

const rejectSchema = z.object({
  reason: z.string().min(5, "Indique el motivo del rechazo").max(500),
});

/// Rechaza un pago pendiente con una razón obligatoria.
export async function rejectPayment(
  paymentId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.PAYMENT_MANAGE);
  const parsed = rejectSchema.safeParse({
    reason: typeof formData.get("reason") === "string" ? (formData.get("reason") as string).trim() : "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, subscriberId },
    include: { enrollment: { select: { id: true, candidateId: true, code: true } } },
  });
  if (!payment) return { ok: false, error: "Pago no encontrado." };
  if (payment.status === "APPROVED") return { ok: false, error: "No se puede rechazar un pago ya aprobado." };

  const existingMeta = (payment.metadata as Prisma.JsonObject | null) ?? {};
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "REJECTED",
      metadata: {
        ...existingMeta,
        rejectedBy: ctx.userId,
        rejectedAt: new Date().toISOString(),
        rejectionReason: parsed.data.reason,
      } as Prisma.InputJsonValue,
    },
  });

  if (payment.enrollment?.candidateId) {
    await notifyCandidate(
      payment.enrollment.candidateId,
      "payment.rejected",
      "Su pago fue rechazado",
      `El pago de su inscripción ${payment.enrollment.code ?? ""} fue rechazado. Motivo: ${parsed.data.reason}`,
    );
  }

  await audit(ctx, {
    action: "payment.reject",
    entity: "Payment",
    entityId: paymentId,
    subscriberId,
    after: { status: "REJECTED", reason: parsed.data.reason },
  });
  revalidatePath("/panel/pagos");
  return { ok: true, message: "Pago rechazado." };
}
