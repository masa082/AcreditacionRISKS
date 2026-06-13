import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { GradeAnswerForm } from "@/components/grade-answer-form";
import { finalizeManualGrading } from "@/lib/actions/grading";
import { InfoRequestPanel, type InfoRequestRow } from "@/components/info-request-panel";

export const metadata = { title: "Calificar evaluación" };

interface Rubric {
  criterios?: { nombre: string; puntos: number }[];
}

export default async function GradeAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.GRADE_MANUAL) && !can(ctx, PERMISSIONS.GRADE_VIEW)) redirect("/panel");
  const canGrade = can(ctx, PERMISSIONS.GRADE_MANUAL);

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { select: { name: true, passingScore: true } },
      candidate: { select: { firstName: true, lastName: true, documentNumber: true } },
      enrollment: { select: { id: true, code: true } },
      questions: { orderBy: { order: "asc" }, include: { answers: true } },
    },
  });
  if (!attempt || attempt.subscriberId !== subscriberId) notFound();

  const manualQuestions = attempt.questions.filter((q) => (q.snapshot as { needsManual?: boolean }).needsManual);
  const allGraded = manualQuestions.every((q) => q.answers[0]?.status === "MANUALLY_SCORED");
  const isOpen = attempt.status === "MANUAL_GRADING";

  const infoRequestsDb = await prisma.attemptInfoRequest.findMany({
    where: { attemptId },
    orderBy: { createdAt: "desc" },
  });
  const infoRequests: InfoRequestRow[] = infoRequestsDb.map((r) => ({
    id: r.id,
    status: r.status,
    message: r.message,
    candidateResponse: r.candidateResponse,
    candidateFileUrl: r.candidateFileUrl,
    candidateFileName: r.candidateFileName,
    respondedAt: r.respondedAt ? r.respondedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
  const pendingInfoRequests = infoRequests.some((r) => r.status === "PENDING");

  return (
    <>
      <PageHeader
        title={`${attempt.candidate.firstName} ${attempt.candidate.lastName}`}
        subtitle={`${attempt.exam.name} · Folio ${attempt.enrollment.code}`}
        actions={
          <Link href="/panel/calificacion" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Volver
          </Link>
        }
      />

      <div className="space-y-5">
        {manualQuestions.map((q, i) => {
          const snap = q.snapshot as unknown as { statement: string; contextText?: string | null; rubric?: Rubric };
          const ans = q.answers[0];
          const resp = (ans?.response ?? {}) as { text?: string; fileName?: string };
          const graded = ans?.status === "MANUALLY_SCORED";
          const rubric = snap.rubric;
          return (
            <Card key={q.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <h2 className="font-semibold text-slate-900">Pregunta {i + 1}</h2>
                {graded ? <Badge tone="green">Calificada {ans?.manualScore != null ? `(${Number(ans.manualScore.toString())}/100)` : ""}</Badge> : <Badge tone="amber">Pendiente</Badge>}
              </div>
              <div className="space-y-4 p-5">
                {snap.contextText ? <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{snap.contextText}</p> : null}
                <p className="text-sm font-medium text-slate-800">{snap.statement}</p>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Respuesta del candidato</h3>
                  {resp.text ? <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{resp.text}</p> : <p className="mt-1 text-sm text-slate-400">Sin texto.</p>}
                  {ans?.fileUrl ? (
                    <a href={`/api/attempt-files/${ans.id}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-brand-700 hover:underline">
                      📎 {resp.fileName ?? "Ver evidencia adjunta"}
                    </a>
                  ) : null}
                </section>

                {rubric?.criterios?.length ? (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rúbrica</h3>
                    <ul className="mt-1 space-y-1 text-sm text-slate-600">
                      {rubric.criterios.map((c, k) => (
                        <li key={k} className="flex justify-between">
                          <span>{c.nombre}</span>
                          <span className="text-slate-400">{c.puntos} pts</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {canGrade && isOpen ? (
                  <GradeAnswerForm
                    answerId={ans?.id ?? ""}
                    initialScore={ans?.manualScore != null ? Number(ans.manualScore.toString()) : null}
                    initialComment={ans?.graderComment ?? null}
                    graded={graded}
                  />
                ) : ans?.graderComment ? (
                  <p className="text-sm text-slate-500">Observación: {ans.graderComment}</p>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      {isOpen ? (
        <div className="mt-6">
          <InfoRequestPanel
            attemptId={attempt.id}
            requests={infoRequests}
            canManage={canGrade}
          />
        </div>
      ) : null}

      {canGrade && isOpen ? (
        <Card className="mt-6 p-5">
          {pendingInfoRequests ? (
            <p className="text-sm text-amber-700">
              ⏸ Hay una solicitud de información pendiente al candidato. No se puede finalizar la calificación hasta que el candidato responda o se cierre la solicitud.
            </p>
          ) : allGraded ? (
            <form action={finalizeManualGrading.bind(null, attempt.id)} className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600">Todas las respuestas están calificadas. Consolide el resultado.</p>
              <SubmitButton pendingText="Procesando…">Finalizar calificación</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-amber-700">Califique todas las respuestas para poder finalizar.</p>
          )}
        </Card>
      ) : null}
    </>
  );
}
