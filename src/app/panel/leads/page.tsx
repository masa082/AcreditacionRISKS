import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatTile } from "@/components/ui";
import { LeadsTable, type LeadRow } from "@/components/leads-table";
import { getMarketingConfig } from "@/lib/marketing-config";

export const metadata = { title: "Leads comerciales" };

export default async function LeadsPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.LEAD_VIEW)) redirect("/panel");

  // RISKS es el suscriptor de la landing pública; mostramos sus leads
  // + los leads aún sin asignar (subscriberId IS NULL) como inbox global.
  const leads = await prisma.lead.findMany({
    where: { OR: [{ subscriberId }, { subscriberId: null }] },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Plantilla de WhatsApp viene de la config de marketing del suscriptor —
  // permite al admin personalizar el saludo desde /panel/organizacion.
  const marketing = await getMarketingConfig();

  // Mapeo a fila plana para el componente cliente (sin Decimal/Date crudos
  // — pasamos ISO strings para que React serialize sin pelearse).
  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    fullName: l.fullName,
    email: l.email,
    phone: l.phone,
    country: l.country,
    company: l.company,
    jobTitle: l.jobTitle,
    certificationOfInterest: l.certificationOfInterest,
    message: l.message,
    notes: l.notes,
    kind: l.kind,
    status: l.status,
    source: l.source,
    siteVisitCount: l.siteVisitCount,
    lastSiteVisitAtIso: l.lastSiteVisitAt ? l.lastSiteVisitAt.toISOString() : null,
    createdAtIso: l.createdAt.toISOString(),
    contactedAtIso: l.contactedAt ? l.contactedAt.toISOString() : null,
  }));

  const news = rows.filter((r) => r.status === "NEW").length;
  const contacted = rows.filter((r) => r.status === "CONTACTED").length;
  const converted = rows.filter((r) => r.status === "CONVERTED").length;

  // Mensaje base WhatsApp; {nombre} se sustituye en el cliente.
  const waTemplate =
    marketing.whatsapp.message ||
    "Hola {nombre}, soy del equipo comercial de CIOC. Vi su solicitud y quiero ayudarle con su proceso de certificación.";

  return (
    <>
      <PageHeader
        title="Leads comerciales"
        subtitle="Solicitudes capturadas desde la landing pública. Filtre, ordene cualquier columna y use las acciones inline para dar seguimiento."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatTile label="Nuevos" value={news} tone={news > 0 ? "warn" : "default"} />
        <StatTile label="En contacto" value={contacted} />
        <StatTile label="Convertidos" value={converted} tone="good" />
        <StatTile label="Total" value={rows.length} />
      </div>

      <LeadsTable rows={rows} whatsappTemplate={waTemplate} />
    </>
  );
}
