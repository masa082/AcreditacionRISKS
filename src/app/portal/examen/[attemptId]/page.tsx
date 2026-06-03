import { notFound, redirect } from "next/navigation";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ExamRunner, type RunnerQuestion } from "@/components/exam-runner";
import { publicSnapshot, type QuestionSnapshot } from "@/lib/exam-attempt";

export const metadata = { title: "Presentación de examen" };

export default async function ExamPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const { candidateId } = await requireCandidatePage();

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: { select: { name: true, durationMin: true, instructions: true } },
      questions: { orderBy: { order: "asc" }, include: { answers: true } },
    },
  });
  if (!attempt || attempt.candidateId !== candidateId) notFound();
  if (attempt.status !== "IN_PROGRESS") redirect(`/portal/examen/${attemptId}/resultado`);

  const questions: RunnerQuestion[] = attempt.questions.map((aq) => {
    const snap = publicSnapshot(aq.snapshot as unknown as QuestionSnapshot);
    const ans = aq.answers[0]?.response as { key?: string; keys?: string[]; text?: string; fileName?: string } | null;
    return {
      id: aq.id,
      sectionTitle: aq.sectionTitle,
      statement: snap.statement,
      contextText: snap.contextText,
      options: snap.options,
      multiple: snap.multiple,
      manual: snap.manual,
      saved: { key: ans?.key, keys: ans?.keys, text: ans?.text, fileName: ans?.fileName },
    };
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900">{attempt.exam.name}</h1>
        {attempt.exam.instructions ? (
          <p className="mt-1 text-sm text-slate-500">{attempt.exam.instructions}</p>
        ) : null}
      </div>
      <ExamRunner
        attemptId={attempt.id}
        dueAt={(attempt.dueAt ?? new Date()).toISOString()}
        questions={questions}
      />
    </div>
  );
}
