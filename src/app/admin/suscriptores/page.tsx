import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { SubscriberForm } from "@/components/subscriber-form";
import { SubscribersTable, type SubscriberRow } from "@/components/subscribers-table";

export const metadata = { title: "Suscriptores" };

export default async function SubscribersPage() {
  const [subs, plans] = await Promise.all([
    prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plan: { select: { id: true, name: true } },
        _count: { select: { users: true, candidates: true, certificates: true } },
      },
    }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceMonthly: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows: SubscriberRow[] = subs.map((s) => ({
    id: s.id,
    slug: s.slug,
    legalName: s.legalName,
    tradeName: s.tradeName,
    status: s.status,
    planId: s.plan?.id ?? null,
    planName: s.plan?.name ?? null,
    createdAtISO: s.createdAt.toISOString(),
    users: s._count.users,
    candidates: s._count.candidates,
    certificates: s._count.certificates,
  }));

  return (
    <>
      <PageHeader title="Suscriptores" subtitle={`${subs.length} organización(es) en la plataforma.`} />

      <Card className="mb-6">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Nuevo suscriptor</h2></div>
        <div className="p-6">
          <SubscriberForm plans={plans} />
        </div>
      </Card>

      <Card>
        <SubscribersTable subs={rows} plans={plans} />
      </Card>
    </>
  );
}
