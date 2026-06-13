import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type Brand,
  type RenderedEmail,
  verificationEmail,
  passwordResetEmail,
  certificateIssuedEmail,
  examScoreEmail,
  habeasReceiptEmail,
  manualGradingRequiredEmail,
  infoRequestToCandidateEmail,
  candidateAnsweredInfoRequestEmail,
} from "./templates";

// ============================================================================
//  Capa de correo. Proveedor configurable por entorno:
//    EMAIL_PROVIDER = "log" (por defecto, solo registra) | "resend" | "smtp"
//  Nunca lanza: si el envío falla, lo registra y devuelve ok:false.
//  Registra cada envío en AuditLog (action email.sent / email.failed).
// ============================================================================

const APP_NAME = "CIOC";

/// FROM por defecto: usamos el dominio de marca (okacreditado.com).
/// Para que Resend acepte enviar desde este dominio hay que verificarlo
/// una sola vez en https://resend.com/domains (agregar los registros DNS
/// que Resend pide: SPF, DKIM, return-path). Mientras NO esté verificado,
/// Resend devuelve HTTP 403 "domain not verified" y el envío falla con
/// un mensaje accionable (ver SANDBOX_TESTING_PATTERNS más abajo).
///
/// IMPORTANTE: el display name NO puede contener caracteres fuera del
/// rango "atom" de RFC 5322 sin estar entrecomillado, o Resend devuelve
/// HTTP 422 "Invalid `from` field". `sanitizeFromAddress` se encarga de
/// limpiar y entrecomillar cuando hace falta.
const FALLBACK_FROM = `"CIOC RISKS INTERNATIONAL" <notificaciones@okacreditado.com>`;
const FROM = sanitizeFromAddress(process.env.EMAIL_FROM ?? FALLBACK_FROM);
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "calidad@risksint.com";

/// Sandbox de último recurso de Resend. SOLO entrega correos a la cuenta
/// dueña de la API key (ese es el comportamiento de "testing mode" que
/// devuelve HTTP 403 para cualquier otro destinatario). Lo usamos UNA
/// SOLA VEZ como reintento cuando el FROM principal falla por dominio
/// no verificado — si vuelve a fallar, ya devolvemos error accionable.
const RESEND_SANDBOX_FROM = `"CIOC RISKS INTERNATIONAL" <onboarding@resend.dev>`;

/// Validación simple de email. No es un parser RFC completo — solo detecta
/// los casos obvios de basura (espacios, comillas internas, sin @, sin TLD).
function isValidEmail(s: string): boolean {
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s);
}

/// Normaliza un valor de FROM a un formato seguro para Resend.
///
/// Acepta:
///   "Display Name <email@host.tld>"   (con display name)
///   "email@host.tld"                  (solo email)
///
/// Arreglos sobre el display name:
///   - middle-dots (·•∙‧) y em/en-dashes (—–‒‐) → guión "-"
///   - chars de control Unicode (\p{Cc}) → espacio
///   - comillas y backslashes → se eliminan (rompen el parser)
///   - cualquier carácter no-ASCII (acentos, paréntesis, comas) →
///     fuerza entrecomillar todo el display name (quoted-string RFC 5322)
///
/// Si el email no es válido devuelve FALLBACK_FROM — preferimos un FROM
/// seguro que entregue, sobre uno "bonito" que falle.
export function sanitizeFromAddress(raw: string): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return FALLBACK_FROM;
  // Captura "Display <email>" — display puede ir entre comillas o no.
  const m = trimmed.match(/^(.*?)\s*<\s*([^>\s]+)\s*>\s*$/);
  if (m) {
    const rawName = m[1].trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
    const email = m[2].trim();
    if (!isValidEmail(email)) return FALLBACK_FROM;
    const safeName = rawName
      .replace(/[·•∙‧]/g, "-") // middle-dots ·•∙‧
      .replace(/[—–‒‐]/g, "-") // em/en/figure/hyphen dashes
      .replace(/\p{Cc}/gu, " ")                    // chars de control Unicode
      .replace(/["'\\]/g, "")                      // comillas, backslash
      .replace(/\s+/g, " ")
      .trim();
    if (!safeName) return email;
    // Entrecomillamos cuando el display name salga del rango "atom" RFC —
    // letras ASCII, dígitos, espacio, `.`, `_`, `-`.
    const needsQuotes = /[^A-Za-z0-9 ._-]/.test(safeName);
    const display = needsQuotes ? `"${safeName}"` : safeName;
    return `${display} <${email}>`;
  }
  if (isValidEmail(trimmed)) return trimmed;
  return FALLBACK_FROM;
}

/// Patrones de error de Resend que indican que el dominio del FROM no
/// está verificado en la cuenta. Reintentamos UNA vez con sandbox para
/// rescatar el envío y dejamos aviso en el AuditLog.
const DOMAIN_NOT_VERIFIED_PATTERNS = [
  /domain.*not.*verified/i,
  /verify.*domain/i,
  /from.*address.*not.*verified/i,
  /sender.*not.*verified/i,
];

/// Patrones que indican que el envío llegó al SANDBOX de Resend y este
/// rechazó por "testing mode" — solo entrega a la cuenta dueña de la
/// API key. Si esto sale, ya NO sirve reintentar: hay que verificar el
/// dominio. Devolvemos un mensaje accionable.
const SANDBOX_TESTING_PATTERNS = [
  /testing emails to your own email/i,
  /verify a domain at resend/i,
  /you can only send testing/i,
];

function isDomainNotVerified(status: number, msg: string): boolean {
  if (status < 400) return false;
  if (DOMAIN_NOT_VERIFIED_PATTERNS.some((p) => p.test(msg))) return true;
  // Resend a veces devuelve 403 sin mensaje claro cuando el dominio del
  // FROM no es propio — usamos 403 como señal solo si el FROM tampoco es
  // sandbox. La detección final del callsite usa esto + isAlreadySandbox.
  return status === 403 && !SANDBOX_TESTING_PATTERNS.some((p) => p.test(msg));
}

function isSandboxTestingMode(msg: string): boolean {
  return SANDBOX_TESTING_PATTERNS.some((p) => p.test(msg));
}

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

/**
 * Adjunto de correo. Resend admite hasta 40 MB combinados por mensaje
 * y acepta tanto `content` en base64 como `path` (URL). Aquí usamos
 * base64 porque generamos los PDFs en memoria.
 */
export interface EmailAttachment {
  filename: string;
  /** Bytes del archivo. Se convierte a base64 al llamar al API. */
  content: Uint8Array;
  /** Opcional. Default: application/pdf si el filename termina en .pdf. */
  contentType?: string;
}

interface SendOpts {
  to: string;
  subject: string;
  html: string;
  text: string;
  subscriberId?: string | null;
  attachments?: EmailAttachment[];
}

export interface SendResult {
  ok: boolean;
  provider: string;
  id?: string;
  error?: string;
}

async function logProvider(opts: SendOpts): Promise<SendResult> {
  // Modo desarrollo: no envía, solo registra en consola.
  console.log(`[email:log] To: ${opts.to} | Subject: ${opts.subject}\n   (modo log — defina EMAIL_PROVIDER=resend|smtp para enviar)`);
  return { ok: true, provider: "log", id: "log" };
}

async function callResend(
  key: string,
  from: string,
  opts: SendOpts,
  bcc: string[],
): Promise<{ status: number; data: { id?: string; message?: string; name?: string } }> {
  // Adjuntos: Resend espera `{ filename, content: <base64-string> }`.
  // Convertimos los bytes a base64 server-side (Node Buffer).
  const attachments = opts.attachments?.map((a) => ({
    filename: a.filename,
    content: Buffer.from(a.content).toString("base64"),
    contentType: a.contentType ?? (a.filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : undefined),
  }));

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
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
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
    // 1. Intento principal con el FROM configurado (dominio de marca).
    let r = await callResend(key, FROM, opts, bcc);
    let errMsg = r.data.message ?? r.data.name ?? "";

    if (r.status >= 200 && r.status < 300 && r.data.id) {
      return { ok: true, provider: "resend", id: r.data.id };
    }

    const isAlreadySandbox = /onboarding@resend\.dev/i.test(FROM);
    const domainProblem = isDomainNotVerified(r.status, errMsg);

    // 2. Reintento UNA sola vez con el sandbox de Resend si el dominio
    //    del FROM principal no está verificado. Solo entrega al dueño de
    //    la API key — útil mientras se verifica el dominio en Resend.
    if (domainProblem && !isAlreadySandbox) {
      const originalFrom = FROM;
      const originalMsg = errMsg;
      r = await callResend(key, RESEND_SANDBOX_FROM, opts, bcc);
      errMsg = r.data.message ?? r.data.name ?? "";

      if (r.status >= 200 && r.status < 300 && r.data.id) {
        // Entregado con sandbox: ÉXITO con aviso para que verifiquen el dominio.
        return {
          ok: true,
          provider: "resend",
          id: r.data.id,
          error:
            `Enviado en modo prueba (sandbox onboarding@resend.dev). ` +
            `Su FROM "${originalFrom}" fue rechazado: ${originalMsg}. ` +
            `Para enviar desde su dominio, verifíquelo en https://resend.com/domains.`,
        };
      }

      // El sandbox también rechazó. Lo más típico es el "testing mode":
      // solo entrega al dueño de la API key.
      if (isSandboxTestingMode(errMsg) || r.status === 403) {
        return {
          ok: false,
          provider: "resend",
          error:
            `DOMINIO NO VERIFICADO en Resend. ` +
            `Su FROM "${originalFrom}" no es de un dominio verificado y el sandbox ` +
            `(onboarding@resend.dev) solo entrega al correo dueño de la API key. ` +
            `SOLUCIÓN: vaya a https://resend.com/domains, agregue okacreditado.com ` +
            `y copie los registros DNS que le pida (SPF, DKIM, return-path) a su ` +
            `proveedor de DNS. Cuando aparezca "verified" en Resend, los envíos ` +
            `funcionan sin tocar nada más.`,
        };
      }
    }

    // 3. Caso "ya estábamos en sandbox y rechazó por testing mode"
    //    — pasa cuando EMAIL_FROM en Vercel apunta directamente al sandbox.
    if (isAlreadySandbox && isSandboxTestingMode(errMsg)) {
      return {
        ok: false,
        provider: "resend",
        error:
          `El FROM actual apunta a onboarding@resend.dev (sandbox), que solo ` +
          `entrega a la cuenta dueña de la API key. Cambie EMAIL_FROM en Vercel a ` +
          `un dominio verificado (por ejemplo "notificaciones@okacreditado.com" tras ` +
          `verificar el dominio en https://resend.com/domains).`,
      };
    }

    // 4. Otros errores: lo devolvemos crudo con contexto del FROM usado.
    return {
      ok: false,
      provider: "resend",
      error: `HTTP ${r.status} — ${errMsg || "respuesta sin detalle"} [from=${FROM}]`,
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

/// Envío del recibo Habeas Data con el PDF de la autorización como
/// adjunto. Se llama al final de `registerCandidate` después de que la
/// transacción persista el DataConsent. El BCC obligatorio sigue
/// aplicando (gerencia + formación quedan con copia del adjunto).
export async function sendHabeasReceiptEmail(
  subscriberId: string,
  to: string,
  data: {
    holderName: string;
    documentLabel: string;
    acceptedAt: Date;
    responsibleEmail: string;
    policyUrl: string;
    evidenceHash: string;
    pdfBytes: Uint8Array;
  },
): Promise<SendResult> {
  const brand = await loadBrand(subscriberId);
  const rendered = habeasReceiptEmail(brand, {
    holderName: data.holderName,
    documentLabel: data.documentLabel,
    acceptedAt: data.acceptedAt,
    responsibleEmail: data.responsibleEmail,
    policyUrl: data.policyUrl,
    evidenceHash: data.evidenceHash,
  });
  // Nombre dinámico:
  //   AutorizacionHabeasData_SAMUEL-SANCHEZ_CC-7182416_FIRMADO_2026-06-12.pdf
  // Importamos el helper acá para no acoplar el módulo de email al
  // árbol completo de PDF utils en builds donde no se use.
  const { buildPdfFilename } = await import("@/lib/pdf-filename");
  // documentLabel viene en formato "CC 7182416" — lo dividimos.
  const docParts = (data.documentLabel ?? "").trim().split(/\s+/);
  const docType = docParts.length > 1 ? docParts[0] : "DOC";
  const docNumber = docParts.length > 1 ? docParts.slice(1).join("") : docParts[0];
  const filename = buildPdfFilename({
    prefix: "AutorizacionHabeasData",
    holderName: data.holderName,
    documentType: docType,
    documentNumber: docNumber,
    status: "FIRMADO",
    suffix: data.acceptedAt.toISOString().slice(0, 10),
  });
  return sendEmail({
    subscriberId, to,
    subject: rendered.subject, html: rendered.html, text: rendered.text,
    attachments: [
      {
        filename,
        content: data.pdfBytes,
        contentType: "application/pdf",
      },
    ],
  });
}

/// Notificación al candidato con el puntaje obtenido al cerrar el intento.
/// Se llama desde submitAttempt (calificación automática) y desde
/// finalizeManualGrading (cuando se cierra la revisión manual).
export async function sendExamScoreEmail(
  subscriberId: string,
  to: string,
  data: {
    holderName: string;
    examName: string;
    scorePercent: number;
    passingScore: number;
    passed: boolean | null;
    nextStep: "COMMITTEE" | "CERTIFIED" | "APPROVED" | "REJECTED" | "MANUAL_GRADING";
    portalUrl: string;
  },
): Promise<SendResult> {
  const brand = await loadBrand(subscriberId);
  return dispatch(to, subscriberId, examScoreEmail(brand, data));
}

/// Aviso al equipo evaluador (admin del suscriptor + comité) de que un
/// caso práctico quedó "Por calificar". Se envía un correo por destinatario
/// para que el From/Reply-To se mantengan coherentes con la marca.
export async function sendManualGradingRequiredEmail(
  subscriberId: string,
  to: string,
  data: { candidateName: string; examName: string; enrollmentCode: string; submittedAt: Date; panelUrl: string },
): Promise<SendResult> {
  const brand = await loadBrand(subscriberId);
  return dispatch(to, subscriberId, manualGradingRequiredEmail(brand, data));
}

/// Aviso al candidato cuando el equipo solicita información adicional.
export async function sendInfoRequestToCandidateEmail(
  subscriberId: string,
  to: string,
  data: { holderName: string; examName: string; message: string; portalUrl: string },
): Promise<SendResult> {
  const brand = await loadBrand(subscriberId);
  return dispatch(to, subscriberId, infoRequestToCandidateEmail(brand, data));
}

/// Aviso al equipo cuando el candidato responde una solicitud de info.
export async function sendCandidateAnsweredInfoRequestEmail(
  subscriberId: string,
  to: string,
  data: { candidateName: string; examName: string; enrollmentCode: string; panelUrl: string },
): Promise<SendResult> {
  const brand = await loadBrand(subscriberId);
  return dispatch(to, subscriberId, candidateAnsweredInfoRequestEmail(brand, data));
}
