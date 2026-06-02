import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";
import { Card, StatTile, PageHeader, Badge, EmptyState } from "@/components/ui";

export const metadata = { title: "Mi portal" };

const NAV: NavItem[] = [
  { href: "/portal", label: "Mi proceso" },
  { href: "/portal/evaluaciones", label: "Evaluaciones disponibles", disabled: true },
  { href: "/portal/pagos", label: "Mis pagos", disabled: true },
  { href: "/portal/agenda", label: "Mi agenda", disabled: true },
  { href: "/portal/resultados", label: "Resultados", disabled: true },
  { href: "/portal/certificados", label: "Mis certificados", disabled: true },
  { href: "/portal/perfil", label: "Mi perfil", disabled: true },
];

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

export default async function CandidatePortal() {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");
  if (ctx.type !== "CANDIDATE") {
    redirect(ctx.type === "PLATFORM" ? "/admin" : "/panel");
  }

  const candidate = await prisma.candidate.findFirst({
    where: { userId: ctx.userId },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: { exam: true, scheme: true },
      },
      certificates: { orderBy: { issuedAt: "desc" } },
    },
  });

  const enrollments = candidate?.enrollments ?? [];
  const certificates = candidate?.certificates ?? [];
  const activeCerts = certificates.filter((c) => c.status === "VALID");

  return (
    <DashboardShell
      area="Portal del candidato"
      nav={NAV}
      user={{ name: `${ctx.firstName} ${ctx.lastName}`, role: "Candidato" }}
    >
      <PageHeader
        title={`Hola, ${ctx.firstName}`}
        subtitle="Estado de sus procesos de certificación."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Inscripciones" value={enrollments.length} />
        <StatTile label="Certificados vigentes" value={activeCerts.length} tone="good" />
        <StatTile
          label="Acciones pendientes"
          value={enrollments.filter((e) => e.status.endsWith("PENDING")).length}
          tone="warn"
        />
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Mis procesos</h2>
        </div>
        <div className="p-5">
          {enrollments.length === 0 ? (
            <EmptyState>
              Aún no tiene inscripciones. Las evaluaciones disponibles se
              habilitarán en su portal próximamente.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {enrollments.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-slate-800">
                      {e.scheme?.name ?? e.exam?.name ?? "Proceso de certificación"}
                    </div>
                    <div className="text-xs text-slate-400">
                      Folio {e.code} ·{" "}
                      {e.createdAt.toLocaleDateString("es-CO")}
                    </div>
                  </div>
                  <Badge tone={e.status === "CERTIFIED" ? "green" : e.status.endsWith("PENDING") ? "amber" : "blue"}>
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
    </DashboardShell>
  );
}
