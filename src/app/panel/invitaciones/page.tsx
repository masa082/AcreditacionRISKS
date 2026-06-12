import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatTile } from "@/components/ui";
import { InvitationCampaign, type SeedContact } from "@/components/invitation-campaign";

export const metadata = { title: "Invitar a certificarse" };

/**
 * Campañas de invitación a la Certificación de Idoneidad por Competencias.
 *
 * Diferencia con /panel/leads y /panel/candidatos:
 *  - Leads = personas que llegaron solas vía landing pública.
 *  - Candidatos = personas YA inscritas en el proceso.
 *  - Invitaciones = OUTBOUND a personas que aún no nos conocen — el
 *    operador pega/importa una lista (LinkedIn, base de datos propia,
 *    eventos, gremio) y los invita a iniciar el proceso.
 *
 * Se reutiliza la infra de correo (wrapEmailHtml + Resend) y el patrón
 * de wa.me link por contacto. Los envíos quedan en EmailLog con
 * kind="INVITATION" para trazabilidad.
 */
export default async function InvitacionesPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.LEAD_MANAGE)) redirect("/panel");

  // KPIs simples de las últimas 30 días.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [sent30d, distinct30d] = await Promise.all([
    prisma.emailLog.count({
      where: { subscriberId, kind: "INVITATION", status: "SENT", sentAt: { gte: since } },
    }),
    prisma.emailLog.findMany({
      where: { subscriberId, kind: "INVITATION", status: "SENT", sentAt: { gte: since } },
      select: { toEmail: true },
      distinct: ["toEmail"],
    }),
  ]);
  const distinctCount = distinct30d.length;

  // Pre-cargamos los leads del subscriber para poder importarlos
  // como "borrador" de contactos sin reescribirlos.
  const leads = await prisma.lead.findMany({
    where: { OR: [{ subscriberId }, { subscriberId: null }] },
    select: { fullName: true, email: true, phone: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const seedLeads: SeedContact[] = leads.map((l) => ({
    name: l.fullName,
    email: l.email,
    phone: l.phone,
    sourceLabel: l.status === "NEW" ? "Lead nuevo" : `Lead · ${l.status.toLowerCase()}`,
  }));

  // Plantilla por defecto: invitación a iniciar el proceso de
  // Certificación de Idoneidad por Competencias.
  const sub = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { tradeName: true, legalName: true },
  });
  const orgName = sub?.tradeName ?? sub?.legalName ?? "CIOC";
  const defaultSubject = `${orgName} le invita a certificarse — Oficial de Cumplimiento`;
  const defaultBody =
    `<p>Hola <strong>{nombre}</strong>,</p>` +
    `<p>Desde <strong>{organismo}</strong>, organismo de certificación de personas bajo la norma ISO/IEC 17024, queremos invitarle a iniciar su <strong>proceso de Certificación de Idoneidad por Competencias</strong> como Oficial de Cumplimiento.</p>` +
    `<p>La certificación le permite acreditar su competencia frente a empleadores y autoridades, dando cumplimiento a los requisitos de la Superintendencia de Sociedades (SAGRILAFT) y la Superintendencia de Transporte (SARLAFT).</p>` +
    `<p><strong>¿Por qué certificarse?</strong></p>` +
    `<ul>` +
    `<li>Reconocimiento oficial de su experiencia y conocimientos.</li>` +
    `<li>Cumplimiento de los requisitos del Oficial de Cumplimiento.</li>` +
    `<li>Diferenciación profesional en el mercado.</li>` +
    `<li>Vigencia internacional bajo ISO/IEC 17024.</li>` +
    `</ul>` +
    `<p><strong>Inicie su proceso aquí:</strong><br>` +
    `<a href="{url_registro}">{url_registro}</a></p>` +
    `<p>Quedo atento(a) a cualquier pregunta.</p>` +
    `<p>Un cordial saludo,<br>Equipo de Certificación · {organismo}</p>`;

  const defaultWhatsApp =
    `Hola {nombre}, le escribo de {organismo}, organismo de certificación de personas bajo ISO/IEC 17024. ` +
    `Queremos invitarle a iniciar su proceso de Certificación de Idoneidad por Competencias como Oficial de Cumplimiento. ` +
    `Puede iniciar aquí: {url_registro}`;

  return (
    <>
      <PageHeader
        title="Invitar a certificarse"
        subtitle="Envíe invitaciones masivas por correo y WhatsApp a profesionales para que inicien su proceso de Certificación de Idoneidad por Competencias."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Invitaciones enviadas (30 días)" value={sent30d} />
        <StatTile label="Personas únicas contactadas" value={distinctCount} />
        <StatTile
          label="Leads disponibles para reinvitar"
          value={seedLeads.length}
          tone={seedLeads.length > 0 ? "default" : undefined}
        />
      </div>

      <InvitationCampaign
        orgName={orgName}
        seedLeads={seedLeads}
        defaultSubject={defaultSubject}
        defaultBodyHtml={defaultBody}
        defaultWhatsApp={defaultWhatsApp}
      />
    </>
  );
}
