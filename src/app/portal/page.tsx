import Link from "next/link";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { StatTile, PageHeader, Badge, EmptyState, Card } from "@/components/ui";
import { dateOnly } from "@/lib/format";
import { WelcomeWizard, ProcessSteps } from "@/components/process-steps";
import { getServerLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/locale";

export const metadata = { title: "Mi portal" };

const ENROLL_STATUS_KEY: Record<string, string> = {
  STARTED: "enroll.status.STARTED",
  CONSENT_PENDING: "enroll.status.CONSENT_PENDING",
  DOCS_PENDING: "enroll.status.DOCS_PENDING",
  PAYMENT_PENDING: "enroll.status.PAYMENT_PENDING",
  SCHEDULING: "enroll.status.SCHEDULING",
  READY: "enroll.status.READY",
  IN_PROGRESS: "enroll.status.IN_PROGRESS",
  GRADING: "enroll.status.GRADING",
  COMMITTEE: "enroll.status.COMMITTEE",
  APPROVED: "enroll.status.APPROVED",
  REJECTED: "enroll.status.REJECTED",
  CERTIFIED: "enroll.status.CERTIFIED",
  EXPIRED: "enroll.status.EXPIRED",
  CANCELLED: "enroll.status.CANCELLED",
};

function toneFor(status: string): "green" | "amber" | "blue" | "slate" {
  if (status === "CERTIFIED" || status === "APPROVED") return "green";
  if (status.endsWith("PENDING") || status === "SCHEDULING") return "amber";
  if (status === "CANCELLED" || status === "REJECTED" || status === "EXPIRED") return "slate";
  return "blue";
}

export default async function CandidatePortal() {
  const { candidateId } = await requireCandidatePage();
  const locale = await getServerLocale();
  const tr = (k: string) => t(k, locale);

  const [enrollments, certificates, candidate] = await Promise.all([
    prisma.enrollment.findMany({
      where: { candidateId },
      orderBy: { createdAt: "desc" },
      include: { exam: { select: { name: true } }, scheme: { select: { name: true } } },
    }),
    prisma.certificate.findMany({
      where: { candidateId },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { firstName: true },
    }),
  ]);

  // Determinar el paso "actual" del candidato según el estado de la
  // inscripción más reciente. Esto le da feedback claro de dónde está.
  const latest = enrollments[0];
  const stepFromStatus = (s: string | undefined): 1 | 2 | 3 | 4 => {
    if (!s) return 1;
    if (s === "CERTIFIED" || s === "APPROVED") return 4;
    if (s === "GRADING" || s === "COMMITTEE") return 4;
    if (s === "IN_PROGRESS" || s === "READY" || s === "SCHEDULING") return 3;
    if (s === "DOCS_PENDING" || s === "PAYMENT_PENDING" || s === "CONSENT_PENDING") return 2;
    return 2;
  };
  const currentStep = stepFromStatus(latest?.status);

  const activeCerts = certificates.filter((c) => c.status === "VALID");
  const pending = enrollments.filter(
    (e) => e.status.endsWith("PENDING") || e.status === "SCHEDULING",
  ).length;

  // Si hay una inscripción "viva" (no cancelada ni vencida), el paso 2
  // del wizard debe llevar a ESA inscripción específica para continuar
  // donde la dejó. Si no, va a la lista de evaluaciones disponibles.
  const liveEnrollment = enrollments.find(
    (e) => e.status !== "CANCELLED" && e.status !== "EXPIRED" && e.status !== "REJECTED",
  );
  const step2Href = liveEnrollment
    ? `/portal/inscripcion/${liveEnrollment.id}`
    : "/portal/evaluaciones";
  const stepHrefs: Partial<Record<1 | 2 | 3 | 4, string>> = {
    1: "/portal/perfil",
    2: step2Href,
    3: "/portal/agenda",
    4: activeCerts.length > 0 ? "/portal/certificados" : "/portal/certificados",
  };

  return (
    <>
      <PageHeader
        title={tr("portal.mi.title")}
        subtitle={tr("portal.mi.subtitle")}
        actions={
          <Link
            href="/portal/evaluaciones"
            className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white"
          >
            {tr("portal.mi.enrollCta")}
          </Link>
        }
      />

      {/* Wizard guiado:
          - Si el candidato aún no se ha inscrito, mostramos el bienvenida
            grande con CTA principal a /portal/evaluaciones y los 4 pasos.
          - Si ya está en proceso, mostramos un stepper compacto con el
            paso actual resaltado para ubicarlo y motivarlo. */}
      {enrollments.length === 0 ? (
        <div className="mb-5">
          <WelcomeWizard
            candidateFirstName={candidate?.firstName ?? undefined}
            enrollmentsCount={enrollments.length}
            locale={locale}
            stepHrefs={stepHrefs}
          />
        </div>
      ) : (
        <div className="mb-5">
          <ProcessSteps
            currentStep={currentStep}
            variant="compact"
            locale={locale}
            stepHrefs={stepHrefs}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={tr("portal.mi.stat.enrollments")} value={enrollments.length} />
        <StatTile label={tr("portal.mi.stat.certs")} value={activeCerts.length} tone="good" />
        <StatTile label={tr("portal.mi.stat.pending")} value={pending} tone="warn" />
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">{tr("portal.mi.processes")}</h2>
        </div>
        <div className="p-5">
          {enrollments.length === 0 ? (
            <EmptyState>
              {tr("portal.mi.empty.processes.before")}{" "}
              <Link href="/portal/evaluaciones" className="text-brand-700 hover:underline">
                {tr("portal.mi.empty.processes.link")}
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
                      {e.exam?.name ?? e.scheme?.name ?? tr("portal.mi.processFallback")}
                    </Link>
                    <div className="text-xs text-slate-400">
                      {tr("portal.mi.folio")} {e.code} · {dateOnly(e.createdAt)}
                    </div>
                  </div>
                  <Badge tone={toneFor(e.status)}>
                    {ENROLL_STATUS_KEY[e.status] ? tr(ENROLL_STATUS_KEY[e.status]) : e.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">{tr("portal.mi.certs")}</h2>
        </div>
        <div className="p-5">
          {certificates.length === 0 ? (
            <EmptyState>{tr("portal.mi.empty.certs")}</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {certificates.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-slate-800">{c.title}</div>
                    <div className="text-xs text-slate-400">{tr("portal.mi.code")} {c.code}</div>
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
