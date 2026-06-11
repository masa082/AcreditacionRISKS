import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { logIncident, type IncidentCategory, type IncidentSeverity } from "@/lib/incidents";

export const dynamic = "force-dynamic";

/**
 * POST /api/incidents — reporte de incidencia desde el cliente.
 *
 * Solo acepta reportes del propio candidato autenticado (no permite que
 * un tercero registre incidencias en otro candidato). El subscriberId
 * se infiere del candidato; nunca se acepta del cuerpo del request.
 *
 * Idempotencia básica: si llegan muchos reportes idénticos en pocos
 * segundos, los descartamos para no inundar la bitácora cuando un
 * archivo grande genera múltiples retries fallidos.
 */
const reportSchema = z.object({
  category: z.enum(["DOCUMENT_UPLOAD", "PAYMENT", "CONSENT", "EXAM", "OTHER"]),
  severity: z.enum(["ERROR", "WARN"]).optional(),
  message: z.string().min(1).max(2000),
  context: z.record(z.unknown()).optional(),
  enrollmentId: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  const ctx = await getCurrentUser();
  if (!ctx) return Response.json({ ok: false, error: "No autenticado" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });
  }

  let candidateId: string | null = null;
  let subscriberId: string | null = null;
  if (ctx.type === "CANDIDATE") {
    const c = await prisma.candidate.findFirst({
      where: { userId: ctx.userId },
      select: { id: true, subscriberId: true },
    });
    if (!c) return Response.json({ ok: false, error: "Candidato no encontrado" }, { status: 404 });
    candidateId = c.id;
    subscriberId = c.subscriberId;
  } else if (ctx.type === "SUBSCRIBER" && ctx.subscriberId) {
    // Personal del organismo también puede registrar incidencias.
    subscriberId = ctx.subscriberId;
  } else {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 403 });
  }

  // Dedupe: descarta si hubo una incidencia equivalente en los últimos 30 s.
  const recent = await prisma.processIncident.findFirst({
    where: {
      subscriberId,
      candidateId,
      category: parsed.data.category,
      message: parsed.data.message,
      createdAt: { gte: new Date(Date.now() - 30_000) },
    },
    select: { id: true },
  });
  if (recent) return Response.json({ ok: true, deduped: true, id: recent.id });

  const id = await logIncident({
    subscriberId: subscriberId!,
    candidateId,
    enrollmentId: parsed.data.enrollmentId ?? null,
    category: parsed.data.category as IncidentCategory,
    severity: (parsed.data.severity as IncidentSeverity | undefined) ?? "ERROR",
    message: parsed.data.message,
    context: (parsed.data.context as Record<string, unknown>) ?? {},
  });

  return Response.json({ ok: true, id });
}
