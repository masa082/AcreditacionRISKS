"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { generateEnrollmentCode } from "@/lib/enrollment";

/// Inicia un proceso de recertificación a partir de un certificado del tenant.
/// Crea una nueva inscripción tipo RECERTIFICATION en estado CONSENT_PENDING.
export async function startRecertification(certificateId: string): Promise<void> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.RENEWAL_MANAGE);

  const cert = await prisma.certificate.findFirst({
    where: { id: certificateId, subscriberId },
    select: {
      id: true,
      candidateId: true,
      schemeId: true,
      enrollment: { select: { examId: true } },
    },
  });
  if (!cert) throw new Error("Certificado no encontrado.");

  const code = await generateEnrollmentCode(subscriberId);

  const enrollment = await prisma.enrollment.create({
    data: {
      subscriberId,
      candidateId: cert.candidateId,
      schemeId: cert.schemeId,
      examId: cert.enrollment?.examId ?? null,
      type: "RECERTIFICATION",
      status: "CONSENT_PENDING",
      code,
    },
  });

  await audit(ctx, {
    action: "renewal.start",
    entity: "Enrollment",
    entityId: enrollment.id,
    subscriberId,
    after: { code, certificateId: cert.id },
  });
  revalidatePath("/panel/vencimientos");
}
