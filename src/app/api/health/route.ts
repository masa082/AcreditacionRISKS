import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/// Health check para monitoreo/uptime. Verifica conectividad con la base de datos.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch {
    return Response.json({ status: "error", db: "down" }, { status: 503 });
  }
}
