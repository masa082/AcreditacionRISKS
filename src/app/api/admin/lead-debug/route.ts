import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Diagnóstico temporal para entender por qué un lead aparece en la
 * bandeja de notificaciones pero no en la tabla. Devuelve los últimos
 * 30 leads + sus últimas 5 actividades. Sin PII más allá del nombre y
 * el dominio del correo (el correo va enmascarado).
 *
 * Protegido por token en env `LEAD_DEBUG_TOKEN`. Se retira en cuanto
 * se confirme la causa.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const expected = process.env.LEAD_DEBUG_TOKEN;
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "token inválido" }), {
      status: 403, headers: { "content-type": "application/json" },
    });
  }
  const mask = (e: string) => {
    const [u, d] = e.split("@");
    if (!u || !d) return e;
    return `${u[0]}***${u.slice(-1)}@${d}`;
  };
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      activities: { orderBy: { createdAt: "desc" }, take: 5 },
      subscriber: { select: { tradeName: true } },
    },
  });
  const data = leads.map((l) => ({
    id: l.id.slice(-10),
    fullName: l.fullName,
    email: mask(l.email),
    subscriber: l.subscriber?.tradeName ?? "(null)",
    status: l.status,
    kind: l.kind,
    certificationOfInterest: l.certificationOfInterest,
    source: l.source,
    siteVisitCount: l.siteVisitCount,
    createdAt: l.createdAt,
    lastSiteVisitAt: l.lastSiteVisitAt,
    activities: l.activities.map((a) => ({
      type: a.type,
      comment: a.comment,
      meta: a.metadata,
      at: a.createdAt,
    })),
  }));
  return new Response(JSON.stringify({ ok: true, count: leads.length, leads: data }, null, 2), {
    status: 200, headers: { "content-type": "application/json" },
  });
}
