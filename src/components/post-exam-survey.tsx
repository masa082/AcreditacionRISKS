"use client";

/// Bloque que aparece en /portal/examen/[attemptId]/resultado debajo del
/// resumen del examen. Tiene dos paneles:
///
/// 1. Encuesta de satisfacción — NPS 0-10 + estrellas 1-5 + comentario
///    libre. Una sola pregunta visible por defecto, el resto colapsado.
/// 2. Refiera a un colega — hasta 3 filas (nombre + correo + teléfono).
///
/// Si ya respondió antes (alreadySubmittedSurvey), el panel de encuesta
/// muestra el agradecimiento y no permite reenviar. El de referidos es
/// siempre re-enviable: cada envío crea Leads nuevos.

import { useState, useTransition } from "react";
import {
  submitSatisfactionSurvey,
  submitPostExamReferrals,
  type ReferralLeadInput,
} from "@/lib/actions/post-exam-survey";

const EMPTY_REFERRAL: ReferralLeadInput = { fullName: "", email: "", phone: "" };

export function PostExamSurveyAndReferral({
  attemptId,
  alreadySubmittedSurvey,
}: {
  attemptId: string;
  alreadySubmittedSurvey: boolean;
}) {
  // ── Encuesta ─────────────────────────────────────────────────────
  const [nps, setNps] = useState<number | null>(null);
  const [overall, setOverall] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [allowFollowup, setAllowFollowup] = useState(false);
  const [surveyDone, setSurveyDone] = useState(alreadySubmittedSurvey);
  const [surveyErr, setSurveyErr] = useState<string | null>(null);
  const [surveyBusy, startSurveyTx] = useTransition();

  function sendSurvey() {
    setSurveyErr(null);
    startSurveyTx(async () => {
      const res = await submitSatisfactionSurvey(attemptId, {
        npsScore: nps,
        overallRating: overall,
        difficultyRating: null,
        clarityRating: null,
        platformRating: null,
        comment: comment.trim() || null,
        allowFollowup,
      });
      if (!res.ok) setSurveyErr(res.error ?? "No se pudo enviar.");
      else setSurveyDone(true);
    });
  }

  // ── Referidos ────────────────────────────────────────────────────
  const [referrals, setReferrals] = useState<ReferralLeadInput[]>([{ ...EMPTY_REFERRAL }]);
  const [referralsCreated, setReferralsCreated] = useState(0);
  const [referralErr, setReferralErr] = useState<string | null>(null);
  const [referralBusy, startReferralTx] = useTransition();

  function updateReferral(i: number, patch: Partial<ReferralLeadInput>) {
    setReferrals((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addReferralRow() {
    if (referrals.length >= 3) return;
    setReferrals((prev) => [...prev, { ...EMPTY_REFERRAL }]);
  }
  function removeReferralRow(i: number) {
    setReferrals((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }
  function sendReferrals() {
    setReferralErr(null);
    setReferralsCreated(0);
    startReferralTx(async () => {
      const res = await submitPostExamReferrals(attemptId, referrals);
      if (!res.ok) setReferralErr(res.error ?? "No se pudo registrar.");
      else {
        setReferralsCreated(res.created);
        setReferrals([{ ...EMPTY_REFERRAL }]);
      }
    });
  }

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      {/* ─────────── Encuesta de satisfacción ─────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800">
          ⭐ Su opinión nos importa
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Tarda menos de un minuto y nos ayuda a mejorar el proceso de certificación.
        </p>

        {surveyDone ? (
          <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            ✓ ¡Gracias por su respuesta! Su retroalimentación ya quedó registrada.
          </div>
        ) : (
          <>
            <fieldset className="mt-5">
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                ¿Qué tan probable es que recomiende este proceso a un colega?
              </legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: 11 }).map((_, n) => {
                  const sel = nps === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNps(n)}
                      className={`h-9 min-w-[36px] rounded-md border px-2 text-sm font-semibold transition ${
                        sel
                          ? n >= 9
                            ? "border-emerald-500 bg-emerald-500 text-white shadow"
                            : n >= 7
                            ? "border-amber-500 bg-amber-500 text-white shadow"
                            : "border-rose-500 bg-rose-500 text-white shadow"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>0 — Nada probable</span>
                <span>10 — Muy probable</span>
              </div>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Calificación general del proceso
              </legend>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = overall != null && star <= overall;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setOverall(star)}
                      className={`text-3xl leading-none transition ${
                        filled ? "text-amber-400" : "text-slate-300 hover:text-amber-200"
                      }`}
                      title={`${star} ${star === 1 ? "estrella" : "estrellas"}`}
                    >
                      ★
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-5 block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Comentario (opcional)
              </span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Cuéntenos qué destacaría o qué podemos mejorar."
                rows={3}
                maxLength={1000}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            <label className="mt-3 flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={allowFollowup}
                onChange={(e) => setAllowFollowup(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Autorizo que el equipo del organismo certificador me contacte para
                profundizar en mi retroalimentación, si fuera necesario.
              </span>
            </label>

            {surveyErr ? (
              <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
                {surveyErr}
              </p>
            ) : null}

            <button
              type="button"
              onClick={sendSurvey}
              disabled={surveyBusy}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-brand-700 to-brand-800 px-4 py-2 text-sm font-bold text-white shadow hover:from-brand-800 hover:to-brand-900 disabled:opacity-50"
            >
              {surveyBusy ? "Enviando…" : "Enviar respuesta"}
            </button>
          </>
        )}
      </section>

      {/* ─────────── Referidos ─────────── */}
      <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800">
          🤝 Refiera a un colega
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          ¿Conoce a alguien que también deba certificarse en SARLAFT, SAGRILAFT u otro
          esquema? Déjenos su nombre, correo y teléfono y el equipo lo contactará.
          Cada referido confirmado puede generar beneficios para usted dentro del plan
          de recompensas.
        </p>

        <div className="mt-4 space-y-3">
          {referrals.map((r, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Contacto {i + 1}
                </span>
                {referrals.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeReferralRow(i)}
                    className="text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <input
                  value={r.fullName}
                  onChange={(e) => updateReferral(i, { fullName: e.target.value })}
                  placeholder="Nombre completo"
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
                <input
                  type="email"
                  value={r.email}
                  onChange={(e) => updateReferral(i, { email: e.target.value })}
                  placeholder="correo@empresa.com"
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
                <input
                  value={r.phone ?? ""}
                  onChange={(e) => updateReferral(i, { phone: e.target.value })}
                  placeholder="Celular (con indicativo)"
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
          ))}
        </div>

        {referrals.length < 3 ? (
          <button
            type="button"
            onClick={addReferralRow}
            className="mt-3 text-xs font-semibold text-amber-800 hover:underline"
          >
            + Agregar otro contacto
          </button>
        ) : null}

        {referralErr ? (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
            {referralErr}
          </p>
        ) : null}
        {referralsCreated > 0 ? (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
            ✓ ¡Gracias! Registramos {referralsCreated} contacto(s). El equipo
            comercial los atenderá pronto.
          </p>
        ) : null}

        <button
          type="button"
          onClick={sendReferrals}
          disabled={referralBusy}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-4 py-2 text-sm font-bold text-white shadow hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
        >
          {referralBusy ? "Enviando…" : "Compartir contactos"}
        </button>

        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
          Al enviar declara que cuenta con la autorización de cada persona para
          compartir sus datos con el organismo certificador con fines de contacto
          comercial. Tratamiento conforme a la Política de Habeas Data.
        </p>
      </section>
    </div>
  );
}
