import "server-only";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, type EmailAttachment } from "@/lib/email";
import { wrapEmailHtml, type BrandCtx } from "@/lib/email/bulk";

/**
 * Motor de envío de invitaciones a certificarse.
 *
 * Diferencia respecto a `runBulkEmail`:
 *  - `runBulkEmail` toma `candidateIds` y resuelve contra la tabla Candidate.
 *  - `runInvitationCampaign` recibe contactos AD-HOC ({name, email, phone})
 *    pegados/importados desde una hoja de cálculo. No requieren existir
 *    como Lead ni como Candidate.
 *
 * Cada envío queda registrado en EmailLog con `kind = "INVITATION"`
 * (sin candidateId), de modo que el operador puede ver la traza desde
 * /panel/leads → Histórico de envíos.
 *
 * Throttle: 120 ms entre envíos (igual que runBulkEmail) para no
 * agarrar 429 de Resend.
 */
export interface InvitationContact {
  name: string;
  email: string;
  phone?: string | null;
}

export interface RunInvitationOpts {
  subscriberId: string;
  contacts: InvitationContact[];
  subject: string;
  bodyHtml: string;
  attachments?: { filename: string; contentType?: string; contentBase64: string }[];
  sentById: string | null;
}

export interface RunInvitationResult {
  sent: number;
  failed: number;
  total: number;
  errors: string[];
  groupId: string;
}

/// Variables disponibles en el editor de invitaciones.
export const INVITATION_VARIABLES = [
  { key: "nombre", label: "Nombre", description: "Primer nombre del contacto" },
  { key: "nombre_completo", label: "Nombre completo", description: "Nombre tal como se ingresó" },
  { key: "correo", label: "Correo", description: "Email del contacto" },
  { key: "organismo", label: "Organismo", description: "Nombre del organismo certificador" },
  { key: "fecha", label: "Fecha de hoy", description: "Fecha actual en español" },
  { key: "url_registro", label: "URL de registro", description: "Link directo a /registro" },
  { key: "url_landing", label: "URL de la landing", description: "https://www.okacreditado.com" },
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key.toLowerCase()];
    return v != null ? v : `{${key}}`;
  });
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? "";
}

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

export async function runInvitationCampaign(
  opts: RunInvitationOpts,
): Promise<RunInvitationResult> {
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
  const brand: BrandCtx = {
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
  const groupId = randomUUID();

  for (let i = 0; i < opts.contacts.length; i++) {
    if (i > 0) await sleep(120);
    const c = opts.contacts[i];
    const vars: Record<string, string> = {
      nombre: firstName(c.name) || c.name || "",
      nombre_completo: c.name,
      correo: c.email,
      organismo: orgName,
      fecha: today,
      url_registro: "https://www.okacreditado.com/registro",
      url_landing: "https://www.okacreditado.com",
    };
    const personalSubject = applyVars(opts.subject, vars);
    const personalHtml = applyVars(opts.bodyHtml, vars);
    const personalText = applyVars(htmlToText(opts.bodyHtml), vars);
    const preheader = personalText.replace(/\s+/g, " ").trim().slice(0, 120);

    const wrappedHtml = wrapEmailHtml({
      innerHtml: personalHtml,
      subject: personalSubject,
      preheader,
      brand,
    });

    let logStatus: "SENT" | "FAILED" = "SENT";
    let logError: string | null = null;
    let logProviderId: string | null = null;

    try {
      const result = await sendEmail({
        subscriberId: opts.subscriberId,
        to: c.email,
        subject: personalSubject,
        html: wrappedHtml,
        text: personalText,
        attachments,
      });
      if (result.ok) {
        sent++;
        logProviderId = result.id ?? null;
      } else {
        failed++;
        logStatus = "FAILED";
        logError = "error" in result && result.error ? result.error : "fallo sin detalle";
        if (errors.length < 5) errors.push(`${c.email}: ${logError}`);
      }
    } catch (e) {
      failed++;
      logStatus = "FAILED";
      logError = e instanceof Error ? e.message : String(e);
      if (errors.length < 5) errors.push(`${c.email}: ${logError}`);
    }

    try {
      await prisma.emailLog.create({
        data: {
          subscriberId: opts.subscriberId,
          candidateId: null,
          toEmail: c.email,
          subject: personalSubject,
          bodyPreview: personalText.slice(0, 600),
          bodyHtml: personalHtml,
          kind: "INVITATION",
          status: logStatus,
          providerId: logProviderId,
          errorMessage: logError,
          sentById: opts.sentById,
          groupId,
        },
      });
    } catch (e) {
      if (errors.length < 5) {
        errors.push(`emailLog ${c.email}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { sent, failed, total: opts.contacts.length, errors, groupId };
}
