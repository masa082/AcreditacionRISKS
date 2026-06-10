import { prisma } from "@/lib/prisma";
import { runBulkEmail, type BulkAttachment } from "@/lib/email/bulk";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // segundos en Vercel — lotes grandes

/**
 * Cron de correos programados — corre cada minuto en Vercel.
 *
 * Procesa hasta MAX_PER_RUN entradas PENDING con scheduledFor ≤ now.
 * Para evitar doble-ejecución cuando dos crons coinciden, marca como
 * SENDING al tomar la fila y SENT al terminar.
 *
 * Auth: header `x-cron-secret` o `Authorization: Bearer <CRON_SECRET>`.
 */
const MAX_PER_RUN = 50;

async function handle(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("x-cron-secret");
    const bearer = req.headers.get("authorization");
    const ok = header === secret || bearer === `Bearer ${secret}`;
    if (!ok) return new Response("No autorizado", { status: 401 });
  }

  // Tomamos las pendientes vencidas, ordenadas por scheduledFor más antigua.
  const pending = await prisma.scheduledEmail.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: new Date() },
    },
    orderBy: { scheduledFor: "asc" },
    take: MAX_PER_RUN,
  });

  if (pending.length === 0) {
    return Response.json({ processed: 0 });
  }

  let processed = 0;
  let totalSent = 0;
  let totalFailed = 0;

  for (const job of pending) {
    // Marca como SENDING — si falla la transacción, otro cron lo retomará
    // cuando lo dejemos sin tocar (raro pero seguro).
    const taken = await prisma.scheduledEmail.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { status: "SENDING" },
    });
    if (taken.count === 0) continue; // alguien más lo tomó

    let result;
    try {
      result = await runBulkEmail({
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
          sentCount: result.sent,
          failedCount: result.failed,
          processedAt: new Date(),
          errorLog: result.errors.slice(0, 10).join("\n") || null,
        },
      });
      totalSent += result.sent;
      totalFailed += result.failed;
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

  return Response.json({ processed, totalSent, totalFailed });
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}
export async function GET(req: Request): Promise<Response> {
  return handle(req);
}
