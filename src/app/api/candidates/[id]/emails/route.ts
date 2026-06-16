import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";

export const dynamic = "force-dynamic";

/**
 * GET /api/candidates/{id}/emails
 *
 * Devuelve la bitácora de correos enviados al candidato indicado, en
 * orden cronológico inverso. El acceso requiere sesión de SUSCRIPTOR y
 * que el candidato pertenezca al MISMO tenant del usuario logueado.
 *
 * Querystring opcional:
 *   limit=N   → tope de filas (default 50, máx 200)
 *   detail=1  → incluye `bodyHtml` completo (más pesado)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let subscriberId: string;
  try {
    ({ subscriberId } = await requireSubscriberAction());
  } catch {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const wantDetail = url.searchParams.get("detail") === "1";

  // Verificación cross-tenant: el candidato debe pertenecer al organismo
  // del usuario logueado.
  const candidate = await prisma.candidate.findFirst({
    where: { id, subscriberId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!candidate) return new Response("No encontrado", { status: 404 });

  const logs = await prisma.emailLog.findMany({
    where: { candidateId: id, subscriberId },
    orderBy: { sentAt: "desc" },
    take: limit,
    select: {
      id: true,
      toEmail: true,
      subject: true,
      bodyPreview: true,
      bodyHtml: wantDetail,
      kind: true,
      template: true,
      status: true,
      providerId: true,
      errorMessage: true,
      sentAt: true,
      groupId: true,
      sentBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  // Contar cuántos candidatos recibieron correos de cada groupId para
  // distinguir entre PERSONALIZADO (1 candidato) vs MASIVO (> 1).
  const groupIds = [...new Set(logs.map(l => l.groupId).filter(Boolean))] as string[];
  const groupCounts = new Map<string, number>();
  if (groupIds.length > 0) {
    const counts = await prisma.emailLog.groupBy({
      by: ["groupId"],
      where: { groupId: { in: groupIds } },
      _count: { candidateId: true },
    });
    for (const c of counts) {
      const count = (c._count as { candidateId?: number })?.candidateId ?? 1;
      if (c.groupId) groupCounts.set(c.groupId, count);
    }
  }

  // Añadir `displayKind` a cada log: si fue BULK pero solo 1 destinatario,
  // mostrarlo como PERSONALIZADO.
  const logsWithKind = logs.map(l => ({
    ...l,
    displayKind: l.kind === "BULK" && l.groupId && groupCounts.get(l.groupId) === 1 ? "PERSONALIZADO" : l.kind,
  }));

  return Response.json({ candidate, logs: logsWithKind, count: logsWithKind.length });
}
