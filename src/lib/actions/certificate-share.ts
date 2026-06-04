"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { BRAND } from "@/lib/brand";
import type { ActionResult } from "@/lib/actions/schemes";

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

const sendSchema = z.object({
  recipientEmail: z.string().email("Correo inválido").max(160),
  recipientName: z.string().max(160).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

/// Envía el certificado al correo indicado con un enlace público al verificable
/// + el PDF si existe. Requiere CERTIFICATE_VIEW (o ISSUE).
export async function sendCertificateByEmail(
  certId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.CERTIFICATE_VIEW);
  const parsed = sendSchema.safeParse({
    recipientEmail: formData.get("recipientEmail"),
    recipientName: clean(formData.get("recipientName")),
    message: clean(formData.get("message")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const cert = await prisma.certificate.findFirst({
    where: { id: certId, subscriberId },
    include: { subscriber: { select: { tradeName: true, legalName: true } } },
  });
  if (!cert) return { ok: false, error: "Certificado no encontrado." };

  const baseUrl = BRAND.appUrl.replace(/\/$/, "");
  const verifyUrl = `${baseUrl}/verificar/${encodeURIComponent(cert.code)}`;
  const publicUrl = `${baseUrl}/certificado/${cert.id}`;
  const org = cert.subscriber.tradeName ?? cert.subscriber.legalName ?? "CIOC";
  const expires = cert.expiresAt ? cert.expiresAt.toISOString().slice(0, 10) : "No vence";

  const greeting = parsed.data.recipientName ? `Hola ${parsed.data.recipientName},` : "Hola,";
  const userMessage = parsed.data.message ? `\n${parsed.data.message}\n` : "";

  const textBody =
`${greeting}

Compartimos el certificado emitido por ${org} a nombre de ${cert.holderName}.
${userMessage}
Programa: ${cert.title}
Código: ${cert.code}
Estado: ${cert.status}
Fecha de emisión: ${cert.issuedAt.toISOString().slice(0,10)}
Vigencia hasta: ${expires}

Verificación pública (QR):
${verifyUrl}

Vista oficial del certificado:
${publicUrl}

Si lo desea, puede descargar el diploma en PDF desde la vista oficial.

${org}
${BRAND.isoNorm}`;

  const htmlBody = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;max-width:600px;margin:0 auto;">
  <div style="border-bottom:3px solid #0b1d44;padding:20px 0;">
    <h2 style="margin:0;color:#0b1d44;">Certificado de Competencias</h2>
    <p style="margin:6px 0 0;font-size:12px;color:#475569;">${org} · ${BRAND.isoNorm}</p>
  </div>
  <div style="padding:24px 0;">
    <p>${greeting}</p>
    <p>Compartimos el certificado emitido por <strong>${org}</strong> a nombre de <strong>${cert.holderName}</strong>.</p>
    ${parsed.data.message ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#f1f5f9;border-left:4px solid #0b1d44;">${parsed.data.message.replace(/</g,"&lt;").replace(/\n/g,"<br>")}</blockquote>` : ""}
    <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">
      <tr><td style="padding:6px 0;color:#64748b;">Programa</td><td style="padding:6px 0;"><strong>${cert.title}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Código único</td><td style="padding:6px 0;font-family:monospace;">${cert.code}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Estado</td><td style="padding:6px 0;color:#059669;font-weight:bold;">${cert.status}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Emisión</td><td style="padding:6px 0;">${cert.issuedAt.toISOString().slice(0,10)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Vigencia hasta</td><td style="padding:6px 0;">${expires}</td></tr>
    </table>
    <p style="margin:24px 0;">
      <a href="${publicUrl}" style="display:inline-block;background:#0b1d44;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Ver certificado oficial</a>
    </p>
    <p style="font-size:12px;color:#64748b;">Verificación pública: <a href="${verifyUrl}" style="color:#0b1d44;">${verifyUrl}</a></p>
  </div>
  <div style="border-top:1px solid #e2e8f0;padding:16px 0;font-size:11px;color:#94a3b8;">
    ${org} · ${BRAND.isoNorm} · <a href="${baseUrl}/verificar" style="color:#0b1d44;">${baseUrl}/verificar</a>
  </div>
  </body></html>`;

  const result = await sendEmail({
    subscriberId,
    to: parsed.data.recipientEmail,
    subject: `[${org}] Certificado ${cert.code} — ${cert.holderName}`,
    html: htmlBody,
    text: textBody,
  });

  await audit(ctx, {
    action: "certificate.share.email",
    entity: "Certificate",
    entityId: certId,
    subscriberId,
    after: { to: parsed.data.recipientEmail, ok: result.ok },
  });

  if (!result.ok) {
    return { ok: false, error: "No se pudo enviar el correo. Verifique la configuración del proveedor (Resend/SMTP)." };
  }
  return { ok: true, message: `Enviado a ${parsed.data.recipientEmail}.` };
}

/// Devuelve la URL wa.me para abrir WhatsApp con un mensaje pre-rellenado
/// con el link público + verificación del certificado. No envía el mensaje:
/// el cliente abre la URL y el usuario lo despacha desde su WhatsApp.
export async function buildCertificateWhatsappLink(certId: string, phoneRaw: string, message?: string): Promise<string | null> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.CERTIFICATE_VIEW);
  const cert = await prisma.certificate.findFirst({
    where: { id: certId, subscriberId },
    include: { subscriber: { select: { tradeName: true, legalName: true } } },
  });
  if (!cert) return null;
  const phone = phoneRaw.replace(/\D/g, "");
  if (!phone) return null;

  const baseUrl = BRAND.appUrl.replace(/\/$/, "");
  const verifyUrl = `${baseUrl}/verificar/${encodeURIComponent(cert.code)}`;
  const org = cert.subscriber.tradeName ?? cert.subscriber.legalName ?? "CIOC";
  const expires = cert.expiresAt ? cert.expiresAt.toISOString().slice(0, 10) : "No vence";

  const text = message?.trim()
    ? `${message.trim()}\n\nCertificado: ${cert.code}\nVerificar: ${verifyUrl}`
    : `Hola, compartimos el certificado emitido por ${org} a nombre de ${cert.holderName}.\n\nPrograma: ${cert.title}\nCódigo: ${cert.code}\nVigencia hasta: ${expires}\n\nVerifique aquí: ${verifyUrl}`;

  await audit(ctx, {
    action: "certificate.share.whatsapp",
    entity: "Certificate",
    entityId: certId,
    subscriberId,
    after: { phone },
  });

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
