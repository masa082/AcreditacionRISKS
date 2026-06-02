import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import {
  QUESTION_TYPES,
  QUESTION_STATUS_LABELS,
  DIFFICULTY_LABELS,
  type QuestionTypeKey,
} from "@/lib/question-types";

export const metadata = { title: "Banco · preguntas" };

const STATUS_TONE: Record<string, "slate" | "blue" | "green" | "amber" | "red"> = {
  DRAFT: "slate",
  IN_REVIEW: "amber",
  APPROVED: "green",
  REJECTED: "red",
  INACTIVE: "slate",
};

export default async function BankDetailPage({
  params,
}: {
  params: Promise<{ bankId: string }>;
}) {
  const { bankId } = await params;
  const { ctx, subscriberId } = await requireSubscriberPage();
  const create = can(ctx, PERMISSIONS.QUESTION_CREATE);

  const bank = await prisma.questionBank.findUnique({
    where: { id: bankId },
    include: { scheme: { select: { name: true } } },
  });
  if (!bank || bank.subscriberId !== subscriberId) notFound();

  const questions = await prisma.question.findMany({
    where: { subscriberId, bankId },
    orderBy: { createdAt: "desc" },
    include: {
      competency: { select: { code: true } },
      _count: { select: { options: true } },
    },
  });

  const counts = {
    total: questions.length,
    approved: questions.filter((q) => q.status === "APPROVED").length,
    review: questions.filter((q) => q.status === "IN_REVIEW").length,
    draft: questions.filter((q) => q.status === "DRAFT").length,
  };

  return (
    <>
      <PageHeader
        title={bank.name}
        subtitle={`${bank.code} · ${bank.scheme?.name ?? "Sin esquema"} · ${bank.version}`}
        actions={
          <div className="flex gap-2">
            <Link href="/panel/preguntas" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Volver</Link>
            {create ? (
              <Link href={`/panel/preguntas/${bankId}/pregunta/nueva`} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900">+ Nueva pregunta</Link>
            ) : null}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-slate-500">Total</div><div className="text-2xl font-semibold text-slate-800">{counts.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Aprobadas</div><div className="text-2xl font-semibold text-emerald-600">{counts.approved}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">En revisión</div><div className="text-2xl font-semibold text-amber-600">{counts.review}</div></Card>
        <Card className="p-4"><div className="text-xs text-slate-500">Borrador</div><div className="text-2xl font-semibold text-slate-600">{counts.draft}</div></Card>
      </div>

      {questions.length === 0 ? (
        <EmptyState>Este banco aún no tiene preguntas. Cree la primera.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Código</th>
                  <th className="px-5 py-3">Enunciado</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Dificultad</th>
                  <th className="px-5 py-3">Puntos</th>
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/panel/preguntas/${bankId}/pregunta/${q.id}`} className="font-mono text-xs font-medium text-brand-700 hover:underline">
                        {q.code}
                      </Link>
                      {q.isCritical ? <span className="ml-1 text-rose-500" title="Crítica">●</span> : null}
                    </td>
                    <td className="px-5 py-3 max-w-md">
                      <div className="truncate text-slate-700">{q.statement}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{QUESTION_TYPES[q.type as QuestionTypeKey]?.label.split("—")[0]}</td>
                    <td className="px-5 py-3 text-slate-600">{DIFFICULTY_LABELS[q.difficulty]}</td>
                    <td className="px-5 py-3 text-slate-600">{Number(q.points)}</td>
                    <td className="px-5 py-3"><Badge tone={STATUS_TONE[q.status]}>{QUESTION_STATUS_LABELS[q.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
