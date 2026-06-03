"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { newToken } from "@/lib/auth";
import { generateCertificateCode } from "@/lib/certificate";
import type { ActionResult } from "@/lib/actions/schemes";

/// Emite el diploma/certificado de certificación de una inscripción aprobada.
/// Idempotente: si ya existe un certificado vigente para la inscripción lo reutiliza.
export async function issueCertificate(enrollmentId: string): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.CERTIFICATE_ISSUE);

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, subscriberId },
    include: {
      candidate: true,
      scheme: true,
      attempts: { where: { passed: true }, orderBy: { attemptNumber: "desc" }, take: 1 },
    },
  });
  if (!enrollment) return { ok: false, error: "Inscripción no encontrada." };
  if (!["APPROVED", "CERTIFIED"].includes(enrollment.status)) {
    return { ok: false, error: "Solo se puede certificar una inscripción aprobada." };
  }

  const existing = await prisma.certificate.findFirst({
    where: { enrollmentId, type: "CERTIFICATION", status: { not: "CANCELLED" } },
    select: { id: true },
  });
  if (existing) {
    revalidatePath("/panel/certificados");
    return { ok: true, id: existing.id };
  }

  const scheme = enrollment.scheme;
  const validityMonths = scheme?.validityMonths ?? 36;
  const issuedAt = new Date();
  const expiresAt = validityMonths > 0 ? new Date(new Date(issuedAt).setMonth(issuedAt.getMonth() + validityMonths)) : null;
  const code = await generateCertificateCode();
  const holderName = `${enrollment.candidate.firstName} ${enrollment.candidate.lastName}`;

  const cert = await prisma.certificate.create({
    data: {
      subscriberId,
      candidateId: enrollment.candidateId,
      enrollmentId,
      schemeId: enrollment.schemeId,
      attemptId: enrollment.attempts[0]?.id ?? null,
      type: "CERTIFICATION",
      code,
      verifyToken: newToken(16),
      title: scheme?.name ?? "Certificación de competencias",
      scope: scheme?.scope ?? null,
      holderName,
      documentNumber: enrollment.candidate.documentNumber,
      status: "VALID",
      issuedAt,
      expiresAt,
      issuedById: ctx.userId,
    },
  });

  await prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: "CERTIFIED" } });
  await audit(ctx, { action: "certificate.issue", entity: "Certificate", entityId: cert.id, subscriberId, after: { code, holderName } });
  revalidatePath("/panel/certificados");
  revalidatePath("/portal/certificados");
  return { ok: true, id: cert.id };
}

const revokeSchema = z.object({
  reason: z.string().min(5, "Indique el motivo de la anulación").max(1000),
});

/// Anula (retira) un certificado con trazabilidad del motivo.
export async function revokeCertificate(
  certificateId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.CERTIFICATE_REVOKE);
  const parsed = revokeSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const cert = await prisma.certificate.findFirst({ where: { id: certificateId, subscriberId }, select: { id: true, status: true } });
  if (!cert) return { ok: false, error: "Certificado no encontrado." };
  if (cert.status === "WITHDRAWN" || cert.status === "CANCELLED") {
    return { ok: false, error: "El certificado ya está anulado." };
  }

  await prisma.certificate.update({
    where: { id: certificateId },
    data: { status: "WITHDRAWN", revocationReason: parsed.data.reason, revokedAt: new Date() },
  });
  await audit(ctx, { action: "certificate.revoke", entity: "Certificate", entityId: certificateId, subscriberId, after: { reason: parsed.data.reason } });
  revalidatePath("/panel/certificados");
  return { ok: true };
}
