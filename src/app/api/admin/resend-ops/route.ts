import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeFromAddress, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Operaciones de mantenimiento contra el API de Resend.
 *
 * Autenticación: header `x-diag-token: <EMAIL_DIAG_TOKEN>` o `?token=...`.
 * El token se configura como env var en Vercel y permite ejecutar
 * operaciones de servidor sin sesión interactiva — necesario para que
 * el operador (o un script de mantenimiento) pueda diagnosticar y
 * resolver problemas de dominio/clave sin estar logueado.
 *
 * Acciones (querystring `?op=...`):
 *   ?op=domains            → lista los dominios del proyecto en Resend
 *   ?op=verify             → fuerza verificación del dominio okacreditado.com
 *   ?op=send&to=...        → envía correo de prueba al destinatario
 *   ?op=ping               → solo eco de configuración (sin Resend)
 *
 * Nunca devuelve la API key (solo prefijo) ni secretos.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const token = req.headers.get("x-diag-token") ?? url.searchParams.get("token") ?? "";
  const expected = process.env.EMAIL_DIAG_TOKEN;
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "token inválido" }), {
      status: 403, headers: { "content-type": "application/json" },
    });
  }

  const key = process.env.RESEND_API_KEY;
  const op = url.searchParams.get("op") ?? "ping";

  const baseDiag = {
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "(no set)",
    hasResendKey: !!key,
    keyPrefix: key ? `${key.slice(0, 6)}…${key.slice(-4)} (len=${key.length})` : null,
    EMAIL_FROM_raw: process.env.EMAIL_FROM ?? "(no set)",
    EMAIL_FROM_sanitized: sanitizeFromAddress(process.env.EMAIL_FROM ?? ""),
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO ?? "(default)",
    EMAIL_BCC: process.env.EMAIL_BCC ?? "(not set)",
  };

  if (op === "ping") {
    return json({ ok: true, op, diagnostics: baseDiag });
  }

  if (!key) {
    return json({ ok: false, op, error: "RESEND_API_KEY no configurada en Vercel.", diagnostics: baseDiag }, 502);
  }

  // ────────────── op=domains ──────────────
  if (op === "domains") {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await res.json().catch(() => ({}));
    return json({ ok: res.ok, op, status: res.status, data, diagnostics: baseDiag }, res.ok ? 200 : 502);
  }

  // ────────────── op=verify ──────────────
  if (op === "verify") {
    // Buscar el ID de okacreditado.com en la lista de dominios.
    const listRes = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const listData = await listRes.json().catch(() => ({}));
    type DomainEntry = { id: string; name: string; status?: string; region?: string };
    const domains: DomainEntry[] = Array.isArray((listData as { data?: DomainEntry[] }).data)
      ? (listData as { data: DomainEntry[] }).data
      : [];
    const target = domains.find((d) => d.name === "okacreditado.com");
    if (!target) {
      return json({
        ok: false, op, error: "okacreditado.com no aparece en la lista de dominios de Resend.",
        domainsFound: domains.map((d) => ({ name: d.name, status: d.status, region: d.region })),
        suggestion: "Use op=add para crearlo y obtener los DNS records.",
        diagnostics: baseDiag,
      }, 404);
    }
    // Disparar verificación.
    const verRes = await fetch(`https://api.resend.com/domains/${target.id}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    });
    const verData = await verRes.json().catch(() => ({}));
    // Releer estado tras verificar para confirmar.
    const detailRes = await fetch(`https://api.resend.com/domains/${target.id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const detailData = await detailRes.json().catch(() => ({}));
    return json({
      ok: verRes.ok, op,
      verifyTriggered: { status: verRes.status, data: verData },
      currentState: { status: detailRes.status, data: detailData },
      diagnostics: baseDiag,
    }, verRes.ok ? 200 : 502);
  }

  // ────────────── op=add ──────────────
  if (op === "add") {
    const region = url.searchParams.get("region") ?? "us-east-1";
    const addRes = await fetch("https://api.resend.com/domains", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "okacreditado.com", region }),
    });
    const addData = await addRes.json().catch(() => ({}));
    return json({ ok: addRes.ok, op, status: addRes.status, data: addData, diagnostics: baseDiag }, addRes.ok ? 200 : 502);
  }

  // ────────────── op=send ──────────────
  if (op === "send") {
    const to = url.searchParams.get("to");
    if (!to) return json({ ok: false, op, error: "falta ?to=..." }, 400);
    const result = await sendEmail({
      to,
      subject: `Prueba CIOC · ${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })}`,
      text: "Esta es una prueba de envío directo desde el endpoint de diagnóstico. Si recibe este correo, Resend está funcionando.",
      html: "<p>Esta es una prueba de envío directo desde el endpoint de diagnóstico. Si recibe este correo, <strong>Resend está funcionando</strong>.</p>",
    });
    const recent = await prisma.auditLog.findMany({
      where: { action: { in: ["email.sent", "email.failed"] } },
      orderBy: { createdAt: "desc" }, take: 3,
      select: { action: true, createdAt: true, after: true },
    });
    return json({ ok: result.ok, op, result, recent, diagnostics: baseDiag }, result.ok ? 200 : 502);
  }

  return json({ ok: false, op, error: "operación desconocida", validOps: ["ping","domains","add","verify","send"] }, 400);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}
