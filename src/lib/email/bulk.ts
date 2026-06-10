import "server-only";
import { randomUUID } from "crypto";
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
  /** UserId del admin que originó el envío (null para envíos sin actor). */
  sentById?: string | null;
  /** kind para la bitácora EmailLog. */
  kind?: "BULK" | "SCHEDULED" | "TRANSACTIONAL";
  /** Si vino de un ScheduledEmail, su id. */
  scheduledEmailId?: string | null;
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
    select: {
      tradeName: true,
      legalName: true,
      logoUrl: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
    },
  });
  const orgName = sub?.tradeName ?? sub?.legalName ?? "CIOC";
  const brandCtx: BrandCtx = {
    name: orgName,
    legalName: sub?.legalName ?? orgName,
    logoUrl: sub?.logoUrl ?? null,
    contactEmail: sub?.contactEmail ?? null,
    contactPhone: sub?.contactPhone ?? null,
    address: sub?.address ?? null,
  };

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

  // Agrupador para que todas las filas de EmailLog del mismo envío
  // compartan un identificador y se pueda recuperar "el envío completo".
  const groupId = randomUUID();
  const kind = opts.kind ?? "BULK";

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

    const preheader = stripPreheader(personalText);
    const wrappedHtml = wrapEmailHtml({
      innerHtml: personalHtml,
      subject: personalSubject,
      preheader,
      brand: brandCtx,
    });
    const preview = personalText.slice(0, 600);

    let logStatus: "SENT" | "FAILED" = "SENT";
    let logError: string | null = null;
    let logProviderId: string | null = null;

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
        logProviderId = result.id ?? null;
        if ("error" in result && result.error) errors.push(`${r.email}: ${result.error}`);
      } else {
        failed++;
        logStatus = "FAILED";
        logError = "error" in result && result.error ? result.error : "fallo sin detalle";
        errors.push(`${r.email}: ${logError}`);
      }
    } catch (e) {
      failed++;
      logStatus = "FAILED";
      logError = e instanceof Error ? e.message : String(e);
      errors.push(`${r.email}: ${logError}`);
    }

    // Persistimos cada envío en la bitácora. Errores aquí NO deben tirar
    // el lote (envío ya ocurrió); los registramos en el array de errors.
    try {
      await prisma.emailLog.create({
        data: {
          subscriberId: opts.subscriberId,
          candidateId: r.id,
          toEmail: r.email,
          subject: personalSubject,
          bodyPreview: preview,
          bodyHtml: personalHtml,
          kind,
          status: logStatus,
          providerId: logProviderId,
          errorMessage: logError,
          sentById: opts.sentById ?? null,
          groupId,
          scheduledEmailId: opts.scheduledEmailId ?? null,
        },
      });
    } catch (e) {
      errors.push(`emailLog ${r.email}: ${e instanceof Error ? e.message : String(e)}`);
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

/**
 * Información de marca usada en el header y el footer del correo.
 * Se obtiene del Subscriber del envío y se pasa a `wrapEmailHtml`.
 */
export interface BrandCtx {
  name: string;
  legalName: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
}

/// Extrae las primeras palabras del cuerpo en texto plano para usar como
/// preheader (texto oculto que Gmail muestra como preview del correo).
function stripPreheader(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/**
 * Plantilla profesional de correo para okacreditado.com.
 *
 * Características:
 *  - Logo del suscriptor en el header (fallback a la inicial en círculo
 *    si no tiene logo configurado).
 *  - Paleta navy + grises (alineada con el manual de marca de RISKS y
 *    con los documentos oficiales). Sin dorado.
 *  - Layout 600px, tabla-based (compatibilidad con clientes de correo
 *    legacy: Outlook, Yahoo, Gmail web/iOS/Android).
 *  - Estilos inline en cada `<td>` — Gmail descarta `<style>` del head.
 *  - Preheader (texto oculto) para mejorar la preview en Inbox.
 *  - Soporte responsive: en pantallas <=480px, padding más compacto.
 *  - Soporte dark mode (media query — Apple Mail lo respeta, Gmail no).
 *  - Footer institucional con leyenda ONAC ISO/IEC 17024, dirección
 *    del organismo, contacto y aviso legal.
 */
export function wrapEmailHtml({
  innerHtml,
  subject,
  preheader,
  brand,
}: {
  innerHtml: string;
  subject: string;
  preheader: string;
  brand: BrandCtx;
}): string {
  const safeOrg = escapeHtml(brand.name);
  const safeSubject = escapeHtml(subject);
  const safePreheader = escapeHtml(preheader);

  const initials = (brand.name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Header con logo (si existe y es URL absoluta pública) o fallback con
  // inicial dentro de un círculo navy. Los clientes de email solo cargan
  // imágenes con URL https://... — descartamos rutas relativas para evitar
  // que aparezca un placeholder roto.
  const isPublicLogo = brand.logoUrl && /^https?:\/\//i.test(brand.logoUrl);
  const logoBlock = isPublicLogo
    ? `<img src="${brand.logoUrl}" alt="${safeOrg}" width="44" height="44" style="display:block;border:0;border-radius:8px;background:#ffffff;object-fit:contain;padding:4px;border:1px solid #e2e8f0;">`
    : `<div style="width:44px;height:44px;border-radius:8px;background:#0b1f3a;color:#ffffff;font-weight:800;font-size:16px;text-align:center;line-height:44px;font-family:Inter,Arial,sans-serif;letter-spacing:-0.3px;">${escapeHtml(initials || "?")}</div>`;

  const contactBits: string[] = [];
  if (brand.contactEmail) contactBits.push(`<a href="mailto:${brand.contactEmail}" style="color:#64748b;text-decoration:none;">${escapeHtml(brand.contactEmail)}</a>`);
  if (brand.contactPhone) contactBits.push(escapeHtml(brand.contactPhone));
  const contactLine = contactBits.join(" · ");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${safeSubject}</title>
<!--[if mso]>
<style>* { font-family: Arial, Helvetica, sans-serif !important; }</style>
<![endif]-->
<style>
  /* Reset mínimo y responsive */
  body, table, td, p, a, li, blockquote {
    -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;
  }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  a { text-decoration:none; }
  @media only screen and (max-width: 480px) {
    .container { width:100% !important; }
    .px-md { padding-left:20px !important; padding-right:20px !important; }
    .hero-title { font-size:22px !important; }
    .hero-org { font-size:13px !important; }
    .footer-cell { padding:18px 20px !important; }
  }
  /* Dark mode (lo respetan Apple Mail y algunos otros — Gmail desktop NO) */
  @media (prefers-color-scheme: dark) {
    .bg-page { background:#0b1220 !important; }
    .bg-card { background:#0f172a !important; }
    .text-body { color:#e2e8f0 !important; }
    .text-muted { color:#94a3b8 !important; }
    .border-soft { border-color:#1e293b !important; }
    .bg-card-foot { background:#0b1220 !important; }
  }
</style>
</head>
<body class="bg-page" style="margin:0;padding:0;background:#eef2f7;color:#0f172a;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<!-- Preheader — texto oculto que aparece en la preview del inbox -->
<div style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">
  ${safePreheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef2f7;">
  <tr><td align="center" style="padding:32px 12px;">

    <!-- ═══════════ Card principal ═══════════ -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container bg-card" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06),0 8px 24px rgba(15,23,42,0.08);">

      <!-- Banda superior navy delgada — refuerza la identidad de marca -->
      <tr><td style="background:#0b1f3a;height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- Header con logo + nombre + chip ISO -->
      <tr><td class="px-md" style="padding:24px 32px 18px 32px;background:#ffffff;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="44" valign="middle" style="padding-right:14px;">
              ${logoBlock}
            </td>
            <td valign="middle">
              <div class="hero-org text-body" style="color:#0b1f3a;font-weight:800;font-size:15px;letter-spacing:-0.2px;line-height:1.2;">
                ${safeOrg}
              </div>
              <div class="text-muted" style="color:#64748b;font-size:11px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;margin-top:2px;">
                Organismo de Certificación · ISO/IEC 17024
              </div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Separador suave -->
      <tr><td class="border-soft" style="padding:0 32px;border-bottom:1px solid #eef2f7;font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- Contenido del editor enriquecido -->
      <tr><td class="px-md text-body" style="padding:28px 32px 8px 32px;color:#0f172a;font-size:15px;line-height:1.65;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        ${innerHtml}
      </td></tr>

      <!-- Firma institucional -->
      <tr><td class="px-md" style="padding:8px 32px 28px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding-top:14px;border-top:1px dashed #cbd5e1;">
            <p style="margin:0;color:#0f172a;font-size:13.5px;line-height:1.5;font-weight:600;">
              ${safeOrg}
            </p>
            <p class="text-muted" style="margin:2px 0 0 0;color:#64748b;font-size:12px;line-height:1.5;">
              Equipo de Certificación · okacreditado.com
            </p>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer institucional -->
      <tr><td class="bg-card-foot footer-cell" style="padding:22px 32px 26px 32px;background:#f8fafc;border-top:1px solid #eef2f7;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td align="left" style="padding-bottom:8px;">
            <span style="display:inline-block;background:#eaf0f6;color:#0b1f3a;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;padding:4px 8px;border-radius:6px;">
              En proceso de acreditación · ONAC
            </span>
          </td></tr>
          <tr><td class="text-muted" style="color:#64748b;font-size:11.5px;line-height:1.6;padding-bottom:6px;">
            ${contactLine ? `Contacto: ${contactLine}<br>` : ""}
            ${brand.address ? `${escapeHtml(brand.address)}<br>` : ""}
            Mensaje enviado por <strong style="color:#0b1f3a;">${safeOrg}</strong> a través de la plataforma <a href="https://www.okacreditado.com" style="color:#0b1f3a;font-weight:600;">okacreditado.com</a>.
          </td></tr>
          <tr><td class="text-muted" style="color:#94a3b8;font-size:10.5px;line-height:1.6;padding-top:6px;border-top:1px solid #e2e8f0;">
            Recibió este correo porque está vinculado al proceso de certificación. Si no era para usted, por favor ignórelo.
            Para gestionar sus datos personales o ejercer sus derechos de habeas data, consulte la
            <a href="https://www.okacreditado.com/documentacion" style="color:#64748b;font-weight:600;">Política de Tratamiento de Datos</a>.
          </td></tr>
        </table>
      </td></tr>
    </table>

    <!-- Pie discreto fuera del card -->
    <p class="text-muted" style="margin:18px 0 0 0;font-size:10.5px;color:#94a3b8;font-family:'Inter',Arial,sans-serif;">
      © ${new Date().getFullYear()} ${safeOrg} · Todos los derechos reservados.
    </p>

  </td></tr>
</table>
</body>
</html>`;
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
