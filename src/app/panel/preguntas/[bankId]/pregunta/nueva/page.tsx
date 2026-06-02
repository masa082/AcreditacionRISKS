import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader } from "@/components/ui";
import { QuestionEditor } from "@/components/question-editor";

export const metadata = { title: "Nueva pregunta" };

export default async function NewQuestionPage({
  params,
}: {
  params: Promise<{ bankId: string }>;
}) {
  const { bankId } = await params;
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.QUESTION_CREATE)) redirect(`/panel/preguntas/${bankId}`);

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank || bank.subscriberId !== subscriberId) notFound();

  const [competencies, topics] = await Promise.all([
    prisma.competency.findMany({ where: { subscriberId }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    prisma.topic.findMany({ where: { subscriberId }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Nueva pregunta"
        subtitle={`Banco ${bank.code}`}
        actions={
          <Link href={`/panel/preguntas/${bankId}`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Volver</Link>
        }
      />
      <Card className="max-w-4xl p-6">
        <QuestionEditor bankId={bankId} competencies={competencies} topics={topics} />
      </Card>
    </>
  );
}
