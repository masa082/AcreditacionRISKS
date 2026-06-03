import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { AppealForm } from "@/components/appeal-form";
import { APPEAL_TYPE_LABELS } from "@/lib/appeals";
import { dateOnly } from "@/lib/format";

export const metadata = { title: "Apelaciones y solicitudes" };

const STATUS: Record<string, { label: string; tone: "amber" | "blue" | "green" | "red" }> = {
  OPEN: { label: "Abierto", tone: "amber" },
  IN_REVIEW: { label: "En revisión", tone: "blue" },
  RESOLVED: { label: "Resuelto", tone: "green" },
  REJECTED: { label: "No procedente", tone: "red" },
};

export default async function CandidateAppealsPage() {
  const { candidateId } = await requireCandidatePage();
  const [appeals, enrollments] = await Promise.all([
    prisma.appeal.findMany({ where: { candidateId }, orderBy: { createdAt: "desc" } }),
    prisma.enrollment.findMany({
      where: { candidateId },
      orderBy: { createdAt: "desc" },
      include: { exam: { select: { name: true } }, scheme: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader title="Apelaciones y solicitudes" subtitle="Presente apelaciones, quejas, solicitudes o correcciones sobre su proceso." />

      <Card className="mb-6">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Nuevo caso</h2></div>
        <div className="p-6">
          <AppealForm enrollments={enrollments.map((e) => ({ id: e.id, label: `${e.exam?.name ?? e.scheme?.name ?? "Proceso"} (${e.code})` }))} />
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Mis casos</h2></div>
        <div className="p-5">
          {appeals.length === 0 ? (
            <EmptyState>No tiene casos registrados.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {appeals.map((a) => {
                const st = STATUS[a.status] ?? STATUS.OPEN;
                return (
                  <li key={a.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="font-medium text-slate-800">{a.subject}</span>
                        <span className="ml-2 text-xs text-slate-400">{APPEAL_TYPE_LABELS[a.type]} · {dateOnly(a.createdAt)}</span>
                      </div>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{a.body}</p>
                    {a.resolution ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><strong>Respuesta:</strong> {a.resolution}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
