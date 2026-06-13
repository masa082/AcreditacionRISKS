import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { buildCandidateCV } from "@/lib/candidate-cv-pdf";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { buildPdfFilename } from "@/lib/pdf-filename";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // pdf-lib + prisma

/**
 * Genera y descarga la Hoja de Vida del Candidato (PDF). Acceso reservado
 * a personal del mismo suscriptor con permiso de gestión de candidatos
 * o de inscripciones. Cada generación queda registrada en AuditLog con su
 * `reportId` único, que también figura en el QR del pie del PDF.
 *
 * Nombre del archivo: dinámico, autodescriptivo. Ej:
 *   HojaDeVida_SAMUEL-SANCHEZ_CC-7182416_LISTO-PARA-PRESENTAR_2026-06-12.pdf
 *
 * Se eligió el status de la inscripción más reciente "no terminal"
 * (READY/COMMITTEE/IN_PROGRESS, etc.) para que la persona que abre el
 * archivo ya sepa de un vistazo en qué punto del proceso está el
 * candidato sin tener que abrirlo.
 */
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
    const [{ bytes, reportId }, candidate] = await Promise.all([
      buildCandidateCV(id, subscriberId),
      // Lookup ligero para el nombre del archivo (no carga relaciones pesadas).
      prisma.candidate.findFirst({
        where: { id, subscriberId },
        select: {
          firstName: true,
          lastName: true,
          documentType: true,
          documentNumber: true,
          enrollments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { status: true },
          },
          certificates: {
            where: { status: "VALID" },
            take: 1,
            select: { status: true },
          },
        },
      }),
    ]);

    // Estado "preferido" para el nombre: si está certificado, manda
    // CERTIFICADO; si no, el status del enrollment más reciente.
    const status =
      candidate?.certificates[0]?.status === "VALID"
        ? "CERTIFIED"
        : candidate?.enrollments[0]?.status ?? null;

    const fileName = buildPdfFilename({
      prefix: "HojaDeVida",
      holderName: `${candidate?.firstName ?? ""} ${candidate?.lastName ?? ""}`.trim(),
      documentType: candidate?.documentType ?? "DOC",
      documentNumber: candidate?.documentNumber ?? undefined,
      status,
      // Fecha de generación, útil cuando hay varias versiones en el disco.
      suffix: new Date().toISOString().slice(0, 10),
    });

    await audit(ctx, {
      action: "candidate.cv.download",
      entity: "Candidate",
      entityId: id,
      subscriberId,
      after: { reportId, sizeBytes: bytes.length, fileName },
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error generando el informe";
    return new Response(msg, { status: 500 });
  }
}
