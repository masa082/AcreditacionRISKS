"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCandidateAction } from "@/lib/guards";
import { audit } from "@/lib/audit";
import { sha256, newToken } from "@/lib/auth";
import {
  generateEnrollmentCode,
  enrollmentTypeFromExam,
  syncEnrollmentStatus,
  computeEnrollmentFees,
} from "@/lib/enrollment";
import { saveUpload, deleteByKey, extFromName, MAX_UPLOAD_BYTES } from "@/lib/storage";
import type { ActionResult } from "@/lib/actions/schemes";

async function loadOwnedEnrollment(candidateId: string, enrollmentId: string) {
  const e = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { exam: true },
  });
  if (!e || e.candidateId !== candidateId) throw new Error("NOT_FOUND");
  return e;
}

// ----------------------------------------------------------------------------
//  Inscribirse en una evaluación publicada.
// ----------------------------------------------------------------------------
export async function startEnrollment(examId: string): Promise<void> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { scheme: { select: { name: true } } },
  });
  if (!exam || exam.subscriberId !== subscriberId || exam.status !== "PUBLISHED") {
    throw new Error("La evaluación no está disponible.");
  }
  // Defensa en profundidad: bloquear inscripciones a esquemas anunciados como
  // "Próximamente" en el catálogo público (lib/brand.ts).
  const { isSchemeComingSoon } = await import("@/lib/brand");
  if (isSchemeComingSoon(exam.scheme?.name)) {
    throw new Error("Este programa aún no está abierto para inscripción. Estará disponible próximamente.");
  }
  const now = new Date();
  if (exam.availableFrom && exam.availableFrom > now) throw new Error("La evaluación aún no está disponible.");
  if (exam.availableTo && exam.availableTo < now) throw new Error("La inscripción a esta evaluación ya cerró.");

  // Reutilizar inscripción activa existente para el mismo examen.
  const existing = await prisma.enrollment.findFirst({
    where: {
      candidateId,
      examId,
      status: { notIn: ["CANCELLED", "REJECTED", "EXPIRED"] },
    },
    select: { id: true },
  });
  if (existing) {
    redirect(`/portal/inscripcion/${existing.id}`);
  }

  const code = await generateEnrollmentCode(subscriberId);
  const created = await prisma.enrollment.create({
    data: {
      subscriberId,
      candidateId,
      schemeId: exam.schemeId,
      examId: exam.id,
      type: enrollmentTypeFromExam(exam.type),
      status: "CONSENT_PENDING",
      code,
    },
  });
  // Si el candidato venía con código de referido (cookie persistida desde la
  // landing /r/[code] o desde ?ref=), crear el Referral PENDING.
  try {
    const { cookies } = await import("next/headers");
    const refCode = (await cookies()).get("ref_code")?.value;
    if (refCode) {
      const { attachReferralCode } = await import("@/lib/actions/referrals");
      await attachReferralCode({
        code: refCode,
        candidateId,
        enrollmentId: created.id,
        subscriberId,
      });
    }
  } catch {
    /* el referido es opcional, no debe bloquear la inscripción */
  }
  await syncEnrollmentStatus(created.id);
  await audit(ctx, {
    action: "enrollment.start",
    entity: "Enrollment",
    entityId: created.id,
    subscriberId,
    after: { code, examId },
  });
  revalidatePath("/portal");
  redirect(`/portal/inscripcion/${created.id}`);
}

// ----------------------------------------------------------------------------
//  Autorización de tratamiento de datos personales.
// ----------------------------------------------------------------------------
export async function giveConsent(
  enrollmentId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  if (formData.get("accept") !== "on") {
    return { ok: false, error: "Debe aceptar la política para continuar." };
  }
  await loadOwnedEnrollment(candidateId, enrollmentId);

  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) return { ok: false, error: "Candidato no encontrado." };

  const policy = await prisma.privacyPolicyVersion.findFirst({
    where: { subscriberId, isCurrent: true },
    orderBy: { effectiveAt: "desc" },
  });
  if (!policy) {
    return { ok: false, error: "La entidad aún no ha publicado su política de datos." };
  }

  const purposeDefs = await prisma.consentPurpose.findMany({
    where: { subscriberId, isActive: true },
  });
  const purposes: Record<string, boolean> = {};
  for (const p of purposeDefs) {
    purposes[p.key] = p.required ? true : formData.get(`purpose_${p.key}`) === "on";
  }

  const hdrMeta = `${candidate.id}:${policy.id}:${new Date().toISOString()}`;
  await prisma.dataConsent.create({
    data: {
      subscriberId,
      candidateId,
      policyId: policy.id,
      holderName: `${candidate.firstName} ${candidate.lastName}`,
      documentType: candidate.documentType,
      documentNumber: candidate.documentNumber,
      policyVersion: policy.version,
      purposes,
      evidenceHash: sha256(hdrMeta),
    },
  });

  await syncEnrollmentStatus(enrollmentId);
  await audit(ctx, {
    action: "consent.accept",
    entity: "DataConsent",
    entityId: enrollmentId,
    subscriberId,
    after: { policyVersion: policy.version },
  });
  revalidatePath(`/portal/inscripcion/${enrollmentId}`);
  return { ok: true };
}

// ----------------------------------------------------------------------------
//  Adjuntar un documento/evidencia requerido (archivo real: PDF/imagen).
// ----------------------------------------------------------------------------
export async function submitDocument(
  enrollmentId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const enrollment = await loadOwnedEnrollment(candidateId, enrollmentId);

  const requiredDocumentId = String(formData.get("requiredDocumentId") ?? "");
  if (!requiredDocumentId) return { ok: false, error: "Documento inválido." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Adjunte un archivo." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "El archivo supera el tamaño máximo de 10 MB." };
  }

  const reqDoc = await prisma.requiredDocument.findFirst({
    where: { id: requiredDocumentId, subscriberId, schemeId: enrollment.schemeId ?? undefined },
    select: { id: true, name: true, acceptedTypes: true },
  });
  if (!reqDoc) return { ok: false, error: "El documento no corresponde a este proceso." };

  const ext = extFromName(file.name);
  const normalized = ext === "jpeg" ? "jpg" : ext;
  const accepted = (reqDoc.acceptedTypes.length ? reqDoc.acceptedTypes : ["pdf", "jpg", "png"]).map((t) => t.toLowerCase());
  if (!accepted.includes(ext) && !accepted.includes(normalized)) {
    return { ok: false, error: `Formato no permitido. Use: ${accepted.join(", ")}.` };
  }

  const { key } = await saveUpload(file, [subscriberId, enrollmentId, reqDoc.id]);

  // Reemplazar entregas previas del mismo requisito (reenvío tras rechazo).
  const prev = await prisma.candidateDocument.findMany({
    where: { enrollmentId, requiredDocumentId: reqDoc.id },
    select: { fileUrl: true },
  });
  await prisma.candidateDocument.deleteMany({ where: { enrollmentId, requiredDocumentId: reqDoc.id } });
  for (const p of prev) {
    if (!/^https?:\/\//i.test(p.fileUrl)) await deleteByKey(p.fileUrl);
  }
  await prisma.candidateDocument.create({
    data: {
      enrollmentId,
      requiredDocumentId: reqDoc.id,
      fileUrl: key,
      fileName: file.name,
      status: "SUBMITTED",
    },
  });

  await syncEnrollmentStatus(enrollmentId);
  await audit(ctx, {
    action: "document.submit",
    entity: "CandidateDocument",
    entityId: enrollmentId,
    subscriberId,
    after: { requiredDocumentId: reqDoc.id, fileName: file.name },
  });
  revalidatePath(`/portal/inscripcion/${enrollmentId}`);
  return { ok: true };
}

// ----------------------------------------------------------------------------
//  Inicio del pago.
//  - Modo `mock`  → aprobación instantánea (solo para entornos demo/local).
//  - Modo `manual`/sin variable → crea Payment PENDING; el admin del
//    suscriptor lo aprueba en /panel/pagos al verificar la transferencia,
//    o un webhook real lo confirmará cuando se conecte la pasarela.
//  - Modo `wompi`/`payu` (futuro) → redirección al checkout externo. El
//    webhook actualizará el estado.
// ----------------------------------------------------------------------------
export async function payEnrollment(enrollmentId: string): Promise<void> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const enrollment = await loadOwnedEnrollment(candidateId, enrollmentId);

  // Si ya tiene un Payment activo (cualquier estado distinto de REJECTED),
  // no creamos otro: lo dejamos avanzar al flujo.
  const existing = await prisma.payment.findFirst({
    where: { enrollmentId, status: { in: ["APPROVED", "PENDING"] } },
    select: { id: true, status: true },
  });
  if (existing) {
    revalidatePath(`/portal/inscripcion/${enrollmentId}`);
    return;
  }

  // Si el candidato ya pagó el programa (mismo esquema) en otra inscripción,
  // esta segunda evaluación del mismo programa queda cubierta sin cobro
  // adicional. Se crea un Payment APPROVED con monto 0 y referencia al pago
  // original, para mantener la trazabilidad sin doblar el cobro.
  let coveredBy: { id: string; providerRef: string | null; amount: string } | null = null;
  if (enrollment.schemeId) {
    const sibling = await prisma.payment.findFirst({
      where: {
        status: "APPROVED",
        enrollment: { candidateId, schemeId: enrollment.schemeId, NOT: { id: enrollmentId } },
        amount: { gt: 0 },
      },
      orderBy: { paidAt: "asc" },
      select: { id: true, providerRef: true, amount: true },
    });
    if (sibling) {
      coveredBy = { id: sibling.id, providerRef: sibling.providerRef, amount: sibling.amount.toString() };
    }
  }

  const { total, currency, lines } = await computeEnrollmentFees(subscriberId, enrollment.schemeId);
  const description = lines.length
    ? lines.map((l) => l.label).join(" + ")
    : "Inscripción a evaluación";

  // Resolución del proveedor de pago en orden de prioridad:
  //   1. Cubierto por pago previo del mismo programa → "internal", APPROVED.
  //   2. Suscriptor con Rapyd habilitado y claves configuradas → "rapyd"
  //      (PENDING + crear Hosted Checkout + redirigir al candidato).
  //   3. Variable de entorno PAYMENT_PROVIDER (mock / manual / wompi / payu).
  const subscriberPayment = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: {
      country: true,
      rapydEnabled: true,
      rapydAccessKey: true,
      rapydSecretKey: true,
      rapydEnv: true,
    },
  });
  const subscriberHasRapyd = !!(
    subscriberPayment?.rapydEnabled &&
    subscriberPayment.rapydAccessKey &&
    subscriberPayment.rapydSecretKey
  );
  const envProvider = (process.env.PAYMENT_PROVIDER || "manual").toLowerCase();
  const providerEnv = subscriberHasRapyd ? "rapyd" : envProvider;
  const isMock = providerEnv === "mock";
  const isRapyd = providerEnv === "rapyd";
  const isCovered = !!coveredBy;

  // Aplicación de descuento por código de referido.
  const referral = !isCovered ? await prisma.referral.findFirst({
    where: { enrollmentId, status: "PENDING" },
    select: { id: true, discountPercent: true, referrerId: true },
  }) : null;
  const discountPct = referral ? Number(referral.discountPercent.toString()) : 0;
  const discountAmount = referral && total.greaterThan(0)
    ? total.times(new Prisma.Decimal(discountPct / 100))
    : new Prisma.Decimal(0);
  const finalTotal = isCovered ? new Prisma.Decimal(0) : total.minus(discountAmount);

  // Casos donde el Payment nace APPROVED: cubierto por pago previo del
  // programa, o modo demo explícito (PAYMENT_PROVIDER=mock).
  const status: "APPROVED" | "PENDING" = isCovered || isMock ? "APPROVED" : "PENDING";
  const provider = isCovered ? "internal" : isMock ? "mock" : providerEnv;
  const providerRef = isCovered
    ? `COVER-${coveredBy!.providerRef ?? coveredBy!.id}`
    : isMock
    ? `MOCK-${newToken(6).toUpperCase()}`
    : `MANUAL-${newToken(6).toUpperCase()}`;
  const amount = isCovered ? new Prisma.Decimal(0) : finalTotal;
  const paidAt = status === "APPROVED" ? new Date() : null;

  const payment = await prisma.payment.create({
    data: {
      subscriberId,
      enrollmentId,
      concept: "EXAM",
      description: isCovered ? `${description} (cubierto por inscripción previa del programa)` : description,
      amount,
      currency,
      status,
      provider,
      providerRef,
      receiptUrl: null,
      paidAt,
      metadata: isCovered
        ? ({ coveredBy: coveredBy!.id, originalAmount: coveredBy!.amount, note: "Cubierto por inscripción previa del mismo programa." } as Prisma.InputJsonValue)
        : isMock
        ? ({ simulated: true, lines: lines.map((l) => ({ label: l.label, amount: l.amount.toString() })) } as Prisma.InputJsonValue)
        : ({ provider: providerEnv, awaitingManualApproval: true, lines: lines.map((l) => ({ label: l.label, amount: l.amount.toString() })) } as Prisma.InputJsonValue),
    },
  });

  // Solo sincroniza el estado del enrollment cuando el pago realmente quedó APPROVED.
  if (status === "APPROVED") {
    await syncEnrollmentStatus(enrollmentId);
    // Confirma el referido si existe — calcula la recompensa sobre el monto
    // realmente cobrado (ya con el descuento aplicado).
    if (!isCovered) {
      const { confirmReferralByEnrollment } = await import("@/lib/actions/referrals");
      await confirmReferralByEnrollment(enrollmentId, Number(amount.toString()), currency, payment.id);
    }
  }
  // Marca el discount aplicado en el referral (informativo).
  if (referral) {
    await prisma.referral.update({
      where: { id: referral.id },
      data: { discountAmount },
    });
  }
  await audit(ctx, {
    action: status === "APPROVED" ? "payment.approve" : "payment.pending",
    entity: "Payment",
    entityId: payment.id,
    subscriberId,
    after: {
      amount: isCovered ? "0" : amount.toString(),
      baseAmount: total.toString(),
      discountAmount: discountAmount.toString(),
      currency,
      status,
      provider,
      referralId: referral?.id ?? null,
      coveredBy: coveredBy?.id ?? null,
    },
  });
  revalidatePath(`/portal/inscripcion/${enrollmentId}`);
  revalidatePath("/portal/pagos");
  revalidatePath("/panel/pagos");
  revalidatePath("/panel/referidos");

  // Si el proveedor activo es Rapyd y el Payment quedó PENDING, intentamos
  // abrir el Hosted Checkout y redirigimos al candidato. Si Rapyd responde
  // con error (claves inválidas, monto fuera de rango, etc.) dejamos el
  // Payment como PENDING y mostramos la inscripción para reintentar.
  if (isRapyd && status === "PENDING" && amount.greaterThan(0) && subscriberHasRapyd) {
    const { createRapydCheckout } = await import("@/lib/payments/rapyd");
    const env = {
      accessKey: subscriberPayment!.rapydAccessKey as string,
      secretKey: subscriberPayment!.rapydSecretKey as string,
      env: (subscriberPayment!.rapydEnv === "production" ? "production" : "sandbox") as "sandbox" | "production",
      baseUrl:
        subscriberPayment!.rapydEnv === "production"
          ? "https://api.rapyd.net"
          : "https://sandboxapi.rapyd.net",
    };
    const { appBaseUrl } = await import("@/lib/app-url");
    const base = appBaseUrl();
    const checkout = await createRapydCheckout({
      env,
      amount: Number(amount.toString()),
      currency,
      country: subscriberPayment?.country ?? "CO",
      merchantReferenceId: payment.id,
      completeUrl: `${base}/portal/inscripcion/${enrollmentId}?rapyd=ok`,
      cancelUrl: `${base}/portal/inscripcion/${enrollmentId}?rapyd=cancel`,
      description: description.slice(0, 80),
    });
    if ("redirectUrl" in checkout) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          provider: "rapyd",
          providerRef: checkout.id,
          metadata: {
            ...(payment.metadata as Prisma.JsonObject | null) ?? {},
            rapyd: { checkoutId: checkout.id, redirectUrl: checkout.redirectUrl, env: env.env },
          } as Prisma.InputJsonValue,
        },
      });
      // Redirige al candidato al Hosted Checkout de Rapyd.
      const { redirect } = await import("next/navigation");
      redirect(checkout.redirectUrl);
    } else {
      // El cobro queda PENDING; el suscriptor lo verá en /panel/pagos para
      // aprobarlo manualmente, y se registra el motivo de falla para soporte.
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            ...(payment.metadata as Prisma.JsonObject | null) ?? {},
            rapydError: checkout.error,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }
}

// ----------------------------------------------------------------------------
//  Reservar (agendar) una sesión de examen.
// ----------------------------------------------------------------------------
export async function bookSlot(enrollmentId: string, sessionId: string): Promise<void> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const enrollment = await loadOwnedEnrollment(candidateId, enrollmentId);

  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { bookings: { where: { status: { notIn: ["CANCELLED", "NO_SHOW"] } } } } } },
  });
  if (!session || session.subscriberId !== subscriberId || !session.isActive) {
    throw new Error("La sesión no está disponible.");
  }
  if (session.examId !== enrollment.examId) {
    throw new Error("La sesión no corresponde a esta evaluación.");
  }
  if (session.startsAt < new Date()) throw new Error("La sesión ya inició.");
  if (session.capacity > 0 && session._count.bookings >= session.capacity) {
    throw new Error("La sesión ya no tiene cupos disponibles.");
  }

  // Cancelar reservas activas previas de esta inscripción (reagendamiento).
  await prisma.scheduleBooking.updateMany({
    where: { enrollmentId, status: { notIn: ["CANCELLED", "ATTENDED", "NO_SHOW"] } },
    data: { status: "CANCELLED" },
  });
  await prisma.scheduleBooking.upsert({
    where: { sessionId_enrollmentId: { sessionId, enrollmentId } },
    create: { sessionId, enrollmentId, status: "BOOKED" },
    update: { status: "BOOKED" },
  });

  await syncEnrollmentStatus(enrollmentId);
  await audit(ctx, {
    action: "schedule.book",
    entity: "ScheduleBooking",
    entityId: enrollmentId,
    subscriberId,
    after: { sessionId },
  });
  revalidatePath(`/portal/inscripcion/${enrollmentId}`);
  revalidatePath("/portal/agenda");
}

// ----------------------------------------------------------------------------
//  Cancelar la inscripción (solo en fase previa a la presentación).
// ----------------------------------------------------------------------------
export async function cancelEnrollment(enrollmentId: string): Promise<void> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const enrollment = await loadOwnedEnrollment(candidateId, enrollmentId);
  const cancellable = ["STARTED", "CONSENT_PENDING", "DOCS_PENDING", "PAYMENT_PENDING", "SCHEDULING", "READY"];
  if (!cancellable.includes(enrollment.status)) {
    throw new Error("La inscripción ya no se puede cancelar.");
  }
  await prisma.scheduleBooking.updateMany({
    where: { enrollmentId, status: { notIn: ["CANCELLED", "ATTENDED", "NO_SHOW"] } },
    data: { status: "CANCELLED" },
  });
  await prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: "CANCELLED" } });
  await audit(ctx, {
    action: "enrollment.cancel",
    entity: "Enrollment",
    entityId: enrollmentId,
    subscriberId,
  });
  revalidatePath("/portal");
  redirect("/portal");
}
