import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { PaymentsToolbar } from "@/components/payments-toolbar";
import { PaymentRowActions } from "@/components/payment-row-actions";
import { money, dateTime } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Pagos recibidos" };

const STATUS_TONE: Record<string, "amber" | "green" | "red" | "slate" | "blue"> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
  EXPIRED: "slate",
  REFUNDED: "blue",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  EXPIRED: "Vencido",
  REFUNDED: "Reembolsado",
};

const PROVIDER_BADGE: Record<string, { label: string; cls: string; icon: string }> = {
  rapyd:    { label: "Rapyd",    cls: "bg-violet-50 text-violet-700 ring-violet-200", icon: "💳" },
  manual:   { label: "Manual",   cls: "bg-slate-100 text-slate-700 ring-slate-200",   icon: "🧾" },
  mock:     { label: "Mock",     cls: "bg-cyan-50 text-cyan-700 ring-cyan-200",       icon: "🧪" },
  internal: { label: "Interno",  cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: "🔁" },
};

interface PaymentMeta {
  rapyd?: {
    checkoutId?: string;
    redirectUrl?: string;
    env?: string;
    eventId?: string;
    type?: string;
    status?: string;
    failureCode?: string;
    failureMessage?: string;
    receivedAt?: string;
  };
  rapydError?: string;
}

function getRapydMeta(metadata: unknown): PaymentMeta["rapyd"] | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const m = metadata as PaymentMeta;
  return m.rapyd;
}

function tile(label: string, value: number, tone: "default" | "warn" | "good" | "danger" | "info" = "default") {
  const cls: Record<typeof tone, string> = {
    default: "border-slate-200 text-slate-900",
    warn: "border-amber-200 bg-amber-50/40 text-amber-900",
    good: "border-emerald-200 bg-emerald-50/40 text-emerald-900",
    danger: "border-rose-200 bg-rose-50/40 text-rose-900",
    info: "border-violet-200 bg-violet-50/40 text-violet-900",
  };
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${cls[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    provider?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.PAYMENT_VIEW) && !can(ctx, PERMISSIONS.PAYMENT_MANAGE)) {
    redirect("/panel");
  }
  const canManage = can(ctx, PERMISSIONS.PAYMENT_MANAGE);
  const sp = await searchParams;

  // Construcción del WHERE: tenant + filtros UI.
  const where: Prisma.PaymentWhereInput = { subscriberId };
  if (sp.status) where.status = sp.status as Prisma.PaymentWhereInput["status"];
  if (sp.provider) where.provider = sp.provider;
  if (sp.from || sp.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (sp.from) createdAt.gte = new Date(`${sp.from}T00:00:00`);
    if (sp.to)   createdAt.lte = new Date(`${sp.to}T23:59:59`);
    where.createdAt = createdAt;
  }
  // Búsqueda libre: documento, nombre del candidato, código de inscripción,
  // referencia del proveedor (Rapyd / banco).
  if (sp.q?.trim()) {
    const q = sp.q.trim();
    where.OR = [
      { providerRef: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { enrollment: { code: { contains: q, mode: "insensitive" } } },
      { enrollment: { candidate: { documentNumber: { contains: q, mode: "insensitive" } } } },
      { enrollment: { candidate: { firstName: { contains: q, mode: "insensitive" } } } },
      { enrollment: { candidate: { lastName: { contains: q, mode: "insensitive" } } } },
      { enrollment: { candidate: { email: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [payments, totalCount, statusGroups, sumAgg] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 500, // tope defensivo
      include: {
        enrollment: {
          select: {
            id: true,
            code: true,
            candidate: { select: { id: true, firstName: true, lastName: true, documentNumber: true, documentType: true, email: true } },
            scheme: { select: { name: true } },
            exam: { select: { name: true } },
          },
        },
      },
    }),
    prisma.payment.count({ where: { subscriberId } }),
    prisma.payment.groupBy({ by: ["status"], where: { subscriberId }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: { subscriberId, status: "APPROVED" }, _sum: { amount: true } }),
  ]);

  const byStatus = Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]));
  const pending = byStatus.PENDING ?? 0;
  const approved = byStatus.APPROVED ?? 0;
  const rejected = byStatus.REJECTED ?? 0;
  const revenue = Number(sumAgg._sum.amount ?? 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pagos recibidos"
        subtitle="Trazabilidad completa de los cobros: Rapyd, manual y otros proveedores. Use la búsqueda y los filtros para auditar el proceso de pago de cualquier candidato."
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {tile("Pendientes", pending, pending ? "warn" : "default")}
        {tile("Aprobados", approved, "good")}
        {tile("Rechazados", rejected, rejected ? "danger" : "default")}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Ingresos acumulados</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-900">
            {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(revenue)}
          </div>
          <div className="text-[10px] text-emerald-700">Suma de pagos aprobados (todos los tiempos)</div>
        </div>
      </div>

      <PaymentsToolbar totalCount={totalCount} filteredCount={payments.length} />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Candidato</th>
                <th className="px-4 py-3">Identificación</th>
                <th className="px-4 py-3">Concepto / Folio</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Proceso de pago</th>
                <th className="px-4 py-3">Fechas</th>
                {canManage ? <th className="px-4 py-3 text-right">Acciones</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="px-5 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-700">Sin pagos para el filtro aplicado.</p>
                    <p className="mt-1 text-xs text-slate-500">Ajuste la búsqueda o los filtros, o pulse <em>Limpiar</em>.</p>
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const enr = p.enrollment;
                  const candName = enr?.candidate
                    ? `${enr.candidate.firstName} ${enr.candidate.lastName}`
                    : "—";
                  const doc = enr?.candidate?.documentNumber;
                  const docType = enr?.candidate?.documentType ?? "CC";
                  const concept = p.description ?? enr?.exam?.name ?? enr?.scheme?.name ?? "Inscripción";
                  const scheme = enr?.scheme?.name;
                  const tone = STATUS_TONE[p.status] ?? "slate";
                  const providerKey = (p.provider ?? "manual").toLowerCase();
                  const provBadge = PROVIDER_BADGE[providerKey] ?? PROVIDER_BADGE.manual;
                  const rapyd = getRapydMeta(p.metadata);
                  const rapydError = (p.metadata as PaymentMeta | null)?.rapydError;
                  return (
                    <tr key={p.id} className="align-top hover:bg-slate-50/50">
                      {/* Candidato */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{candName}</div>
                        {enr?.candidate?.email ? (
                          <div className="text-[10px] text-slate-500">{enr.candidate.email}</div>
                        ) : null}
                      </td>
                      {/* Identificación */}
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {doc ? (
                          <>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{docType}</span>{" "}
                            <span className="font-mono">{doc}</span>
                          </>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      {/* Concepto */}
                      <td className="px-4 py-3 text-xs text-slate-700">
                        <div className="font-medium text-slate-800">{concept}</div>
                        {scheme && scheme !== concept ? (
                          <div className="text-[10px] text-slate-500">{scheme}</div>
                        ) : null}
                        {enr?.code ? (
                          <div className="mt-0.5 text-[10px] text-slate-400">Folio {enr.code}</div>
                        ) : null}
                      </td>
                      {/* Monto */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-slate-900">{money(p.amount, p.currency)}</div>
                        <div className="text-[10px] text-slate-400">{p.currency} + IVA</div>
                      </td>
                      {/* Proveedor */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${provBadge.cls}`}>
                          <span aria-hidden>{provBadge.icon}</span> {provBadge.label}
                        </span>
                        {rapyd?.env ? (
                          <div className="mt-1 text-[10px] text-slate-400 uppercase">{rapyd.env}</div>
                        ) : null}
                      </td>
                      {/* Estado */}
                      <td className="px-4 py-3">
                        <Badge tone={tone}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                      </td>
                      {/* Proceso de pago (datos detallados Rapyd) */}
                      <td className="px-4 py-3 text-[11px] text-slate-700">
                        {p.receiptUrl ? (
                          <a
                            href={`/api/payments/${p.id}/receipt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mb-1 inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                          >
                            📎 Ver soporte de pago
                          </a>
                        ) : p.status === "PENDING" && (p.provider ?? "manual") !== "rapyd" ? (
                          <div className="mb-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800 ring-1 ring-amber-200">
                            Soporte aún no cargado por el candidato
                          </div>
                        ) : null}
                        {p.providerRef ? (
                          <div>
                            <span className="text-[10px] text-slate-400">Ref.</span>{" "}
                            <code className="break-all rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-700">{p.providerRef}</code>
                          </div>
                        ) : null}
                        {rapyd?.checkoutId ? (
                          <div>
                            <span className="text-[10px] text-slate-400">Checkout</span>{" "}
                            <code className="break-all rounded bg-violet-50 px-1 font-mono text-[10px] text-violet-700">{rapyd.checkoutId}</code>
                          </div>
                        ) : null}
                        {rapyd?.type ? (
                          <div className="text-[10px] text-slate-500">Evento: <strong className="text-slate-700">{rapyd.type}</strong>{rapyd.status ? ` · ${rapyd.status}` : ""}</div>
                        ) : null}
                        {rapyd?.failureCode || rapyd?.failureMessage ? (
                          <div className="mt-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-700 ring-1 ring-rose-200">
                            {rapyd.failureCode ? <strong>{rapyd.failureCode}</strong> : null}{rapyd.failureCode && rapyd.failureMessage ? " — " : ""}{rapyd.failureMessage}
                          </div>
                        ) : null}
                        {rapydError ? (
                          <div className="mt-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800 ring-1 ring-amber-200">
                            Rapyd no creó checkout: {rapydError}
                          </div>
                        ) : null}
                        {rapyd?.redirectUrl && p.status === "PENDING" ? (
                          <a
                            href={rapyd.redirectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block rounded btn-grad-navy px-1.5 py-0.5 text-[10px] font-semibold text-white"
                          >
                            Abrir checkout ↗
                          </a>
                        ) : null}
                      </td>
                      {/* Fechas */}
                      <td className="px-4 py-3 text-[11px] text-slate-600">
                        <div><span className="text-[10px] text-slate-400">Creado</span> {dateTime(p.createdAt)}</div>
                        {p.paidAt ? (
                          <div className="text-emerald-700"><span className="text-[10px] text-emerald-500">Pagado</span> {dateTime(p.paidAt)}</div>
                        ) : null}
                        {rapyd?.receivedAt ? (
                          <div className="text-[10px] text-slate-400">Webhook {dateTime(new Date(rapyd.receivedAt))}</div>
                        ) : null}
                      </td>
                      {/* Acciones */}
                      {canManage ? (
                        <td className="px-4 py-3 text-right">
                          <PaymentRowActions
                            paymentId={p.id}
                            providerRef={p.providerRef}
                            status={p.status}
                          />
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {payments.length === 500 ? (
          <div className="border-t border-slate-100 px-4 py-2 text-center text-[10px] text-slate-400">
            Mostrando las primeras 500 filas. Refine la búsqueda o los filtros para más precisión.
          </div>
        ) : null}
      </Card>
    </div>
  );
}
