"use client";

import { useState } from "react";
import { LinkedInShare } from "@/components/linkedin-share";

/**
 * Tarjeta del certificado del candidato.
 *
 * Muestra:
 *  1. Encabezado: título · código · fechas + badge de estado.
 *  2. Chip de PUNTAJE OBTENIDO si el certificado tiene un intento de
 *     examen vinculado. Esta información SOLO aparece aquí — NO se
 *     embebe en el PDF del certificado para no condicionar al lector
 *     externo del documento formal.
 *  3. Preview del PDF embebido en iframe (visor nativo del navegador).
 *     El PDF se sirve desde /api/certificate/{verifyToken}/pdf con
 *     Content-Disposition: inline, así que el navegador lo renderiza.
 *  4. Acciones: Descargar (forzando download), Vista completa,
 *     Verificación pública (URL del QR).
 *
 * El iframe se monta solo cuando la tarjeta está expandida o al
 * cargar la primera vez si hay un único certificado. Esto evita
 * descargar todos los PDFs si el candidato tiene varios.
 */

const STATUS_TONE: Record<string, { label: string; cls: string }> = {
  VALID: { label: "Vigente", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  EXPIRED: { label: "Vencido", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  SUSPENDED: { label: "Suspendido", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  WITHDRAWN: { label: "Anulado", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  CANCELLED: { label: "Anulado", cls: "bg-slate-100 text-slate-500 ring-slate-200" },
};

export interface CertificateRow {
  id: string;
  code: string;
  title: string;
  /** Tipo: CERTIFICATION (diploma final) o EXAM_PRESENTATION (constancia). */
  type: "CERTIFICATION" | "EXAM_PRESENTATION";
  issuedAtIso: string;
  expiresAtIso: string | null;
  status: string;
  /** URL pública del PDF (acepta verifyToken). */
  pdfUrl: string;
  /** URL de verificación pública (QR), relativa. */
  publicViewUrl: string;
  /** URL ABSOLUTA de verificación — necesaria para LinkedIn/redes. */
  publicViewUrlAbsolute: string;
  /** Razón comercial del organismo — irá como `organizationName` en LinkedIn. */
  organizationName: string;
  /** Puntaje del intento — solo se muestra en pantalla, NO va al PDF. */
  score: {
    rawScore: string | null;
    maxScore: string | null;
    scorePercent: string | null;
    passed: boolean | null;
  } | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function num(s: string | null): number | null {
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function CertificateCard({ row }: { row: CertificateRow }) {
  // Preview cargada por defecto. El navegador lazy-carga el iframe igual.
  const [showPreview, setShowPreview] = useState(true);

  const expired =
    row.status === "VALID" &&
    row.expiresAtIso &&
    new Date(row.expiresAtIso) < new Date();
  const stateKey = expired ? "EXPIRED" : row.status;
  const state = STATUS_TONE[stateKey] ?? STATUS_TONE.VALID;

  const raw = num(row.score?.rawScore ?? null);
  const max = num(row.score?.maxScore ?? null);
  const pct = num(row.score?.scorePercent ?? null);
  const passed = row.score?.passed ?? null;

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      {/* ─── Encabezado ─────────────────────────────────────────────── */}
      <header className="border-b border-slate-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">{row.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Código <span className="font-mono">{row.code}</span> · emitido{" "}
              {formatDate(row.issuedAtIso)}
              {row.expiresAtIso ? ` · vence ${formatDate(row.expiresAtIso)}` : ""}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${state.cls}`}
          >
            {state.label}
          </span>
        </div>

        {/* Chips de puntaje — SOLO en pantalla, NO en el certificado.
            Si no hay intento vinculado, no mostramos esta línea. */}
        {row.score ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-brand-50/40 px-3 py-2 ring-1 ring-brand-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-900">
              📊 Puntaje obtenido (solo visible en su portal)
            </span>
            {raw != null && max != null ? (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-bold text-slate-800 ring-1 ring-brand-200">
                {raw.toLocaleString("es-CO")} / {max.toLocaleString("es-CO")}
              </span>
            ) : null}
            {pct != null ? (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-bold text-brand-800 ring-1 ring-brand-200">
                {pct.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%
              </span>
            ) : null}
            {passed === true ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[12px] font-bold text-emerald-800 ring-1 ring-emerald-200">
                ✓ Aprobado
              </span>
            ) : null}
            {passed === false ? (
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[12px] font-bold text-rose-800 ring-1 ring-rose-200">
                ✗ No aprobado
              </span>
            ) : null}
            <span className="ml-auto text-[10.5px] italic text-slate-500">
              Este puntaje NO se imprime en el certificado emitido.
            </span>
          </div>
        ) : null}
      </header>

      {/* ─── Preview del PDF ────────────────────────────────────────── */}
      {showPreview ? (
        <div className="relative bg-slate-100">
          <iframe
            src={`${row.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            title={`Vista previa del certificado ${row.code}`}
            className="block h-[520px] w-full border-0"
            // Sandbox no se pone: el visor de PDF nativo (PDFium) necesita
            // ejecutar sus propios scripts internos para renderizar.
            loading="lazy"
          />
          {/* Pequeño aviso superpuesto en la esquina */}
          <div className="pointer-events-none absolute right-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-slate-200">
            Vista previa
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="block h-[120px] w-full bg-slate-50 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          🔍 Cargar vista previa del certificado
        </button>
      )}

      {/* ─── Compartir en LinkedIn ─ solo certificados de competencias ── */}
      {row.type === "CERTIFICATION" && row.status === "VALID" ? (
        <div className="border-t border-slate-100 px-5 py-4">
          <LinkedInShare
            title={row.title}
            code={row.code}
            organizationName={row.organizationName}
            issueYear={new Date(row.issuedAtIso).getFullYear()}
            issueMonth={new Date(row.issuedAtIso).getMonth() + 1}
            expirationYear={row.expiresAtIso ? new Date(row.expiresAtIso).getFullYear() : undefined}
            expirationMonth={row.expiresAtIso ? new Date(row.expiresAtIso).getMonth() + 1 : undefined}
            publicUrl={row.publicViewUrlAbsolute}
          />
        </div>
      ) : null}

      {/* ─── Acciones ───────────────────────────────────────────────── */}
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
        <a
          href={row.publicViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          🔗 Página pública de verificación
        </a>
        <a
          href={`/certificado/${row.id}`}
          className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50"
        >
          🔍 Vista completa (imprimible)
        </a>
        <a
          href={row.pdfUrl}
          download={`certificado-${row.code}.pdf`}
          className="rounded-lg btn-grad-navy px-3 py-1.5 text-xs font-bold text-white shadow-sm"
        >
          ⬇ Descargar PDF
        </a>
      </footer>
    </article>
  );
}
