import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { ConsentForm } from "@/components/consent-form";
import { DocumentUpload } from "@/components/document-upload";
import { EnrollmentNotes } from "@/components/enrollment-notes";
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import { PaymentReceiptUpload } from "@/components/payment-receipt-upload";
import { computeJourney, computeEnrollmentFees, type JourneyStep } from "@/lib/enrollment";
import { bookSlot, cancelEnrollment } from "@/lib/actions/enrollment";
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
  // Saber si el suscriptor tiene Rapyd activo decide si la opción "Pago en
  // línea" aparece habilitada o bloqueada con un aviso.
  const subscriberPay = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { rapydEnabled: true, rapydAccessKey: true, rapydSecretKey: true },
  });
  const hasRapyd = !!(subscriberPay?.rapydEnabled && subscriberPay.rapydAccessKey && subscriberPay.rapydSecretKey);
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
    prisma.payment.findFirst({ where: { enrollmentId: enrollment.id, status: { in: ["APPROVED", "PENDING", "REJECTED"] } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
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

  // Documentos APROBADOS por el organismo en inscripciones ANTERIORES
  // del mismo candidato y mismo esquema. Se reutilizan en esta inscripción
  // para no obligarlo a re-cargar archivos ya validados (anti-reproceso).
  // Se marcan con `inheritedFromEnrollmentId` para que la UI sepa que el
  // archivo vive en otra inscripción y NO mostrar formulario de subida.
  const inheritedDocs = enrollment.schemeId
    ? await prisma.candidateDocument.findMany({
        where: {
          requiredDocumentId: { in: requiredDocs.map((d) => d.id) },
          status: "APPROVED",
          enrollment: {
            candidateId,
            schemeId: enrollment.schemeId,
            NOT: { id: enrollment.id },
          },
        },
        orderBy: { uploadedAt: "desc" },
        include: { enrollment: { select: { code: true } } },
      })
    : [];

  // Map por requiredDocumentId. Priorizamos las submissions de ESTA
  // inscripción; solo si no existe una local, usamos la heredada.
  const submissionByDoc = new Map<string, {
    id: string;
    fileName: string | null;
    status: string;
    reviewNotes: string | null;
    inheritedFromEnrollmentCode?: string;
  }>();
  for (const s of submissions) {
    if (!s.requiredDocumentId) continue;
    submissionByDoc.set(s.requiredDocumentId, {
      id: s.id,
      fileName: s.fileName,
      status: s.status,
      reviewNotes: s.reviewNotes,
    });
  }
  for (const d of inheritedDocs) {
    if (!d.requiredDocumentId) continue;
    if (submissionByDoc.has(d.requiredDocumentId)) continue;
    submissionByDoc.set(d.requiredDocumentId, {
      id: d.id,
      fileName: d.fileName,
      status: "APPROVED",
      reviewNotes: d.reviewNotes,
      inheritedFromEnrollmentCode: d.enrollment?.code ?? undefined,
    });
  }

  const fees = await computeEnrollmentFees(subscriberId, enrollment.schemeId);

  const { getMarketingConfig } = await import("@/lib/marketing-config");
  const marketing = await getMarketingConfig();

  // ¿Tiene un descuento de referido activo en esta inscripción?
  const activeReferral = await prisma.referral.findFirst({
    where: { enrollmentId: enrollment.id, status: { in: ["PENDING", "CONFIRMED"] } },
    select: { discountPercent: true, referrer: { select: { fullName: true, code: true } } },
  });
  const refPct = activeReferral ? Number(activeReferral.discountPercent.toString()) : 0;
  const refDiscount = activeReferral && fees.total
    ? Number(fees.total.toString()) * (refPct / 100)
    : 0;
  const refFinalTotal = activeReferral
    ? Number(fees.total.toString()) - refDiscount
    : Number(fees.total.toString());

  // Detecta si esta inscripción ya quedaría cubierta por un pago previo del
  // mismo programa (mismo schemeId, otro enrollment del mismo candidato).
  const coveredByPrevious = !payment && enrollment.schemeId
    ? Boolean(
        await prisma.payment.findFirst({
          where: {
            status: "APPROVED",
            amount: { gt: 0 },
            enrollment: { candidateId, schemeId: enrollment.schemeId, NOT: { id: enrollment.id } },
          },
          select: { id: true },
        }),
      )
    : false;

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
            <Link href={`/portal/examen/${latestAttempt.id}`} className="rounded-lg btn-grad-navy px-5 py-2 text-sm font-semibold text-white">
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
              información se trata de forma confidencial. Formatos PDF/JPG/PNG, máx. 100 MB por archivo (se comprime automáticamente sin perder calidad).
            </p>
            <div className="space-y-3">
              {requiredDocs.map((doc) => {
                const sub = submissionByDoc.get(doc.id);
                return (
                  <DocumentUpload
                    key={doc.id}
                    enrollmentId={enrollment.id}
                    doc={{ id: doc.id, name: doc.name, description: doc.description, required: doc.required, acceptedTypes: doc.acceptedTypes }}
                    submission={sub ? {
                      id: sub.id,
                      fileName: sub.fileName,
                      status: sub.status,
                      reviewNotes: sub.reviewNotes,
                      inheritedFromEnrollmentCode: sub.inheritedFromEnrollmentCode,
                    } : undefined}
                  />
                );
              })}
            </div>
          </StepCard>
        )}

        {consentDone && paymentStep.required && (
          <StepCard title={`${docsStep.required ? "3" : "2"}. Pago`} done={paymentStep.done}>
            {payment && payment.status === "APPROVED" ? (
              <div className="text-sm text-slate-600">
                <p className="font-medium text-emerald-700">✓ Pago aprobado</p>
                <p className="mt-1">{money(payment.amount, payment.currency)} · {payment.description}</p>
                <p className="text-xs text-slate-400">Ref. {payment.providerRef} · {payment.paidAt ? dateTime(payment.paidAt) : ""}</p>
              </div>
            ) : payment && payment.status === "PENDING" ? (
              (() => {
                // ¿Ya subió el soporte de pago?
                const meta = (payment.metadata as { receipt?: { fileName?: string }; rapyd?: { redirectUrl?: string; checkoutId?: string }; method?: string } | null) ?? {};
                const hasReceipt = !!payment.receiptUrl || !!meta.receipt;
                const isOnlinePending = meta.method === "online" && meta.rapyd?.redirectUrl;
                if (isOnlinePending) {
                  return (
                    <div className="space-y-3 rounded-xl border-2 border-brand-300 bg-brand-50/40 p-5">
                      <h3 className="text-base font-bold text-brand-900">⏳ Pago en línea en curso</h3>
                      <p className="text-sm text-brand-900">
                        Si cerró la ventana de la pasarela, puede continuar el pago aquí:
                      </p>
                      <a
                        href={meta.rapyd!.redirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg btn-grad-navy px-4 py-2 text-sm font-bold text-white"
                      >
                        Continuar pago en línea ↗
                      </a>
                      <p className="text-xs text-slate-500">
                        ¿Prefiere pagar por consignación? Su solicitud queda pendiente; pulse abajo
                        para cancelar y elegir otro método.
                      </p>
                    </div>
                  );
                }
                // Caso manual: instrucciones + carga de soporte
                return (
                  <PaymentReceiptUpload
                    paymentId={payment.id}
                    hasReceipt={hasReceipt}
                    receiptName={meta.receipt?.fileName ?? null}
                    bankingInfo={marketing.bankingInfo}
                    amount={money(payment.amount, payment.currency)}
                    currency={payment.currency}
                  />
                );
              })()
            ) : payment && payment.status === "REJECTED" ? (
              <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm">
                <p className="font-semibold text-rose-800">⚠ Pago rechazado</p>
                <p className="text-rose-700">Su pago fue rechazado por el organismo. Contacte a soporte para conocer el motivo y reintente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {coveredByPrevious ? (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
                    Esta evaluación está <strong>cubierta</strong> por el pago previo del programa. No se cobrará un nuevo cargo.
                  </div>
                ) : fees.lines.length > 0 ? (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {fees.lines.map((l, i) => (
                      <li key={i} className="flex justify-between py-2">
                        <span className="text-slate-600">{l.label}</span>
                        <span className="font-medium text-slate-800">{money(l.amount, fees.currency)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between py-2 font-semibold">
                      <span>Subtotal</span>
                      <span>{money(fees.total, fees.currency)}</span>
                    </li>
                    {activeReferral ? (
                      <>
                        <li className="flex justify-between py-1 text-sm font-medium text-emerald-700">
                          <span>Descuento referido ({activeReferral.referrer.code})</span>
                          <span>− {money(refDiscount, fees.currency)}</span>
                        </li>
                        <li className="flex justify-between py-2 font-bold text-brand-800">
                          <span>Total a pagar</span>
                          <span>{money(refFinalTotal, fees.currency)}</span>
                        </li>
                      </>
                    ) : null}
                    <li className="flex justify-between py-1 text-xs text-slate-500">
                      <span>+ IVA</span>
                      <span>según legislación aplicable</span>
                    </li>
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Esta evaluación no tiene tarifas configuradas.</p>
                )}
                {coveredByPrevious ? (
                  <form
                    action={async () => {
                      "use server";
                      const { payEnrollment } = await import("@/lib/actions/enrollment");
                      const fd = new FormData();
                      fd.set("method", "manual");
                      fd.set("acceptRefund", "on");
                      fd.set("acceptEconomicUse", "on");
                      await payEnrollment(enrollment.id, { ok: false }, fd);
                    }}
                  >
                    <SubmitButton pendingText="Confirmando…">
                      Confirmar (cubierto por pago previo)
                    </SubmitButton>
                  </form>
                ) : fees.total && Number(fees.total.toString()) > 0 ? (
                  <PaymentMethodSelector
                    enrollmentId={enrollment.id}
                    enrollmentCode={enrollment.code ?? enrollment.id.slice(-6).toUpperCase()}
                    amount={money(refFinalTotal, fees.currency)}
                    currency={fees.currency}
                    hasRapyd={hasRapyd}
                    bankingInfo={marketing.bankingInfo}
                  />
                ) : (
                  <form
                    action={async () => {
                      "use server";
                      const { payEnrollment } = await import("@/lib/actions/enrollment");
                      const fd = new FormData();
                      fd.set("method", "manual");
                      fd.set("acceptRefund", "on");
                      fd.set("acceptEconomicUse", "on");
                      await payEnrollment(enrollment.id, { ok: false }, fd);
                    }}
                  >
                    <SubmitButton pendingText="Confirmando…">Confirmar (sin costo)</SubmitButton>
                  </form>
                )}
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
                <button type="submit" className="rounded-lg btn-grad-navy px-3 py-1.5 text-xs font-semibold text-white">
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
