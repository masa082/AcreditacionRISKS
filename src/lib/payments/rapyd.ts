import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Capa de integración con Rapyd.
 *
 * Las claves Rapyd se almacenan POR SUSCRIPTOR (Subscriber.rapydAccessKey /
 * rapydSecretKey / rapydEnv) y se editan únicamente por el SUPERADMIN o por
 * el admin del suscriptor (permiso ORG_MANAGE). Como fallback de
 * compatibilidad seguimos aceptando RAPYD_ACCESS_KEY / RAPYD_SECRET_KEY en
 * entorno cuando no hay claves por tenant — útil para probar el webhook
 * antes de que un suscriptor configure su pasarela.
 *
 * Firma de webhooks: HMAC-SHA256 sobre `url + salt + timestamp + access_key
 * + body` con el SECRET_KEY de la cuenta; el digest hex se base64ea para
 * comparar contra el header `signature`.
 * Doc: https://docs.rapyd.net/build-with-rapyd/reference/webhooks-overview
 *
 * Firma de requests salientes (Create Checkout, etc.): HMAC-SHA256 sobre
 * `method + url_path + salt + timestamp + access_key + secret_key + body`,
 * mismo encoding hex→base64.
 * Doc: https://docs.rapyd.net/build-with-rapyd/reference/message-security
 */
export interface RapydEnv {
  accessKey: string;
  secretKey: string;
  baseUrl: string;
  env: "sandbox" | "production";
}

function baseUrlFromEnv(env: string): string {
  return env === "production" ? "https://api.rapyd.net" : "https://sandboxapi.rapyd.net";
}

/** Compatibilidad: claves Rapyd de proceso (fallback). */
export function getRapydEnv(): RapydEnv | null {
  const accessKey = process.env.RAPYD_ACCESS_KEY;
  const secretKey = process.env.RAPYD_SECRET_KEY;
  if (!accessKey || !secretKey) return null;
  const env: "sandbox" | "production" =
    process.env.RAPYD_BASE_URL?.includes("sandbox") === false ? "production" : "sandbox";
  return { accessKey, secretKey, baseUrl: process.env.RAPYD_BASE_URL ?? baseUrlFromEnv(env), env };
}

/** Claves Rapyd resueltas desde la fila de Subscriber (preferido) o env (fallback). */
export function resolveRapydForSubscriber(sub: {
  rapydEnabled: boolean;
  rapydAccessKey: string | null;
  rapydSecretKey: string | null;
  rapydEnv: string;
}): RapydEnv | null {
  if (sub.rapydEnabled && sub.rapydAccessKey && sub.rapydSecretKey) {
    const env: "sandbox" | "production" = sub.rapydEnv === "production" ? "production" : "sandbox";
    return {
      accessKey: sub.rapydAccessKey,
      secretKey: sub.rapydSecretKey,
      baseUrl: baseUrlFromEnv(env),
      env,
    };
  }
  return getRapydEnv();
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
  if (t.includes("COMPLETED") || t.includes("SUCCEEDED") || t.includes("CAPTURE") || s === "CLO" || s === "ACT") return "APPROVED";
  if (t.includes("FAILED") || t.includes("CANCEL") || s === "ERR" || s === "REJ") return "REJECTED";
  if (t.includes("EXPIRED") || s === "EXP") return "EXPIRED";
  if (t.includes("REFUND")) return "REFUNDED";
  return null;
}

/**
 * Firma un request saliente a la API de Rapyd. Sigue el esquema documentado
 * por Rapyd: HMAC-SHA256 de `method + url_path + salt + timestamp + access_key
 * + secret_key + body`, hex → base64.
 *
 * Nota: el `url_path` NO debe incluir el host, sólo la ruta y query: por
 * ejemplo "/v1/checkout".
 */
export async function rapydApi<T = unknown>(
  env: RapydEnv,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body: unknown = null,
): Promise<{ ok: boolean; data?: T; status: number; raw: string }> {
  const salt = randomBytes(8).toString("hex");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const bodyText = body == null ? "" : JSON.stringify(body);
  const payload = method.toLowerCase() + path + salt + timestamp + env.accessKey + env.secretKey + bodyText;
  const hex = createHmac("sha256", env.secretKey).update(payload).digest("hex");
  const signature = Buffer.from(hex).toString("base64");

  const res = await fetch(env.baseUrl + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_key: env.accessKey,
      salt,
      timestamp,
      signature,
    },
    body: bodyText || undefined,
    cache: "no-store",
  });
  const raw = await res.text();
  let parsed: unknown = undefined;
  try {
    parsed = raw ? JSON.parse(raw) : undefined;
  } catch {
    // Rapyd debería devolver JSON; si no, lo dejamos como raw.
  }
  return { ok: res.ok, data: parsed as T, status: res.status, raw };
}

interface RapydCheckoutResponse {
  status?: { status?: string; error_code?: string; message?: string };
  data?: { id?: string; redirect_url?: string };
}

/**
 * Crea un Hosted Checkout en Rapyd para cobrar el monto indicado y devuelve
 * la URL pública a la que se debe redirigir al candidato. El webhook
 * confirmará el cobro cuando el candidato finalice el pago.
 */
export async function createRapydCheckout(opts: {
  env: RapydEnv;
  amount: number;
  currency: string; // ISO 4217, "COP", "USD"…
  country: string;  // ISO 3166-1 alpha-2 ("CO")
  merchantReferenceId: string; // PaymentConfig.id local
  completeUrl: string;
  cancelUrl: string;
  description?: string;
}): Promise<{ id: string; redirectUrl: string } | { error: string }> {
  const body = {
    amount: opts.amount,
    currency: opts.currency,
    country: opts.country,
    merchant_reference_id: opts.merchantReferenceId,
    complete_checkout_url: opts.completeUrl,
    cancel_checkout_url: opts.cancelUrl,
    payment_method_type_categories: ["card", "bank_transfer", "ewallet"],
    description: opts.description ?? null,
  };
  const res = await rapydApi<RapydCheckoutResponse>(opts.env, "POST", "/v1/checkout", body);
  const id = res.data?.data?.id;
  const url = res.data?.data?.redirect_url;
  if (res.ok && id && url) return { id, redirectUrl: url };
  return {
    error:
      res.data?.status?.message ||
      res.data?.status?.error_code ||
      `HTTP ${res.status} — ${res.raw.slice(0, 200)}`,
  };
}
