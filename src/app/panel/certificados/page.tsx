import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, StatTile } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { issueCertificate } from "@/lib/actions/certificates";
import { CertificatesList, type CertificateRow } from "@/components/certificates-list";

export const metadata = { title: "Certificados" };

interface SP {
  q?: string;
  program?: string;
  status?: string;
  from?: string;
  to?: string;
}

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.CERTIFICATE_ISSUE) && !can(ctx, PERMISSIONS.CERTIFICATE_VIEW)) redirect("/panel");
  const canIssue = can(ctx, PERMISSIONS.CERTIFICATE_ISSUE);
  const canRevoke = can(ctx, PERMISSIONS.CERTIFICATE_REVOKE);
  const sp = await searchParams;
  const now = new Date();

  const where: Record<string, unknown> = { subscriberId, type: "CERTIFICATION" };
  if (sp.program) where.title = sp.program;
  if (sp.status === "VALID") where.status = "VALID";
  else if (sp.status === "EXPIRED") {
    where.status = "VALID";
    where.expiresAt = { lt: now };
  } else if (sp.status === "SUSPENDED") where.status = "SUSPENDED";
  else if (sp.status === "WITHDRAWN") where.status = { in: ["WITHDRAWN", "CANCELLED"] };
  if (sp.from || sp.to) {
    where.issuedAt = {
      ...(sp.from ? { gte: new Date(sp.from) } : {}),
      ...(sp.to ? { lte: new Date(sp.to + "T23:59:59") } : {}),
    };
  }
  if (sp.q?.trim()) {
    const term = sp.q.trim();
    where.OR = [
      { holderName: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { documentNumber: { contains: term, mode: "insensitive" } },
      { candidate: { is: { email: { contains: term, mode: "insensitive" } } } },
    ];
  }

  const [pending, certs, allTitles] = await Promise.all([
    prisma.enrollment.findMany({
      where: { subscriberId, status: "APPROVED", certificates: { none: { type: "CERTIFICATION", status: { not: "CANCELLED" } } } },
      include: { candidate: { select: { firstName: true, lastName: true } }, scheme: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.certificate.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      take: 500,
      include: { candidate: { select: { firstName: true, lastName: true, email: true, phone: true } } },
    }),
    prisma.certificate.findMany({
      where: { subscriberId, type: "CERTIFICATION" },
      select: { title: true },
      distinct: ["title"],
    }),
  ]);

  // Estadísticas globales
  const [totalAll, validAll, expiredAll, revokedAll] = await Promise.all([
    prisma.certificate.count({ where: { subscriberId, type: "CERTIFICATION" } }),
    prisma.certificate.count({ where: { subscriberId, type: "CERTIFICATION", status: "VALID", OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] } }),
    prisma.certificate.count({ where: { subscriberId, type: "CERTIFICATION", status: "VALID", expiresAt: { lt: now } } }),
    prisma.certificate.count({ where: { subscriberId, type: "CERTIFICATION", status: { in: ["SUSPENDED", "WITHDRAWN", "CANCELLED"] } } }),
  ]);

  const rows: CertificateRow[] = certs.map((c) => {
    const isExpired = c.status === "VALID" && c.expiresAt && c.expiresAt < now;
    const effective = isExpired ? "EXPIRED" : c.status;
    return {
      id: c.id,
      code: c.code,
      holderName: c.holderName,
      holderEmail: c.candidate?.email ?? "",
      holderPhone: c.candidate?.phone ?? null,
      title: c.title,
      status: c.status,
      effectiveStatus: effective,
      issuedAtISO: c.issuedAt.toISOString(),
      expiresAtISO: c.expiresAt?.toISOString() ?? null,
    };
  });

  return (
    <>
      <PageHeader
        title="Certificados"
        subtitle="Emita, consulte, anule, envíe por correo y comparta por WhatsApp los certificados emitidos por su organización."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatTile label="Total" value={totalAll} />
        <StatTile label="Vigentes" value={validAll} tone="good" />
        <StatTile label="Vencidos" value={expiredAll} tone={expiredAll ? "warn" : "default"} />
        <StatTile label="Anulados / Suspendidos" value={revokedAll} tone={revokedAll ? "danger" : "default"} />
      </div>

      {canIssue ? (
        <Card className="mb-6">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Aprobados pendientes de certificar ({pending.length})</h2></div>
          <div className="p-5">
            {pending.length === 0 ? (
              <EmptyState>No hay inscripciones aprobadas pendientes de certificar.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pending.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="font-medium text-slate-800">{e.candidate.firstName} {e.candidate.lastName}</div>
                      <div className="text-xs text-slate-400">{e.scheme?.name} · Folio {e.code}</div>
                    </div>
                    <form action={async () => { "use server"; await issueCertificate(e.id); }}>
                      <SubmitButton pendingText="Emitiendo…">Emitir certificado</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Certificados emitidos ({rows.length})</h2>
        </div>
        <div className="p-5">
          <CertificatesList rows={rows} programs={allTitles.map((t) => t.title)} canRevoke={canRevoke} />
        </div>
      </Card>
    </>
  );
}
