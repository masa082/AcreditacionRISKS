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
import { saveUpload, deleteByKey, extFromName, MAX_UPLOAD_BYTES, presignedPutUrl, buildUploadKey, assertObjectExists, EXT_TO_MIME } from "@/lib/storage";
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

  // Carpeta dedicada por candidato: <subscriber>/candidates/<candidateId>/enrollments/<enrollmentId>/<reqDocId>
  // Así el SUSCRIPTOR puede inspeccionar todos los archivos de una persona
  // simplemente listando su carpeta en el bucket / FS.
  const { key } = await saveUpload(file, [
    subscriberId,
    "candidates",
    candidateId,
    "enrollments",
    enrollmentId,
    reqDoc.id,
  ]);

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
//
//  El candidato elige explícitamente el método al pulsar "Pagar":
//    - "online"  → Hosted Checkout de Rapyd (tarjeta, PSE, billeteras).
//                  Si el suscriptor no tiene Rapyd configurado, cae a manual.
//    - "manual"  → Reporte de consignación / transferencia: crea Payment
//                  PENDING y el candidato luego sube el SOPORTE de pago,
//                  que el admin del suscriptor verifica en /panel/pagos.
//
//  Antes de iniciar el pago el candidato DEBE aceptar los términos legales:
//    1) Acepta cobrar el servicio entendiendo que es una obligación de
//       MEDIO (no de resultado) y que no habrá devolución del dinero
//       una vez iniciado el proceso de certificación.
//    2) Declara que la certificación se solicita para el desarrollo de su
//       actividad económica, profesión u oficio.
//
//  Modo demo: si PAYMENT_PROVIDER=mock o el suscriptor está configurado
//  como demo, el pago queda APPROVED automáticamente con providerRef
//  "MOCK-…" (solo entornos local/preview).
// ----------------------------------------------------------------------------
export async function payEnrollment(
  enrollmentId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const enrollment = await loadOwnedEnrollment(candidateId, enrollmentId);

  const method = (formData.get("method") as string) === "online" ? "online" : "manual";
  const acceptRefund = formData.get("acceptRefund") === "on";
  const acceptEconomic = formData.get("acceptEconomicUse") === "on";
  if (!acceptRefund || !acceptEconomic) {
    return { ok: false, error: "Debe aceptar los términos y condiciones para continuar con el pago." };
  }

  // Si ya tiene un Payment activo (cualquier estado distinto de REJECTED),
  // no creamos otro: lo dejamos avanzar al flujo.
  const existing = await prisma.payment.findFirst({
    where: { enrollmentId, status: { in: ["APPROVED", "PENDING"] } },
    select: { id: true, status: true },
  });
  if (existing) {
    revalidatePath(`/portal/inscripcion/${enrollmentId}`);
    return { ok: true };
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
  // El método lo elige el candidato: "online" usa Rapyd cuando está
  // disponible y cae a manual si no; "manual" siempre crea un Payment
  // PENDING para que el candidato suba el soporte de la consignación.
  const wantsOnline = method === "online" && subscriberHasRapyd;
  const providerEnv = wantsOnline ? "rapyd" : envProvider;
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
        ? ({ coveredBy: coveredBy!.id, originalAmount: coveredBy!.amount, note: "Cubierto por inscripción previa del mismo programa.", terms: { acceptRefund, acceptEconomic, acceptedAt: new Date().toISOString() } } as Prisma.InputJsonValue)
        : isMock
        ? ({ simulated: true, method, lines: lines.map((l) => ({ label: l.label, amount: l.amount.toString() })), terms: { acceptRefund, acceptEconomic, acceptedAt: new Date().toISOString() } } as Prisma.InputJsonValue)
        : ({ provider: providerEnv, method, awaitingManualApproval: providerEnv !== "rapyd", lines: lines.map((l) => ({ label: l.label, amount: l.amount.toString() })), terms: { acceptRefund, acceptEconomic, acceptedAt: new Date().toISOString() } } as Prisma.InputJsonValue),
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
      return {
        ok: false,
        error: `No fue posible abrir la pasarela: ${checkout.error}. Su pago quedó registrado como pendiente; el equipo del organismo lo confirmará manualmente.`,
      };
    }
  }
  return { ok: true };
}

// ----------------------------------------------------------------------------
//  Subir el SOPORTE de pago (comprobante de transferencia / consignación)
//  para un Payment PENDING. Solo el candidato dueño puede subirlo. El
//  archivo se almacena en la carpeta del candidato y queda visible para el
//  admin del suscriptor en /panel/pagos para verificar y aprobar.
// ----------------------------------------------------------------------------
export async function uploadPaymentReceipt(
  paymentId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, subscriberId, enrollment: { candidateId } },
    select: { id: true, status: true, enrollmentId: true, providerRef: true },
  });
  if (!payment) return { ok: false, error: "Pago no encontrado." };
  if (payment.status === "APPROVED") {
    return { ok: false, error: "Este pago ya fue aprobado." };
  }
  if (payment.status === "REJECTED") {
    return { ok: false, error: "Este pago fue rechazado. Genere un nuevo pago para reintentar." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Adjunte el comprobante de pago." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "El comprobante supera el tamaño máximo de 10 MB." };
  }
  const ext = extFromName(file.name);
  const allowed = ["pdf", "jpg", "jpeg", "png"];
  if (!allowed.includes(ext)) {
    return { ok: false, error: `Formato no permitido. Use ${allowed.join(", ")}.` };
  }

  const { key } = await saveUpload(file, [
    subscriberId,
    "candidates",
    candidateId,
    "payments",
    paymentId,
  ]);

  const note = (formData.get("note") as string | null)?.trim() ?? "";

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      receiptUrl: key,
      metadata: {
        ...((await prisma.payment.findUnique({ where: { id: paymentId }, select: { metadata: true } }))?.metadata as Prisma.JsonObject | null ?? {}),
        receipt: {
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          note: note || null,
        },
      } as Prisma.InputJsonValue,
    },
  });

  await audit(ctx, {
    action: "payment.receipt.upload",
    entity: "Payment",
    entityId: paymentId,
    subscriberId,
    after: { fileName: file.name, note: note || null },
  });
  revalidatePath(`/portal/inscripcion/${payment.enrollmentId}`);
  revalidatePath("/portal/pagos");
  revalidatePath("/panel/pagos");
  return { ok: true, message: "Soporte de pago cargado. El organismo lo revisará pronto." };
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

// ─── Subida DIRECTA de documentos a S3 vía URL prefirmada ─────────────
//
// Patrón para sortear el límite de body de Vercel (~4.5 MB en Hobby):
//
//   1. requestDocumentUploadUrl(enrollmentId, requiredDocumentId, fileName, fileType, fileSize)
//      → Valida ownership + tipo + tamaño. Devuelve { url, key } prefirmados.
//
//   2. Cliente sube el archivo con fetch PUT a la URL devuelta. El archivo
//      NO pasa por el serverless de Vercel.
//
//   3. confirmDocumentUpload(enrollmentId, requiredDocumentId, key, fileName)
//      → Verifica que el objeto exista en el bucket, registra metadata en
//        CandidateDocument, sincroniza estado e invalida la página.

interface UploadUrlResult {
  ok: boolean;
  error?: string;
  /** URL prefirmada PUT al bucket. */
  url?: string;
  /** Clave final del objeto en el bucket. */
  key?: string;
  /** Tipo MIME esperado por el bucket (debe enviarse como Content-Type). */
  contentType?: string;
  /** Cuando true, el backend NO tiene S3 configurado y el cliente debe
   *  caer al método antiguo (POST a submitDocument con FormData). */
  fallback?: boolean;
}

export async function requestDocumentUploadUrl(
  enrollmentId: string,
  requiredDocumentId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
): Promise<UploadUrlResult> {
  const { candidateId, subscriberId } = await requireCandidateAction();
  const enrollment = await loadOwnedEnrollment(candidateId, enrollmentId);

  if (!fileName || fileSize <= 0) return { ok: false, error: "Adjunte un archivo." };
  if (fileSize > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "El archivo supera el tamaño máximo de 10 MB." };
  }

  const reqDoc = await prisma.requiredDocument.findFirst({
    where: { id: requiredDocumentId, subscriberId, schemeId: enrollment.schemeId ?? undefined },
    select: { id: true, name: true, acceptedTypes: true },
  });
  if (!reqDoc) return { ok: false, error: "El documento no corresponde a este proceso." };

  const ext = extFromName(fileName);
  const normalized = ext === "jpeg" ? "jpg" : ext;
  const accepted = (reqDoc.acceptedTypes.length ? reqDoc.acceptedTypes : ["pdf", "jpg", "png"]).map((t) => t.toLowerCase());
  if (!accepted.includes(ext) && !accepted.includes(normalized)) {
    return { ok: false, error: `Formato no permitido. Use: ${accepted.join(", ")}.` };
  }

  const { key } = buildUploadKey(fileName, [
    subscriberId,
    "candidates",
    candidateId,
    "enrollments",
    enrollmentId,
    reqDoc.id,
  ]);

  // Forzamos el Content-Type real del archivo al firmar — debe coincidir
  // con el que envíe el cliente en el PUT o S3 rechazará el upload.
  const contentType = fileType || EXT_TO_MIME[ext] || "application/octet-stream";
  const signed = await presignedPutUrl(key, contentType, 300);

  if (!signed.direct) {
    // Dev/local: no hay S3 — el cliente debe caer al POST clásico.
    return { ok: true, fallback: true, key };
  }
  return { ok: true, url: signed.url, key: signed.key, contentType };
}

export async function confirmDocumentUpload(
  enrollmentId: string,
  requiredDocumentId: string,
  key: string,
  fileName: string,
): Promise<ActionResult> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();
  const enrollment = await loadOwnedEnrollment(candidateId, enrollmentId);

  const reqDoc = await prisma.requiredDocument.findFirst({
    where: { id: requiredDocumentId, subscriberId, schemeId: enrollment.schemeId ?? undefined },
    select: { id: true, name: true },
  });
  if (!reqDoc) return { ok: false, error: "El documento no corresponde a este proceso." };

  // Defensa: la clave debe estar dentro de la carpeta del candidato — evita
  // que un cliente malicioso confirme una clave de otro tenant/usuario.
  const expectedPrefix = `${subscriberId}/candidates/${candidateId}/enrollments/${enrollmentId}/${reqDoc.id}/`;
  if (!key.startsWith(expectedPrefix)) {
    return { ok: false, error: "Clave de archivo inválida." };
  }

  // Verifica que el objeto realmente exista en el bucket antes de registrar.
  const exists = await assertObjectExists(key);
  if (!exists) return { ok: false, error: "El archivo no llegó al almacenamiento. Intente de nuevo." };

  // Reemplaza entregas previas del mismo requisito
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
      fileName,
      status: "SUBMITTED",
    },
  });

  await syncEnrollmentStatus(enrollmentId);
  await audit(ctx, {
    action: "document.submit",
    entity: "CandidateDocument",
    entityId: enrollmentId,
    subscriberId,
    after: { requiredDocumentId: reqDoc.id, fileName, method: "presigned" },
  });
  revalidatePath(`/portal/inscripcion/${enrollmentId}`);
  return { ok: true };
}

// ─── Subida DIRECTA del soporte de pago (presigned URL) ───────────────
// Mismo patrón que requestDocumentUploadUrl/confirmDocumentUpload pero
// para el comprobante de transferencia/consignación de un Payment.
export async function requestPaymentReceiptUploadUrl(
  paymentId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
): Promise<UploadUrlResult> {
  const { candidateId, subscriberId } = await requireCandidateAction();

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, subscriberId, enrollment: { candidateId } },
    select: { id: true, status: true },
  });
  if (!payment) return { ok: false, error: "Pago no encontrado." };
  if (payment.status === "APPROVED") return { ok: false, error: "Este pago ya fue aprobado." };
  if (payment.status === "REJECTED") return { ok: false, error: "Este pago fue rechazado." };

  if (!fileName || fileSize <= 0) return { ok: false, error: "Adjunte el comprobante." };
  if (fileSize > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "El comprobante supera el tamaño máximo de 10 MB." };
  }

  const ext = extFromName(fileName);
  const allowed = ["pdf", "jpg", "jpeg", "png"];
  if (!allowed.includes(ext)) {
    return { ok: false, error: `Formato no permitido. Use ${allowed.join(", ")}.` };
  }

  const { key } = buildUploadKey(fileName, [
    subscriberId,
    "candidates",
    candidateId,
    "payments",
    paymentId,
  ]);
  const contentType = fileType || EXT_TO_MIME[ext] || "application/octet-stream";
  const signed = await presignedPutUrl(key, contentType, 300);
  if (!signed.direct) return { ok: true, fallback: true, key };
  return { ok: true, url: signed.url, key: signed.key, contentType };
}

export async function confirmPaymentReceiptUpload(
  paymentId: string,
  key: string,
  fileName: string,
  note: string | null,
): Promise<ActionResult> {
  const { ctx, candidateId, subscriberId } = await requireCandidateAction();

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, subscriberId, enrollment: { candidateId } },
    select: { id: true, status: true, enrollmentId: true, metadata: true },
  });
  if (!payment) return { ok: false, error: "Pago no encontrado." };
  if (payment.status === "APPROVED") return { ok: false, error: "Este pago ya fue aprobado." };

  const expectedPrefix = `${subscriberId}/candidates/${candidateId}/payments/${paymentId}/`;
  if (!key.startsWith(expectedPrefix)) return { ok: false, error: "Clave de archivo inválida." };

  const exists = await assertObjectExists(key);
  if (!exists) return { ok: false, error: "El archivo no llegó al almacenamiento. Intente de nuevo." };

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      receiptUrl: key,
      metadata: {
        ...((payment.metadata as Prisma.JsonObject | null) ?? {}),
        receipt: {
          fileName,
          uploadedAt: new Date().toISOString(),
          note: note || null,
        },
      } as Prisma.InputJsonValue,
    },
  });

  await audit(ctx, {
    action: "payment.receipt.upload",
    entity: "Payment",
    entityId: paymentId,
    subscriberId,
    after: { fileName, note: note || null, method: "presigned" },
  });
  revalidatePath(`/portal/inscripcion/${payment.enrollmentId}`);
  revalidatePath("/portal/pagos");
  revalidatePath("/panel/pagos");
  return { ok: true, message: "Soporte de pago cargado. El organismo lo revisará pronto." };
}
