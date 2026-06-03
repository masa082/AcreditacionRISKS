import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge, StatTile } from "@/components/ui";
import { ReferralPayForm } from "@/components/referral-pay-form";
import { REFERRAL_STATUS_LABEL } from "@/lib/referrals";
import { money, dateTime } from "@/lib/format";

export const metadata = { title: "Programa de referidos" };

const STATUS_TONE: Record<string, "amber" | "blue" | "green" | "slate" | "red"> = {
  PENDING: "amber",
  CONFIRMED: "blue",
  PAID: "green",
  CANCELLED: "slate",
};

export default async function PanelReferralsPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.REFERRAL_VIEW) && !can(ctx, PERMISSIONS.REFERRAL_MANAGE)) {
    redirect("/panel");
  }
  const canManage = can(ctx, PERMISSIONS.REFERRAL_MANAGE);

  const [referrers, referrals] = await Promise.all([
    prisma.referrer.findMany({
      where: { OR: [{ subscriberId }, { subscriberId: null }] },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referral.findMany({
      where: { OR: [{ subscriberId }, { subscriberId: null }] },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        referrer: { select: { fullName: true, email: true, code: true, bankAccountInfo: true } },
        candidate: { select: { firstName: true, lastName: true, email: true } },
        enrollment: { select: { code: true } },
      },
    }),
  ]);

  const counts = {
    referrers: referrers.length,
    pending: referrals.filter((r) => r.status === "PENDING").length,
    confirmed: referrals.filter((r) => r.status === "CONFIRMED").length,
    paid: referrals.filter((r) => r.status === "PAID").length,
  };
  const owedAmount = referrals
    .filter((r) => r.status === "CONFIRMED")
    .reduce((acc, r) => acc + Number((r.rewardAmount ?? "0").toString()), 0);

  return (
    <>
      <PageHeader
        title="Programa de referidos"
        subtitle="Referidores registrados y referidos pendientes/confirmados/pagados. Apruebe el pago de recompensas cuando realice la transferencia al referidor."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatTile label="Referidores activos" value={counts.referrers} />
        <StatTile label="Pendientes" value={counts.pending} tone={counts.pending ? "warn" : "default"} />
        <StatTile label="A pagar (confirmados)" value={counts.confirmed} tone={counts.confirmed ? "warn" : "default"} />
        <StatTile label="Recompensas pagadas" value={counts.paid} tone="good" />
      </div>

      {owedAmount > 0 ? (
        <Card className="mb-6 border-l-4 border-l-amber-500 bg-amber-50/40 p-5">
          <p className="text-sm font-semibold text-amber-900">
            Tiene <strong>{money(owedAmount, "COP")}</strong> en recompensas pendientes de pagar a referidores.
          </p>
        </Card>
      ) : null}

      <Card className="mb-6">
        <div className="border-b border-slate-200 px-5 py-3"><h2 className="font-semibold text-slate-900">Referidores</h2></div>
        <div className="p-5">
          {referrers.length === 0 ? (
            <EmptyState>Aún no hay referidores registrados.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {referrers.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900">{r.fullName}</span>
                      <span className="ml-2 text-xs text-slate-500">{r.email}</span>
                      <span className="ml-3 font-mono text-xs text-brand-800">CÓDIGO: {r.code}</span>
                    </div>
                    <Badge tone={r.status === "ACTIVE" ? "green" : "slate"}>{r.status}</Badge>
                  </div>
                  {r.bankAccountInfo ? <p className="mt-1 text-xs text-slate-500">Cuenta: {r.bankAccountInfo}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-3"><h2 className="font-semibold text-slate-900">Referidos</h2></div>
        <div className="p-5">
          {referrals.length === 0 ? (
            <EmptyState>Aún no hay referidos registrados.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {referrals.map((r) => {
                const tone = STATUS_TONE[r.status] ?? "slate";
                const candidateName = r.candidate ? `${r.candidate.firstName} ${r.candidate.lastName}` : "Candidato";
                return (
                  <li key={r.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900">{candidateName}</span>
                        <span className="ml-2 text-xs text-slate-500">referido por <strong>{r.referrer.fullName}</strong> ({r.referrer.email})</span>
                      </div>
                      <Badge tone={tone}>{REFERRAL_STATUS_LABEL[r.status] ?? r.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Folio {r.enrollment?.code ?? "—"} · Código {r.referrer.code} ·
                      Recompensa: <strong className="text-slate-800">{r.rewardAmount ? money(r.rewardAmount, r.currency) : "—"}</strong>
                      {r.confirmedAt ? <> · Confirmado: {dateTime(r.confirmedAt)}</> : null}
                      {r.paidAt ? <> · Pagado: {dateTime(r.paidAt)}</> : null}
                    </div>
                    {r.referrer.bankAccountInfo ? <p className="mt-1 text-xs text-slate-500">Cuenta: {r.referrer.bankAccountInfo}</p> : null}
                    {canManage && r.status === "CONFIRMED" ? <ReferralPayForm referralId={r.id} /> : null}
                    {r.notes ? <p className="mt-1 text-xs text-slate-500"><strong>Notas:</strong> {r.notes}</p> : null}
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
