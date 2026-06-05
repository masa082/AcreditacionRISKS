import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { ExamForm, type ExamInitial } from "@/components/exam-form";
import { SectionForm } from "@/components/section-form";
import { updateExam, addSection, removeSection, setExamStatus } from "@/lib/actions/exams";
import { EXAM_STATUS_LABELS } from "@/lib/exam-meta";
import { DIFFICULTY_LABELS } from "@/lib/question-types";

export const metadata = { title: "Configurar evaluación" };

const STATUS_TONE: Record<string, "slate" | "green" | "amber"> = {
  DRAFT: "slate", PUBLISHED: "green", ARCHIVED: "amber",
};

function dtLocal(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.EXAM_VIEW)) redirect("/panel/evaluaciones");
  const manage = can(ctx, PERMISSIONS.EXAM_MANAGE);

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { order: "asc" }, include: { bank: { select: { code: true, name: true } } } },
    },
  });
  if (!exam || exam.subscriberId !== subscriberId) notFound();

  const [schemes, banks] = await Promise.all([
    prisma.certificationScheme.findMany({ where: { subscriberId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.questionBank.findMany({ where: { subscriberId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true } }),
  ]);

  const initial: ExamInitial = {
    code: exam.code, name: exam.name, description: exam.description,
    schemeId: exam.schemeId, type: exam.type, modality: exam.modality,
    durationMin: exam.durationMin, passingScore: Number(exam.passingScore),
    attemptsAllowed: exam.attemptsAllowed, maxQuestions: exam.maxQuestions,
    questionSwapsAllowed: exam.questionSwapsAllowed,
    instructions: exam.instructions,
    availableFrom: dtLocal(exam.availableFrom), availableTo: dtLocal(exam.availableTo),
    randomizeQuestions: exam.randomizeQuestions, randomizeOptions: exam.randomizeOptions,
    requirePayment: exam.requirePayment, requireSchedule: exam.requireSchedule,
    requireCommittee: exam.requireCommittee, autoCertificate: exam.autoCertificate,
    showResultImmediately: exam.showResultImmediately, showCorrectAnswers: exam.showCorrectAnswers,
    allowReview: exam.allowReview,
  };

  const canPublish = exam.sections.length > 0 && exam.numQuestions > 0;

  return (
    <>
      <PageHeader
        title={exam.name}
        subtitle={`${exam.code} · ${exam.numQuestions} preguntas en bancos · máx ${exam.maxQuestions > 0 ? exam.maxQuestions : "sin tope"} por intento · ${exam.durationMin} min`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[exam.status]}>{EXAM_STATUS_LABELS[exam.status]}</Badge>
            {manage && exam.status !== "PUBLISHED" ? (
              <form action={setExamStatus.bind(null, id, "PUBLISHED")}>
                <button disabled={!canPublish} title={canPublish ? "" : "Agregue al menos una sección con preguntas"} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Publicar</button>
              </form>
            ) : null}
            {manage && exam.status === "PUBLISHED" ? (
              <form action={setExamStatus.bind(null, id, "DRAFT")}>
                <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Despublicar</button>
              </form>
            ) : null}
            <Link href="/panel/evaluaciones" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Volver</Link>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Configuración general</h3>
            {manage ? (
              <ExamForm action={updateExam.bind(null, id)} schemes={schemes} initial={initial} submitLabel="Guardar configuración" />
            ) : (
              <div className="text-sm text-slate-500">Vista de solo lectura.</div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 font-semibold text-slate-900">Secciones ({exam.sections.length})</h3>
            {exam.sections.length === 0 ? (
              <EmptyState>Sin secciones. Agregue una para definir cuántas preguntas se toman de cada banco.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {exam.sections.map((s) => (
                  <li key={s.id} className="flex items-start justify-between rounded-lg border border-slate-200 p-3 text-sm">
                    <div>
                      <div className="font-medium text-slate-800">{s.title}</div>
                      <div className="text-xs text-slate-500">
                        {s.questionCount} preg · {s.bank?.code ?? "—"}
                        {s.difficulty ? ` · ${DIFFICULTY_LABELS[s.difficulty]}` : ""}
                        {s.pointsPerQuestion ? ` · ${Number(s.pointsPerQuestion)} pts c/u` : ""}
                      </div>
                    </div>
                    {manage ? (
                      <form action={removeSection.bind(null, s.id)}>
                        <button className="text-rose-600 hover:underline">Quitar</button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <div>Total disponible en bancos: <b>{exam.numQuestions}</b> preguntas · <b>{Number(exam.totalPoints)}</b> puntos</div>
              <div>
                Por intento el candidato verá:{" "}
                <b className="text-brand-800">
                  {exam.maxQuestions > 0
                    ? `${Math.min(exam.maxQuestions, exam.numQuestions)} preguntas`
                    : `${exam.numQuestions} preguntas (sin tope)`}
                </b>
                {" "}al azar, sin repetir.
              </div>
            </div>
          </Card>

          {manage ? (
            <Card className="p-5">
              <h3 className="mb-3 font-semibold text-slate-900">Agregar sección</h3>
              {banks.length === 0 ? (
                <EmptyState>Cree un banco de preguntas primero.</EmptyState>
              ) : (
                <SectionForm action={addSection.bind(null, id)} banks={banks} />
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
