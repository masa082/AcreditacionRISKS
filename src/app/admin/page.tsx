import { prisma } from "@/lib/prisma";
import { Card, StatTile, PageHeader, Badge } from "@/components/ui";

export const metadata = { title: "Panel de plataforma" };

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "slate"> = {
  ACTIVE: "green",
  TRIAL: "amber",
  SUSPENDED: "red",
  CANCELLED: "slate",
};

export default async function AdminDashboard() {
  const [
    totalSubs,
    activeSubs,
    suspendedSubs,
    trialSubs,
    totalUsers,
    totalCandidates,
    totalExams,
    totalCertificates,
    recentSubs,
    plans,
  ] = await Promise.all([
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { status: "ACTIVE" } }),
    prisma.subscriber.count({ where: { status: "SUSPENDED" } }),
    prisma.subscriber.count({ where: { status: "TRIAL" } }),
    prisma.user.count(),
    prisma.candidate.count(),
    prisma.exam.count(),
    prisma.certificate.count(),
    prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { plan: true, _count: { select: { users: true, candidates: true } } },
    }),
    prisma.plan.findMany({ orderBy: { priceMonthly: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Resumen de la plataforma"
        subtitle="Estado general del SaaS y de los suscriptores."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Suscriptores activos" value={activeSubs} hint={`${totalSubs} en total`} tone="good" />
        <StatTile label="En prueba (trial)" value={trialSubs} tone="warn" />
        <StatTile label="Suspendidos" value={suspendedSubs} tone={suspendedSubs ? "danger" : "default"} />
        <StatTile label="Planes configurados" value={plans.length} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Usuarios registrados" value={totalUsers} />
        <StatTile label="Candidatos" value={totalCandidates} />
        <StatTile label="Evaluaciones" value={totalExams} />
        <StatTile label="Certificados emitidos" value={totalCertificates} />
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Suscriptores recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Organización</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Usuarios</th>
                <th className="px-5 py-3">Candidatos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSubs.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{s.tradeName ?? s.legalName}</div>
                    <div className="text-xs text-slate-400">/{s.slug}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{s.plan?.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[s.status] ?? "slate"}>{s.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{s._count.users}</td>
                  <td className="px-5 py-3 text-slate-600">{s._count.candidates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
