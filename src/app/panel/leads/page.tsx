import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge, StatTile } from "@/components/ui";
import { LeadUpdateForm } from "@/components/lead-update-form";
import { LEAD_KIND_LABELS, LEAD_STATUS_LABELS } from "@/lib/leads";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Leads comerciales" };

const STATUS_TONE: Record<string, "amber" | "blue" | "green" | "slate" | "red"> = {
  NEW: "amber",
  CONTACTED: "blue",
  CONVERTED: "green",
  DISCARDED: "slate",
};

export default async function LeadsPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.LEAD_VIEW)) redirect("/panel");
  const canManage = can(ctx, PERMISSIONS.LEAD_MANAGE);

  // Hoy RISKS es el único suscriptor activo de la landing, así que mostramos
  // sus leads y los leads aún sin asignar (subscriberId IS NULL) como inbox.
  const leads = await prisma.lead.findMany({
    where: { OR: [{ subscriberId }, { subscriberId: null }] },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  const open = leads.filter((l) => l.status === "NEW" || l.status === "CONTACTED").length;

  return (
    <>
      <PageHeader title="Leads comerciales" subtitle="Solicitudes capturadas desde la landing pública de RISKS INTERNATIONAL." />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatTile label="Nuevos" value={leads.filter((l) => l.status === "NEW").length} tone={leads.some((l) => l.status === "NEW") ? "warn" : "default"} />
        <StatTile label="En contacto" value={leads.filter((l) => l.status === "CONTACTED").length} />
        <StatTile label="Convertidos" value={leads.filter((l) => l.status === "CONVERTED").length} tone="good" />
        <StatTile label="Total" value={leads.length} />
      </div>

      <Card>
        <div className="p-5">
          {leads.length === 0 ? (
            <EmptyState>Aún no hay leads capturados.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {leads.map((l) => (
                <li key={l.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900">{l.fullName}</span>
                      <span className="ml-2 text-sm text-slate-500">&lt;<a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a>&gt;</span>
                      <span className="ml-3 text-xs text-slate-400">
                        {LEAD_KIND_LABELS[l.kind]} · {dateTime(l.createdAt)}
                        {l.phone ? ` · ${l.phone}` : ""}
                        {l.country ? ` · ${l.country}` : ""}
                        {l.source ? ` · ${l.source}` : ""}
                      </span>
                    </div>
                    <Badge tone={STATUS_TONE[l.status] ?? "slate"}>{LEAD_STATUS_LABELS[l.status]}</Badge>
                  </div>
                  {(l.company || l.jobTitle || l.certificationOfInterest) ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {l.company ? <><strong className="text-slate-700">Empresa:</strong> {l.company}</> : null}
                      {l.jobTitle ? <> · <strong className="text-slate-700">Cargo:</strong> {l.jobTitle}</> : null}
                      {l.certificationOfInterest ? <> · <strong className="text-slate-700">Interés:</strong> {l.certificationOfInterest}</> : null}
                    </p>
                  ) : null}
                  {l.message ? <p className="mt-2 text-sm text-slate-700">{l.message}</p> : null}
                  {l.notes ? <p className="mt-1 text-xs text-slate-500"><strong>Notas:</strong> {l.notes}</p> : null}
                  {canManage ? (
                    <LeadUpdateForm leadId={l.id} currentStatus={l.status} currentNotes={l.notes} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {open > 0 ? (
        <p className="mt-4 text-xs text-slate-400">{open} caso(s) abierto(s).</p>
      ) : null}
    </>
  );
}
