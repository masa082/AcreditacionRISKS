import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { ConsentForm } from "@/components/consent-form";
import { DocumentUpload } from "@/components/document-upload";
import { EnrollmentNotes } from "@/components/enrollment-notes";
import { computeJourney, computeEnrollmentFees, type JourneyStep } from "@/lib/enrollment";
import { payEnrollment, bookSlot, cancelEnrollment } from "@/lib/actions/enrollment";
import { startAttempt } from "@/lib/actions/attempt";
import { money, dateTime } from "@/lib/format";

export const metadata = { title: "Inscripción" };

function Stepper({ steps, currentStep }: { steps: JourneyStep[]; currentStep: string | null }) {
  const visible = steps.filter((s) => s.required);
  return (
    <ol className="mb-6 flex flex-wrap gap-2">
      {visible.map((s, i) => {
        const state = s.done ? "done" : s.key === currentStep ? "current" : "todo";
        const cls =
          state === "done"
            ? "bg-emerald-100 text-emerald-700"
            : state === "current"
              ? "bg-brand-100 text-brand-800 ring-1 ring-brand-300"
              : "bg-slate-100 text-slate-500";
        return (
          <li key={s.key} className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
            <span className="font-bold">{s.done ? "✓" : i + 1}</span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

function StepCard({
  title,
  done,
  children,
}: {
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {done ? <Badge tone="green">Completado</Badge> : <Badge tone="amber">Pendiente</Badge>}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export default async function EnrollmentProcessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { subscriberId, candidateId } = await requireCandidatePage();

  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    include: {
      exam: true,
      scheme: { select: { id: true, name: true } },
    },
  });
  if (!enrollment || enrollment.candidateId !== candidateId) notFound();

  const requirePayment = enrollment.exam?.requirePayment ?? false;
  const requireSchedule = enrollment.exam?.requireSchedule ?? false;

  const journey = await computeJourney({
    subscriberId,
    candidateId,
    enrollmentId: enrollment.id,
    schemeId: enrollment.schemeId,
    requirePayment,
    requireSchedule,
  });
  const consentDone = journey.steps[0].done;
  const docsStep = journey.steps[1];
  const paymentStep = journey.steps[2];
  const scheduleStep = journey.steps[3];

  const terminal = ["IN_PROGRESS", "GRADING", "COMMITTEE", "APPROVED", "REJECTED", "CERTIFIED", "EXPIRED", "CANCELLED"].includes(enrollment.status);

  // --- Datos para cada paso ---
  const [policy, purposes, requiredDocs, submissions, payment, sessions, booking] = await Promise.all([
    prisma.privacyPolicyVersion.findFirst({ where: { subscriberId, isCurrent: true }, orderBy: { effectiveAt: "desc" } }),
    prisma.consentPurpose.findMany({ where: { subscriberId, isActive: true }, orderBy: { required: "desc" } }),
    enrollment.schemeId
      ? prisma.requiredDocument.findMany({ where: { subscriberId, schemeId: enrollment.schemeId, isActive: true }, orderBy: { required: "desc" } })
      : Promise.resolve([]),
    prisma.candidateDocument.findMany({ where: { enrollmentId: enrollment.id } }),
    prisma.payment.findFirst({ where: { enrollmentId: enrollment.id, status: "APPROVED" }, orderBy: { paidAt: "desc" } }),
    requireSchedule && enrollment.examId
      ? prisma.examSession.findMany({
          where: { subscriberId, examId: enrollment.examId, isActive: true, startsAt: { gte: new Date() } },
          orderBy: { startsAt: "asc" },
          include: { _count: { select: { bookings: { where: { status: { notIn: ["CANCELLED", "NO_SHOW"] } } } } } },
        })
      : Promise.resolve([]),
    prisma.scheduleBooking.findFirst({
      where: { enrollmentId: enrollment.id, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      include: { session: true },
    }),
  ]);

  const submissionByDoc = new Map(submissions.map((s) => [s.requiredDocumentId, s]));
  const fees = await computeEnrollmentFees(subscriberId, enrollment.schemeId);

  // Último intento de examen (para el CTA de presentación).
  const latestAttempt = enrollment.examId
    ? await prisma.examAttempt.findFirst({
        where: { enrollmentId: enrollment.id },
        orderBy: { attemptNumber: "desc" },
        select: { id: true, status: true, passed: true, scorePercent: true },
      })
    : null;
  const FINISHED_ATTEMPT = ["SUBMITTED", "AUTO_GRADED", "MANUAL_GRADING", "GRADED", "PASSED", "FAILED", "PENDING_COMMITTEE"];
  const canPresent = !!enrollment.exam;

  return (
    <>
      <PageHeader
        title={enrollment.exam?.name ?? enrollment.scheme?.name ?? "Inscripción"}
        subtitle={`Folio ${enrollment.code}`}
        actions={
          <Link href="/portal" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Volver
          </Link>
        }
      />

      <Stepper steps={journey.steps} currentStep={journey.currentStep} />

      <EnrollmentNotes />

      {latestAttempt?.status === "IN_PROGRESS" ? (
        <Card className="mb-6 border-l-4 border-l-amber-500 bg-amber-50/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-amber-800">Tiene un examen en curso.</p>
            <Link href={`/portal/examen/${latestAttempt.id}`} className="rounded-lg bg-brand-800 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-900">
              Continuar examen
            </Link>
          </div>
        </Card>
      ) : latestAttempt && FINISHED_ATTEMPT.includes(latestAttempt.status) ? (
        <Card className="mb-6 border-l-4 border-l-brand-600 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-700">
              Examen presentado{latestAttempt.scorePercent != null ? ` — calificación ${Number(latestAttempt.scorePercent.toString())}%` : ""}.
            </p>
            <Link href={`/portal/examen/${latestAttempt.id}/resultado`} className="rounded-lg border border-brand-300 px-5 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50">
              Ver resultado
            </Link>
          </div>
        </Card>
      ) : !terminal && journey.completed && canPresent ? (
        <Card className="mb-6 border-l-4 border-l-emerald-500 bg-emerald-50/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-emerald-800">
              ✓ ¡Inscripción completa! Está <strong>listo para presentar</strong> la evaluación.
            </p>
            <form action={startAttempt.bind(null, enrollment.id)}>
              <SubmitButton pendingText="Preparando…">Presentar examen</SubmitButton>
            </form>
          </div>
        </Card>
      ) : terminal ? (
        <Card className="mb-6 border-l-4 border-l-brand-600 p-5">
          <p className="text-sm text-slate-600">
            Esta inscripción está en estado <strong>{enrollment.status}</strong>.
          </p>
        </Card>
      ) : null}

      <div className="space-y-5">
        {/* Paso 1: Consentimiento */}
        <StepCard title="1. Autorización de tratamiento de datos" done={consentDone}>
          {consentDone ? (
            <p className="text-sm text-slate-600">
              Su autorización de datos quedó registrada. Gracias.
            </p>
          ) : policy ? (
            <ConsentForm
              enrollmentId={enrollment.id}
              policy={{ title: policy.title, content: policy.content, version: policy.version }}
              purposes={purposes.map((p) => ({ key: p.key, label: p.label, description: p.description, required: p.required }))}
            />
          ) : (
            <EmptyState>La entidad aún no ha publicado su política de tratamiento de datos.</EmptyState>
          )}
        </StepCard>

        {/* Pasos siguientes: se habilitan tras el consentimiento */}
        {consentDone && docsStep.required && (
          <StepCard title="2. Documentos requeridos" done={docsStep.done}>
            <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
              Adjunte copia de su documento de identidad, fotografía y los soportes de los datos
              consignados (último nivel de estudios, experiencia laboral y antecedentes). La
              información se trata de forma confidencial. Formatos PDF/JPG/PNG, máx. 10 MB por archivo.
            </p>
            <div className="space-y-3">
              {requiredDocs.map((doc) => {
                const sub = submissionByDoc.get(doc.id);
                return (
                  <DocumentUpload
                    key={doc.id}
                    enrollmentId={enrollment.id}
                    doc={{ id: doc.id, name: doc.name, description: doc.description, required: doc.required, acceptedTypes: doc.acceptedTypes }}
                    submission={sub ? { id: sub.id, fileName: sub.fileName, status: sub.status, reviewNotes: sub.reviewNotes } : undefined}
                  />
                );
              })}
            </div>
          </StepCard>
        )}

        {consentDone && paymentStep.required && (
          <StepCard title={`${docsStep.required ? "3" : "2"}. Pago`} done={paymentStep.done}>
            {payment ? (
              <div className="text-sm text-slate-600">
                <p className="font-medium text-emerald-700">Pago aprobado</p>
                <p className="mt-1">{money(payment.amount, payment.currency)} · {payment.description}</p>
                <p className="text-xs text-slate-400">Ref. {payment.providerRef} · {payment.paidAt ? dateTime(payment.paidAt) : ""}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fees.lines.length > 0 ? (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {fees.lines.map((l, i) => (
                      <li key={i} className="flex justify-between py-2">
                        <span className="text-slate-600">{l.label}</span>
                        <span className="font-medium text-slate-800">{money(l.amount, fees.currency)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between py-2 font-semibold">
                      <span>Total</span>
                      <span>{money(fees.total, fees.currency)}</span>
                    </li>
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Esta evaluación no tiene tarifas configuradas.</p>
                )}
                <form action={payEnrollment.bind(null, enrollment.id)}>
                  <SubmitButton pendingText="Procesando pago…">
                    {fees.total && Number(fees.total.toString()) > 0 ? `Pagar ${money(fees.total, fees.currency)} (simulado)` : "Confirmar (sin costo)"}
                  </SubmitButton>
                </form>
                <p className="text-xs text-slate-400">Pasarela de pago simulada para demostración. La integración real (Wompi/PayU/MercadoPago) se conecta en producción.</p>
              </div>
            )}
          </StepCard>
        )}

        {consentDone && scheduleStep.required && (
          <StepCard title={`${[docsStep, paymentStep].filter((s) => s.required).length + 2}. Agendamiento`} done={scheduleStep.done}>
            {booking ? (
              <div className="text-sm text-slate-600">
                <p className="font-medium text-emerald-700">Sesión reservada</p>
                <p className="mt-1">{dateTime(booking.session.startsAt)}</p>
                {booking.session.location ? <p className="text-xs text-slate-500">Lugar: {booking.session.location}</p> : null}
                {booking.session.meetingLink ? <p className="text-xs text-slate-500">Enlace: {booking.session.meetingLink}</p> : null}
                <p className="mt-2 text-xs text-slate-400">¿Necesita otro horario? Seleccione una nueva sesión abajo.</p>
                <SessionList enrollmentId={enrollment.id} sessions={sessions} currentSessionId={booking.sessionId} />
              </div>
            ) : sessions.length > 0 ? (
              <SessionList enrollmentId={enrollment.id} sessions={sessions} />
            ) : (
              <EmptyState>No hay sesiones disponibles por ahora. La entidad publicará nuevos horarios.</EmptyState>
            )}
          </StepCard>
        )}
      </div>

      {!terminal && (
        <form action={cancelEnrollment.bind(null, enrollment.id)} className="mt-8">
          <button type="submit" className="text-sm text-rose-600 hover:underline">
            Cancelar esta inscripción
          </button>
        </form>
      )}
    </>
  );
}

function SessionList({
  enrollmentId,
  sessions,
  currentSessionId,
}: {
  enrollmentId: string;
  sessions: Array<{ id: string; startsAt: Date; capacity: number; modality: string; location: string | null; _count: { bookings: number } }>;
  currentSessionId?: string;
}) {
  return (
    <ul className="mt-3 space-y-2">
      {sessions.map((s) => {
        const full = s.capacity > 0 && s._count.bookings >= s.capacity;
        const isCurrent = s.id === currentSessionId;
        return (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-2">
            <div className="text-sm">
              <div className="font-medium text-slate-800">{dateTime(s.startsAt)}</div>
              <div className="text-xs text-slate-400">
                {s.modality === "ONLINE" ? "En línea" : "Presencial"}
                {s.location ? ` · ${s.location}` : ""}
                {s.capacity > 0 ? ` · ${s._count.bookings}/${s.capacity} cupos` : ""}
              </div>
            </div>
            {isCurrent ? (
              <Badge tone="green">Reservada</Badge>
            ) : full ? (
              <Badge tone="slate">Sin cupos</Badge>
            ) : (
              <form action={bookSlot.bind(null, enrollmentId, s.id)}>
                <button type="submit" className="rounded-lg bg-brand-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-900">
                  Reservar
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
