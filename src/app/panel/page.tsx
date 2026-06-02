import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { StatTile, PageHeader, Card } from "@/components/ui";

export const metadata = { title: "Panel del suscriptor" };

export default async function SubscriberDashboard() {
  const { subscriberId } = await requireSubscriberPage();
  const soon = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const [
    subscriber,
    candidates,
    pendingPayment,
    scheduled,
    attemptsTaken,
    pendingGrading,
    certsIssued,
    certsExpiring,
    activeExams,
    questionsCreated,
    questionsInReview,
    pendingAppeals,
    schemes,
    revenueAgg,
  ] = await Promise.all([
    prisma.subscriber.findUnique({ where: { id: subscriberId }, include: { plan: true } }),
    prisma.candidate.count({ where: { subscriberId } }),
    prisma.enrollment.count({ where: { subscriberId, status: "PAYMENT_PENDING" } }),
    prisma.scheduleBooking.count({ where: { enrollment: { subscriberId }, status: { in: ["BOOKED", "CONFIRMED"] } } }),
    prisma.examAttempt.count({ where: { subscriberId, status: { in: ["SUBMITTED", "GRADED", "PASSED", "FAILED", "PENDING_COMMITTEE"] } } }),
    prisma.examAttempt.count({ where: { subscriberId, status: { in: ["SUBMITTED", "MANUAL_GRADING"] } } }),
    prisma.certificate.count({ where: { subscriberId, type: "CERTIFICATION" } }),
    prisma.certificate.count({ where: { subscriberId, status: "VALID", expiresAt: { lte: soon, gte: new Date() } } }),
    prisma.exam.count({ where: { subscriberId, status: "PUBLISHED" } }),
    prisma.question.count({ where: { subscriberId } }),
    prisma.question.count({ where: { subscriberId, status: "IN_REVIEW" } }),
    prisma.appeal.count({ where: { subscriberId, status: { in: ["OPEN", "IN_REVIEW"] } } }),
    prisma.certificationScheme.count({ where: { subscriberId } }),
    prisma.payment.aggregate({ where: { subscriberId, status: "APPROVED" }, _sum: { amount: true } }),
  ]);

  const revenue = revenueAgg._sum.amount ?? 0;
  const orgName = subscriber?.tradeName ?? subscriber?.legalName ?? "Suscriptor";

  return (
    <>
      <PageHeader
        title={`Panel de ${orgName}`}
        subtitle={`Plan ${subscriber?.plan?.name ?? "—"} · operación de certificación`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Candidatos" value={candidates} />
        <StatTile label="Pendientes de pago" value={pendingPayment} tone={pendingPayment ? "warn" : "default"} />
        <StatTile label="Pruebas agendadas" value={scheduled} />
        <StatTile label="Pruebas presentadas" value={attemptsTaken} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Pend. de calificación" value={pendingGrading} tone={pendingGrading ? "warn" : "default"} />
        <StatTile label="Certificados emitidos" value={certsIssued} tone="good" />
        <StatTile label="Por vencer (90 días)" value={certsExpiring} tone={certsExpiring ? "warn" : "default"} />
        <StatTile label="Apelaciones abiertas" value={pendingAppeals} tone={pendingAppeals ? "danger" : "default"} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Esquemas" value={schemes} />
        <StatTile label="Evaluaciones activas" value={activeExams} />
        <StatTile label="Preguntas creadas" value={questionsCreated} />
        <StatTile label="Preguntas en revisión" value={questionsInReview} tone={questionsInReview ? "warn" : "default"} />
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-semibold text-slate-900">Accesos rápidos</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/panel/esquemas" className="rounded-lg border border-slate-200 p-4 hover:border-brand-300 hover:bg-brand-50">
            <div className="font-medium text-brand-800">Esquemas de certificación</div>
            <div className="mt-1 text-xs text-slate-500">Defina alcances, vigencias y normas.</div>
          </Link>
          <Link href="/panel/preguntas" className="rounded-lg border border-slate-200 p-4 hover:border-brand-300 hover:bg-brand-50">
            <div className="font-medium text-brand-800">Banco de preguntas</div>
            <div className="mt-1 text-xs text-slate-500">10 tipos, revisión y aprobación.</div>
          </Link>
          <Link href="/panel/evaluaciones" className="rounded-lg border border-slate-200 p-4 hover:border-brand-300 hover:bg-brand-50">
            <div className="font-medium text-brand-800">Evaluaciones</div>
            <div className="mt-1 text-xs text-slate-500">Arme exámenes con secciones y reglas.</div>
          </Link>
        </div>
        <div className="mt-4 text-sm text-slate-500">
          Ingresos por pagos aprobados:{" "}
          <span className="font-semibold text-emerald-600">
            ${Number(revenue).toLocaleString("es-CO")} COP
          </span>
        </div>
      </Card>
    </>
  );
}
