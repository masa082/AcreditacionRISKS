import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type Brand,
  type RenderedEmail,
  verificationEmail,
  passwordResetEmail,
  certificateIssuedEmail,
} from "./templates";

// ============================================================================
//  Capa de correo. Proveedor configurable por entorno:
//    EMAIL_PROVIDER = "log" (por defecto, solo registra) | "resend" | "smtp"
//  Nunca lanza: si el envío falla, lo registra y devuelve ok:false.
//  Registra cada envío en AuditLog (action email.sent / email.failed).
// ============================================================================

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "CIOC";
const FROM = process.env.EMAIL_FROM ?? `${APP_NAME} <no-reply@okacreditado.com>`;

interface SendOpts {
  to: string;
  subject: string;
  html: string;
  text: string;
  subscriberId?: string | null;
}

export interface SendResult {
  ok: boolean;
  provider: string;
  id?: string;
  error?: string;
}

async function logProvider(opts: SendOpts): Promise<SendResult> {
  // Modo desarrollo: no envía, solo registra en consola.
  console.log(`📧 [email:log] To: ${opts.to} | Subject: ${opts.subject}\n   (modo log — defina EMAIL_PROVIDER=resend|smtp para enviar)`);
  return { ok: true, provider: "log", id: "log" };
}

async function resendProvider(opts: SendOpts): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, provider: "resend", error: "RESEND_API_KEY no configurada" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, provider: "resend", error: data.message ?? `HTTP ${res.status}` };
    return { ok: true, provider: "resend", id: data.id };
  } catch (e) {
    return { ok: false, provider: "resend", error: e instanceof Error ? e.message : "error de red" };
  }
}

async function smtpProvider(opts: SendOpts): Promise<SendResult> {
  if (!process.env.SMTP_HOST) return { ok: false, provider: "smtp", error: "SMTP_HOST no configurado" };
  try {
    // Carga dinámica para no incluir nodemailer salvo que se use SMTP.
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    const info = await transport.sendMail({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });
    return { ok: true, provider: "smtp", id: info.messageId };
  } catch (e) {
    return { ok: false, provider: "smtp", error: e instanceof Error ? e.message : "error SMTP" };
  }
}

/// Envío de bajo nivel. No lanza; registra el resultado en auditoría.
export async function sendEmail(opts: SendOpts): Promise<SendResult> {
  const provider = (process.env.EMAIL_PROVIDER ?? "log").toLowerCase();
  let result: SendResult;
  try {
    if (provider === "resend") result = await resendProvider(opts);
    else if (provider === "smtp") result = await smtpProvider(opts);
    else result = await logProvider(opts);
  } catch (e) {
    result = { ok: false, provider, error: e instanceof Error ? e.message : "error inesperado" };
  }
  await prisma.auditLog
    .create({
      data: {
        subscriberId: opts.subscriberId ?? null,
        action: result.ok ? "email.sent" : "email.failed",
        entity: "Email",
        after: { to: opts.to, subject: opts.subject, provider: result.provider, error: result.error ?? null },
      },
    })
    .catch(() => {});
  return result;
}

async function loadBrand(subscriberId?: string | null): Promise<Brand> {
  if (!subscriberId) return { orgName: APP_NAME, appName: APP_NAME };
  const s = await prisma.subscriber
    .findUnique({ where: { id: subscriberId }, select: { tradeName: true, legalName: true, primaryColor: true } })
    .catch(() => null);
  return { orgName: s?.tradeName ?? s?.legalName ?? APP_NAME, primaryColor: s?.primaryColor, appName: APP_NAME };
}

async function dispatch(to: string, subscriberId: string | null | undefined, rendered: RenderedEmail): Promise<SendResult> {
  return sendEmail({ to, subscriberId, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

// ----------------------- Correos transaccionales -----------------------

export async function sendVerificationEmail(subscriberId: string, to: string, firstName: string, actionUrl: string): Promise<SendResult> {
  const brand = await loadBrand(subscriberId);
  return dispatch(to, subscriberId, verificationEmail(brand, { firstName, actionUrl }));
}

export async function sendPasswordResetEmail(subscriberId: string | null, to: string, actionUrl: string): Promise<SendResult> {
  const brand = await loadBrand(subscriberId);
  return dispatch(to, subscriberId, passwordResetEmail(brand, { actionUrl }));
}

export async function sendCertificateIssuedEmail(subscriberId: string, to: string, data: { holderName: string; title: string; code: string; verifyUrl: string }): Promise<SendResult> {
  const brand = await loadBrand(subscriberId);
  return dispatch(to, subscriberId, certificateIssuedEmail(brand, data));
}
