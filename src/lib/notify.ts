import "server-only";
import { prisma } from "./prisma";

// ============================================================================
//  Notificaciones in-app. Crea registros Notification para un usuario.
//  Nunca debe romper la operación principal (envolver en try/catch en llamadores
//  donde aplique, o usar las variantes que ya capturan).
// ============================================================================

export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body?: string,
): Promise<void> {
  await prisma.notification
    .create({ data: { userId, type, title, body: body ?? null, channel: "IN_APP" } })
    .catch(() => {
      /* la notificación nunca debe romper la operación principal */
    });
}

/// Notifica al usuario asociado a un candidato (si tiene cuenta).
export async function notifyCandidate(
  candidateId: string,
  type: string,
  title: string,
  body?: string,
): Promise<void> {
  const candidate = await prisma.candidate
    .findUnique({ where: { id: candidateId }, select: { userId: true } })
    .catch(() => null);
  if (candidate?.userId) await notifyUser(candidate.userId, type, title, body);
}
