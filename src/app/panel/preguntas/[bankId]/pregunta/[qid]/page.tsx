import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader, Badge } from "@/components/ui";
import { QuestionEditor, type QuestionInitial } from "@/components/question-editor";
import { setQuestionStatus, deleteQuestion } from "@/lib/actions/questions";
import { QUESTION_STATUS_LABELS, type QuestionTypeKey } from "@/lib/question-types";

export const metadata = { title: "Editar pregunta" };

const STATUS_TONE: Record<string, "slate" | "blue" | "green" | "amber" | "red"> = {
  DRAFT: "slate", IN_REVIEW: "amber", APPROVED: "green", REJECTED: "red", INACTIVE: "slate",
};

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ bankId: string; qid: string }>;
}) {
  const { bankId, qid } = await params;
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.QUESTION_VIEW)) redirect("/panel/preguntas");

  const q = await prisma.question.findUnique({
    where: { id: qid },
    include: {
      options: { orderBy: { order: "asc" } },
      revisions: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!q || q.subscriberId !== subscriberId || q.bankId !== bankId) notFound();

  const canEdit = can(ctx, PERMISSIONS.QUESTION_EDIT);
  const canReview = can(ctx, PERMISSIONS.QUESTION_REVIEW);
  const canApprove = can(ctx, PERMISSIONS.QUESTION_APPROVE);

  const [competencies, topics] = await Promise.all([
    prisma.competency.findMany({ where: { subscriberId }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.topic.findMany({ where: { subscriberId }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
  ]);

  const initial: QuestionInitial = {
    id: q.id,
    code: q.code,
    type: q.type as QuestionTypeKey,
    statement: q.statement,
    contextText: q.contextText,
    mediaUrl: q.mediaUrl,
    points: Number(q.points),
    partialScoring: q.partialScoring,
    difficulty: q.difficulty,
    competencyId: q.competencyId,
    topicId: q.topicId,
    normReference: q.normReference,
    tags: q.tags,
    suggestedTimeSec: q.suggestedTimeSec,
    isCritical: q.isCritical,
    feedback: q.feedback,
    options: q.options.map((o) => ({
      text: o.text,
      isCorrect: o.isCorrect,
      matchLeft: o.matchLeft ?? "",
      matchRight: o.matchRight ?? "",
    })),
    trueFalseAnswer: typeof q.correctAnswer === "boolean" ? q.correctAnswer : null,
    scaleConfig: (q.scaleConfig as QuestionInitial["scaleConfig"]) ?? null,
    rubric: (q.rubric as QuestionInitial["rubric"]) ?? null,
  };

  // Acciones de flujo editorial disponibles según estado + permisos.
  const actions: { label: string; transition: Parameters<typeof setQuestionStatus>[1]; tone: string; show: boolean }[] = [
    { label: "Enviar a revisión", transition: "submit", tone: "bg-amber-600", show: (q.status === "DRAFT" || q.status === "REJECTED") && canEdit },
    { label: "Aprobar", transition: "approve", tone: "bg-emerald-600", show: q.status === "IN_REVIEW" && canApprove },
    { label: "Rechazar", transition: "reject", tone: "bg-rose-600", show: q.status === "IN_REVIEW" && (canReview || canApprove) },
    { label: "Inactivar", transition: "inactivate", tone: "bg-slate-600", show: q.status === "APPROVED" && canApprove },
    { label: "Reactivar", transition: "reactivate", tone: "bg-emerald-600", show: q.status === "INACTIVE" && canApprove },
  ];

  return (
    <>
      <PageHeader
        title={`Pregunta ${q.code}`}
        subtitle={`Versión ${q.version}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[q.status]}>{QUESTION_STATUS_LABELS[q.status]}</Badge>
            <Link href={`/panel/preguntas/${bankId}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Volver</Link>
          </div>
        }
      />

      {/* Barra de flujo editorial */}
      <Card className="mb-5 flex flex-wrap items-center gap-2 p-4">
        <span className="text-sm font-medium text-slate-600">Flujo editorial:</span>
        {actions.filter((a) => a.show).length === 0 ? (
          <span className="text-sm text-slate-400">Sin acciones disponibles para su rol en este estado.</span>
        ) : null}
        {actions.filter((a) => a.show).map((a) => (
          <form key={a.transition} action={setQuestionStatus.bind(null, q.id, a.transition)}>
            <button className={`rounded-lg ${a.tone} px-4 py-2 text-sm font-semibold text-white hover:opacity-90`}>{a.label}</button>
          </form>
        ))}
        {(q.status === "DRAFT" || q.status === "REJECTED") && canEdit ? (
          <form action={deleteQuestion.bind(null, q.id)} className="ml-auto">
            <button className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">Eliminar</button>
          </form>
        ) : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            {canEdit ? (
              <QuestionEditor bankId={bankId} competencies={competencies} topics={topics} initial={initial} />
            ) : (
              <div className="text-sm text-slate-500">No tiene permiso para editar. Vista de solo lectura.</div>
            )}
          </Card>
        </div>
        <div>
          <Card className="p-5">
            <h3 className="font-semibold text-slate-900">Historial de cambios</h3>
            <ul className="mt-3 space-y-3">
              {q.revisions.map((r) => (
                <li key={r.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                  <div className="font-medium text-slate-700">v{r.version} · {r.action}</div>
                  <div className="text-xs text-slate-400">{r.createdAt.toLocaleString("es-CO")}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
