"use server";

import { z } from "zod";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { sanitizeEditorHtml } from "@/lib/email/bulk";
import { runInvitationCampaign, type InvitationContact } from "@/lib/email/invitations";
import type { ActionResult } from "@/lib/actions/schemes";

const MAX_CONTACTS = 500;
const MAX_TOTAL_ATTACHMENTS_BYTES = 12 * 1024 * 1024; // 12 MB

const contactSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(150),
  email: z.string().trim().email("Email inválido").max(200),
  phone: z.string().trim().max(40).optional().nullable(),
});

const campaignSchema = z.object({
  subject: z.string().trim().min(3, "Asunto muy corto").max(180),
  bodyHtml: z.string().trim().min(20, "El mensaje es muy corto"),
  contacts: z.array(contactSchema).min(1, "Agregue al menos un contacto").max(MAX_CONTACTS, `Máximo ${MAX_CONTACTS} contactos por envío.`),
  attachments: z.string().optional(),
});

/**
 * Envía la campaña de invitaciones (correo masivo).
 *
 * Diferencia con `sendBulkEmail` (candidatos):
 *  - No requiere que los contactos existan en BD: son contactos ad-hoc
 *    pegados/importados desde una hoja de cálculo o copia de portapapeles.
 *  - Cada envío queda como EmailLog con kind="INVITATION" (sin candidateId)
 *    para que el operador vea la traza desde el histórico de envíos.
 *  - Permite enviar a personas que aún NO están en el sistema, para
 *    invitarlas a iniciar el proceso de Certificación de Idoneidad.
 */
export async function sendInvitationCampaign(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);

  let contacts: InvitationContact[];
  try {
    const raw = String(formData.get("contacts") ?? "[]");
    contacts = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Lista de contactos en formato inválido." };
  }

  const parsed = campaignSchema.safeParse({
    subject: formData.get("subject"),
    bodyHtml: formData.get("bodyHtml"),
    contacts,
    attachments: formData.get("attachments"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  // Sanitizar HTML del editor.
  const safeHtml = sanitizeEditorHtml(parsed.data.bodyHtml);

  // Validar adjuntos (mismo patrón que sendBulkEmail).
  let attachments: { filename: string; contentType?: string; contentBase64: string }[] = [];
  if (parsed.data.attachments) {
    try {
      const raw = JSON.parse(parsed.data.attachments);
      if (!Array.isArray(raw)) throw new Error("formato inválido");
      let totalBytes = 0;
      for (const a of raw) {
        if (!a?.filename || !a?.contentBase64) continue;
        const bytes = Math.ceil((String(a.contentBase64).length * 3) / 4);
        totalBytes += bytes;
        if (totalBytes > MAX_TOTAL_ATTACHMENTS_BYTES) {
          return {
            ok: false,
            error: `Adjuntos exceden ${Math.round(MAX_TOTAL_ATTACHMENTS_BYTES / 1024 / 1024)} MB.`,
          };
        }
        attachments.push({
          filename: String(a.filename).slice(0, 200),
          contentType: a.contentType,
          contentBase64: String(a.contentBase64),
        });
      }
    } catch {
      return { ok: false, error: "Adjuntos en formato inválido." };
    }
  }

  // Deduplicar emails (case-insensitive) y normalizar.
  const seen = new Set<string>();
  const dedupedContacts: InvitationContact[] = [];
  for (const c of parsed.data.contacts) {
    const e = c.email.toLowerCase();
    if (seen.has(e)) continue;
    seen.add(e);
    dedupedContacts.push({
      name: c.name,
      email: c.email,
      phone: c.phone ?? null,
    });
  }

  const result = await runInvitationCampaign({
    subscriberId,
    contacts: dedupedContacts,
    subject: parsed.data.subject,
    bodyHtml: safeHtml,
    attachments,
    sentById: ctx.userId,
  });

  await audit(ctx, {
    action: "invitation.bulk_email",
    entity: "EmailLog",
    subscriberId,
    after: {
      subject: parsed.data.subject,
      total: result.total,
      sent: result.sent,
      failed: result.failed,
      groupId: result.groupId,
    },
  });

  if (result.failed > 0 && result.sent === 0) {
    return {
      ok: false,
      error: `Falló el envío. ${result.errors[0] ?? "Verifique la configuración de correo del organismo."}`,
    };
  }
  if (result.failed > 0) {
    return {
      ok: true,
      message: `Enviados: ${result.sent} · Fallaron: ${result.failed}. Primer aviso: ${result.errors[0]}`,
    };
  }
  return {
    ok: true,
    message: `✓ Invitaciones enviadas a ${result.sent} contacto(s).`,
  };
}

/**
 * Registra un envío masivo de WhatsApp como auditoría.
 *
 * WhatsApp no permite envío masivo desde el navegador (la API gratuita
 * requiere interacción humana). El cliente genera los enlaces wa.me
 * personalizados, los abre uno por uno (o "abrir todos" en pestañas)
 * y llama a esta acción para dejar trazabilidad de la campaña.
 */
export async function logInvitationWhatsApp(payload: {
  contacts: { name: string; phone: string }[];
  messagePreview: string;
}): Promise<{ ok: boolean; count: number }> {
  try {
    const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);
    const valid = (payload.contacts ?? []).filter((c) => c.phone && c.phone.replace(/\D/g, "").length >= 7);
    await audit(ctx, {
      action: "invitation.bulk_whatsapp",
      entity: "Invitation",
      subscriberId,
      after: {
        count: valid.length,
        preview: (payload.messagePreview ?? "").slice(0, 200),
      },
    });
    return { ok: true, count: valid.length };
  } catch {
    return { ok: false, count: 0 };
  }
}
