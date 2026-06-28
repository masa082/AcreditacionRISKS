import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";

/**
 * POST /api/cache/purge
 * Purga el caché de revalidación de Next.js (On-Demand ISR).
 * Permite al admin limpiar datos cacheados sin desplegar.
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const ctx = await getCurrentUser();
    if (!ctx || !ctx.subscriberId) {
      return NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    // Rutas críticas a revalidar
    const routes = [
      "/panel",
      "/panel/candidatos",
      "/panel/evaluaciones",
      "/panel/calificacion",
      "/panel/certificados",
      "/panel/leads",
      "/panel/reportes",
    ];

    // Revalidar cada ruta usando Next.js ISR
    let revalidatedCount = 0;
    const errors: string[] = [];

    for (const route of routes) {
      try {
        revalidatePath(route);
        revalidatedCount++;
      } catch (error) {
        console.error(`[cache/purge] Error revalidating ${route}:`, error);
        errors.push(`${route}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      message: errors.length === 0
        ? "Caché purgado exitosamente"
        : `Caché purgado parcialmente (${revalidatedCount}/${routes.length})`,
      revalidated: revalidatedCount,
      total: routes.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[cache/purge] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error al limpiar caché",
      },
      { status: 500 }
    );
  }
}
