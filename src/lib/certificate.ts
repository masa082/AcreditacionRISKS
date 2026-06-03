import "server-only";
import QRCode from "qrcode";
import { prisma } from "./prisma";
import { newToken } from "./auth";

// ============================================================================
//  Dominio de certificados: generación de código público único, URL de
//  verificación y código QR.
// ============================================================================

/// URL pública base para la verificación de certificados.
export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100").replace(/\/$/, "");
}

export function verifyUrl(code: string): string {
  return `${appBaseUrl()}/verificar/${encodeURIComponent(code)}`;
}

/// Genera el código QR (PNG data URL) que apunta a la verificación pública.
export async function qrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(verifyUrl(code), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: { dark: "#0f172aff", light: "#ffffffff" },
  });
}

/// Genera un código de certificado único a nivel global (PREFIJO-AAAA-XXXXXXXX).
export async function generateCertificateCode(prefix = "CERT"): Promise<string> {
  const year = new Date().getFullYear();
  for (let i = 0; i < 50; i++) {
    const code = `${prefix}-${year}-${newToken(4).toUpperCase()}`;
    const exists = await prisma.certificate.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  return `${prefix}-${year}-${Date.now().toString(36).toUpperCase()}`;
}

/// Emite (idempotente) la constancia de PRESENTACIÓN del examen para un intento
/// enviado. Se dispara automáticamente al finalizar el intento; nunca debe romper
/// el flujo de envío (envolver en try/catch en el llamador).
export async function issuePresentationCertificate(attemptId: string): Promise<void> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { select: { name: true } },
      candidate: { select: { id: true, firstName: true, lastName: true, documentNumber: true } },
      enrollment: { select: { id: true, schemeId: true } },
    },
  });
  if (!attempt || !attempt.submittedAt) return;

  const existing = await prisma.certificate.findFirst({
    where: { attemptId, type: "EXAM_PRESENTATION" },
    select: { id: true },
  });
  if (existing) return;

  const code = await generateCertificateCode("PRES");
  await prisma.certificate.create({
    data: {
      subscriberId: attempt.subscriberId,
      candidateId: attempt.candidateId,
      enrollmentId: attempt.enrollmentId,
      schemeId: attempt.enrollment?.schemeId ?? null,
      attemptId,
      type: "EXAM_PRESENTATION",
      code,
      verifyToken: newToken(16),
      title: `Constancia de presentación — ${attempt.exam.name}`,
      holderName: `${attempt.candidate.firstName} ${attempt.candidate.lastName}`,
      documentNumber: attempt.candidate.documentNumber,
      status: "VALID",
      issuedAt: new Date(),
      expiresAt: null,
    },
  });
}
