import { prisma } from "@/lib/prisma";
import { getCurrentUser, can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { readFileByKey, EXT_TO_MIME, extFromName } from "@/lib/storage";

/// Sirve un documento/evidencia de candidato con control de acceso:
/// - El candidato dueño de la inscripción.
/// - Personal del suscriptor (mismo tenant) con permiso de revisión/gestión.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getCurrentUser();
  if (!ctx) return new Response("No autenticado", { status: 401 });

  const doc = await prisma.candidateDocument.findUnique({
    where: { id },
    include: {
      enrollment: {
        select: {
          subscriberId: true,
          candidate: { select: { userId: true } },
        },
      },
    },
  });
  if (!doc) return new Response("No encontrado", { status: 404 });

  const enr = doc.enrollment;
  let allowed = false;
  if (ctx.type === "CANDIDATE") {
    allowed = enr.candidate.userId === ctx.userId;
  } else if (ctx.type === "SUBSCRIBER") {
    allowed =
      ctx.subscriberId === enr.subscriberId &&
      (can(ctx, PERMISSIONS.DOCUMENT_REVIEW) ||
        can(ctx, PERMISSIONS.CANDIDATE_MANAGE) ||
        can(ctx, PERMISSIONS.ENROLLMENT_MANAGE));
  }
  if (!allowed) return new Response("Acceso denegado", { status: 403 });

  // Compatibilidad: entregas antiguas guardadas como URL externa.
  if (/^https?:\/\//i.test(doc.fileUrl)) {
    return Response.redirect(doc.fileUrl, 302);
  }

  let buf: Buffer;
  try {
    buf = await readFileByKey(doc.fileUrl);
  } catch {
    return new Response("Archivo no disponible", { status: 404 });
  }

  const ext = extFromName(doc.fileUrl);
  const mime = EXT_TO_MIME[ext] ?? "application/octet-stream";
  const safeName = (doc.fileName ?? `documento.${ext}`).replace(/"/g, "");

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
