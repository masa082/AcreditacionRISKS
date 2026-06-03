import { generateDueReminders } from "@/lib/certificate-reminders";

export const dynamic = "force-dynamic";

/// Cron de vencimientos: marca certificados vencidos y crea recordatorios.
/// Si CRON_SECRET está definido, exige el header `x-cron-secret` o el
/// `Authorization: Bearer <CRON_SECRET>` que envía Vercel Cron.
async function handle(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("x-cron-secret");
    const bearer = req.headers.get("authorization");
    const ok = header === secret || bearer === `Bearer ${secret}`;
    if (!ok) return new Response("No autorizado", { status: 401 });
  }
  const result = await generateDueReminders();
  return Response.json(result);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}
