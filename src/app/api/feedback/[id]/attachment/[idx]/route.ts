import { prisma } from "@/lib/prisma";
import { getCurrentUser, can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { readFileByKey, EXT_TO_MIME, extFromName } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/// Sirve un adjunto de un ticket de feedback. Acceso reservado al
/// SUPERADMIN (cualquier permiso de plataforma) o al usuario autor del
/// ticket cuando vuelve a verlo. Como las claves de los adjuntos viven
/// en storage privado, este endpoint es el único camino para abrirlos.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; idx: string }> },
) {
  const { id, idx } = await params;
  const ctx = await getCurrentUser();
  if (!ctx) return new Response("No autenticado", { status: 401 });

  const t = await prisma.feedbackTicket.findUnique({
    where: { id },
    select: { attachments: true, userId: true },
  });
  if (!t) return new Response("Ticket no encontrado", { status: 404 });

  const isPlatform = ctx.type === "PLATFORM" && can(ctx, PERMISSIONS.SUBSCRIBER_MANAGE);
  const isAuthor = ctx.userId === t.userId;
  if (!isPlatform && !isAuthor) {
    return new Response("Acceso denegado", { status: 403 });
  }

  const i = Number.parseInt(idx, 10);
  if (!Number.isFinite(i) || i < 0 || i >= t.attachments.length) {
    return new Response("Adjunto no encontrado", { status: 404 });
  }
  const key = t.attachments[i];

  let buf: Buffer;
  try {
    buf = await readFileByKey(key);
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }
  const ext = extFromName(key);
  const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
