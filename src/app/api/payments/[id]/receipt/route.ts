import { prisma } from "@/lib/prisma";
import { getCurrentUser, can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import {
  readFileByKey,
  EXT_TO_MIME,
  extFromName,
  presignedGetUrl,
} from "@/lib/storage";

/**
 * Sirve el soporte (comprobante) de un Payment con control de acceso:
 *   - El candidato dueño del enrollment puede ver/descargar su propio
 *     soporte.
 *   - El personal del mismo suscriptor con permiso PAYMENT_VIEW o
 *     PAYMENT_MANAGE puede inspeccionarlo para verificar el pago.
 *   - El SUPERADMIN con SUBSCRIBER_MANAGE puede inspeccionar cualquier
 *     soporte (auditoría).
 *
 * Igual que /api/files/[id]: tras subir el tope a 100 MB, bufferar el
 * archivo en Vercel causa timeout/OOM (HTTP 500). Cuando hay bucket S3
 * redirigimos a una URL prefirmada GET; en modo dev local mantenemos el
 * stream desde el filesystem.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getCurrentUser();
  if (!ctx) return new Response("No autenticado", { status: 401 });

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      enrollment: {
        select: {
          subscriberId: true,
          candidate: { select: { userId: true } },
        },
      },
    },
  });
  if (!payment || !payment.receiptUrl) {
    return new Response("Soporte no disponible", { status: 404 });
  }

  let allowed = false;
  if (ctx.type === "CANDIDATE") {
    allowed = payment.enrollment?.candidate.userId === ctx.userId;
  } else if (ctx.type === "SUBSCRIBER") {
    allowed =
      ctx.subscriberId === payment.subscriberId &&
      (can(ctx, PERMISSIONS.PAYMENT_VIEW) || can(ctx, PERMISSIONS.PAYMENT_MANAGE));
  } else if (ctx.type === "PLATFORM") {
    allowed = can(ctx, PERMISSIONS.SUBSCRIBER_MANAGE);
  }
  if (!allowed) return new Response("Acceso denegado", { status: 403 });

  const ext = extFromName(payment.receiptUrl);
  const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";
  const downloadName = `soporte-pago-${payment.id}.${ext}`;

  // Redirect a presigned S3 si está configurado (producción).
  try {
    const presigned = await presignedGetUrl(payment.receiptUrl, {
      expiresInSeconds: 300,
      contentType: mime,
      downloadName,
    });
    if (presigned) return Response.redirect(presigned, 302);
  } catch {
    /* fallback al stream */
  }

  // Modo local (dev): stream desde filesystem.
  let buf: Buffer;
  try {
    buf = await readFileByKey(payment.receiptUrl);
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${downloadName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
