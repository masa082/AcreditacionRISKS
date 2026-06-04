import { NextRequest } from "next/server";
import { getCurrentUser, can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/// Envía un correo de prueba con el proveedor configurado (Resend cuando
/// EMAIL_PROVIDER=resend). Útil para verificar la integración tras
/// configurar las variables en Vercel. Reservado al SUPERADMIN.
///
///   GET  /api/admin/email-test?to=gerencia@risksint.com
///   POST /api/admin/email-test  (body opcional)
export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser();
  if (!ctx || ctx.type !== "PLATFORM" || !can(ctx, PERMISSIONS.SUBSCRIBER_MANAGE)) {
    return new Response(JSON.stringify({ ok: false, error: "Acceso denegado." }), {
      status: 403, headers: { "content-type": "application/json" },
    });
  }
  const to = req.nextUrl.searchParams.get("to") || ctx.email;
  const provider = process.env.EMAIL_PROVIDER ?? "log";
  const hasKey = !!process.env.RESEND_API_KEY;

  const subject = `Prueba de correo · CIOC · ${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })}`;
  const text =
    "Este es un correo de prueba enviado desde la plataforma CIOC para verificar la integración con Resend.\n\n" +
    "Si está recibiendo este mensaje, el envío de correos transaccionales está funcionando correctamente.\n\n" +
    "Equipo CIOC — RISKS INTERNATIONAL S.A.S.";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="border-left: 4px solid #c89a35; padding-left: 12px;">
        <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #c89a35;">CIOC · Prueba de correo</div>
        <h1 style="font-size: 18px; color: #0b1d44; margin: 4px 0 0;">El envío de correos está funcionando ✓</h1>
      </div>
      <p style="color: #1f2937; font-size: 14px; line-height: 1.6;">
        Este es un correo de prueba enviado desde la plataforma <strong>CIOC</strong> para verificar la integración con <strong>Resend</strong>.
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #475569;">
        <tr><td style="padding: 4px 0; font-weight: bold;">Proveedor</td><td>${provider}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">API key configurada</td><td>${hasKey ? "Sí" : "No"}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Hora del servidor</td><td>${new Date().toISOString()}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Destinatario</td><td>${to}</td></tr>
      </table>
      <p style="color: #94a3b8; font-size: 11px; margin-top: 24px;">
        Esta es una prueba automatizada. Las copias obligatorias (gerencia@risksint.com y formacion@risksint.com) deben verse en la bandeja de cada uno.
      </p>
    </div>
  `;

  const result = await sendEmail({ to, subject, html, text });

  return new Response(
    JSON.stringify({
      sent: result.ok,
      provider: result.provider,
      messageId: result.id ?? null,
      error: result.error ?? null,
      diagnostics: {
        EMAIL_PROVIDER: provider,
        hasResendKey: hasKey,
        EMAIL_FROM: process.env.EMAIL_FROM ?? "(default no-reply@okacreditado.com)",
        EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO ?? "(default calidad@risksint.com)",
        EMAIL_BCC: process.env.EMAIL_BCC ?? "(no configurado — usa solo BCC obligatorio)",
        mandatoryBcc: ["gerencia@risksint.com", "formacion@risksint.com"],
      },
    }, null, 2),
    { status: result.ok ? 200 : 502, headers: { "content-type": "application/json" } },
  );
}
