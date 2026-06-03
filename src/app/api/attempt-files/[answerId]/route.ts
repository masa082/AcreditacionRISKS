import { prisma } from "@/lib/prisma";
import { getCurrentUser, can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { readFileByKey, EXT_TO_MIME, extFromName } from "@/lib/storage";

/// Sirve la evidencia (archivo) adjunta a una respuesta de examen, con control de acceso:
/// el candidato dueño del intento o personal del suscriptor con permiso de calificación/comité.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ answerId: string }> },
) {
  const { answerId } = await params;
  const ctx = await getCurrentUser();
  if (!ctx) return new Response("No autenticado", { status: 401 });

  const answer = await prisma.attemptAnswer.findUnique({
    where: { id: answerId },
    include: { attempt: { select: { subscriberId: true, candidate: { select: { userId: true } } } } },
  });
  if (!answer || !answer.fileUrl) return new Response("No encontrado", { status: 404 });

  let allowed = false;
  if (ctx.type === "CANDIDATE") {
    allowed = answer.attempt.candidate.userId === ctx.userId;
  } else if (ctx.type === "SUBSCRIBER") {
    allowed =
      ctx.subscriberId === answer.attempt.subscriberId &&
      (can(ctx, PERMISSIONS.GRADE_MANUAL) ||
        can(ctx, PERMISSIONS.GRADE_VIEW) ||
        can(ctx, PERMISSIONS.COMMITTEE_REVIEW));
  }
  if (!allowed) return new Response("Acceso denegado", { status: 403 });

  let buf: Buffer;
  try {
    buf = await readFileByKey(answer.fileUrl);
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }
  const ext = extFromName(answer.fileUrl);
  const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";
  const fileName = ((answer.response as { fileName?: string } | null)?.fileName ?? `evidencia.${ext}`).replace(/"/g, "");

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
