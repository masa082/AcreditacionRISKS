import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { buildCandidateCV } from "@/lib/candidate-cv-pdf";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // pdf-lib + prisma

/// Genera y descarga la Hoja de Vida del Candidato (PDF). Acceso reservado
/// a personal del mismo suscriptor con permiso de gestión de candidatos
/// o de inscripciones. Cada generación queda registrada en AuditLog con su
/// `reportId` único, que también figura en el QR del pie del PDF.
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
    const { bytes, reportId } = await buildCandidateCV(id, subscriberId);
    await audit(ctx, {
      action: "candidate.cv.download",
      entity: "Candidate",
      entityId: id,
      subscriberId,
      after: { reportId, sizeBytes: bytes.length },
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="hoja-de-vida-${id.slice(-8)}-${reportId.slice(0, 8)}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error generando el informe";
    return new Response(msg, { status: 500 });
  }
}
