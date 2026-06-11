import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Bitácora de incidencias del proceso del candidato (subida de docs,
 * pago, examen). Se muestra como badge "⚠ N" en /panel/candidatos.
 *
 * Diseño:
 *  - logIncident NUNCA tira excepción: si la BD está caída, devuelve
 *    null silenciosamente. No queremos que reportar un error rompa el
 *    flujo del candidato.
 *  - El context lleva info técnica útil para el soporte (códigos HTTP,
 *    nombres de archivo, IPs). Nada sensible (no API keys, etc.).
 *  - Cuando hay éxito tras un fallo previo, el llamador puede invocar
 *    `resolveIncidentsFor(...)` para marcar como resueltas las pendientes
 *    de la misma categoría — así el badge baja sin acción manual.
 */

export type IncidentCategory =
  | "DOCUMENT_UPLOAD"
  | "PAYMENT"
  | "CONSENT"
  | "EXAM"
  | "OTHER";

export type IncidentSeverity = "ERROR" | "WARN";

export async function logIncident(opts: {
  subscriberId: string;
  candidateId?: string | null;
  enrollmentId?: string | null;
  category: IncidentCategory;
  severity?: IncidentSeverity;
  message: string;
  context?: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const row = await prisma.processIncident.create({
      data: {
        subscriberId: opts.subscriberId,
        candidateId: opts.candidateId ?? null,
        enrollmentId: opts.enrollmentId ?? null,
        category: opts.category,
        severity: opts.severity ?? "ERROR",
        message: opts.message.slice(0, 2000),
        context: (opts.context ?? {}) as object,
      },
      select: { id: true },
    });
    return row.id;
  } catch {
    return null;
  }
}

/// Marca como resueltas las incidencias pendientes de una categoría
/// específica para un candidato — útil cuando el flujo finalmente tiene
/// éxito tras varios intentos. Si subscriberId es la fuente original.
export async function resolveIncidentsFor(opts: {
  subscriberId: string;
  candidateId: string;
  category: IncidentCategory;
  resolution?: string;
}): Promise<number> {
  try {
    const r = await prisma.processIncident.updateMany({
      where: {
        subscriberId: opts.subscriberId,
        candidateId: opts.candidateId,
        category: opts.category,
        resolvedAt: null,
      },
      data: {
        resolvedAt: new Date(),
        resolution: opts.resolution ?? "Resuelto automáticamente tras éxito posterior.",
      },
    });
    return r.count;
  } catch {
    return 0;
  }
}
