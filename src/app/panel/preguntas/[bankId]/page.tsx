import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader } from "@/components/ui";
import { QuestionsTable, type QuestionRow } from "@/components/questions-table";
import {
  QUESTION_TYPES,
  QUESTION_STATUS_LABELS,
  DIFFICULTY_LABELS,
  type QuestionTypeKey,
} from "@/lib/question-types";

export const metadata = { title: "Banco · preguntas" };

interface SP {
  q?: string;
  type?: string;
  status?: string;
  difficulty?: string;
  tag?: string;
}

export default async function BankDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bankId: string }>;
  searchParams: Promise<SP>;
}) {
  const { bankId } = await params;
  const sp = await searchParams;
  const { ctx, subscriberId } = await requireSubscriberPage();
  const canEdit = can(ctx, PERMISSIONS.QUESTION_EDIT);
  const canCreate = can(ctx, PERMISSIONS.QUESTION_CREATE);

  const bank = await prisma.questionBank.findUnique({
    where: { id: bankId },
    include: { scheme: { select: { name: true } } },
  });
  if (!bank || bank.subscriberId !== subscriberId) notFound();

  const where: Record<string, unknown> = { subscriberId, bankId };
  if (sp.type) where.type = sp.type;
  if (sp.status) where.status = sp.status;
  if (sp.difficulty) where.difficulty = sp.difficulty;
  if (sp.tag) where.tags = { has: sp.tag };
  if (sp.q?.trim()) {
    const term = sp.q.trim();
    where.OR = [
      { statement: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { tags: { has: term } },
    ];
  }

  const [questions, totalCount, allTagsRaw] = await Promise.all([
    prisma.question.findMany({ where, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.question.count({ where: { subscriberId, bankId } }),
    prisma.question.findMany({ where: { subscriberId, bankId }, select: { tags: true } }),
  ]);

  // Estadísticas calculadas: # apariciones en exámenes y % aciertos promedio.
  const qIds = questions.map((q) => q.id);
  const appearancesById = new Map<string, number>();
  const answersById = new Map<string, { count: number; ratioSum: number }>();
  if (qIds.length > 0) {
    const appearancesAgg = await prisma.attemptQuestion.groupBy({
      by: ["questionId"],
      where: { questionId: { in: qIds } },
      _count: { _all: true },
    });
    for (const a of appearancesAgg) appearancesById.set(a.questionId, a._count._all);

    const aas = await prisma.attemptAnswer.findMany({
      where: {
        finalScore: { not: null },
        attemptQuestion: { questionId: { in: qIds } },
      },
      select: {
        finalScore: true,
        attemptQuestion: { select: { questionId: true, points: true } },
      },
    });
    for (const a of aas) {
      const qid = a.attemptQuestion.questionId;
      const pts = Number(a.attemptQuestion.points.toString());
      const fs = Number((a.finalScore ?? 0).toString());
      if (pts <= 0) continue;
      const ratio = Math.max(0, Math.min(1, fs / pts));
      const cur = answersById.get(qid) ?? { count: 0, ratioSum: 0 };
      cur.count += 1;
      cur.ratioSum += ratio;
      answersById.set(qid, cur);
    }
  }

  const rows: QuestionRow[] = questions.map((q) => {
    const apps = appearancesById.get(q.id) ?? 0;
    const ag = answersById.get(q.id);
    const correctRate = ag && ag.count > 0 ? Math.round((ag.ratioSum / ag.count) * 100) : null;
    return {
      id: q.id,
      code: q.code,
      statement: q.statement,
      typeLabel: QUESTION_TYPES[q.type as QuestionTypeKey]?.label.split("—")[0] ?? q.type,
      type: q.type,
      difficultyLabel: DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty,
      difficulty: q.difficulty,
      points: Number(q.points),
      status: q.status,
      statusLabel: QUESTION_STATUS_LABELS[q.status] ?? q.status,
      isCritical: q.isCritical,
      tags: q.tags,
      appearances: apps,
      correctRate,
      answersCount: ag?.count ?? 0,
    };
  });

  const knownTags = Array.from(new Set(allTagsRaw.flatMap((q) => q.tags))).sort();

  const counts = {
    total: totalCount,
    approved: rows.filter((r) => r.status === "APPROVED").length,
    review: rows.filter((r) => r.status === "IN_REVIEW").length,
    draft: rows.filter((r) => r.status === "DRAFT").length,
  };

  return (
    <>
      <PageHeader
        title={bank.name}
        subtitle={`${bank.code} · ${bank.scheme?.name ?? "Sin esquema"} · v${bank.version}`}
        actions={
          <div className="flex gap-2">
            <Link href="/panel/preguntas" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Volver</Link>
            {canCreate ? (
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

      <Card className="p-5">
        <QuestionsTable bankId={bankId} rows={rows} knownTags={knownTags} canEdit={canEdit} canCreate={canCreate} />
      </Card>
    </>
  );
}
