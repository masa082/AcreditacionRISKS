import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";
import { EXAM_TYPE_LABELS, EXAM_MODALITY_LABELS, EXAM_STATUS_LABELS } from "@/lib/exam-meta";

export const metadata = { title: "Evaluaciones" };

const STATUS_TONE: Record<string, "slate" | "green" | "amber"> = {
  DRAFT: "slate", PUBLISHED: "green", ARCHIVED: "amber",
};

export default async function ExamsPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  const manage = can(ctx, PERMISSIONS.EXAM_MANAGE);

  const exams = await prisma.exam.findMany({
    where: { subscriberId },
    orderBy: { createdAt: "desc" },
    include: {
      scheme: { select: { name: true } },
      sections: { select: { bankId: true } },
      _count: { select: { sections: true } },
    },
  });

  // Stock real por examen: cuenta APPROVED en los bancos referenciados
  // por las secciones. Una sola query agrupada por bankId nos da el
  // total por banco para todos los exámenes; luego sumamos por examen
  // (sin doble-conteo si dos secciones comparten banco — usamos Set).
  const allBankIds = Array.from(
    new Set(exams.flatMap((e) => e.sections.map((s) => s.bankId).filter((b): b is string => !!b))),
  );
  const stocksByBank = allBankIds.length
    ? Object.fromEntries(
        (await prisma.question.groupBy({
          by: ["bankId"],
          where: { subscriberId, bankId: { in: allBankIds }, status: "APPROVED" },
          _count: { _all: true },
        })).map((r) => [r.bankId, r._count._all] as const),
      )
    : {};
  const realPoolByExam = new Map<string, number>();
  for (const e of exams) {
    const uniq = new Set(e.sections.map((s) => s.bankId).filter((b): b is string => !!b));
    let pool = 0;
    for (const bid of uniq) pool += stocksByBank[bid] ?? 0;
    realPoolByExam.set(e.id, pool);
  }

  return (
    <>
      <PageHeader
        title="Evaluaciones"
        subtitle="Arme exámenes con secciones, reglas de calificación y publicación."
        actions={manage ? (
          <Link href="/panel/evaluaciones/nuevo" className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white">+ Nueva evaluación</Link>
        ) : null}
      />

      {exams.length === 0 ? (
        <EmptyState>Aún no hay evaluaciones. Cree la primera y agregue secciones de preguntas.</EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Evaluación</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Modalidad</th>
                  <th className="px-5 py-3">Preguntas</th>
                  <th className="px-5 py-3">Aprob.</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.map((e) => {
                  const realPool = realPoolByExam.get(e.id) ?? 0;
                  // Servir-por-intento: min(maxQuestions, stockReal). Cuando
                  // el examen no tiene maxQuestions configurado, sirve todo.
                  const perAttempt = e.maxQuestions > 0
                    ? Math.min(e.maxQuestions, realPool || e.numQuestions)
                    : realPool || e.numQuestions;
                  return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{e.name}</div>
                      <div className="font-mono text-xs text-slate-400">{e.code} · {e.scheme?.name ?? "Sin esquema"}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{EXAM_TYPE_LABELS[e.type]}</td>
                    <td className="px-5 py-3 text-slate-600">{EXAM_MODALITY_LABELS[e.modality]}</td>
                    <td className="px-5 py-3 text-slate-600">
                      <div>
                        <b className="text-brand-800">{perAttempt}</b>{" "}
                        <span className="text-xs text-slate-400">por intento</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        disponible en banco: <b>{realPool}</b> · {e._count.sections} secc.
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{Number(e.passingScore)}%</td>
                    <td className="px-5 py-3"><Badge tone={STATUS_TONE[e.status]}>{EXAM_STATUS_LABELS[e.status]}</Badge></td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/panel/evaluaciones/${e.id}`} className="text-sm font-medium text-brand-700 hover:underline">{manage ? "Configurar" : "Ver"}</Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
