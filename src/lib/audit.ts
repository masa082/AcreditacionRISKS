import "server-only";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import type { AuthContext } from "./session";

/// Registra un evento de auditoría/trazabilidad.
export async function audit(
  ctx: AuthContext | null,
  params: {
    action: string;
    entity: string;
    entityId?: string | null;
    subscriberId?: string | null;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    userAgent = h.get("user-agent") ?? null;
  } catch {
    /* fuera de contexto de request */
  }
  await prisma.auditLog
    .create({
      data: {
        subscriberId: params.subscriberId ?? ctx?.subscriberId ?? null,
        actorId: ctx?.userId ?? null,
        actorType: ctx?.type ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        before: (params.before ?? undefined) as never,
        after: (params.after ?? undefined) as never,
        ip,
        userAgent,
      },
    })
    .catch(() => {
      /* la auditoría nunca debe romper la operación principal */
    });
}
