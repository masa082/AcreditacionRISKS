import "server-only";
import { prisma } from "@/lib/prisma";
import { newToken } from "@/lib/auth";
import { generateCertificateCode, verifyUrl } from "@/lib/certificate";
import { notifyCandidate } from "@/lib/notify";
import { sendCertificateIssuedEmail } from "@/lib/email";

/// Emite el certificado de competencias (type=CERTIFICATION) de una
/// inscripción aprobada SIN exigir permission check del operador.
/// Pensado para uso interno desde el flujo automático:
///
///   - submitAttempt: cuando el intento queda en PASSED con autoCertificate.
///   - finalizeManualGrading: idem cuando consolida MANUAL_GRADING → PASSED.
///   - Scripts de reparación operativa (Samuel y similares).
///
/// Es idempotente: si ya existe un certificado CERTIFICATION vigente para
/// la inscripción lo retorna en lugar de crear duplicado.
///
/// Devuelve `{ created: boolean, id, code, title }` para que el caller
/// sepa si el certificado se acaba de emitir (para disparar UI de
/// "Felicitaciones").
export async function issueCertificationInternal(opts: {
  enrollmentId: string;
  issuedByUserId?: string | null;
}): Promise<
  | { ok: true; created: boolean; id: string; code: string; title: string }
  | { ok: false; error: string }
> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: opts.enrollmentId },
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, email: true, documentNumber: true } },
      scheme: true,
      attempts: { where: { passed: true }, orderBy: { attemptNumber: "desc" }, take: 1 },
    },
  });
  if (!enrollment) return { ok: false, error: "Inscripción no encontrada." };

  const existing = await prisma.certificate.findFirst({
    where: { enrollmentId: enrollment.id, type: "CERTIFICATION", status: { not: "CANCELLED" } },
    select: { id: true, code: true, title: true },
  });
  if (existing) {
    return { ok: true, created: false, id: existing.id, code: existing.code, title: existing.title };
  }

  const scheme = enrollment.scheme;
  const validityMonths = scheme?.validityMonths ?? 36;
  const issuedAt = new Date();
  const expiresAt = validityMonths > 0
    ? new Date(new Date(issuedAt).setMonth(issuedAt.getMonth() + validityMonths))
    : null;
  const code = await generateCertificateCode();
  const holderName = `${enrollment.candidate.firstName} ${enrollment.candidate.lastName}`.trim();
  const title = scheme?.name ?? "Certificación de competencias";

  const cert = await prisma.certificate.create({
    data: {
      subscriberId: enrollment.subscriberId,
      candidateId: enrollment.candidateId,
      enrollmentId: enrollment.id,
      schemeId: enrollment.schemeId,
      attemptId: enrollment.attempts[0]?.id ?? null,
      type: "CERTIFICATION",
      code,
      verifyToken: newToken(16),
      title,
      scope: scheme?.scope ?? null,
      holderName,
      documentNumber: enrollment.candidate.documentNumber,
      status: "VALID",
      issuedAt,
      expiresAt,
      issuedById: opts.issuedByUserId ?? null,
    },
  });

  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status: "CERTIFIED" },
  });
  try {
    await notifyCandidate(
      enrollment.candidateId,
      "certificate.issued",
      "¡Su certificado fue emitido!",
      `${cert.title} · código ${cert.code}`,
    );
  } catch { /* notificación tolerante */ }
  try {
    if (enrollment.candidate.email) {
      await sendCertificateIssuedEmail(enrollment.subscriberId, enrollment.candidate.email, {
        holderName,
        title: cert.title,
        code: cert.code,
        verifyUrl: verifyUrl(cert.code),
      });
    }
  } catch { /* email tolerante */ }

  return { ok: true, created: true, id: cert.id, code: cert.code, title: cert.title };
}
