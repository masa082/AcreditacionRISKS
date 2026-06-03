import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { RevokeForm } from "@/components/revoke-form";
import { issueCertificate } from "@/lib/actions/certificates";
import { dateOnly } from "@/lib/format";

export const metadata = { title: "Certificados" };

const STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "slate" }> = {
  VALID: { label: "Vigente", tone: "green" },
  EXPIRED: { label: "Vencido", tone: "amber" },
  SUSPENDED: { label: "Suspendido", tone: "red" },
  WITHDRAWN: { label: "Anulado", tone: "red" },
  CANCELLED: { label: "Anulado", tone: "slate" },
};

export default async function CertificatesPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.CERTIFICATE_ISSUE) && !can(ctx, PERMISSIONS.CERTIFICATE_VIEW)) redirect("/panel");
  const canIssue = can(ctx, PERMISSIONS.CERTIFICATE_ISSUE);
  const canRevoke = can(ctx, PERMISSIONS.CERTIFICATE_REVOKE);
  const now = new Date();

  const [pending, certs] = await Promise.all([
    prisma.enrollment.findMany({
      where: { subscriberId, status: "APPROVED", certificates: { none: { type: "CERTIFICATION", status: { not: "CANCELLED" } } } },
      include: { candidate: { select: { firstName: true, lastName: true } }, scheme: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.certificate.findMany({
      where: { subscriberId, type: "CERTIFICATION" },
      orderBy: { issuedAt: "desc" },
      include: { candidate: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader title="Certificados" subtitle="Emita, consulte y anule los certificados de su organización." />

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
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Certificados emitidos ({certs.length})</h2></div>
        <div className="p-5">
          {certs.length === 0 ? (
            <EmptyState>Aún no se han emitido certificados.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-4 font-medium">Titular</th>
                    <th className="py-2 pr-4 font-medium">Código</th>
                    <th className="py-2 pr-4 font-medium">Emisión</th>
                    <th className="py-2 pr-4 font-medium">Estado</th>
                    <th className="py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certs.map((c) => {
                    const expired = c.status === "VALID" && c.expiresAt && c.expiresAt < now;
                    const st = STATUS[expired ? "EXPIRED" : c.status] ?? STATUS.VALID;
                    return (
                      <tr key={c.id}>
                        <td className="py-3 pr-4 text-slate-700">{c.candidate.firstName} {c.candidate.lastName}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-600">{c.code}</td>
                        <td className="py-3 pr-4 text-slate-500">{dateOnly(c.issuedAt)}</td>
                        <td className="py-3 pr-4"><Badge tone={st.tone}>{st.label}</Badge></td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <Link href={`/certificado/${c.id}`} className="text-xs font-medium text-brand-700 hover:underline">Ver</Link>
                            {canRevoke && !["WITHDRAWN", "CANCELLED"].includes(c.status) ? <RevokeForm certificateId={c.id} /> : null}
                          </div>
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
    </>
  );
}
