import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge, StatTile } from "@/components/ui";
import { PaymentApproveForm, PaymentRejectForm } from "@/components/payment-review-forms";
import { money, dateTime } from "@/lib/format";

export const metadata = { title: "Pagos recibidos" };

const STATUS_TONE: Record<string, "amber" | "green" | "red" | "slate" | "blue"> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  EXPIRED: "slate",
  REFUNDED: "blue",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente de verificación",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  EXPIRED: "Vencido",
  REFUNDED: "Reembolsado",
};

export default async function PaymentsPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.PAYMENT_VIEW) && !can(ctx, PERMISSIONS.PAYMENT_MANAGE)) {
    redirect("/panel");
  }
  const canManage = can(ctx, PERMISSIONS.PAYMENT_MANAGE);

  const payments = await prisma.payment.findMany({
    where: { subscriberId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      enrollment: {
        select: {
          id: true,
          code: true,
          candidate: { select: { firstName: true, lastName: true, documentNumber: true } },
          scheme: { select: { name: true } },
          exam: { select: { name: true } },
        },
      },
    },
  });
  const pending = payments.filter((p) => p.status === "PENDING").length;
  const approved = payments.filter((p) => p.status === "APPROVED").length;
  const rejected = payments.filter((p) => p.status === "REJECTED").length;

  return (
    <>
      <PageHeader
        title="Pagos recibidos"
        subtitle="Verifique y apruebe los pagos pendientes que los candidatos reportan tras una transferencia o consignación. Cuando se conecte una pasarela automática (Wompi/PayU), los webhooks aprobarán estos pagos por ti."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatTile label="Pendientes de verificar" value={pending} tone={pending ? "warn" : "default"} />
        <StatTile label="Aprobados" value={approved} tone="good" />
        <StatTile label="Rechazados" value={rejected} tone={rejected ? "danger" : "default"} />
        <StatTile label="Total" value={payments.length} />
      </div>

      {pending > 0 ? (
        <Card className="mb-6 border-l-4 border-l-amber-500 bg-amber-50/40 p-5">
          <p className="text-sm font-semibold text-amber-900">
            Hay {pending} pago(s) en cola esperando que verifique el comprobante y los apruebe.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Mientras un pago esté pendiente, el candidato no puede continuar al examen.
          </p>
        </Card>
      ) : null}

      <Card>
        <div className="p-5">
          {payments.length === 0 ? (
            <EmptyState>Aún no hay pagos registrados.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.map((p) => {
                const tone = STATUS_TONE[p.status] ?? "slate";
                const enr = p.enrollment;
                const candidateName = enr?.candidate
                  ? `${enr.candidate.firstName} ${enr.candidate.lastName}`
                  : "Candidato";
                const scheme = enr?.exam?.name ?? enr?.scheme?.name ?? "";
                return (
                  <li key={p.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900">{candidateName}</span>
                        {enr?.candidate?.documentNumber ? (
                          <span className="ml-2 text-xs text-slate-500">CC {enr.candidate.documentNumber}</span>
                        ) : null}
                        <span className="ml-2 text-xs text-slate-400">
                          {p.description ?? "Pago"} · {dateTime(p.createdAt)}
                        </span>
                      </div>
                      <Badge tone={tone}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      <strong className="text-slate-800">{money(p.amount, p.currency)}</strong> + IVA
                      {scheme ? <> · {scheme}</> : null}
                      {enr?.code ? <> · Folio {enr.code}</> : null}
                      {p.providerRef ? <> · Ref. {p.providerRef}</> : null}
                      {p.provider ? <> · Proveedor: {p.provider}</> : null}
                    </div>
                    {canManage && p.status === "PENDING" ? (
                      <>
                        <PaymentApproveForm paymentId={p.id} defaultRef={p.providerRef} />
                        <PaymentRejectForm paymentId={p.id} />
                      </>
                    ) : null}
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
