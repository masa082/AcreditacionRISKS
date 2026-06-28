import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * POST /api/cleanup/full
 * Limpia:
 * 1. Caché de Next.js (ISR)
 * 2. Cookies de sesión
 * 3. Datos locales del navegador (via header al cliente)
 *
 * ROBUSTO: No requiere autenticación de servidor
 * El cliente maneja la limpieza de localStorage/sessionStorage/cookies
 */
export async function POST(req: NextRequest) {
  try {
    // Rutas críticas a revalidar
    const routes = [
      "/",
      "/panel",
      "/panel/candidatos",
      "/panel/evaluaciones",
      "/panel/calificacion",
      "/panel/certificados",
      "/panel/leads",
      "/panel/reportes",
      "/portal",
      "/login",
    ];

    // Revalidar cada ruta usando Next.js ISR
    let revalidatedCount = 0;
    const errors: string[] = [];

    for (const route of routes) {
      try {
        revalidatePath(route);
        revalidatedCount++;
      } catch (error) {
        console.error(`[cleanup/full] Error revalidating ${route}:`, error);
      }
    }

    // Crear respuesta con instrucciones para limpiar cookies del cliente
    const response = NextResponse.json({
      ok: true,
      message: "✓ Sistema limpiado exitosamente",
      revalidated: revalidatedCount,
      total: routes.length,
      timestamp: new Date().toISOString(),
    });

    // Limpiar cookies (solo server-side; el cliente hace más)
    response.cookies.delete("__Secure-next-auth.session-token");
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("next-auth.csrf-token");
    response.cookies.delete("app-locale");
    response.cookies.delete("theme");

    return response;
  } catch (error) {
    console.error("[cleanup/full] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error al limpiar datos",
      },
      { status: 500 }
    );
  }
}
