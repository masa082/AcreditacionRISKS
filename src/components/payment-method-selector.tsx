"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { payEnrollment } from "@/lib/actions/enrollment";
import type { ActionResult } from "@/lib/actions/schemes";

/// Marca-logos SVG inline (Visa, Mastercard, PSE) para evitar dependencias y
/// problemas de licencia con assets externos. Reproducen el look pero
/// preservan el contraste y el color principal de cada marca.
function VisaLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 24" className={className} aria-label="Visa">
      <rect width="64" height="24" rx="3" fill="#fff" stroke="#cbd5e1" />
      <text x="32" y="17" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontWeight="900" fontSize="14" fill="#1a1f71" letterSpacing="1">VISA</text>
    </svg>
  );
}
function MastercardLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 24" className={className} aria-label="Mastercard">
      <rect width="64" height="24" rx="3" fill="#fff" stroke="#cbd5e1" />
      <circle cx="27" cy="12" r="7" fill="#eb001b" />
      <circle cx="37" cy="12" r="7" fill="#f79e1b" />
      <path d="M32 6.5a7 7 0 0 0 0 11 7 7 0 0 0 0-11" fill="#ff5f00" />
    </svg>
  );
}
function PseLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 24" className={className} aria-label="PSE — Pagos Seguros en Línea">
      <rect width="64" height="24" rx="3" fill="#0073c3" />
      <text x="32" y="17" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontWeight="900" fontSize="13" fill="#fff" letterSpacing="1.5">PSE</text>
    </svg>
  );
}
function NequiLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 24" className={className} aria-label="Nequi">
      <rect width="80" height="24" rx="3" fill="#ed008c" />
      <text x="40" y="17" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontWeight="800" fontSize="12" fill="#fff" letterSpacing="1">NEQUI</text>
    </svg>
  );
}

interface Props {
  enrollmentId: string;
  enrollmentCode: string;
  amount: string;          // monto formateado
  currency: string;
  hasRapyd: boolean;       // si el suscriptor tiene Rapyd activo
  bankingInfo: string | null;
}

const initial: ActionResult = { ok: false };

/// Selector de método de pago para el candidato. Presenta dos opciones:
///   - Pago en línea (Rapyd: VISA / Mastercard / PSE / Nequi) → recomendado.
///   - Transferencia / consignación → muestra datos bancarios y permite
///     subir el soporte después.
///
/// Antes de enviar el formulario, el candidato debe aceptar dos cláusulas
/// legales obligatorias: no devolución (obligación de medio) y declaración
/// de uso para actividad económica / profesión.
export function PaymentMethodSelector({
  enrollmentId,
  enrollmentCode,
  amount,
  currency,
  hasRapyd,
  bankingInfo,
}: Props) {
  const bound = payEnrollment.bind(null, enrollmentId);
  const [state, action, pending] = useActionState<ActionResult, FormData>(bound, initial);
  const [method, setMethod] = useState<"online" | "manual">(hasRapyd ? "online" : "manual");
  const [acceptRefund, setAcceptRefund] = useState(false);
  const [acceptEconomic, setAcceptEconomic] = useState(false);
  const canSubmit = acceptRefund && acceptEconomic;

  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-900">Elija su método de pago</legend>

        {/* ── Tarjeta 1: PAGO EN LÍNEA (Rapyd) ───────────────────────────── */}
        <label
          className={`flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 transition ${
            method === "online" && hasRapyd
              ? "border-brand-700 bg-brand-50/40 ring-2 ring-brand-100"
              : "border-slate-200 hover:border-brand-300"
          } ${!hasRapyd ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="method"
              value="online"
              checked={method === "online"}
              disabled={!hasRapyd}
              onChange={() => setMethod("online")}
              className="mt-1 h-4 w-4 accent-brand-700"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-slate-900">Pago en línea</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Recomendado · más rápido
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Pague de inmediato con tarjeta débito o crédito, PSE o billeteras.
                Su inscripción se activa en cuanto la pasarela confirme.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <VisaLogo className="h-6 w-12" />
                <MastercardLogo className="h-6 w-12" />
                <PseLogo className="h-6 w-12" />
                <NequiLogo className="h-6 w-16" />
                <span className="text-[10px] text-slate-400">y más medios</span>
              </div>
              {!hasRapyd ? (
                <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800 ring-1 ring-amber-200">
                  Esta organización aún no tiene activa la pasarela en línea.
                  Use la opción de transferencia/consignación.
                </p>
              ) : null}
            </div>
          </div>
        </label>

        {/* ── Tarjeta 2: TRANSFERENCIA / CONSIGNACIÓN ──────────────────── */}
        <label
          className={`flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 transition ${
            method === "manual"
              ? "border-brand-700 bg-brand-50/40 ring-2 ring-brand-100"
              : "border-slate-200 hover:border-brand-300"
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="method"
              value="manual"
              checked={method === "manual"}
              onChange={() => setMethod("manual")}
              className="mt-1 h-4 w-4 accent-brand-700"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-slate-900">Transferencia o consignación</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Verificación manual
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Realice la transferencia desde su banco. Luego suba aquí el soporte de pago
                (recibo / comprobante) para que el organismo lo verifique. Su inscripción se
                activa cuando el pago sea aprobado.
              </p>
              {method === "manual" ? (
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg border border-slate-300 bg-white p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Datos para realizar el pago
                    </div>
                    {bankingInfo ? (
                      <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] text-slate-800">{bankingInfo}</pre>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500 italic">
                        El organismo aún no ha publicado sus datos bancarios.
                        Pulse <em>Reportar pago</em> y se le contactará con las instrucciones.
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-slate-500">
                      <strong className="text-slate-700">Concepto / referencia:</strong>{" "}
                      <code className="rounded bg-slate-100 px-1 font-mono">Inscripción {enrollmentCode}</code>
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      <strong className="text-slate-700">Valor a transferir:</strong>{" "}
                      <span className="font-semibold text-brand-900">{amount} {currency}</span> + IVA
                    </p>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Tras pulsar <em>Reportar pago</em>, en esta misma pantalla aparecerá la opción
                    para <strong>subir el soporte</strong>. Hasta que el organismo verifique el
                    soporte, su inscripción permanecerá pendiente y no podrá avanzar al examen.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </label>
      </fieldset>

      {/* ── Términos y condiciones obligatorios ────────────────────────── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
          Términos y condiciones de la certificación
        </div>
        <ul className="mt-2 space-y-3 text-sm">
          <li>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                name="acceptRefund"
                checked={acceptRefund}
                onChange={(e) => setAcceptRefund(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-700"
                required
              />
              <span className="text-slate-800">
                Acepto que la certificación es un <strong>servicio profesional de medio</strong>,
                no de resultado: el pago cubre el proceso de evaluación, no garantiza la aprobación
                del examen. <strong className="text-rose-700">No habrá devolución del dinero</strong>{" "}
                una vez confirmado el pago, y me comprometo a presentar la evaluación en la fecha
                programada. Conozco y acepto los{" "}
                <Link href="/terminos" target="_blank" className="text-brand-700 underline">términos y condiciones</Link>{" "}
                y la{" "}
                <Link href="/privacidad" target="_blank" className="text-brand-700 underline">política de datos</Link>.
              </span>
            </label>
          </li>
          <li>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                name="acceptEconomicUse"
                checked={acceptEconomic}
                onChange={(e) => setAcceptEconomic(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-700"
                required
              />
              <span className="text-slate-800">
                Declaro que solicito esta certificación para el{" "}
                <strong>desarrollo de mi actividad económica, profesión u oficio</strong>,
                como persona natural o representante de una persona jurídica, y que los datos
                personales y profesionales que aporto son verdaderos.
              </span>
            </label>
          </li>
        </ul>
      </div>

      {state.error ? (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="w-full rounded-xl bg-brand-800 px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {pending
          ? "Procesando…"
          : method === "online" && hasRapyd
          ? `Pagar ${amount} ${currency} en línea →`
          : `Reportar pago por consignación`}
      </button>
      <p className="text-center text-[10px] text-slate-400">
        Su información viaja cifrada. El cobro lo procesa la pasarela del organismo certificador.
      </p>
    </form>
  );
}
