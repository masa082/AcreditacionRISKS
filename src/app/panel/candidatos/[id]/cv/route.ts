import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { buildCandidateCV } from "@/lib/candidate-cv-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // pdf-lib + prisma

/// Genera y descarga la Hoja de Vida del Candidato (PDF). Acceso reservado
/// a personal del mismo suscriptor con permiso de gestión de candidatos
/// o de inscripciones. El nombre de archivo incluye el documento de
/// identidad para facilitar el archivo físico/digital.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.CANDIDATE_MANAGE) && !can(ctx, PERMISSIONS.ENROLLMENT_MANAGE)) {
    return new Response("Acceso denegado", { status: 403 });
  }

  try {
    const bytes = await buildCandidateCV(id, subscriberId);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="hoja-de-vida-${id.slice(-8)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error generando el informe";
    return new Response(msg, { status: 500 });
  }
}
