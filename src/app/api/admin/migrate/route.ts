import { NextRequest, NextResponse } from "next/server";

/**
 * ENDPOINT TEMPORAL: Ejecutar migraciones de Prisma
 * Solo para emergencias de deploy. Eliminar después de usar.
 * Requiere MIGRATION_SECRET en la URL.
 */
async function handleMigrate(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");

  // Validación simple
  if (secret !== process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { execSync } = await import("child_process");

    // Ejecutar migraciones
    const result = execSync("npx prisma migrate deploy", {
      encoding: "utf-8",
      stdio: "pipe",
    });

    return NextResponse.json({
      success: true,
      message: "Migraciones ejecutadas exitosamente",
      output: result,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      output: error.stdout?.toString() || "",
    }, { status: 500});
  }
}

export async function POST(req: NextRequest) {
  return handleMigrate(req);
}

export async function GET(req: NextRequest) {
  return handleMigrate(req);
}
