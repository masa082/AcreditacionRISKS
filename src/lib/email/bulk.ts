import "server-only";
import { prisma } from "@/lib/prisma";
import { sendEmail, type EmailAttachment } from "@/lib/email";

/**
 * Envío masivo a candidatos. Núcleo compartido entre:
 *   - sendBulkEmail (envío inmediato desde el server action)
 *   - processScheduledEmails (cron que procesa los programados)
 *
 * Para cada destinatario:
 *   - Sustituye variables del cuerpo y del asunto: {nombre}, {apellido},
 *     {nombre_completo}, {correo}, {documento}, {organismo}, {fecha}.
 *   - Envía vía Resend con HTML (preservando formato del editor).
 *   - Anexa los archivos pasados (imágenes del editor).
 *   - Throttle de 120 ms entre envíos para no agarrar 429 de Resend.
 */
export interface BulkAttachment {
  filename: string;
  contentType?: string;
  contentBase64: string;
}

export interface BulkRunOpts {
  subscriberId: string;
  candidateIds: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  attachments?: BulkAttachment[];
}

export interface BulkRunResult {
  sent: number;
  failed: number;
  total: number;
  errors: string[];
}

/// Variables disponibles para personalizar el correo. Se exportan también
/// al cliente para que el componente las muestre como chips clickeables.
export const BULK_VARIABLES = [
  { key: "nombre", label: "Nombre", description: "Primer nombre del candidato" },
  { key: "apellido", label: "Apellido", description: "Apellido del candidato" },
  { key: "nombre_completo", label: "Nombre completo", description: "Nombre + apellido" },
  { key: "correo", label: "Correo", description: "Correo principal del candidato" },
  { key: "documento", label: "Documento", description: "Número de identificación" },
  { key: "organismo", label: "Organismo", description: "Nombre del organismo certificador" },
  { key: "fecha", label: "Fecha de hoy", description: "Fecha actual en español" },
] as const;

/// Reemplazo literal y case-insensitive de todas las ocurrencias `{var}`.
function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key.toLowerCase()];
    return v != null ? v : `{${key}}`;
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runBulkEmail(opts: BulkRunOpts): Promise<BulkRunResult> {
  const recipients = await prisma.candidate.findMany({
    where: { id: { in: opts.candidateIds }, subscriberId: opts.subscriberId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      documentNumber: true,
    },
  });

  const sub = await prisma.subscriber.findUnique({
    where: { id: opts.subscriberId },
    select: { tradeName: true, legalName: true },
  });
  const orgName = sub?.tradeName ?? sub?.legalName ?? "CIOC";

  const attachments: EmailAttachment[] | undefined = opts.attachments?.length
    ? opts.attachments.map((a) => ({
        filename: a.filename,
        content: Uint8Array.from(Buffer.from(a.contentBase64, "base64")),
        contentType: a.contentType,
      }))
    : undefined;

  const today = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i++) {
    if (i > 0) await sleep(120);
    const r = recipients[i];
    const fullName = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim();
    const vars: Record<string, string> = {
      nombre: r.firstName ?? "",
      apellido: r.lastName ?? "",
      nombre_completo: fullName,
      correo: r.email,
      documento: r.documentNumber ?? "",
      organismo: orgName,
      fecha: today,
    };
    const personalSubject = applyVars(opts.subject, vars);
    const personalHtml = applyVars(opts.bodyHtml, vars);
    const personalText = applyVars(opts.bodyText ?? htmlToText(opts.bodyHtml), vars);

    const wrappedHtml = wrapEmailHtml(personalHtml, orgName);

    try {
      const result = await sendEmail({
        subscriberId: opts.subscriberId,
        to: r.email,
        subject: personalSubject,
        html: wrappedHtml,
        text: personalText,
        attachments,
      });
      if (result.ok) {
        sent++;
        if ("error" in result && result.error) errors.push(`${r.email}: ${result.error}`);
      } else {
        failed++;
        errors.push(`${r.email}: ${"error" in result && result.error ? result.error : "fallo sin detalle"}`);
      }
    } catch (e) {
      failed++;
      errors.push(`${r.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { sent, failed, total: recipients.length, errors };
}

/// Conversión rápida HTML→texto para clientes de correo sin soporte HTML.
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/// Envuelve el HTML del editor en un layout responsive de correo con
/// header del organismo y firma. Mantiene la paleta navy.
function wrapEmailHtml(innerHtml: string, orgName: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f1f5f9;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <tr><td style="padding:14px 24px;background:#0b1f3a;color:#ffffff;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;font-weight:700;">
        ${escapeHtml(orgName)}
      </td></tr>
      <tr><td style="padding:24px;font-size:15px;line-height:1.6;color:#1f2937;">
        ${innerHtml}
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:11px;color:#64748b;text-align:center;">
        Mensaje enviado por ${escapeHtml(orgName)} · okacreditado.com<br>
        Si no era para usted, ignore este correo.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/// Sanitización mínima del HTML aceptado del editor. Permite solo
/// inline-tags razonables y atributos seguros. Bloquea <script>,
/// <iframe>, eventos on*, javascript:.
export function sanitizeEditorHtml(html: string): string {
  if (!html) return "";
  let s = html;
  // Quita comentarios HTML
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  // Quita tags peligrosos completos
  s = s.replace(/<\s*(script|style|iframe|object|embed|form|meta|link)\b[\s\S]*?<\/\s*\1\s*>/gi, "");
  s = s.replace(/<\s*(script|style|iframe|object|embed|form|meta|link)\b[^>]*\/?>/gi, "");
  // Quita atributos on*
  s = s.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]+)/gi, "");
  // Quita javascript: en href/src
  s = s.replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
  return s;
}
