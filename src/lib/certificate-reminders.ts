import "server-only";

// ============================================================================
//  Generación de recordatorios de vencimiento / recertificación.
//  Marca como vencidos los certificados expirados y crea recordatorios +
//  notificaciones in-app para los hitos previos al vencimiento ya alcanzados.
//  Idempotente: un mismo {certificateId, offsetDays} solo se crea una vez.
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

/// Hitos (en días respecto al vencimiento; negativo = antes del vencimiento).
const OFFSETS = [-180, -120, -90, -60, -30, -15, 0];

/// Procesa los vencimientos pendientes. Pensado para ejecutarse por un cron.
export async function generateDueReminders(): Promise<{
  expired: number;
  remindersCreated: number;
  notified: number;
}> {
  const { prisma } = await import("@/lib/prisma");
  const now = new Date();

  // (a) Marcar como EXPIRED los certificados vigentes ya vencidos.
  const expiredRes = await prisma.certificate.updateMany({
    where: { status: "VALID", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });
  const expired = expiredRes.count;

  // (b) Para los certificados aún vigentes con vencimiento, crear los
  //     recordatorios de los hitos ya alcanzados.
  const certs = await prisma.certificate.findMany({
    where: { status: "VALID", expiresAt: { not: null } },
    select: {
      id: true,
      code: true,
      expiresAt: true,
      candidate: { select: { userId: true } },
    },
  });

  let remindersCreated = 0;
  let notified = 0;

  for (const cert of certs) {
    if (!cert.expiresAt) continue;
    const expiresAt = cert.expiresAt;

    for (const offset of OFFSETS) {
      const scheduledFor = new Date(expiresAt.getTime() + offset * DAY_MS);
      // El hito solo aplica si ya llegó (scheduledFor <= ahora).
      if (scheduledFor > now) continue;

      // Idempotencia: no recrear el mismo hito.
      const exists = await prisma.certificateReminder.findFirst({
        where: { certificateId: cert.id, offsetDays: offset },
        select: { id: true },
      });
      if (exists) continue;

      await prisma.certificateReminder.create({
        data: {
          certificateId: cert.id,
          offsetDays: offset,
          channel: "IN_APP",
          status: "SCHEDULED",
          scheduledFor,
        },
      });
      remindersCreated++;

      // Notificar al titular (si tiene cuenta de usuario).
      const userId = cert.candidate?.userId;
      if (userId) {
        const daysLeft = Math.round((expiresAt.getTime() - now.getTime()) / DAY_MS);
        const title =
          daysLeft > 0
            ? `Certificado ${cert.code}: vence en ${daysLeft} día(s)`
            : `Certificado ${cert.code}: vencido`;
        await prisma.notification.create({
          data: {
            userId,
            type: "cert.expiry",
            title,
            channel: "IN_APP",
          },
        });
        notified++;
      }
    }
  }

  return { expired, remindersCreated, notified };
}
