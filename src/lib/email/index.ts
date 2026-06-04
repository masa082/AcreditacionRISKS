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

const APP_NAME = "CIOC";
/// FROM por defecto: usamos el dominio sandbox oficial de Resend
/// (onboarding@resend.dev) hasta que okacreditado.com esté verificado.
/// El sandbox SOLO entrega a la cuenta dueña de la API key (la del owner
/// de Resend) — para enviar a cualquier dirección hay que verificar un
/// dominio. Esto evita que el envío "falle silenciosamente" mientras se
/// completa el DNS de okacreditado.com en Resend.
const FALLBACK_FROM = "CIOC · RISKS <onboarding@resend.dev>";
const FROM = process.env.EMAIL_FROM ?? FALLBACK_FROM;
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "calidad@risksint.com";

/// Patrones de error de Resend que indican que el dominio del FROM no
/// está verificado en la cuenta. En esos casos reintentamos UNA vez con
/// el sandbox oficial para no perder el envío y dejamos un registro
/// claro en el AuditLog.
const DOMAIN_NOT_VERIFIED_PATTERNS = [
  /domain.*not.*verified/i,
  /verify.*domain/i,
  /from.*address.*not.*verified/i,
  /sender.*not.*verified/i,
  /403/,
  /unauthorized/i,
];

/// Copia oculta obligatoria de TODOS los correos transaccionales. Por
/// política operativa del organismo, gerencia y el área de formación deben
/// quedarse con copia de cada notificación que enviamos a candidatos,
/// suscriptores o visitantes para trazabilidad y respaldo del proceso.
/// Se puede ampliar vía la variable EMAIL_BCC (lista separada por coma).
const MANDATORY_BCC = ["gerencia@risksint.com", "formacion@risksint.com"];

function resolveBccList(toAddress: string): string[] {
  const extra = (process.env.EMAIL_BCC ?? "")
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const all = [...MANDATORY_BCC, ...extra];
  // Evita enviar BCC a la misma dirección destinataria (Resend lo rechaza).
  const set = new Set(all.map((a) => a.toLowerCase()));
  set.delete(toAddress.toLowerCase());
  return Array.from(set);
}

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

async function callResend(
  key: string,
  from: string,
  opts: SendOpts,
  bcc: string[],
): Promise<{ status: number; data: { id?: string; message?: string; name?: string } }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [opts.to],
      bcc: bcc.length > 0 ? bcc : undefined,
      reply_to: REPLY_TO,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  return { status: res.status, data };
}

async function resendProvider(opts: SendOpts): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, provider: "resend", error: "RESEND_API_KEY no configurada" };
  const bcc = resolveBccList(opts.to);
  try {
    let r = await callResend(key, FROM, opts, bcc);
    let errMsg = r.data.message ?? r.data.name ?? "";

    // Si el FROM falla por dominio no verificado y NO estamos ya usando el
    // sandbox, reintentamos automáticamente con onboarding@resend.dev.
    const domainProblem =
      r.status >= 400 &&
      DOMAIN_NOT_VERIFIED_PATTERNS.some((p) => p.test(`${errMsg} ${r.status}`));
    const isAlreadySandbox = /onboarding@resend\.dev/i.test(FROM);

    if (domainProblem && !isAlreadySandbox) {
      const original = errMsg;
      r = await callResend(key, FALLBACK_FROM, opts, bcc);
      errMsg = r.data.message ?? r.data.name ?? "";
      if (r.status >= 200 && r.status < 300 && r.data.id) {
        return {
          ok: true, provider: "resend", id: r.data.id,
          error: `[FROM "${FROM}" rechazado por Resend (${original}). Enviado con sandbox onboarding@resend.dev. Verifique el dominio en https://resend.com/domains.]`,
        };
      }
    }

    if (r.status >= 200 && r.status < 300 && r.data.id) {
      return { ok: true, provider: "resend", id: r.data.id };
    }
    return {
      ok: false,
      provider: "resend",
      error: `HTTP ${r.status} — ${errMsg || "respuesta sin detalle"}`,
    };
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
    const bcc = resolveBccList(opts.to);
    const info = await transport.sendMail({
      from: FROM,
      to: opts.to,
      bcc: bcc.length > 0 ? bcc : undefined,
      replyTo: REPLY_TO,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
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
        after: {
          to: opts.to,
          bcc: resolveBccList(opts.to),
          replyTo: REPLY_TO,
          subject: opts.subject,
          provider: result.provider,
          messageId: result.id ?? null,
          error: result.error ?? null,
        },
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
