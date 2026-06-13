"use client";

/// Tarjeta animada que aparece al candidato en /portal/examen/[attemptId]/resultado
/// cuando el equipo evaluador le solicitó información adicional para
/// terminar de calificar su Caso Práctico. Mientras la solicitud esté
/// PENDING, mostramos un formulario de texto. Cuando responde, se marca
/// como ANSWERED y la tarjeta queda en estado de "respuesta enviada".
///
/// El equipo recibe correo automático y desde el panel decide si cerrar
/// (DISMISSED) o seguir calificando.

import { useState, useTransition } from "react";
import { respondToInfoRequest } from "@/lib/actions/info-request";

export interface CandidateInfoRequest {
  id: string;
  status: "PENDING" | "ANSWERED" | "DISMISSED";
  message: string;
  candidateResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export function CandidateInfoRequests({
  requests,
}: {
  requests: CandidateInfoRequest[];
}) {
  if (requests.length === 0) return null;
  return (
    <div className="mt-5 space-y-4">
      {requests.map((r) => (
        <InfoRequestCard key={r.id} request={r} />
      ))}
    </div>
  );
}

function InfoRequestCard({ request }: { request: CandidateInfoRequest }) {
  const [response, setResponse] = useState("");
  const [done, setDone] = useState(request.status !== "PENDING");
  const [err, setErr] = useState<string | null>(null);
  const [busy, startTx] = useTransition();

  function send() {
    setErr(null);
    startTx(async () => {
      const res = await respondToInfoRequest(request.id, {
        response: response.trim(),
      });
      if (!res.ok) setErr(res.error ?? "No se pudo enviar.");
      else setDone(true);
    });
  }

  const isPending = request.status === "PENDING" && !done;

  return (
    <section
      className={`rounded-2xl border-2 p-5 shadow-sm ${
        isPending
          ? "border-amber-400 bg-gradient-to-br from-amber-50 via-white to-white ring-2 ring-amber-200 shadow-md shadow-amber-100"
          : request.status === "DISMISSED"
          ? "border-slate-200 bg-white"
          : "border-emerald-300 bg-gradient-to-br from-emerald-50/40 via-white to-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {isPending
              ? "⚠ El equipo evaluador necesita información adicional"
              : request.status === "DISMISSED"
              ? "Solicitud cerrada por el equipo"
              : "✓ Respuesta enviada"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Enviada {new Date(request.createdAt).toLocaleString("es-CO")}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isPending
              ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
              : request.status === "DISMISSED"
              ? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
              : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
          }`}
        >
          {isPending ? "Pendiente" : request.status === "DISMISSED" ? "Cerrada" : "Respondida"}
        </span>
      </div>

      <div className="mt-3 rounded-md bg-white p-3 ring-1 ring-slate-200">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Solicitud del equipo
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
          {request.message}
        </p>
      </div>

      {isPending ? (
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Su respuesta
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder="Aporte la información solicitada con el mayor detalle posible. El equipo calificará una vez reciba su respuesta."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
          />
          {err ? (
            <p className="mt-2 rounded bg-rose-50 px-3 py-1.5 text-xs text-rose-700 ring-1 ring-rose-200">
              {err}
            </p>
          ) : null}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              Su examen está <strong>en espera</strong> hasta que envíe la respuesta.
            </p>
            <button
              type="button"
              onClick={send}
              disabled={busy || response.trim().length === 0}
              className="rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 px-4 py-2 text-sm font-bold text-white shadow hover:from-amber-700 hover:to-amber-800 disabled:opacity-50"
            >
              {busy ? "Enviando…" : "Enviar respuesta"}
            </button>
          </div>
        </div>
      ) : request.candidateResponse ? (
        <div className="mt-3 rounded-md bg-emerald-50/40 p-3 ring-1 ring-emerald-200">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
            Su respuesta {request.respondedAt ? `· ${new Date(request.respondedAt).toLocaleString("es-CO")}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
            {request.candidateResponse}
          </p>
        </div>
      ) : null}
    </section>
  );
}
