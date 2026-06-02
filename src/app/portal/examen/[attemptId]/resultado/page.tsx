import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, StatTile } from "@/components/ui";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Resultado del examen" };

const STATUS: Record<string, { label: string; tone: "green" | "red" | "amber" | "blue" }> = {
  PASSED: { label: "Aprobado", tone: "green" },
  FAILED: { label: "No aprobado", tone: "red" },
  MANUAL_GRADING: { label: "En calificación", tone: "amber" },
  PENDING_COMMITTEE: { label: "En revisión del comité", tone: "blue" },
};

export default async function ResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const { candidateId } = await requireCandidatePage();

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { select: { name: true, passingScore: true, allowReview: true, showResultImmediately: true } },
      enrollment: { select: { id: true, code: true } },
    },
  });
  if (!attempt || attempt.candidateId !== candidateId) notFound();

  const st = STATUS[attempt.status] ?? { label: attempt.status, tone: "blue" as const };
  const pending = attempt.status === "MANUAL_GRADING" || attempt.status === "PENDING_COMMITTEE";
  const percent = attempt.scorePercent != null ? Number(attempt.scorePercent.toString()) : null;
  const passing = Number(attempt.exam.passingScore.toString());

  return (
    <>
      <PageHeader
        title="Resultado del examen"
        subtitle={attempt.exam.name}
        actions={
          <Link href={`/portal/inscripcion/${attempt.enrollment.id}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Volver a la inscripción
          </Link>
        }
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Folio {attempt.enrollment.code}</div>
            <div className="mt-1 flex items-center gap-3">
              <Badge tone={st.tone}>{st.label}</Badge>
              {attempt.submittedAt ? <span className="text-xs text-slate-400">Enviado {dateTime(attempt.submittedAt)}</span> : null}
            </div>
          </div>
        </div>

        {pending ? (
          <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
            Su examen fue enviado y está {attempt.status === "PENDING_COMMITTEE" ? "en revisión del comité evaluador" : "en proceso de calificación"}.
            Le notificaremos el resultado.
          </p>
        ) : percent != null ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatTile label="Calificación" value={`${percent}%`} tone={attempt.passed ? "good" : "danger"} />
            <StatTile label="Mínimo aprobatorio" value={`${passing}%`} />
            <StatTile label="Resultado" value={attempt.passed ? "Aprobado" : "No aprobado"} tone={attempt.passed ? "good" : "danger"} />
          </div>
        ) : null}

        {!pending && attempt.passed === false ? (
          <p className="mt-4 text-sm text-slate-500">
            No alcanzó el puntaje mínimo aprobatorio. Si su esquema permite reintentos, podrá presentarlo nuevamente según las políticas de la entidad.
          </p>
        ) : null}
      </Card>
    </>
  );
}
