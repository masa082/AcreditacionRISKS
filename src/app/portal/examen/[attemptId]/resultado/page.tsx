import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, StatTile } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { retryAttempt } from "@/lib/actions/attempt";
import { dateTime } from "@/lib/format";
import { PostExamSurveyAndReferral } from "@/components/post-exam-survey";

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
      exam: { select: { name: true, passingScore: true, allowReview: true, showResultImmediately: true, attemptsAllowed: true } },
      enrollment: { select: { id: true, code: true } },
    },
  });
  if (!attempt || attempt.candidateId !== candidateId) notFound();

  // Conteo de intentos terminados de esta inscripción — para decidir
  // si todavía puede reintentar.
  const FINISHED = [
    "SUBMITTED", "AUTO_GRADED", "MANUAL_GRADING", "GRADED",
    "PASSED", "FAILED", "PENDING_COMMITTEE", "VOID",
  ];
  const attemptsUsed = await prisma.examAttempt.count({
    where: { enrollmentId: attempt.enrollment.id, status: { in: FINISHED as never } },
  });
  const attemptsLeft = Math.max(0, attempt.exam.attemptsAllowed - attemptsUsed);
  const canRetry =
    !attempt.passed &&
    attempt.passed !== null &&     // ya está calificado
    attemptsLeft > 0;

  const focusLost = await prisma.attemptEvent.count({ where: { attemptId, type: "focus_lost" } });
  const existingSurvey = await prisma.satisfactionSurvey.findUnique({
    where: { attemptId },
    select: { id: true },
  });
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
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/40 p-4">
            <p className="text-sm font-semibold text-rose-900">
              No alcanzó el puntaje mínimo aprobatorio ({passing}%).
            </p>
            {canRetry ? (
              <>
                <p className="mt-1 text-xs text-rose-800">
                  Le quedan <strong>{attemptsLeft}</strong> reintento(s).
                  El nuevo intento tendrá <strong>preguntas distintas</strong> a las
                  que ya respondió y un <strong>mayor grado de dificultad</strong>
                  {" "}para evaluar más a fondo sus competencias.
                </p>
                {/* Server action: crea un nuevo ExamAttempt con
                    excludeQuestionIds + difficultyBoost y redirige al
                    runner del examen (HonestyGate primero). */}
                <form action={retryAttempt.bind(null, attempt.id)} className="mt-3">
                  <SubmitButton pendingText="Preparando el nuevo intento…">
                    ↻ Reintentar el examen ahora
                  </SubmitButton>
                </form>
              </>
            ) : (
              <p className="mt-1 text-xs text-rose-800">
                Agotó los {attempt.exam.attemptsAllowed} intento(s) permitidos para esta evaluación.
                Puede presentar una apelación si considera que hubo un error en la calificación.
              </p>
            )}
          </div>
        ) : null}

        {focusLost > 0 ? (
          <p className="mt-4 text-xs text-amber-600">
            ⚠ Durante la presentación se registraron {focusLost} salida(s) de la pantalla del examen (control de integridad).
          </p>
        ) : null}
      </Card>

      <PostExamSurveyAndReferral
        attemptId={attempt.id}
        alreadySubmittedSurvey={!!existingSurvey}
      />
    </>
  );
}
