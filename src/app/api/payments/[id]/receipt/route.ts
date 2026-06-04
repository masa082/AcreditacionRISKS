import { prisma } from "@/lib/prisma";
import { getCurrentUser, can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { readFileByKey, EXT_TO_MIME, extFromName } from "@/lib/storage";

/// Sirve el soporte (comprobante) de un Payment con control de acceso:
///   - El candidato dueño del enrollment puede ver/descargar su propio
///     soporte.
///   - El personal del mismo suscriptor con permiso PAYMENT_VIEW o
///     PAYMENT_MANAGE puede inspeccionarlo para verificar el pago.
///   - El SUPERADMIN con SUBSCRIBER_MANAGE puede inspeccionar cualquier
///     soporte (auditoría).
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

  let buf: Buffer;
  try {
    buf = await readFileByKey(payment.receiptUrl);
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }
  const ext = extFromName(payment.receiptUrl);
  const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="soporte-pago-${payment.id}.${ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
