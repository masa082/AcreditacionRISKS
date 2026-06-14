import { prisma } from "@/lib/prisma";
import { qrDataUrl } from "@/lib/certificate";
import { readFileByKey, extFromName } from "@/lib/storage";
import { renderCertificatePdf, type CertificateData } from "@/lib/certificate-design";
import { buildPdfFilename } from "@/lib/pdf-filename";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Descarga pública del certificado en PDF.
 *
 * Por seguridad — y por la solicitud expresa de proteger los enlaces para
 * que NO se puedan adivinar cambiando un número — esta ruta acepta
 * únicamente el **verifyToken** del certificado, que es un token aleatorio
 * de 24 bytes (192 bits de entropía) generado con randomBytes. El
 * `code` legible NO sirve aquí, ni tampoco el id.
 *
 *   https://www.okacreditado.com/api/certificate/<verifyToken>/pdf
 *
 * El diseño del PDF se delega a `lib/certificate-design.ts` que decide
 * entre el diploma premium (CERTIFICATION) y la constancia sobria
 * (EXAM_PRESENTATION). Tamaño: CARTA horizontal (792 × 612 pt).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return new Response("Token inválido", { status: 400 });
  }
  const cert = await prisma.certificate.findFirst({
    where: { verifyToken: token },
    include: {
      subscriber: {
        select: { tradeName: true, legalName: true, authorizedSigner: true, logoUrl: true, signatureImageUrl: true, taxId: true },
      },
      scheme: { select: { name: true, code: true, normReference: true, scope: true } },
    },
  });
  if (!cert) {
    return new Response("Certificado no encontrado", { status: 404 });
  }
  if (cert.status !== "VALID" && cert.status !== "EXPIRED") {
    return new Response("Este certificado no se puede descargar (estado: " + cert.status + ")", { status: 403 });
  }

  // Estado efectivo (recalcula vencimiento en caliente)
  const effectiveStatus = cert.expiresAt && cert.status === "VALID" && cert.expiresAt < new Date() ? "EXPIRED" : cert.status;

  // Cargar logo
  let logoBytes: Uint8Array | null = null;
  let logoIsPng = true;
  if (cert.subscriber.logoUrl?.startsWith("/api/brand/")) {
    try {
      const key = cert.subscriber.logoUrl.replace("/api/brand/", "");
      logoBytes = await readFileByKey(key);
      logoIsPng = extFromName(key) === "png";
    } catch { /* ignore */ }
  }
  // Cargar firma
  let signatureBytes: Uint8Array | null = null;
  let signatureIsPng = true;
  if (cert.subscriber.signatureImageUrl?.startsWith("/api/brand/")) {
    try {
      const key = cert.subscriber.signatureImageUrl.replace("/api/brand/", "");
      signatureBytes = await readFileByKey(key);
      signatureIsPng = extFromName(key) === "png";
    } catch { /* ignore */ }
  }
  // QR PNG
  let qrPngBytes: Uint8Array | null = null;
  try {
    const qrDataURL = await qrDataUrl(cert.code);
    const base64 = qrDataURL.split(",")[1];
    if (base64) qrPngBytes = Buffer.from(base64, "base64");
  } catch { /* ignore */ }

  const tokenPreview = `${token.slice(0, 8)}…${token.slice(-8)}`;

  const certData: CertificateData = {
    type: cert.type === "CERTIFICATION" ? "CERTIFICATION" : "EXAM_PRESENTATION",
    code: cert.code,
    title: cert.title,
    scope: cert.scope ?? cert.scheme?.scope ?? null,
    holderName: cert.holderName,
    documentNumber: cert.documentNumber,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    status: effectiveStatus,
    subscriber: {
      tradeName: cert.subscriber.tradeName,
      legalName: cert.subscriber.legalName,
      authorizedSigner: cert.subscriber.authorizedSigner,
      taxId: cert.subscriber.taxId,
    },
    scheme: cert.scheme ? { normReference: cert.scheme.normReference } : null,
  };

  const bytes = await renderCertificatePdf({
    cert: certData,
    qrPngBytes,
    logoBytes,
    logoIsPng,
    signatureBytes,
    signatureIsPng,
    tokenPreview,
  });

  // Auditar descarga (tolerante)
  try {
    await prisma.auditLog.create({
      data: {
        action: "certificate.download",
        entity: "Certificate",
        entityId: cert.id,
        subscriberId: cert.subscriberId,
        after: { code: cert.code, token: tokenPreview },
      },
    });
  } catch { /* tolerante */ }

  const certType = cert.type === "CERTIFICATION" ? "Certificado" : "Constancia";
  const fileName = buildPdfFilename({
    prefix: certType,
    holderName: cert.holderName,
    documentType: "DOC",
    documentNumber: cert.documentNumber ?? undefined,
    status: effectiveStatus,
    suffix: cert.code,
  });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
