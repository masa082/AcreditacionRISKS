/**
 * Repara enrollments cuyo `status` quedó congelado en un estado
 * "PENDING" aunque el journey real (incluyendo herencia de documentos
 * y pagos previos del mismo programa) lo da por completo.
 *
 * El campo `enrollment.status` se actualizaba SOLO tras una escritura
 * (subir doc, pagar, etc.). Cuando una nueva inscripción del mismo
 * programa reusa documentos APROBADOS de la anterior, no hay escritura
 * — y el status no se sincronizaba.
 *
 * Este script recomputa el journey de TODAS las inscripciones en
 * estado PRE-PRESENTACIÓN y actualiza el status si cambia. Idempotente.
 *
 * NOTA: la lógica de journey se inlinea aquí (no se importa de src/lib
 * por incompatibilidad de path aliases en scripts CLI).
 *
 * Uso:
 *   - LOCAL:  npm run sync:stale-enrollments
 *   - PROD:   DATABASE_URL="<railway-url>" npm run sync:stale-enrollments
 */
import { PrismaClient, type EnrollmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

const PRE_PRESENTATION: EnrollmentStatus[] = [
  "STARTED",
  "CONSENT_PENDING",
  "DOCS_PENDING",
  "PAYMENT_PENDING",
  "SCHEDULING",
];

/**
 * Re-evalúa el status REAL de una inscripción. Reproduce 1:1 la
 * lógica de src/lib/enrollment.ts::computeJourney + syncEnrollmentStatus,
 * incluyendo la regla de HERENCIA: documentos APROBADOS en otras
 * inscripciones del mismo (candidato, esquema) cuentan como completos.
 *
 * Para el pago, la misma lógica `coveredByPrevious`: si requirePayment
 * es true pero hay un pago APROBADO en cualquier inscripción del mismo
 * candidato+esquema, se considera cubierto.
 */
async function deriveStatus(
  enrollmentId: string,
): Promise<EnrollmentStatus | null> {
  const e = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { exam: { select: { requirePayment: true, requireSchedule: true } } },
  });
  if (!e) return null;

  // 1) Consentimiento (DataConsent existe para el candidato).
  const consentCount = await prisma.dataConsent.count({
    where: { subscriberId: e.subscriberId, candidateId: e.candidateId },
  });
  if (consentCount === 0) return "CONSENT_PENDING";

  // 2) Documentos.
  if (e.schemeId) {
    const required = await prisma.requiredDocument.findMany({
      where: { subscriberId: e.subscriberId, schemeId: e.schemeId, isActive: true, required: true },
      select: { id: true },
    });
    if (required.length > 0) {
      const reqIds = required.map((r) => r.id);

      // Locales no rechazados.
      const localOk = await prisma.candidateDocument.findMany({
        where: {
          enrollmentId: e.id,
          requiredDocumentId: { in: reqIds },
          status: { not: "REJECTED" },
        },
        select: { requiredDocumentId: true },
      });

      // Aprobados en OTRAS inscripciones del mismo candidato+esquema.
      const inherited = await prisma.candidateDocument.findMany({
        where: {
          requiredDocumentId: { in: reqIds },
          status: "APPROVED",
          enrollment: {
            candidateId: e.candidateId,
            schemeId: e.schemeId,
            NOT: { id: e.id },
          },
        },
        select: { requiredDocumentId: true },
      });

      const ok = new Set<string>();
      for (const d of localOk) if (d.requiredDocumentId) ok.add(d.requiredDocumentId);
      for (const d of inherited) if (d.requiredDocumentId) ok.add(d.requiredDocumentId);
      if (!required.every((r) => ok.has(r.id))) return "DOCS_PENDING";
    }
  }

  // 3) Pago.
  if (e.exam?.requirePayment) {
    const paidLocal = await prisma.payment.count({
      where: { enrollmentId: e.id, status: "APPROVED" },
    });
    if (paidLocal === 0) {
      // Cubierto por otro pago del mismo programa.
      const paidOther = e.schemeId
        ? await prisma.payment.count({
            where: {
              status: "APPROVED",
              amount: { gt: 0 },
              enrollment: {
                candidateId: e.candidateId,
                schemeId: e.schemeId,
                NOT: { id: e.id },
              },
            },
          })
        : 0;
      if (paidOther === 0) return "PAYMENT_PENDING";
    }
  }

  // 4) Agendamiento.
  if (e.exam?.requireSchedule) {
    const booked = await prisma.scheduleBooking.count({
      where: { enrollmentId: e.id, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    });
    if (booked === 0) return "SCHEDULING";
  }

  return "READY";
}

async function main() {
  const stale = await prisma.enrollment.findMany({
    where: { status: { in: PRE_PRESENTATION } },
    select: { id: true, code: true, status: true },
  });
  console.log(`→ ${stale.length} inscripción(es) pre-presentación a re-evaluar...`);

  let changed = 0;
  for (const e of stale) {
    const next = await deriveStatus(e.id);
    if (!next) continue;
    if (next !== e.status) {
      await prisma.enrollment.update({ where: { id: e.id }, data: { status: next } });
      console.log(`  ✓ ${e.code}: ${e.status} → ${next}`);
      changed++;
    }
  }
  console.log(`\n✅ ${changed}/${stale.length} inscripción(es) reparadas.`);
}

main()
  .catch((e) => {
    console.error("✗", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
