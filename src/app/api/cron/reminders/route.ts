import { generateDueReminders } from "@/lib/certificate-reminders";
import { prisma } from "@/lib/prisma";
import { runBulkEmail, type BulkAttachment } from "@/lib/email/bulk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron diario unificado (vencimientos + correos programados).
 *
 * En planes de Vercel donde solo se permite un cron diario, este handler
 * hace dos tareas en una sola corrida:
 *  1. generateDueReminders — marca certificados vencidos y crea
 *     recordatorios automáticos.
 *  2. processScheduledEmails — procesa los ScheduledEmail PENDING cuya
 *     scheduledFor ya pasó.
 *
 * Para granularidad fina (envío programado al minuto), apunte un cron
 * externo gratuito (cron-job.org, Railway scheduled job, GitHub Actions
 * con on: schedule, etc.) a /api/cron/scheduled-emails con el header
 * x-cron-secret.
 *
 * Si CRON_SECRET está definido, exige el header `x-cron-secret` o el
 * `Authorization: Bearer <CRON_SECRET>` que envía Vercel Cron.
 */
async function handle(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("x-cron-secret");
    const bearer = req.headers.get("authorization");
    const ok = header === secret || bearer === `Bearer ${secret}`;
    if (!ok) return new Response("No autorizado", { status: 401 });
  }
  const reminders = await generateDueReminders();
  const emails = await processScheduledEmails();
  return Response.json({ reminders, emails });
}

/// Procesa hasta 50 envíos programados vencidos. Mismo cuerpo que
/// /api/cron/scheduled-emails, replicado aquí para que el cron diario
/// haga ambas tareas en plan Hobby sin necesitar un segundo cron job.
async function processScheduledEmails() {
  const pending = await prisma.scheduledEmail.findMany({
    where: { status: "PENDING", scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    take: 50,
  });
  if (pending.length === 0) return { processed: 0 };

  let processed = 0;
  let totalSent = 0;
  let totalFailed = 0;

  for (const job of pending) {
    const taken = await prisma.scheduledEmail.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { status: "SENDING" },
    });
    if (taken.count === 0) continue;

    try {
      const r = await runBulkEmail({
        subscriberId: job.subscriberId,
        candidateIds: job.recipientIds,
        subject: job.subject,
        bodyHtml: job.bodyHtml,
        attachments: (job.attachments as unknown as BulkAttachment[]) ?? [],
        sentById: job.createdById,
        kind: "SCHEDULED",
        scheduledEmailId: job.id,
      });
      await prisma.scheduledEmail.update({
        where: { id: job.id },
        data: {
          status: "SENT",
          sentCount: r.sent,
          failedCount: r.failed,
          processedAt: new Date(),
          errorLog: r.errors.slice(0, 10).join("\n") || null,
        },
      });
      totalSent += r.sent;
      totalFailed += r.failed;
    } catch (e) {
      await prisma.scheduledEmail.update({
        where: { id: job.id },
        data: {
          status: "SENT",
          failedCount: job.recipientIds.length,
          processedAt: new Date(),
          errorLog: e instanceof Error ? e.message : String(e),
        },
      });
      totalFailed += job.recipientIds.length;
    }
    processed++;
  }
  return { processed, totalSent, totalFailed };
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}
export async function GET(req: Request): Promise<Response> {
  return handle(req);
}
