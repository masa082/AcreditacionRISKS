import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Capa de integración con Rapyd.
 *
 * - Webhooks: Rapyd firma cada notificación con HMAC-SHA256 sobre
 *   `url_path + salt + timestamp + access_key + body` usando el SECRET_KEY
 *   de la cuenta. La firma viene base64 en el header `signature`.
 *   Documentación: https://docs.rapyd.net/build-with-rapyd/reference/webhooks-overview
 *
 * - Las claves se inyectan por variables de entorno:
 *     RAPYD_ACCESS_KEY      Access Key del entorno (sandbox o producción)
 *     RAPYD_SECRET_KEY      Secret Key del mismo entorno (usado para firmar)
 *     RAPYD_BASE_URL        https://sandboxapi.rapyd.net  ó  https://api.rapyd.net
 *
 * El SECRET_KEY nunca debe pegarse en el código ni en el repo. Configúralo
 * en Vercel → Project Settings → Environment Variables.
 */
export interface RapydEnv {
  accessKey: string;
  secretKey: string;
  baseUrl: string;
}

export function getRapydEnv(): RapydEnv | null {
  const accessKey = process.env.RAPYD_ACCESS_KEY;
  const secretKey = process.env.RAPYD_SECRET_KEY;
  const baseUrl = process.env.RAPYD_BASE_URL ?? "https://sandboxapi.rapyd.net";
  if (!accessKey || !secretKey) return null;
  return { accessKey, secretKey, baseUrl };
}

/**
 * Verifica la firma de un webhook Rapyd. El path del webhook debe ser la URL
 * completa con la que Rapyd lo envió (sin query string), por ejemplo:
 *   https://www.okacreditado.com/api/payments/rapyd/webhook
 */
export function verifyRapydWebhookSignature(opts: {
  url: string;
  signature: string;
  salt: string;
  timestamp: string;
  accessKey: string;
  body: string;
  secretKey: string;
}): boolean {
  if (!opts.signature || !opts.salt || !opts.timestamp || !opts.accessKey) return false;
  if (opts.accessKey !== (getRapydEnv()?.accessKey ?? opts.accessKey)) {
    // Si la access key no coincide con la del entorno, rechazamos.
    return false;
  }
  // Tolerancia de tiempo: 5 minutos para prevenir replay.
  const tsNum = Number(opts.timestamp);
  if (!Number.isFinite(tsNum)) return false;
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - tsNum);
  if (ageSec > 300) return false;

  const payload = opts.url + opts.salt + opts.timestamp + opts.accessKey + opts.body;
  // Rapyd firma calculando hmac(SHA256, secret_key, payload), convierte a
  // hexadecimal en minúsculas y luego base64 ese string hexadecimal.
  const hexSig = createHmac("sha256", opts.secretKey).update(payload).digest("hex");
  const expected = Buffer.from(hexSig).toString("base64");

  // Comparación constante en tiempo.
  const a = Buffer.from(opts.signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface RapydPaymentEvent {
  id?: string;
  type?: string;
  data?: {
    id?: string; // payment id
    status?: string;
    merchant_reference_id?: string; // referencia que enviamos al crear el checkout (PaymentConfig.id local)
    amount?: number;
    currency_code?: string;
    error_payment_method_required?: string;
    failure_code?: string;
    failure_message?: string;
  };
}

/** Mapea el evento Rapyd al estado local de Payment. */
export function rapydEventToStatus(eventType: string | undefined, status: string | undefined): "APPROVED" | "REJECTED" | "EXPIRED" | "REFUNDED" | "PENDING" | null {
  const t = (eventType ?? "").toUpperCase();
  const s = (status ?? "").toUpperCase();
  // Eventos típicos de Rapyd:
  //   PAYMENT_COMPLETED, PAYMENT_CAPTURE, PAYMENT_SUCCEEDED → APPROVED
  //   PAYMENT_FAILED, PAYMENT_CANCELED → REJECTED
  //   PAYMENT_EXPIRED → EXPIRED
  //   PAYMENT_REFUNDED → REFUNDED
  if (t.includes("COMPLETED") || t.includes("SUCCEEDED") || t.includes("CAPTURE") || s === "CLO" || s === "ACT") return "APPROVED";
  if (t.includes("FAILED") || t.includes("CANCEL") || s === "ERR" || s === "REJ") return "REJECTED";
  if (t.includes("EXPIRED") || s === "EXP") return "EXPIRED";
  if (t.includes("REFUND")) return "REFUNDED";
  return null;
}
