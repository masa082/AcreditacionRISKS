import Link from "next/link";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { startEnrollment } from "@/lib/actions/enrollment";
import { money, dateOnly } from "@/lib/format";

export const metadata = { title: "Evaluaciones disponibles" };

const MODALITY_ES: Record<string, string> = {
  ONLINE: "En línea",
  ONSITE: "Presencial",
  HYBRID: "Híbrida",
};

export default async function AvailableExamsPage() {
  const { subscriberId, candidateId } = await requireCandidatePage();
  const now = new Date();

  const [exams, activeEnrollments] = await Promise.all([
    prisma.exam.findMany({
      where: {
        subscriberId,
        status: "PUBLISHED",
        OR: [{ availableTo: null }, { availableTo: { gte: now } }],
      },
      orderBy: { name: "asc" },
      include: { scheme: { select: { id: true, name: true } } },
    }),
    prisma.enrollment.findMany({
      where: { candidateId, status: { notIn: ["CANCELLED", "REJECTED", "EXPIRED"] } },
      select: { id: true, examId: true },
    }),
  ]);

  const enrolledByExam = new Map(activeEnrollments.map((e) => [e.examId, e.id]));

  // Tarifas por esquema (inscripción + examen) para mostrar el costo estimado.
  const schemeIds = [...new Set(exams.map((e) => e.schemeId).filter(Boolean))] as string[];
  const fees = schemeIds.length
    ? await prisma.feeConfig.findMany({
        where: { subscriberId, schemeId: { in: schemeIds }, isActive: true, concept: { in: ["ENROLLMENT", "EXAM"] } },
      })
    : [];
  const feeBySchemeTotal = new Map<string, { total: number; currency: string }>();
  for (const f of fees) {
    if (!f.schemeId) continue;
    const cur = feeBySchemeTotal.get(f.schemeId) ?? { total: 0, currency: f.currency };
    cur.total += Number(f.amount.toString());
    feeBySchemeTotal.set(f.schemeId, cur);
  }

  return (
    <>
      <PageHeader
        title="Evaluaciones disponibles"
        subtitle="Seleccione una evaluación para iniciar su proceso de inscripción."
      />

      {exams.length === 0 ? (
        <EmptyState>
          No hay evaluaciones publicadas en este momento. Vuelva más tarde o
          contacte a la entidad certificadora.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => {
            const enrolledId = enrolledByExam.get(exam.id);
            const fee = exam.schemeId ? feeBySchemeTotal.get(exam.schemeId) : undefined;
            return (
              <Card key={exam.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">{exam.name}</h3>
                  <Badge tone="blue">{MODALITY_ES[exam.modality]}</Badge>
                </div>
                {exam.scheme ? (
                  <p className="mt-1 text-xs text-slate-400">{exam.scheme.name}</p>
                ) : null}
                {exam.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">{exam.description}</p>
                ) : null}

                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div><dt className="text-slate-400">Duración</dt><dd className="font-medium text-slate-700">{exam.durationMin} min</dd></div>
                  <div><dt className="text-slate-400">Aprobación</dt><dd className="font-medium text-slate-700">{Number(exam.passingScore.toString())}%</dd></div>
                  <div><dt className="text-slate-400">Intentos</dt><dd className="font-medium text-slate-700">{exam.attemptsAllowed}</dd></div>
                  <div><dt className="text-slate-400">Costo</dt><dd className="font-medium text-slate-700">{fee && fee.total > 0 ? money(fee.total, fee.currency) : "Sin costo"}</dd></div>
                </dl>

                {exam.availableTo ? (
                  <p className="mt-3 text-xs text-amber-600">Inscripciones hasta {dateOnly(exam.availableTo)}</p>
                ) : null}

                <div className="mt-4 flex-1" />
                {enrolledId ? (
                  <Link
                    href={`/portal/inscripcion/${enrolledId}`}
                    className="rounded-lg border border-brand-300 px-4 py-2 text-center text-sm font-semibold text-brand-800 hover:bg-brand-50"
                  >
                    Continuar inscripción
                  </Link>
                ) : (
                  <form action={startEnrollment.bind(null, exam.id)}>
                    <SubmitButton pendingText="Inscribiendo…">Inscribirme</SubmitButton>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
