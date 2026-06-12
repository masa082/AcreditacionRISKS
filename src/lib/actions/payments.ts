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

/// El SUSCRIPTOR carga manualmente el SOPORTE de pago de un Payment
/// (por ejemplo: el dinero llegó por consignación directa al banco y el
/// candidato no subió el comprobante). Puede opcionalmente APROBAR el pago
/// en el mismo paso marcando `andApprove`.
export async function attachPaymentReceiptByAdmin(
  paymentId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.PAYMENT_MANAGE);

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, subscriberId },
    include: { enrollment: { select: { id: true, candidateId: true, code: true } } },
  });
  if (!payment) return { ok: false, error: "Pago no encontrado." };
  if (payment.status === "REJECTED") {
    return { ok: false, error: "Este pago fue rechazado. Cree un pago nuevo para reintentar." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Adjunte el comprobante de pago." };
  }
  const { saveUpload, extFromName, MAX_UPLOAD_BYTES } = await import("@/lib/storage");
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "El archivo supera el tamaño máximo de 100 MB." };
  }
  const ext = extFromName(file.name);
  const allowed = ["pdf", "jpg", "jpeg", "png"];
  if (!allowed.includes(ext)) {
    return { ok: false, error: `Formato no permitido. Use ${allowed.join(", ")}.` };
  }

  const { key } = await saveUpload(file, [
    subscriberId,
    "candidates",
    payment.enrollment?.candidateId ?? "_unknown",
    "payments",
    paymentId,
  ]);

  const note = (formData.get("note") as string | null)?.trim() ?? "";
  const providerRef = (formData.get("providerRef") as string | null)?.trim() ?? "";
  const andApprove = formData.get("andApprove") === "on";

  const existingMeta = (payment.metadata as Prisma.JsonObject | null) ?? {};
  const baseUpdate: Prisma.PaymentUpdateInput = {
    receiptUrl: key,
    providerRef: providerRef || payment.providerRef,
    metadata: {
      ...existingMeta,
      receipt: {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "ADMIN",
        adminUserId: ctx.userId,
        note: note || null,
      },
    } as Prisma.InputJsonValue,
  };

  let didApprove = false;
  if (andApprove && payment.status === "PENDING") {
    baseUpdate.status = "APPROVED";
    baseUpdate.paidAt = new Date();
    didApprove = true;
  }
  await prisma.payment.update({ where: { id: paymentId }, data: baseUpdate });

  if (didApprove && payment.enrollment) {
    await syncEnrollmentStatus(payment.enrollment.id);
    // Confirma referido si aplicaba
    try {
      const { confirmReferralByEnrollment } = await import("@/lib/actions/referrals");
      await confirmReferralByEnrollment(
        payment.enrollment.id,
        Number(payment.amount.toString()),
        payment.currency,
        payment.id,
      );
    } catch { /* tolerante a falta de referido */ }
    if (payment.enrollment.candidateId) {
      await notifyCandidate(
        payment.enrollment.candidateId,
        "payment.approved",
        "Su pago fue aprobado",
        `Su pago de la inscripción ${payment.enrollment.code ?? ""} fue confirmado por el equipo del organismo. Ya puede continuar con su proceso.`,
      );
    }
  }

  await audit(ctx, {
    action: didApprove ? "payment.receipt.upload+approve" : "payment.receipt.upload",
    entity: "Payment",
    entityId: paymentId,
    subscriberId,
    after: { fileName: file.name, note: note || null, andApprove: didApprove, providerRef: providerRef || null },
  });
  revalidatePath("/panel/pagos");
  revalidatePath(`/portal/inscripcion/${payment.enrollment?.id ?? ""}`);
  return { ok: true, message: didApprove ? "Soporte cargado y pago aprobado." : "Soporte cargado por el organismo." };
}
