import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import {
  GradingByCandidate,
  type CandidateGradingGroup,
  type GradingAttemptRow,
} from "@/components/grading-by-candidate";

export const dynamic = 'force-dynamic';

export const metadata = { title: "Calificación" };

/**
 * Vista de calificación AGRUPADA POR CANDIDATO. Cada candidato muestra
 * sus inscripciones e intentos en un mismo bloque, con accesos directos
 * a la ficha (`/panel/candidatos/[id]`) y a la Hoja de Vida en PDF
 * (`/panel/candidatos/[id]/cv`) para que el evaluador pueda revisar el
 * informe del candidato antes de calificar.
 *
 * Filtrable por estado (Por calificar / En curso / En comité /
 * Aprobaron / No aprobaron) y buscable por nombre, documento, examen
 * o folio. El evaluador con permiso GRADE_MANUAL ve botón "Calificar"
 * solo para intentos en MANUAL_GRADING; el resto se abren como "Ver".
 */
export default async function GradingListPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.GRADE_MANUAL) && !can(ctx, PERMISSIONS.GRADE_VIEW)) redirect("/panel");

  const attempts = await prisma.examAttempt.findMany({
    where: { subscriberId },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    include: {
      exam: { select: { name: true, passingScore: true } },
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          documentNumber: true,
          documentType: true,
          email: true,
          phone: true,
        },
      },
      enrollment: {
        select: {
          code: true,
          scheme: { select: { name: true } },
        },
      },
    },
  });

  // Agrupamos por candidato preservando el orden de aparición (el primer
  // intento del candidato — ya viene ordenado por submittedAt desc).
  const byCandidate = new Map<string, CandidateGradingGroup>();
  for (const a of attempts) {
    const cid = a.candidate.id;
    const existing = byCandidate.get(cid);
    const row: GradingAttemptRow = {
      attemptId: a.id,
      enrollmentCode: a.enrollment.code,
      schemeName: a.enrollment.scheme?.name ?? null,
      examName: a.exam.name,
      status: a.status,
      scorePercent: a.scorePercent != null ? Number(a.scorePercent.toString()) : null,
      passingScore: Number(a.exam.passingScore.toString()),
      attemptNumber: a.attemptNumber,
      submittedAtIso: a.submittedAt ? a.submittedAt.toISOString() : null,
      gradedAtIso: a.gradedAt ? a.gradedAt.toISOString() : null,
    };
    if (existing) {
      existing.attempts.push(row);
    } else {
      byCandidate.set(cid, {
        candidateId: cid,
        fullName: `${a.candidate.firstName} ${a.candidate.lastName}`.trim(),
        documentLabel: [a.candidate.documentType, a.candidate.documentNumber].filter(Boolean).join(" ") || "—",
        email: a.candidate.email,
        phone: a.candidate.phone ?? null,
        attempts: [row],
      });
    }
  }
  const groups = [...byCandidate.values()];

  const totalAttempts = attempts.length;
  const manualPending = attempts.filter((a) => a.status === "MANUAL_GRADING").length;

  return (
    <>
      <PageHeader
        title="Calificación"
        subtitle={
          totalAttempts === 0
            ? "Aún no hay intentos de evaluación registrados."
            : `${groups.length} candidato(s) · ${totalAttempts} intento(s) · ${manualPending} por calificar.`
        }
      />
      <GradingByCandidate groups={groups} />
    </>
  );
}
