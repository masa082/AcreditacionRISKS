import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { CompetencyForm, TopicForm } from "@/components/clasificacion-forms";

export const metadata = { title: "Competencias y temas" };

export default async function ClasificacionPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  const create = can(ctx, PERMISSIONS.QUESTION_CREATE);

  const [competencies, topics] = await Promise.all([
    prisma.competency.findMany({
      where: { subscriberId },
      orderBy: { code: "asc" },
      include: { _count: { select: { questions: true, topics: true } } },
    }),
    prisma.topic.findMany({
      where: { subscriberId },
      orderBy: { code: "asc" },
      include: { competency: { select: { code: true } }, _count: { select: { questions: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Competencias y temas"
        subtitle="Clasificación para preguntas y reglas de selección de exámenes."
        actions={<Link href="/panel/preguntas" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Volver</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 font-semibold text-slate-900">Competencias</h3>
            {competencies.length === 0 ? (
              <EmptyState>Sin competencias.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {competencies.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span><span className="font-mono text-slate-400">{c.code}</span> · {c.name}</span>
                    <span className="text-xs text-slate-400">{c._count.questions} preg · {c._count.topics} temas</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {create ? <Card className="p-5"><CompetencyForm /></Card> : null}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="mb-3 font-semibold text-slate-900">Temas</h3>
            {topics.length === 0 ? (
              <EmptyState>Sin temas.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {topics.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                    <span><span className="font-mono text-slate-400">{t.code}</span> · {t.name} {t.competency ? <span className="text-xs text-slate-400">({t.competency.code})</span> : null}</span>
                    <span className="text-xs text-slate-400">{t._count.questions} preg</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {create ? <Card className="p-5"><TopicForm competencies={competencies.map((c) => ({ id: c.id, code: c.code, name: c.name }))} /></Card> : null}
        </div>
      </div>
    </>
  );
}
