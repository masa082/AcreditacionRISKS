import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * POST /api/debug/revalidate-candidatos
 * Fuerza revalidación de candidatos page
 * USE: Cuando los datos están stale pero cached
 */
export async function POST(req: NextRequest) {
  try {
    // Revalidar la página de candidatos
    revalidatePath("/panel/candidatos");
    revalidatePath("/panel/candidatos", "page");

    // Revalidar el layout también
    revalidatePath("/panel", "layout");

    return NextResponse.json({
      ok: true,
      message: "Caché revalidado",
      revalidated: ["/panel/candidatos", "/panel"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[revalidate-candidatos] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
