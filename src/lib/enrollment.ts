import "server-only";
import { Prisma } from "@prisma/client";
import type { EnrollmentStatus, EnrollmentType, ExamType } from "@prisma/client";
import { prisma } from "./prisma";

// ============================================================================
//  Dominio de la inscripción (spine del flujo del candidato).
//  Calcula los pasos del proceso, el progreso y mantiene el estado sincronizado
//  a partir de la evidencia real (consentimiento, documentos, pagos, agenda).
// ============================================================================

export type StepKey = "consent" | "documents" | "payment" | "schedule";

export interface JourneyStep {
  key: StepKey;
  label: string;
  required: boolean;
  done: boolean;
}

export interface EnrollmentJourney {
  steps: JourneyStep[];
  currentStep: StepKey | null;
  completed: boolean;
  derivedStatus: EnrollmentStatus;
}

const STEP_LABELS: Record<StepKey, string> = {
  consent: "Autorización de datos",
  documents: "Documentos requeridos",
  payment: "Pago",
  schedule: "Agendamiento",
};

/// Mapea el tipo de examen al tipo de inscripción.
export function enrollmentTypeFromExam(t: ExamType): EnrollmentType {
  switch (t) {
    case "ADMISSION":
      return "ADMISSION";
    case "RECERTIFICATION":
      return "RECERTIFICATION";
    case "CERTIFICATION":
    case "FINAL":
      return "CERTIFICATION";
    default:
      return "EVALUATION";
  }
}

/// Genera un folio de inscripción único por suscriptor (INS-AAAA-NNNN).
export async function generateEnrollmentCode(subscriberId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INS-${year}-`;
  const count = await prisma.enrollment.count({
    where: { subscriberId, code: { startsWith: prefix } },
  });
  let seq = count + 1;
  // Reintentar ante colisiones (registros concurrentes / huecos).
  for (let i = 0; i < 50; i++) {
    const code = `${prefix}${String(seq).padStart(4, "0")}`;
    const exists = await prisma.enrollment.findFirst({
      where: { subscriberId, code },
      select: { id: true },
    });
    if (!exists) return code;
    seq++;
  }
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

interface JourneyInput {
  subscriberId: string;
  candidateId: string;
  enrollmentId: string;
  schemeId: string | null;
  requirePayment: boolean;
  requireSchedule: boolean;
}

/// Calcula el recorrido (pasos + progreso) de una inscripción a partir de la
/// evidencia almacenada. El consentimiento siempre es obligatorio.
export async function computeJourney(input: JourneyInput): Promise<EnrollmentJourney> {
  const { subscriberId, candidateId, enrollmentId, schemeId } = input;

  // 1) Consentimiento: existe un DataConsent del candidato.
  const consentCount = await prisma.dataConsent.count({
    where: { subscriberId, candidateId },
  });

  // 2) Documentos requeridos del esquema.
  const requiredDocs = schemeId
    ? await prisma.requiredDocument.findMany({
        where: { subscriberId, schemeId, isActive: true, required: true },
        select: { id: true },
      })
    : [];
  let docsDone = true;
  if (requiredDocs.length > 0) {
    const reqIds = requiredDocs.map((d) => d.id);

    // 2.a) Documentos cargados en ESTA inscripción y que no fueron rechazados.
    const submitted = await prisma.candidateDocument.findMany({
      where: {
        enrollmentId,
        requiredDocumentId: { in: reqIds },
        status: { not: "REJECTED" },
      },
      select: { requiredDocumentId: true },
    });

    // 2.b) Documentos APROBADOS por el organismo en CUALQUIER OTRA
    //      inscripción del mismo candidato y mismo esquema. Se reutilizan
    //      automáticamente — el candidato no debe volver a cargar archivos
    //      ya validados por el organismo (regla anti-reproceso). Solo
    //      consideramos APPROVED (no SUBMITTED) porque un documento solo
    //      "salta" la subida si tiene firma de revisor previa.
    const inherited = schemeId
      ? await prisma.candidateDocument.findMany({
          where: {
            requiredDocumentId: { in: reqIds },
            status: "APPROVED",
            enrollment: {
              candidateId,
              schemeId,
              NOT: { id: enrollmentId },
            },
          },
          select: { requiredDocumentId: true },
        })
      : [];

    const ok = new Set<string>();
    for (const d of submitted) if (d.requiredDocumentId) ok.add(d.requiredDocumentId);
    for (const d of inherited) if (d.requiredDocumentId) ok.add(d.requiredDocumentId);
    docsDone = requiredDocs.every((d) => ok.has(d.id));
  }

  // 3) Pago aprobado.
  const paidCount = input.requirePayment
    ? await prisma.payment.count({
        where: { enrollmentId, status: "APPROVED" },
      })
    : 0;

  // 4) Agendamiento (reserva activa).
  const bookingCount = input.requireSchedule
    ? await prisma.scheduleBooking.count({
        where: { enrollmentId, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      })
    : 0;

  const steps: JourneyStep[] = [
    { key: "consent", label: STEP_LABELS.consent, required: true, done: consentCount > 0 },
    {
      key: "documents",
      label: STEP_LABELS.documents,
      required: requiredDocs.length > 0,
      done: docsDone,
    },
    {
      key: "payment",
      label: STEP_LABELS.payment,
      required: input.requirePayment,
      done: !input.requirePayment || paidCount > 0,
    },
    {
      key: "schedule",
      label: STEP_LABELS.schedule,
      required: input.requireSchedule,
      done: !input.requireSchedule || bookingCount > 0,
    },
  ];

  const pending = steps.filter((s) => s.required && !s.done);
  const currentStep = pending[0]?.key ?? null;
  const completed = pending.length === 0;

  let derivedStatus: EnrollmentStatus;
  if (!steps[0].done) derivedStatus = "CONSENT_PENDING";
  else if (steps[1].required && !steps[1].done) derivedStatus = "DOCS_PENDING";
  else if (steps[2].required && !steps[2].done) derivedStatus = "PAYMENT_PENDING";
  else if (steps[3].required && !steps[3].done) derivedStatus = "SCHEDULING";
  else derivedStatus = "READY";

  return { steps, currentStep, completed, derivedStatus };
}

const PRE_PRESENTATION: EnrollmentStatus[] = [
  "STARTED",
  "CONSENT_PENDING",
  "DOCS_PENDING",
  "PAYMENT_PENDING",
  "SCHEDULING",
  "READY",
];

/// Recalcula y persiste el estado de la inscripción a partir del progreso real,
/// solo mientras está en la fase previa a la presentación. Devuelve el journey.
export async function syncEnrollmentStatus(
  enrollmentId: string,
): Promise<EnrollmentJourney | null> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { exam: { select: { requirePayment: true, requireSchedule: true } } },
  });
  if (!enrollment) return null;

  const journey = await computeJourney({
    subscriberId: enrollment.subscriberId,
    candidateId: enrollment.candidateId,
    enrollmentId: enrollment.id,
    schemeId: enrollment.schemeId,
    requirePayment: enrollment.exam?.requirePayment ?? false,
    requireSchedule: enrollment.exam?.requireSchedule ?? false,
  });

  if (
    PRE_PRESENTATION.includes(enrollment.status) &&
    enrollment.status !== journey.derivedStatus
  ) {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: journey.derivedStatus },
    });
  }
  return journey;
}

/// Suma las tarifas aplicables a la inscripción (inscripción + examen).
export async function computeEnrollmentFees(
  subscriberId: string,
  schemeId: string | null,
): Promise<{ total: Prisma.Decimal; currency: string; lines: { label: string; amount: Prisma.Decimal }[] }> {
  const fees = schemeId
    ? await prisma.feeConfig.findMany({
        where: {
          subscriberId,
          schemeId,
          isActive: true,
          concept: { in: ["ENROLLMENT", "EXAM"] },
        },
        orderBy: { concept: "asc" },
      })
    : [];
  const currency = fees[0]?.currency ?? "COP";
  let total = new Prisma.Decimal(0);
  const lines = fees.map((f) => {
    total = total.plus(f.amount);
    return { label: f.label, amount: f.amount };
  });
  return { total, currency, lines };
}
