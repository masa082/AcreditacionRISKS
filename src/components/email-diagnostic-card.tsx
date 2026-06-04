"use client";

import { useState } from "react";

/**
 * Tarjeta de diagnóstico del envío de correo.
 *
 * Permite al admin del suscriptor (ORG_MANAGE) probar el pipeline de
 * correo en producción sin depender de soporte. Hace POST-equivalente
 * (en realidad GET) a /api/admin/email-test, recibe diagnóstico completo
 * y lo renderiza con badges legibles + últimas 10 entregas reales del
 * AuditLog.
 *
 * Lo que muestra:
 *   - Provider configurado (resend / smtp / log).
 *   - API key presente + prefijo.
 *   - EMAIL_FROM RAW vs SANITIZADO — si el sanitizer tuvo que arreglar
 *     algo, se marca con un chip amarillo.
 *   - BCC obligatorio.
 *   - Resultado del envío de prueba (sent / failed / motivo).
 *   - Últimos 10 intentos del AuditLog del suscriptor.
 */
interface DiagResponse {
  sent: boolean;
  provider: string;
  messageId: string | null;
  error: string | null;
  diagnostics: {
    EMAIL_PROVIDER: string;
    hasResendKey: boolean;
    keyPrefix: string | null;
    EMAIL_FROM_raw: string;
    EMAIL_FROM_sanitized: string;
    EMAIL_FROM_changedBySanitizer: boolean;
    EMAIL_REPLY_TO: string;
    EMAIL_BCC: string;
    mandatoryBcc: string[];
    invokerType: string;
    invokerEmail: string;
  };
  recentDelivery: Array<{
    action: string;
    createdAt: string;
    after: Record<string, unknown> | null;
  }>;
}

export function EmailDiagnosticCard({ defaultTo }: { defaultTo?: string }) {
  const [to, setTo] = useState(defaultTo ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const url = `/api/admin/email-test${to ? `?to=${encodeURIComponent(to)}` : ""}`;
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      const data = (await res.json()) as DiagResponse;
      setResult(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            📧 Diagnóstico de envío de correo
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Envía un correo de prueba con la configuración actual y muestra
            el estado del proveedor, BCC y los últimos intentos registrados.
            Útil para confirmar que el pipeline está funcionando.
          </p>
        </div>
      </header>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[240px]">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Destinatario de la prueba
          </span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="su-correo@dominio.com"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="btn-grad-navy rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-60"
        >
          {loading ? "Enviando…" : "Enviar prueba"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Si deja vacío, se envía a su propio correo de sesión. Las copias
        obligatorias (gerencia@risksint.com y formacion@risksint.com) se
        envían igual.
      </p>

      {err ? (
        <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
          {err}
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 space-y-5">
          {/* Resultado del envío */}
          <div
            className={`rounded-xl px-4 py-3 ring-1 ${
              result.sent
                ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                : "bg-rose-50 text-rose-900 ring-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{result.sent ? "✓" : "✗"}</span>
              <strong className="text-sm">
                {result.sent ? "Correo de prueba enviado" : "Falló el envío de prueba"}
              </strong>
              <span className="ml-auto text-[11px] uppercase tracking-wider opacity-70">
                vía {result.provider}
              </span>
            </div>
            {result.messageId ? (
              <p className="mt-1 text-[12px] opacity-80">
                Resend ID: <code className="font-mono">{result.messageId}</code>
              </p>
            ) : null}
            {result.error ? (
              <p className="mt-1 text-[12.5px]">
                <strong>Motivo:</strong> {result.error}
              </p>
            ) : null}
          </div>

          {/* Diagnóstico de configuración */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Configuración detectada en producción
            </h3>
            <dl className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
              <DiagRow
                k="EMAIL_PROVIDER"
                v={result.diagnostics.EMAIL_PROVIDER}
                ok={result.diagnostics.EMAIL_PROVIDER === "resend"}
              />
              <DiagRow
                k="API key Resend"
                v={
                  result.diagnostics.hasResendKey
                    ? `presente (${result.diagnostics.keyPrefix})`
                    : "NO configurada"
                }
                ok={result.diagnostics.hasResendKey}
              />
              <DiagRow
                k="EMAIL_FROM (Vercel)"
                v={result.diagnostics.EMAIL_FROM_raw}
                mono
                wide
              />
              <DiagRow
                k="EMAIL_FROM (sanitizado, lo que llega a Resend)"
                v={result.diagnostics.EMAIL_FROM_sanitized}
                mono
                wide
                warn={result.diagnostics.EMAIL_FROM_changedBySanitizer}
                warnLabel="se normalizó"
              />
              <DiagRow k="REPLY_TO" v={result.diagnostics.EMAIL_REPLY_TO} mono />
              <DiagRow k="BCC extra" v={result.diagnostics.EMAIL_BCC} mono />
              <DiagRow
                k="BCC obligatorio"
                v={result.diagnostics.mandatoryBcc.join(" · ")}
                mono
                wide
              />
            </dl>
          </div>

          {/* Últimos envíos del log */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Últimos 10 intentos registrados (AuditLog)
            </h3>
            {result.recentDelivery.length === 0 ? (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">
                Sin actividad de correo registrada todavía.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {result.recentDelivery.map((row, i) => {
                  const ok = row.action === "email.sent";
                  const meta =
                    (row.after as {
                      to?: string;
                      subject?: string;
                      error?: string | null;
                      provider?: string;
                    }) ?? {};
                  return (
                    <li
                      key={`${row.createdAt}-${i}`}
                      className="rounded-lg border border-slate-200 bg-white p-3 text-[12.5px]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            ok
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                          }`}
                        >
                          {ok ? "✓ sent" : "✗ failed"}
                        </span>
                        <span className="text-slate-500">
                          {new Date(row.createdAt).toLocaleString("es-CO", {
                            timeZone: "America/Bogota",
                          })}
                        </span>
                        {meta.provider ? (
                          <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-400">
                            {meta.provider}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 text-slate-700">
                        <strong>{meta.to}</strong>
                        {meta.subject ? (
                          <span className="text-slate-500"> — {meta.subject}</span>
                        ) : null}
                      </div>
                      {meta.error ? (
                        <div className="mt-1 break-words text-[12px] text-rose-700">
                          ↳ {meta.error}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DiagRow({
  k,
  v,
  ok,
  warn,
  warnLabel,
  mono,
  wide,
}: {
  k: string;
  v: string;
  ok?: boolean;
  warn?: boolean;
  warnLabel?: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k}</dt>
      <dd className="flex items-start gap-2">
        <span
          className={`${mono ? "font-mono" : ""} break-all rounded-md bg-white px-2 py-1 text-[12px] ring-1 ring-slate-200`}
        >
          {v}
        </span>
        {ok === true ? (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
            OK
          </span>
        ) : ok === false ? (
          <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
            !
          </span>
        ) : null}
        {warn ? (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
            {warnLabel ?? "ojo"}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
