import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { dateOnly } from "@/lib/format";

export const metadata = { title: "Candidatos" };

const ENROLL_STATUS_ES: Record<string, string> = {
  STARTED: "Iniciado",
  CONSENT_PENDING: "Autorización pendiente",
  DOCS_PENDING: "Documentos pendientes",
  PAYMENT_PENDING: "Pago pendiente",
  SCHEDULING: "Por agendar",
  READY: "Listo para presentar",
  IN_PROGRESS: "En presentación",
  GRADING: "En calificación",
  COMMITTEE: "En comité",
  APPROVED: "Aprobado",
  REJECTED: "No aprobado",
  CERTIFIED: "Certificado",
  EXPIRED: "Vencido",
  CANCELLED: "Cancelado",
};

export default async function CandidatesListPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.CANDIDATE_MANAGE) && !can(ctx, PERMISSIONS.ENROLLMENT_MANAGE)) {
    redirect("/panel");
  }

  const candidates = await prisma.candidate.findMany({
    where: { subscriberId },
    orderBy: { createdAt: "desc" },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          _count: { select: { documents: { where: { status: "SUBMITTED" } } } },
        },
      },
    },
  });

  const totalPendingDocs = candidates.reduce(
    (sum, c) => sum + c.enrollments.reduce((s, e) => s + e._count.documents, 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Candidatos"
        subtitle={`${candidates.length} candidato(s) · ${totalPendingDocs} documento(s) por revisar`}
      />

      <Card>
        <div className="p-5">
          {candidates.length === 0 ? (
            <EmptyState>
              Aún no hay candidatos registrados. Comparta el enlace público de
              registro para recibir inscripciones.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-4 font-medium">Candidato</th>
                    <th className="py-2 pr-4 font-medium">Documento</th>
                    <th className="py-2 pr-4 font-medium">Inscripciones</th>
                    <th className="py-2 pr-4 font-medium">Último estado</th>
                    <th className="py-2 font-medium">Por revisar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((c) => {
                    const last = c.enrollments[0];
                    const pending = c.enrollments.reduce((s, e) => s + e._count.documents, 0);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4">
                          <Link href={`/panel/candidatos/${c.id}`} className="font-medium text-slate-800 hover:text-brand-800 hover:underline">
                            {c.firstName} {c.lastName}
                          </Link>
                          <div className="text-xs text-slate-400">{c.email}</div>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {c.documentType ? `${c.documentType} ` : ""}{c.documentNumber ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{c.enrollments.length}</td>
                        <td className="py-3 pr-4">
                          {last ? (
                            <span className="text-slate-600">
                              {ENROLL_STATUS_ES[last.status] ?? last.status}
                              <span className="ml-1 text-xs text-slate-400">· {dateOnly(last.createdAt)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">Sin inscripciones</span>
                          )}
                        </td>
                        <td className="py-3">
                          {pending > 0 ? <Badge tone="amber">{pending}</Badge> : <span className="text-slate-300">—</span>}
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
