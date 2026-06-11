import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";

export const dynamic = "force-dynamic";

/// GET /api/candidates/{id}/incidents → lista incidencias del candidato.
/// Acceso: SUBSCRIBER del mismo tenant.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let subscriberId: string;
  try {
    ({ subscriberId } = await requireSubscriberAction());
  } catch {
    return new Response("No autorizado", { status: 401 });
  }
  const { id } = await params;

  const candidate = await prisma.candidate.findFirst({
    where: { id, subscriberId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!candidate) return new Response("No encontrado", { status: 404 });

  const incidents = await prisma.processIncident.findMany({
    where: { candidateId: id, subscriberId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      category: true,
      severity: true,
      message: true,
      context: true,
      resolvedAt: true,
      resolution: true,
      resolvedBy: { select: { firstName: true, lastName: true } },
      createdAt: true,
    },
  });
  return Response.json({ candidate, incidents });
}
