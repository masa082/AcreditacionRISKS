import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { GradingTable, type GradingRow } from "@/components/grading-table";

export const metadata = { title: "Calificación" };

/**
 * Vista de calificación: tabla con TODOS los intentos del suscriptor
 * (no solo los que esperan calificación manual). Cada fila muestra el
 * estado actual del intento — desde "En curso" hasta "Aprobó / No
 * aprobó / En comité / Anulado" — y la calificación cuando ya está.
 *
 * Filtrable por estado y buscable por candidato/documento/examen/folio.
 * El evaluador con permiso GRADE_MANUAL ve botón "Calificar →" solo
 * para los intentos en MANUAL_GRADING; el resto lo pueden abrir como
 * "Ver" (read-only) para inspeccionar puntajes.
 */
export default async function GradingListPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.GRADE_MANUAL) && !can(ctx, PERMISSIONS.GRADE_VIEW)) redirect("/panel");

  const attempts = await prisma.examAttempt.findMany({
    where: { subscriberId },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    include: {
      exam: { select: { name: true, passingScore: true } },
      candidate: { select: { firstName: true, lastName: true, documentNumber: true } },
      enrollment: { select: { code: true } },
    },
  });

  const rows: GradingRow[] = attempts.map((a) => ({
    attemptId: a.id,
    candidateName: `${a.candidate.firstName} ${a.candidate.lastName}`.trim(),
    documentNumber: a.candidate.documentNumber,
    enrollmentCode: a.enrollment.code,
    examName: a.exam.name,
    status: a.status,
    scorePercent: a.scorePercent != null ? Number(a.scorePercent.toString()) : null,
    passingScore: Number(a.exam.passingScore.toString()),
    attemptNumber: a.attemptNumber,
    startedAtIso: a.startedAt ? a.startedAt.toISOString() : null,
    submittedAtIso: a.submittedAt ? a.submittedAt.toISOString() : null,
    gradedAtIso: a.gradedAt ? a.gradedAt.toISOString() : null,
  }));

  const manualPending = rows.filter((r) => r.status === "MANUAL_GRADING").length;

  return (
    <>
      <PageHeader
        title="Calificación"
        subtitle={
          rows.length === 0
            ? "Aún no hay intentos de evaluación registrados."
            : `${rows.length} intento(s) en total · ${manualPending} pendiente(s) de calificación manual.`
        }
      />
      <GradingTable rows={rows} />
    </>
  );
}
