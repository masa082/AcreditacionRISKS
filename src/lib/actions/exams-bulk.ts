"use server";

import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

type ExamType = "PRACTICAL" | "THEORETICAL";

interface BulkEnableExamOpts {
  enrollmentIds: string[];
  examType: ExamType;
  sendNotification?: boolean;
}

/**
 * Habilita examen práctico o teórico para candidatos seleccionados.
 * Valida que cumplan requisitos previos.
 * Envía correo personalizado (UNO A UNO, no MASIVO).
 */
export async function bulkEnableExam(opts: BulkEnableExamOpts) {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.LEAD_MANAGE);

  if (!opts.enrollmentIds.length) {
    return { ok: false, error: "Seleccione al menos un candidato" };
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { id: { in: opts.enrollmentIds }, subscriberId },
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
      exam: { select: { id: true, name: true } },
      attempts: { select: { scorePercent: true, status: true } },
      documents: { select: { id: true, status: true } },
    },
  });

  if (!enrollments.length) {
    return { ok: false, error: "Candidatos no encontrados" };
  }

  let enabled = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const enrollment of enrollments) {
    try {
      // Validar prerrequisitos
      const { isEligible, reason } = validateEnrollmentEligibility(enrollment, opts.examType);
      if (!isEligible) {
        failed++;
        errors.push(`${enrollment.candidate.firstName}: ${reason}`);
        continue;
      }

      // Re-habilitar examen
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          practicalCaseDisabledAt: null,
        },
      });

      // Enviar correo (UNO A UNO, no MASIVO)
      if (opts.sendNotification && enrollment.exam) {
        const subject = `${enrollment.exam.name} habilitado nuevamente`;
        const body = `Hola ${enrollment.candidate.firstName},\n\nTe informamos que tu ${opts.examType === "PRACTICAL" ? "caso práctico" : "examen teórico"} ha sido habilitado nuevamente.\n\nDirigete a tu portal para continuar con tu certificación.`;

        await prisma.emailLog.create({
          data: {
            subscriberId,
            candidateId: enrollment.candidate.id,
            toEmail: enrollment.candidate.email,
            subject,
            bodyPreview: body.slice(0, 100),
            bodyHtml: `<p>${body.replace(/\n/g, "</p><p>")}</p>`,
            kind: "TRANSACTIONAL", // UNO A UNO, no BULK
            status: "SENT",
            sentById: ctx.userId, // Usuario actual, no SISTEMA
            groupId: undefined,
          },
        });

        // Enviar email real
        await sendEmail({
          subscriberId,
          to: enrollment.candidate.email,
          subject,
          html: `<p>${body.replace(/\n/g, "</p><p>")}</p>`,
          text: body,
        }).catch((e) => console.error(`Email fail ${enrollment.candidate.email}:`, e));
      }

      enabled++;
    } catch (e) {
      failed++;
      errors.push(
        `${enrollment.candidate.firstName}: ${e instanceof Error ? e.message : "error"}`,
      );
    }
  }

  // Auditar
  await audit(ctx, {
    action: `exam.${opts.examType.toLowerCase()}.bulk_enable`,
    entity: "Exam",
    subscriberId,
    after: { count: opts.enrollmentIds.length, enabled, failed, examType: opts.examType },
  });

  revalidatePath("/panel/candidatos");

  return {
    ok: failed === 0,
    enabled,
    failed,
    error: errors.length > 0 ? errors[0] : undefined,
    errors: errors.slice(0, 10),
    message: `${enabled} habilitado(s), ${failed} fallaron`,
  };
}

function validateEnrollmentEligibility(
  enrollment: any,
  examType: ExamType,
): { isEligible: boolean; reason: string } {
  // Validar documentos APROBADOS
  const docsApproved = enrollment.documents?.filter((d: any) => d.status === "APPROVED").length ?? 0;

  if (docsApproved === 0) {
    return { isEligible: false, reason: "Falta subir documentos aprobados" };
  }

  if (examType === "PRACTICAL") {
    // Verificar que presentó caso práctico en 0% O lo reprobó
    // NOTA: scorePercent puede estar en cualquier status (MANUAL_GRADING, GRADED, AUTO_GRADED, etc)
    const practicalAttempts = enrollment.attempts.filter(
      (a: any) => a.status === "FAILED" || Number(a.scorePercent) === 0,
    );
    if (!practicalAttempts.length) {
      return { isEligible: false, reason: "El candidato aún no ha presentado el caso práctico o no cumple criterios" };
    }
  } else if (examType === "THEORETICAL") {
    // Verificar que reprobó examen teórico
    const theoreticalAttempts = enrollment.attempts.filter((a: any) => a.status === "FAILED");
    // DEBUG INFO
    const attemptDetails = enrollment.attempts
      .map((a: any) => `${a.status}`)
      .join(", ");
    if (!theoreticalAttempts.length) {
      return {
        isEligible: false,
        reason: `[Teórico FAILED requerido] ${enrollment.candidate.firstName}: Total intentos: ${enrollment.attempts.length}, Estatus: [${attemptDetails}], FAILED encontrados: ${theoreticalAttempts.length}`,
      };
    }
  }

  return { isEligible: true, reason: "" };
}
