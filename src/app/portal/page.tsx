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
  if (status === "GRADING" || status === "COMMITTEE") return "blue";
  if (status.endsWith("PENDING") || status === "SCHEDULING") return "amber";
  if (status === "CANCELLED" || status === "REJECTED" || status === "EXPIRED") return "slate";
  return "blue";
}

/**
 * Mi proceso — vista resumen para el candidato.
 *
 * Cambios respecto a la versión anterior:
 *  - El stepper se calcula a partir del avance REAL: si tiene un
 *    intento aprobado se mueve a Paso 3; si tiene certificado a Paso 4.
 *    Antes solo miraba enrollment.status del más reciente, lo que
 *    "retrocedía" al candidato cuando creaba una nueva inscripción en
 *    DOCS_PENDING aunque ya hubiera aprobado el examen anterior.
 *  - Tarjeta "Estado actual y próximo paso" antes de la lista — muestra
 *    el puntaje obtenido (cuando ya presentó), checklist mini y un
 *    botón claro para AVANZAR (presentar Caso Práctico / ver
 *    resultado / esperar comité / descargar certificado).
 *  - Cada fila de "Mis procesos" muestra ahora puntaje + tiempo desde
 *    creación + atajo a la siguiente acción.
 */
export default async function CandidatePortal() {
  const { candidateId } = await requireCandidatePage();
  const locale = await getServerLocale();
  const tr = (k: string) => t(k, locale);

  const [enrollments, certificates, candidate] = await Promise.all([
    prisma.enrollment.findMany({
      where: { candidateId },
      orderBy: { createdAt: "desc" },
      include: {
        exam: { select: { id: true, name: true, passingScore: true, requirePayment: true } },
        scheme: { select: { id: true, name: true } },
        attempts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            scorePercent: true,
            passed: true,
            submittedAt: true,
            gradedAt: true,
          },
        },
        payments: { select: { status: true } },
        // Importante: traer el TIPO del certificado para distinguir
        // EXAM_PRESENTATION (constancia) de CERTIFICATION (certificado
        // final). Una constancia NO significa que el proceso esté
        // terminado — el candidato todavía puede tener evaluaciones
        // pendientes del programa.
        certificates: { select: { id: true, status: true, type: true } },
      },
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

  const activeCerts = certificates.filter((c) => c.status === "VALID");
  // SOLO la certificación final (no las constancias de presentación)
  // cuenta como "proceso terminado". Una constancia es un comprobante
  // de que presentó el examen, no de que aprobó la certificación
  // completa. Para los KPIs y el stepper hay que distinguir.
  const finalCerts = activeCerts.filter((c) => c.type === "CERTIFICATION");

  // Step REAL del candidato: tomamos el MÁS ALTO de todos los procesos,
  // no el más reciente. Step 4 solo si tiene una CERTIFICATION final;
  // una constancia de presentación NO completa el proceso.
  const currentStep = computeOverallStep(enrollments, finalCerts.length > 0);

  // "Pendientes" reales del candidato — algo que requiere su acción.
  const pendingActions = enrollments.filter((e) => candidateActionRequired(e)).length;

  // Inscripción "viva" para enlazar el stepper.
  const liveEnrollment = enrollments.find(
    (e) => e.status !== "CANCELLED" && e.status !== "EXPIRED" && e.status !== "REJECTED",
  );
  const step2Href = liveEnrollment
    ? `/portal/inscripcion/${liveEnrollment.id}`
    : "/portal/evaluaciones";
  const stepHrefs: Partial<Record<1 | 2 | 3 | 4, string>> = {
    1: "/portal/perfil",
    2: step2Href,
    3: liveEnrollment ? `/portal/inscripcion/${liveEnrollment.id}` : "/portal/evaluaciones",
    4: "/portal/certificados",
  };

  // Programas agrupados — para mostrar "su Caso Práctico" debajo del
  // Examen Teórico de la misma certificación con un único panel guiado.
  const programs = groupBySchemeOrEnrollment(enrollments);

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
        <StatTile
          label={tr("portal.mi.stat.pending")}
          value={pendingActions}
          tone={pendingActions > 0 ? "warn" : undefined}
        />
      </div>

      {/* ─── Panel guiado: estado actual + próximo paso ─────────────── */}
      {programs.length > 0 ? (
        <div className="mt-6 space-y-4">
          {programs.map((p) => (
            <ProgramStatusCard key={p.key} program={p} tr={tr} />
          ))}
        </div>
      ) : null}

      {/* ─── Tarjeta de procesos (más simple, con score inline) ────── */}
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
              {enrollments.map((e) => {
                const latestAttempt = e.attempts[0] ?? null;
                const scorePct = latestAttempt?.scorePercent
                  ? Number(latestAttempt.scorePercent.toString())
                  : null;
                // Indica si esta inscripción tiene una acción PENDIENTE
                // del candidato (lista para presentar, intento en curso).
                // En esos casos mostramos el botón animado "Completar el
                // proceso →" inline.
                const showActionButton =
                  e.status === "READY" ||
                  (latestAttempt?.status === "IN_PROGRESS" || latestAttempt?.status === "NOT_STARTED");
                const actionLabel =
                  latestAttempt?.status === "IN_PROGRESS"
                    ? "Continuar prueba"
                    : "Completar el proceso";
                return (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/portal/inscripcion/${e.id}`}
                        className="font-medium text-slate-800 hover:text-brand-800 hover:underline"
                      >
                        {e.exam?.name ?? e.scheme?.name ?? tr("portal.mi.processFallback")}
                      </Link>
                      <div className="text-xs text-slate-400">
                        {tr("portal.mi.folio")} {e.code} · {dateOnly(e.createdAt)}
                        {scorePct != null ? (
                          <span
                            className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                              latestAttempt?.passed
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            📊 {scorePct.toLocaleString("es-CO", { maximumFractionDigits: 1 })}% ·{" "}
                            {latestAttempt?.passed ? "Aprobado" : "No aprobado"}
                          </span>
                        ) : null}
                      </div>
                      {showActionButton && !latestAttempt?.passed ? (
                        <p className="mt-1 text-[11px] font-semibold text-amber-700">
                          ⏳ Pendiente de presentar — última acción suya
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={toneFor(e.status)}>
                        {ENROLL_STATUS_KEY[e.status] ? tr(ENROLL_STATUS_KEY[e.status]) : e.status}
                      </Badge>
                      {showActionButton ? (
                        <Link
                          href={`/portal/inscripcion/${e.id}`}
                          // animate-pulse + ring para llamar la atención
                          // sobre la acción que le falta al candidato.
                          className="inline-flex animate-pulse items-center gap-1 rounded-lg btn-grad-navy px-3 py-1.5 text-[12px] font-bold text-white shadow ring-2 ring-emerald-400 ring-offset-2"
                          title="Vaya a la inscripción para iniciar la prueba"
                        >
                          ➜ {actionLabel}
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
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
                  <div className="flex items-center gap-2">
                    <Badge tone={c.status === "VALID" ? "green" : "slate"}>{c.status}</Badge>
                    <Link
                      href="/portal/certificados"
                      className="rounded-md border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-800 hover:bg-brand-50"
                    >
                      Ver / Descargar
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}

// ============================================================================
//  Helpers
// ============================================================================

type EnrollmentRow = Awaited<
  ReturnType<typeof prisma.enrollment.findMany<{
    include: {
      exam: { select: { id: true; name: true; passingScore: true; requirePayment: true } };
      scheme: { select: { id: true; name: true } };
      attempts: {
        orderBy: { createdAt: "desc" };
        select: {
          id: true; status: true; scorePercent: true; passed: true;
          submittedAt: true; gradedAt: true;
        };
      };
      payments: { select: { status: true } };
      certificates: { select: { id: true; status: true; type: true } };
    };
  }>>
>[number];

/**
 * Calcula el paso "más alto" alcanzado por el candidato considerando
 * TODAS sus inscripciones + sus certificados. Antes la función solo
 * miraba el status de la inscripción más reciente, lo que hacía
 * retroceder el stepper cuando el candidato pre-inscribía una nueva
 * evaluación (status=DOCS_PENDING) tras haber aprobado otra.
 */
function computeOverallStep(
  enrollments: EnrollmentRow[],
  hasAnyValidCert: boolean,
): 1 | 2 | 3 | 4 {
  let max: 1 | 2 | 3 | 4 = 1;
  if (hasAnyValidCert) return 4;
  for (const e of enrollments) {
    const s = stepFromStatus(e.status, e.attempts);
    if (s > max) max = s;
  }
  return max;
}

function stepFromStatus(
  status: string,
  attempts: { status: string; passed: boolean | null }[],
): 1 | 2 | 3 | 4 {
  // Paso 4: comité / aprobado / certificado emitido.
  if (status === "CERTIFIED" || status === "APPROVED" || status === "GRADING" || status === "COMMITTEE") return 4;
  // Paso 3: ya presentó al menos un intento (aprobado o pendiente de
  // calificación) o está listo/curso para presentar.
  if (attempts.some((a) => a.passed === true)) return 3;
  if (attempts.some((a) => ["SUBMITTED", "AUTO_GRADED", "PENDING_COMMITTEE", "GRADED", "PASSED", "FAILED"].includes(a.status))) return 3;
  if (status === "IN_PROGRESS" || status === "READY" || status === "SCHEDULING") return 3;
  // Paso 2: documentos + pago.
  if (status === "DOCS_PENDING" || status === "PAYMENT_PENDING" || status === "CONSENT_PENDING") return 2;
  return 2;
}

/**
 * Hay una acción pendiente del candidato cuando:
 *  - Falta presentar un examen (READY / IN_PROGRESS no terminado).
 *  - Faltan documentos para una inscripción nueva.
 *  - Tiene un intento NO aprobado que requiere repetir / revisar.
 */
function candidateActionRequired(e: EnrollmentRow): boolean {
  if (["CONSENT_PENDING", "DOCS_PENDING", "PAYMENT_PENDING", "SCHEDULING", "READY"].includes(e.status)) {
    return true;
  }
  // Intento en curso sin enviar.
  if (e.attempts.some((a) => a.status === "IN_PROGRESS" || a.status === "NOT_STARTED")) {
    return true;
  }
  return false;
}

interface Program {
  key: string;
  schemeName: string;
  enrollments: EnrollmentRow[];
}

function groupBySchemeOrEnrollment(enrollments: EnrollmentRow[]): Program[] {
  // Agrupamos por scheme.id (o por enrollment.id si no hay scheme).
  const map = new Map<string, Program>();
  for (const e of enrollments) {
    const key = e.scheme?.id ?? e.id;
    const name = e.scheme?.name ?? e.exam?.name ?? "Programa";
    const g = map.get(key) ?? { key, schemeName: name, enrollments: [] };
    g.enrollments.push(e);
    map.set(key, g);
  }
  // Orden: programas con acciones pendientes primero.
  return Array.from(map.values()).sort((a, b) => {
    const aP = a.enrollments.some(candidateActionRequired) ? 0 : 1;
    const bP = b.enrollments.some(candidateActionRequired) ? 0 : 1;
    return aP - bP;
  });
}

// ============================================================================
//  Tarjeta "Estado actual + próximo paso" por programa.
// ============================================================================

function ProgramStatusCard({
  program,
  tr,
}: {
  program: Program;
  tr: (k: string) => string;
}) {
  // Tomamos los dos exámenes típicos: Teórico y Caso Práctico.
  const teor = program.enrollments.find((e) => /teórico|teorico/i.test(e.exam?.name ?? ""));
  const caso = program.enrollments.find((e) => /caso/i.test(e.exam?.name ?? ""));

  const teorAttempt = teor?.attempts[0] ?? null;
  const casoAttempt = caso?.attempts[0] ?? null;

  const teorScore = teorAttempt?.scorePercent ? Number(teorAttempt.scorePercent.toString()) : null;
  const casoScore = casoAttempt?.scorePercent ? Number(casoAttempt.scorePercent.toString()) : null;

  // Distinguir constancia (EXAM_PRESENTATION) de certificación final
  // (CERTIFICATION). Solo la segunda marca el proceso como completado.
  const hasFinalCert = program.enrollments.some((e) =>
    e.certificates.some((c) => c.type === "CERTIFICATION"),
  );
  const hasPresentationCert = program.enrollments.some((e) =>
    e.certificates.some((c) => c.type === "EXAM_PRESENTATION"),
  );

  // Próximo paso del programa.
  const next = computeNextStep({
    teor,
    caso,
    teorAttempt,
    casoAttempt,
    hasFinalCert,
  });

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-brand-900">{program.schemeName}</h3>
          <p className="mt-0.5 text-xs text-slate-500">Resumen de su avance en este programa</p>

          {/* Checklist mini */}
          <ul className="mt-3 space-y-1 text-[12.5px]">
            <Step
              done={!!teor}
              pending={false}
              label="Inscripción registrada"
              detail={teor ? `Folio ${teor.code}` : null}
            />
            <Step
              done={teorAttempt?.passed === true || teorAttempt?.status === "PASSED" || teorAttempt?.status === "GRADED" || teorAttempt?.status === "PENDING_COMMITTEE"}
              pending={teorAttempt?.status === "SUBMITTED" || teorAttempt?.status === "AUTO_GRADED"}
              failed={teorAttempt?.passed === false}
              label="Examen Teórico"
              detail={
                teorScore != null
                  ? `Puntaje: ${teorScore.toLocaleString("es-CO", { maximumFractionDigits: 1 })}% · ${teorAttempt?.passed ? "Aprobado" : "No aprobado"}`
                  : teorAttempt?.status === "IN_PROGRESS"
                  ? "Iniciado, sin enviar"
                  : teor
                  ? "Pendiente de presentar"
                  : null
              }
            />
            <Step
              done={casoAttempt?.passed === true}
              pending={casoAttempt?.status === "PENDING_COMMITTEE" || casoAttempt?.status === "SUBMITTED"}
              failed={casoAttempt?.passed === false}
              label="Caso Práctico"
              detail={
                casoScore != null
                  ? `Puntaje: ${casoScore.toLocaleString("es-CO", { maximumFractionDigits: 1 })}% · ${casoAttempt?.passed ? "Aprobado" : casoAttempt?.status === "PENDING_COMMITTEE" ? "En revisión del comité" : "No aprobado"}`
                  : casoAttempt?.status === "IN_PROGRESS"
                  ? "Iniciado, sin enviar"
                  : caso
                  ? "Pendiente de presentar"
                  : "Tras aprobar el Examen Teórico"
              }
            />
            <Step
              done={hasFinalCert}
              pending={false}
              label="Certificado emitido"
              detail={
                hasFinalCert
                  ? "Disponible en Mis Certificados"
                  : hasPresentationCert
                  ? "Constancia emitida — falta aprobar la última evaluación"
                  : "Tras aprobar ambas evaluaciones"
              }
            />
          </ul>
        </div>

        {/* Próximo paso destacado a la derecha. Si la acción depende del
            candidato (presentar/continuar prueba), añadimos animate-pulse
            + ring para que llame la atención. */}
        {next ? (
          <aside className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 lg:max-w-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              ➜ Siguiente paso
            </div>
            <p className="mt-1 text-sm font-bold text-emerald-900">{next.title}</p>
            {next.detail ? <p className="mt-0.5 text-[11.5px] text-emerald-800">{next.detail}</p> : null}
            {next.href ? (
              <Link
                href={next.href}
                className={
                  "mt-3 block rounded-lg btn-grad-navy px-3 py-2 text-center text-sm font-bold text-white shadow-sm" +
                  (next.isAction
                    ? " animate-pulse ring-2 ring-emerald-400 ring-offset-2"
                    : "")
                }
              >
                {next.cta}
              </Link>
            ) : null}
          </aside>
        ) : null}
      </div>
    </Card>
  );
}

function Step({
  done,
  pending,
  failed,
  label,
  detail,
}: {
  done?: boolean;
  pending?: boolean;
  failed?: boolean;
  label: string;
  detail?: string | null;
}) {
  const state = failed ? "failed" : done ? "done" : pending ? "pending" : "todo";
  const cfg = {
    done: { icon: "✓", cls: "bg-emerald-100 text-emerald-700" },
    pending: { icon: "⏳", cls: "bg-blue-100 text-blue-700" },
    todo: { icon: "○", cls: "bg-slate-100 text-slate-400" },
    failed: { icon: "✗", cls: "bg-rose-100 text-rose-700" },
  }[state];
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${cfg.cls}`}>
        {cfg.icon}
      </span>
      <span className="min-w-0">
        <span className={`font-semibold ${state === "todo" ? "text-slate-500" : "text-slate-800"}`}>{label}</span>
        {detail ? <span className="ml-1 text-[11px] text-slate-500">— {detail}</span> : null}
      </span>
    </li>
  );
}

function computeNextStep({
  teor,
  caso,
  teorAttempt,
  casoAttempt,
  hasFinalCert,
}: {
  teor: EnrollmentRow | undefined;
  caso: EnrollmentRow | undefined;
  teorAttempt: { status: string; passed: boolean | null; scorePercent: unknown } | null;
  casoAttempt: { status: string; passed: boolean | null; scorePercent: unknown } | null;
  hasFinalCert: boolean;
}): { title: string; detail?: string; cta: string; href?: string; isAction?: boolean } | null {
  // `isAction` distingue las acciones donde el candidato debe ACTUAR
  // (presentar/continuar prueba/inscribirse) de las informativas
  // (esperar comité, descargar certificado). El render lo usa para
  // aplicar animate-pulse al CTA.
  // Solo la CERTIFICATION final cierra el proceso. Una constancia
  // (EXAM_PRESENTATION) NO basta: el candidato todavía puede tener
  // evaluaciones pendientes del programa.
  if (hasFinalCert) {
    return {
      title: "Certificado emitido",
      detail: "Descárguelo, compártalo o verifíquelo por QR.",
      cta: "Ver mis certificados →",
      href: "/portal/certificados",
    };
  }
  // Sin Teórico → ir a inscripción / lista.
  if (!teor) {
    return {
      title: "Inscríbase al Examen Teórico",
      detail: "Es la primera evaluación del programa.",
      cta: "Ir a evaluaciones disponibles →",
      href: "/portal/evaluaciones",
      isAction: true,
    };
  }
  // Teórico en curso → continuar.
  if (teorAttempt?.status === "IN_PROGRESS") {
    return {
      title: "Continúe el Examen Teórico",
      detail: "Tiene un intento en curso.",
      cta: "Volver a la prueba →",
      href: `/portal/examen/${(teorAttempt as { id?: string }).id ?? ""}`,
      isAction: true,
    };
  }
  // Teórico no presentado → presentar.
  if (teor && !teorAttempt) {
    return {
      title: "Presente el Examen Teórico",
      detail: "Cuando esté listo, inicie la prueba desde la inscripción.",
      cta: "Ir al Examen Teórico →",
      href: `/portal/inscripcion/${teor.id}`,
      isAction: true,
    };
  }
  // Teórico no aprobado → revisar / reintentar.
  if (teorAttempt?.passed === false) {
    return {
      title: "Examen Teórico no aprobado",
      detail: "Revise el resultado del intento y las opciones de reintento.",
      cta: "Ver detalle del intento →",
      href: `/portal/inscripcion/${teor.id}`,
      isAction: true,
    };
  }
  // Teórico aprobado y no hay Caso Práctico → ir a inscribirse / iniciar.
  if (teorAttempt?.passed && !caso) {
    return {
      title: "Inicie el Caso Práctico",
      detail: "Aprobó el Examen Teórico — sin costo adicional. Los documentos ya aprobados se reutilizan automáticamente.",
      cta: "Completar el proceso · Iniciar Caso Práctico →",
      href: "/portal/evaluaciones",
      isAction: true,
    };
  }
  // Caso Práctico inscrito sin presentar.
  if (caso && !casoAttempt) {
    return {
      title: "Presente el Caso Práctico",
      detail: "Última evaluación del programa. Al aprobar se emite su certificado.",
      cta: "Completar el proceso · Iniciar Caso Práctico →",
      href: `/portal/inscripcion/${caso.id}`,
      isAction: true,
    };
  }
  if (casoAttempt?.status === "IN_PROGRESS") {
    return {
      title: "Continúe el Caso Práctico",
      cta: "Volver a la prueba →",
      href: `/portal/examen/${(casoAttempt as { id?: string }).id ?? ""}`,
      isAction: true,
    };
  }
  if (casoAttempt?.status === "PENDING_COMMITTEE" || casoAttempt?.status === "SUBMITTED") {
    return {
      title: "Caso Práctico en revisión",
      detail: "El comité del organismo está evaluando su entrega. Le notificaremos por correo.",
      cta: "Ver detalle del intento →",
      href: caso ? `/portal/inscripcion/${caso.id}` : "/portal/evaluaciones",
    };
  }
  if (casoAttempt?.passed === false) {
    return {
      title: "Caso Práctico no aprobado",
      detail: "Revise el resultado y las opciones de reintento.",
      cta: "Ver detalle del intento →",
      href: caso ? `/portal/inscripcion/${caso.id}` : "/portal/evaluaciones",
    };
  }
  if (casoAttempt?.passed === true && teorAttempt?.passed === true) {
    return {
      title: "Esperando emisión del certificado",
      detail: "Aprobó ambas evaluaciones. El organismo emite su certificado en breve.",
      cta: "Ver mis certificados →",
      href: "/portal/certificados",
    };
  }
  return null;
}
