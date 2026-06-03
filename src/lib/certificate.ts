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

/// Genera un código de certificado único a nivel global (CERT-AAAA-XXXXXXXX).
export async function generateCertificateCode(): Promise<string> {
  const year = new Date().getFullYear();
  for (let i = 0; i < 50; i++) {
    const code = `CERT-${year}-${newToken(4).toUpperCase()}`;
    const exists = await prisma.certificate.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  return `CERT-${year}-${Date.now().toString(36).toUpperCase()}`;
}
