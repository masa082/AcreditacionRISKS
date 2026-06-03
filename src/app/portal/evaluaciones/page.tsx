import Link from "next/link";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { startEnrollment } from "@/lib/actions/enrollment";
import { money, dateOnly } from "@/lib/format";

export const metadata = { title: "Programas de certificación disponibles" };

const MODALITY_ES: Record<string, string> = {
  ONLINE: "En línea",
  ONSITE: "Presencial",
  HYBRID: "Híbrida",
};

interface ExamRow {
  id: string;
  name: string;
  durationMin: number;
  passingScore: { toString(): string };
  attemptsAllowed: number;
  modality: string;
  availableTo: Date | null;
  description: string | null;
  schemeId: string | null;
}

interface SchemeGroup {
  schemeId: string;
  schemeName: string;
  scope: string | null;
  validityMonths: number;
  normReference: string | null;
  exams: ExamRow[];
  feeTotal: number;
  feeCurrency: string;
}

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
      include: {
        scheme: { select: { id: true, name: true, scope: true, validityMonths: true, normReference: true } },
      },
    }),
    prisma.enrollment.findMany({
      where: { candidateId, status: { notIn: ["CANCELLED", "REJECTED", "EXPIRED"] } },
      select: { id: true, examId: true, schemeId: true, status: true },
    }),
  ]);

  // Mapa examen → inscripción activa, y conjunto de esquemas con inscripción activa.
  const enrolledByExam = new Map<string, string>();
  const enrolledSchemes = new Set<string>();
  for (const e of activeEnrollments) {
    if (e.examId) enrolledByExam.set(e.examId, e.id);
    if (e.schemeId) enrolledSchemes.add(e.schemeId);
  }

  const schemeIds = Array.from(new Set(exams.map((e) => e.schemeId).filter((x): x is string => !!x)));
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

  // Agrupar exámenes publicados por esquema.
  const groups = new Map<string, SchemeGroup>();
  const orphanExams: ExamRow[] = [];
  for (const e of exams) {
    const row: ExamRow = {
      id: e.id,
      name: e.name,
      durationMin: e.durationMin,
      passingScore: e.passingScore,
      attemptsAllowed: e.attemptsAllowed,
      modality: e.modality,
      availableTo: e.availableTo,
      description: e.description,
      schemeId: e.schemeId,
    };
    if (!e.schemeId || !e.scheme) {
      orphanExams.push(row);
      continue;
    }
    const g = groups.get(e.schemeId) ?? {
      schemeId: e.scheme.id,
      schemeName: e.scheme.name,
      scope: e.scheme.scope,
      validityMonths: e.scheme.validityMonths,
      normReference: e.scheme.normReference,
      exams: [],
      feeTotal: feeBySchemeTotal.get(e.scheme.id)?.total ?? 0,
      feeCurrency: feeBySchemeTotal.get(e.scheme.id)?.currency ?? "COP",
    };
    g.exams.push(row);
    groups.set(e.schemeId, g);
  }
  const schemeList = Array.from(groups.values()).sort((a, b) => a.schemeName.localeCompare(b.schemeName));

  return (
    <>
      <PageHeader
        title="Programas de certificación disponibles"
        subtitle="Cada programa incluye dos evaluaciones (Caso Práctico y Examen Teórico) que culminan en una certificación profesional verificable."
      />

      {schemeList.length === 0 && orphanExams.length === 0 ? (
        <EmptyState>
          No hay programas publicados en este momento. Vuelva más tarde o contacte a la entidad certificadora.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {schemeList.map((g) => (
            <ProgramCard
              key={g.schemeId}
              group={g}
              enrolledByExam={enrolledByExam}
              enrolledSchemes={enrolledSchemes}
            />
          ))}
          {orphanExams.map((e) => (
            <Card key={e.id} className="p-5">
              <h3 className="font-semibold text-slate-900">{e.name}</h3>
              <Badge tone="amber">Sin programa asignado</Badge>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function ProgramCard({
  group,
  enrolledByExam,
  enrolledSchemes,
}: {
  group: SchemeGroup;
  enrolledByExam: Map<string, string>;
  enrolledSchemes: Set<string>;
}) {
  const years = Math.round(group.validityMonths / 12);
  const yearsLabel = `${years} ${years === 1 ? "año" : "años"}`;
  const inProgress = enrolledSchemes.has(group.schemeId);
  // Mostrar primero el Examen Teórico, luego el Caso Práctico (orden pedagógico).
  const examOrder = [...group.exams].sort((a, b) => {
    const w = (n: string) => (/teórico/i.test(n) ? 0 : /caso/i.test(n) ? 1 : 2);
    return w(a.name) - w(b.name) || a.name.localeCompare(b.name);
  });

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">{group.schemeName}</h2>
            {inProgress ? <Badge tone="green">Inscrito</Badge> : null}
          </div>
          {group.scope ? <p className="mt-2 text-sm text-slate-600">{group.scope}</p> : null}
          {group.normReference ? <p className="mt-2 text-xs italic text-slate-400">Referencia: {group.normReference}</p> : null}
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Incluye {group.exams.length} evaluaciones:
          </p>
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            {examOrder.map((e) => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-800">✓</span>
                <span>
                  <strong className="text-slate-800">{e.name}</strong>
                  <span className="ml-2 text-xs text-slate-400">
                    {e.durationMin} min · Aprobación {Number(e.passingScore.toString())}% · {MODALITY_ES[e.modality] ?? e.modality}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900 ring-1 ring-brand-100">
            Al aprobar ambas evaluaciones, recibirá el <strong>Certificado de Competencias</strong> con vigencia de {yearsLabel} y verificación pública por QR.
          </p>
        </div>

        <aside className="rounded-2xl bg-slate-50 p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500">Costo del programa</div>
          <div className="mt-1 text-2xl font-bold text-brand-800">
            {group.feeTotal > 0 ? money(group.feeTotal, group.feeCurrency) : "Sin costo"}
          </div>
          <div className="text-[11px] text-slate-500">+ IVA · pago único por el programa</div>
          <dl className="mt-5 space-y-2 text-xs text-slate-500">
            <div className="flex justify-between"><dt>Vigencia</dt><dd className="font-semibold text-slate-700">{yearsLabel}</dd></div>
            <div className="flex justify-between"><dt>Evaluaciones</dt><dd className="font-semibold text-slate-700">{group.exams.length}</dd></div>
            <div className="flex justify-between"><dt>Modalidad</dt><dd className="font-semibold text-slate-700">En línea</dd></div>
          </dl>
          <div className="mt-5 space-y-2">
            {examOrder.map((e) => {
              const enrolledId = enrolledByExam.get(e.id);
              const isTeor = /teórico/i.test(e.name);
              const label = isTeor ? "Examen Teórico" : /caso/i.test(e.name) ? "Caso Práctico" : e.name;
              const earliestClose = e.availableTo ? `Cierra ${dateOnly(e.availableTo)}` : null;
              return (
                <div key={e.id}>
                  {enrolledId ? (
                    <Link
                      href={`/portal/inscripcion/${enrolledId}`}
                      className="block rounded-lg border border-brand-300 px-3 py-2 text-center text-sm font-semibold text-brand-800 hover:bg-brand-50"
                    >
                      Continuar · {label}
                    </Link>
                  ) : (
                    <form action={startEnrollment.bind(null, e.id)}>
                      <SubmitButton pendingText="Inscribiendo…">Inscribirme · {label}</SubmitButton>
                    </form>
                  )}
                  {earliestClose ? <p className="mt-1 text-center text-[10px] text-amber-600">{earliestClose}</p> : null}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-[10px] text-slate-400">
            La primera inscripción cubre el costo del programa. La segunda evaluación queda <strong>sin costo adicional</strong>.
          </p>
        </aside>
      </div>
    </Card>
  );
}
