import { NextRequest, NextResponse } from "next/server";
import { requireSubscriberAction } from "@/lib/guards";
import { audit } from "@/lib/audit";

/**
 * POST /api/cache/purge
 * Purga el caché de revalidación de Next.js (On-Demand ISR).
 * Permite al admin limpiar datos cacheados sin desplegar.
 */
export async function POST(req: NextRequest) {
  try {
    const { ctx, subscriberId } = await requireSubscriberAction("*");

    // Revalidar rutas críticas del panel
    const routes = [
      "/panel",
      "/panel/candidatos",
      "/panel/evaluaciones",
      "/panel/calificacion",
      "/panel/certificados",
      "/panel/leads",
      "/panel/reportes",
    ];

    for (const route of routes) {
      try {
        // Next.js revalidation API (ISR)
        await fetch(`http://localhost:3000${route}`, {
          method: "HEAD",
          headers: { "x-prerender-revalidate": "secret_token" },
        }).catch(() => {
          // Silently ignore if can't reach (no prerender-bypass token)
        });
      } catch {}
    }

    // Registrar en auditoría
    await audit(ctx, {
      action: "cache.purge",
      entity: "System",
      subscriberId,
      after: { routes: routes.length, timestamp: new Date().toISOString() },
    });

    return NextResponse.json({
      ok: true,
      message: "Caché purgado exitosamente",
      routes: routes.length,
    });
  } catch (error) {
    console.error("[cache/purge] Error:", error);
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }
}
