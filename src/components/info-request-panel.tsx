"use client";

/// Bloque que muestra el calificador en /panel/calificacion/[attemptId]:
///   - lista las solicitudes de información adicional existentes con su
///     estado (Pendiente / Respondida / Cerrada) y la respuesta del
///     candidato cuando aplique;
///   - formulario para crear una nueva solicitud (sólo si no hay otra
///     PENDING — para no acumular varias en paralelo);
///   - botón para cerrar (DISMISSED) una solicitud ANSWERED o PENDING.

import { useState, useTransition } from "react";
import { createInfoRequest, dismissInfoRequest } from "@/lib/actions/info-request";

export interface InfoRequestRow {
  id: string;
  status: "PENDING" | "ANSWERED" | "DISMISSED";
  message: string;
  candidateResponse: string | null;
  candidateFileUrl: string | null;
  candidateFileName: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export function InfoRequestPanel({
  attemptId,
  requests,
  canManage,
}: {
  attemptId: string;
  requests: InfoRequestRow[];
  canManage: boolean;
}) {
  const [message, setMessage] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, startTx] = useTransition();

  const pendingExists = requests.some((r) => r.status === "PENDING");

  function create() {
    setErr(null);
    startTx(async () => {
      const res = await createInfoRequest(attemptId, { message: message.trim() });
      if (!res.ok) setErr(res.error ?? "No se pudo crear la solicitud.");
      else setMessage("");
    });
  }

  function dismiss(id: string) {
    if (!confirm("¿Cerrar esta solicitud? El intento podrá calificarse de nuevo.")) return;
    startTx(async () => {
      const res = await dismissInfoRequest(id);
      if (!res.ok) setErr(res.error ?? "No se pudo cerrar.");
    });
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-800">
          ✉ Solicitudes de información al candidato
        </h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Mientras exista una solicitud <strong>pendiente</strong>, el intento
          queda <em>en espera de respuesta</em> y no se podrá finalizar la
          calificación. Cuando el candidato responda, el equipo recibirá un
          correo y la solicitud pasará a <strong>respondida</strong>.
        </p>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-md bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
          Aún no se ha enviado ninguna solicitud.
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    r.status === "PENDING"
                      ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                      : r.status === "ANSWERED"
                      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                      : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {r.status === "PENDING" ? "Pendiente" : r.status === "ANSWERED" ? "Respondida" : "Cerrada"}
                </span>
                <span className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleString("es-CO")}</span>
              </div>

              <div className="mt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Solicitud</p>
                <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{r.message}</p>
              </div>

              {r.candidateResponse ? (
                <div className="mt-3 rounded-md bg-emerald-50/40 px-3 py-2 ring-1 ring-emerald-200">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                    Respuesta del candidato {r.respondedAt ? `· ${new Date(r.respondedAt).toLocaleString("es-CO")}` : ""}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-slate-700">{r.candidateResponse}</p>
                  {r.candidateFileUrl ? (
                    <a
                      href={r.candidateFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline"
                    >
                      📎 {r.candidateFileName ?? "Archivo adjunto"}
                    </a>
                  ) : null}
                </div>
              ) : null}

              {canManage && r.status !== "DISMISSED" ? (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => dismiss(r.id)}
                    disabled={busy}
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cerrar solicitud
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-white p-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Nueva solicitud al candidato
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={2000}
            disabled={pendingExists || busy}
            placeholder="Describa qué información necesita: una aclaración del análisis, una evidencia adicional, una matriz que faltó, etc."
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50"
          />
          {pendingExists ? (
            <p className="mt-1 text-[11px] text-amber-700">
              Espere a que el candidato responda la solicitud pendiente antes de enviar otra.
            </p>
          ) : null}
          {err ? (
            <p className="mt-2 rounded bg-rose-50 px-3 py-1.5 text-xs text-rose-700 ring-1 ring-rose-200">
              {err}
            </p>
          ) : null}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={create}
              disabled={pendingExists || busy || message.trim().length < 10}
              className="rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 px-4 py-2 text-sm font-bold text-white shadow hover:from-amber-700 hover:to-amber-800 disabled:opacity-50"
            >
              {busy ? "Enviando…" : "✉ Enviar solicitud al candidato"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
