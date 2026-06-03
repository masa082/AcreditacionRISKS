import Link from "next/link";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { StatTile, PageHeader, Badge, EmptyState, Card } from "@/components/ui";
import { dateOnly } from "@/lib/format";

export const metadata = { title: "Mi portal" };

const ENROLL_STATUS_ES: Record<string, string> = {
  STARTED: "Iniciado",
  CONSENT_PENDING: "Pendiente de autorización de datos",
  DOCS_PENDING: "Pendiente de documentos",
  PAYMENT_PENDING: "Pendiente de pago",
  SCHEDULING: "Por agendar",
  READY: "Listo para presentar",
  IN_PROGRESS: "En presentación",
  GRADING: "En calificación",
  COMMITTEE: "En revisión de comité",
  APPROVED: "Aprobado",
  REJECTED: "No aprobado",
  CERTIFIED: "Certificado",
  EXPIRED: "Vencido",
  CANCELLED: "Cancelado",
};

function toneFor(status: string): "green" | "amber" | "blue" | "slate" {
  if (status === "CERTIFIED" || status === "APPROVED") return "green";
  if (status.endsWith("PENDING") || status === "SCHEDULING") return "amber";
  if (status === "CANCELLED" || status === "REJECTED" || status === "EXPIRED") return "slate";
  return "blue";
}

export default async function CandidatePortal() {
  const { candidateId } = await requireCandidatePage();

  const [enrollments, certificates] = await Promise.all([
    prisma.enrollment.findMany({
      where: { candidateId },
      orderBy: { createdAt: "desc" },
      include: { exam: { select: { name: true } }, scheme: { select: { name: true } } },
    }),
    prisma.certificate.findMany({
      where: { candidateId },
      orderBy: { issuedAt: "desc" },
    }),
  ]);

  const activeCerts = certificates.filter((c) => c.status === "VALID");
  const pending = enrollments.filter(
    (e) => e.status.endsWith("PENDING") || e.status === "SCHEDULING",
  ).length;

  return (
    <>
      <PageHeader
        title="Mi proceso"
        subtitle="Estado de sus procesos de certificación."
        actions={
          <Link
            href="/portal/evaluaciones"
            className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900"
          >
            Inscribirme en una evaluación
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Inscripciones" value={enrollments.length} />
        <StatTile label="Certificados vigentes" value={activeCerts.length} tone="good" />
        <StatTile label="Acciones pendientes" value={pending} tone="warn" />
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Mis procesos</h2>
        </div>
        <div className="p-5">
          {enrollments.length === 0 ? (
            <EmptyState>
              Aún no tiene inscripciones.{" "}
              <Link href="/portal/evaluaciones" className="text-brand-700 hover:underline">
                Vea las evaluaciones disponibles
              </Link>
              .
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {enrollments.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/portal/inscripcion/${e.id}`}
                      className="font-medium text-slate-800 hover:text-brand-800 hover:underline"
                    >
                      {e.exam?.name ?? e.scheme?.name ?? "Proceso de certificación"}
                    </Link>
                    <div className="text-xs text-slate-400">
                      Folio {e.code} · {dateOnly(e.createdAt)}
                    </div>
                  </div>
                  <Badge tone={toneFor(e.status)}>
                    {ENROLL_STATUS_ES[e.status] ?? e.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Mis certificados</h2>
        </div>
        <div className="p-5">
          {certificates.length === 0 ? (
            <EmptyState>Todavía no tiene certificados emitidos.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {certificates.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-slate-800">{c.title}</div>
                    <div className="text-xs text-slate-400">Código {c.code}</div>
                  </div>
                  <Badge tone={c.status === "VALID" ? "green" : "slate"}>{c.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
