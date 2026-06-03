import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge, StatTile } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { dateOnly } from "@/lib/format";
import { startRecertification } from "@/lib/actions/renewals";

export const metadata = { title: "Vencimientos" };

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function ExpiriesPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.RENEWAL_MANAGE)) redirect("/panel");

  const now = new Date();
  const horizon = new Date(now.getTime() + 180 * DAY_MS);

  const certs = await prisma.certificate.findMany({
    where: { subscriberId, type: "CERTIFICATION", expiresAt: { not: null } },
    orderBy: { expiresAt: "asc" },
    include: {
      candidate: { select: { firstName: true, lastName: true } },
      scheme: { select: { name: true } },
    },
  });

  const expiring = certs.filter(
    (c) => c.status === "VALID" && c.expiresAt && c.expiresAt >= now && c.expiresAt <= horizon,
  );
  const expired = certs.filter(
    (c) => c.status === "EXPIRED" || (c.expiresAt != null && c.expiresAt < now),
  );

  return (
    <>
      <PageHeader
        title="Vencimientos"
        subtitle="Gestione los certificados próximos a vencer y los procesos de recertificación."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile label="Por vencer (180 días)" value={expiring.length} tone="warn" />
        <StatTile label="Vencidos" value={expired.length} tone="danger" />
      </div>

      <Card className="mb-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Por vencer ({expiring.length})</h2>
        </div>
        <div className="p-5">
          {expiring.length === 0 ? (
            <EmptyState>No hay certificados próximos a vencer en los próximos 180 días.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-4 font-medium">Titular</th>
                    <th className="py-2 pr-4 font-medium">Esquema</th>
                    <th className="py-2 pr-4 font-medium">Código</th>
                    <th className="py-2 pr-4 font-medium">Vence</th>
                    <th className="py-2 pr-4 font-medium">Días restantes</th>
                    <th className="py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiring.map((c) => {
                    const daysLeft = Math.ceil((c.expiresAt!.getTime() - now.getTime()) / DAY_MS);
                    return (
                      <tr key={c.id}>
                        <td className="py-3 pr-4 text-slate-700">
                          {c.candidate.firstName} {c.candidate.lastName}
                        </td>
                        <td className="py-3 pr-4 text-slate-500">{c.scheme?.name ?? "—"}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-600">{c.code}</td>
                        <td className="py-3 pr-4 text-slate-500">{dateOnly(c.expiresAt!)}</td>
                        <td className="py-3 pr-4">
                          <Badge tone={daysLeft <= 30 ? "red" : "amber"}>{daysLeft} día(s)</Badge>
                        </td>
                        <td className="py-3">
                          <form action={startRecertification.bind(null, c.id)}>
                            <SubmitButton pendingText="Iniciando…">Iniciar recertificación</SubmitButton>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Vencidos ({expired.length})</h2>
        </div>
        <div className="p-5">
          {expired.length === 0 ? (
            <EmptyState>No hay certificados vencidos.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-4 font-medium">Titular</th>
                    <th className="py-2 pr-4 font-medium">Esquema</th>
                    <th className="py-2 pr-4 font-medium">Código</th>
                    <th className="py-2 pr-4 font-medium">Venció</th>
                    <th className="py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expired.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 pr-4 text-slate-700">
                        {c.candidate.firstName} {c.candidate.lastName}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{c.scheme?.name ?? "—"}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{c.code}</td>
                      <td className="py-3 pr-4 text-slate-500">
                        {c.expiresAt ? dateOnly(c.expiresAt) : "—"}
                      </td>
                      <td className="py-3">
                        <form action={startRecertification.bind(null, c.id)}>
                          <SubmitButton pendingText="Iniciando…">Iniciar recertificación</SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
