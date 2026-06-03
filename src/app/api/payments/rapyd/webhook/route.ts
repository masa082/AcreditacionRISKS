import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { syncEnrollmentStatus } from "@/lib/enrollment";
import { notifyCandidate } from "@/lib/notify";
import { audit } from "@/lib/audit";
import {
  getRapydEnv,
  rapydEventToStatus,
  verifyRapydWebhookSignature,
  type RapydPaymentEvent,
} from "@/lib/payments/rapyd";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // crypto + prisma

/**
 * Webhook público de Rapyd.
 *
 * URL pública: https://www.okacreditado.com/api/payments/rapyd/webhook
 *
 * Verifica la firma HMAC-SHA256 con RAPYD_SECRET_KEY antes de aceptar el
 * evento. Mapea PAYMENT_COMPLETED/FAILED/EXPIRED/REFUNDED a estados locales
 * de Payment y notifica al candidato.
 */
export async function POST(req: Request) {
  const env = getRapydEnv();
  if (!env) {
    // Sin claves configuradas: aceptamos la conexión pero no autenticamos.
    // Esto permite probar el endpoint desde Rapyd dashboard antes de tener
    // las credenciales en Vercel.
    return new Response(JSON.stringify({ ok: false, reason: "RAPYD_ACCESS_KEY / RAPYD_SECRET_KEY no configurados todavía" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  const h = await headers();
  const signature = h.get("signature") ?? "";
  const salt = h.get("salt") ?? "";
  const timestamp = h.get("timestamp") ?? "";
  const accessKey = h.get("access_key") ?? env.accessKey;

  // Leemos el cuerpo crudo (la firma se calcula sobre el body exacto).
  const bodyText = await req.text();

  // La URL que Rapyd usó para firmar debe ser la URL pública sin query.
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "www.okacreditado.com";
  const url = `${proto}://${host}/api/payments/rapyd/webhook`;

  const valid = verifyRapydWebhookSignature({
    url,
    signature,
    salt,
    timestamp,
    accessKey,
    body: bodyText,
    secretKey: env.secretKey,
  });
  if (!valid) {
    return new Response(JSON.stringify({ ok: false, reason: "firma inválida" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let event: RapydPaymentEvent;
  try {
    event = JSON.parse(bodyText) as RapydPaymentEvent;
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: "JSON inválido" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const newStatus = rapydEventToStatus(event.type, event.data?.status);
  if (!newStatus) {
    // Evento aceptado pero no relevante (p. ej. CUSTOMER_CREATED).
    return new Response(JSON.stringify({ ok: true, ignored: true, type: event.type }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  // Resolvemos el Payment local por `merchant_reference_id` (que vamos a
  // configurar al crear el checkout = paymentId local) o por `providerRef`.
  const ref = event.data?.merchant_reference_id ?? event.data?.id;
  if (!ref) {
    return new Response(JSON.stringify({ ok: false, reason: "Evento sin referencia" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });
  }

  const payment = await prisma.payment.findFirst({
    where: { OR: [{ id: ref }, { providerRef: ref }] },
    include: { enrollment: { select: { id: true, candidateId: true, code: true } } },
  });
  if (!payment) {
    // No es nuestro o ya fue eliminado.
    return new Response(JSON.stringify({ ok: true, unknown: true }), {
      status: 202,
      headers: { "content-type": "application/json" },
    });
  }

  // Idempotencia: si ya estamos en el mismo estado, devolvemos OK sin hacer nada.
  if (payment.status === newStatus) {
    return new Response(JSON.stringify({ ok: true, idempotent: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  const existingMeta = (payment.metadata as Prisma.JsonObject | null) ?? {};
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: newStatus,
      provider: "rapyd",
      providerRef: event.data?.id ?? payment.providerRef,
      paidAt: newStatus === "APPROVED" ? new Date() : payment.paidAt,
      metadata: {
        ...existingMeta,
        rapyd: {
          eventId: event.id ?? null,
          type: event.type ?? null,
          status: event.data?.status ?? null,
          failureCode: event.data?.failure_code ?? null,
          failureMessage: event.data?.failure_message ?? null,
          receivedAt: new Date().toISOString(),
        },
      } as Prisma.InputJsonValue,
    },
  });

  if (newStatus === "APPROVED" && payment.enrollment) {
    await syncEnrollmentStatus(payment.enrollment.id);
  }

  if (payment.enrollment?.candidateId) {
    if (newStatus === "APPROVED") {
      await notifyCandidate(
        payment.enrollment.candidateId,
        "payment.approved",
        "Su pago fue aprobado",
        `Su pago de la inscripción ${payment.enrollment.code ?? ""} fue confirmado por la pasarela. Ya puede continuar con su proceso.`,
      );
    } else if (newStatus === "REJECTED") {
      await notifyCandidate(
        payment.enrollment.candidateId,
        "payment.rejected",
        "Su pago no se completó",
        `La pasarela rechazó el pago de la inscripción ${payment.enrollment.code ?? ""}. Por favor reintente o contacte a soporte.`,
      );
    }
  }

  // Audit log sin contexto de usuario (webhook → sistema).
  await audit(null, {
    action: `payment.webhook.${newStatus.toLowerCase()}`,
    entity: "Payment",
    entityId: payment.id,
    subscriberId: payment.subscriberId,
    after: { status: newStatus, provider: "rapyd", eventType: event.type ?? null },
  });

  return new Response(JSON.stringify({ ok: true, status: newStatus }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// Health-check del webhook: permite a Rapyd validar la URL sin enviar evento.
export async function GET() {
  const env = getRapydEnv();
  return new Response(
    JSON.stringify({
      ok: true,
      service: "rapyd-webhook",
      configured: !!env,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
