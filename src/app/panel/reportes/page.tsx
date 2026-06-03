import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, StatTile } from "@/components/ui";
import { money } from "@/lib/format";

export const metadata = { title: "Reportes" };

/// Tarjetas de descarga: cada una apunta al endpoint CSV correspondiente.
const REPORTS: { type: string; label: string; description: string }[] = [
  {
    type: "candidatos",
    label: "Candidatos",
    description: "Datos de contacto e identificación de los candidatos.",
  },
  {
    type: "inscripciones",
    label: "Inscripciones",
    description: "Folios, candidato, examen, tipo y estado de cada inscripción.",
  },
  {
    type: "pagos",
    label: "Pagos",
    description: "Conceptos, montos, moneda y estado de los pagos.",
  },
  {
    type: "certificados",
    label: "Certificados",
    description: "Códigos, titulares, estado y vigencia de los certificados.",
  },
  {
    type: "evaluaciones",
    label: "Evaluaciones",
    description: "Catálogo de exámenes con su configuración principal.",
  },
];

export default async function ReportesPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.REPORT_VIEW)) redirect("/panel");

  const [
    candidates,
    enrollments,
    approvedPayments,
    revenueAgg,
    validCertificates,
    exams,
  ] = await Promise.all([
    prisma.candidate.count({ where: { subscriberId } }),
    prisma.enrollment.count({ where: { subscriberId } }),
    prisma.payment.count({ where: { subscriberId, status: "APPROVED" } }),
    prisma.payment.aggregate({
      where: { subscriberId, status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.certificate.count({ where: { subscriberId, status: "VALID" } }),
    prisma.exam.count({ where: { subscriberId } }),
  ]);

  const revenue = revenueAgg._sum.amount ?? 0;

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle="Indicadores de su organización y exportación de datos en CSV."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Candidatos" value={candidates} />
        <StatTile label="Inscripciones" value={enrollments} />
        <StatTile
          label="Pagos aprobados"
          value={approvedPayments}
          hint={money(revenue)}
          tone="good"
        />
        <StatTile label="Certificados vigentes" value={validCertificates} tone="good" />
        <StatTile label="Evaluaciones" value={exams} />
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Exportar a CSV</h2>
        </div>
        <div className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REPORTS.map((r) => (
              <div
                key={r.type}
                className="flex flex-col justify-between rounded-xl border border-slate-200 p-4"
              >
                <div>
                  <div className="font-medium text-slate-800">{r.label}</div>
                  <p className="mt-1 text-xs text-slate-500">{r.description}</p>
                </div>
                <a
                  href={`/api/reportes/${r.type}`}
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-800"
                >
                  Descargar CSV
                </a>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}
