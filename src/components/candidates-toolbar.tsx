"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BulkEmailComposer } from "@/components/bulk-email-composer";
import { BulkEnableExamButton } from "@/components/candidatos/bulk-enable-exam-button";

const STATUS_OPTS = [
  { v: "", l: "Todos los estados" },
  { v: "CONSENT_PENDING", l: "Autorización pendiente" },
  { v: "DOCS_PENDING", l: "Documentos pendientes" },
  { v: "PAYMENT_PENDING", l: "Pago pendiente" },
  { v: "SCHEDULING", l: "Por agendar" },
  { v: "READY", l: "Listo para presentar" },
  { v: "IN_PROGRESS", l: "En presentación" },
  { v: "GRADING", l: "En calificación" },
  { v: "COMMITTEE", l: "En comité" },
  { v: "APPROVED", l: "Aprobado" },
  { v: "REJECTED", l: "No aprobado" },
  { v: "CERTIFIED", l: "Certificado" },
  { v: "EXPIRED", l: "Vencido" },
];

const PAYMENT_OPTS = [
  { v: "", l: "Pagos: todos" },
  { v: "approved", l: "Con pago aprobado" },
  { v: "pending", l: "Pago pendiente" },
  { v: "none", l: "Sin intento de pago" },
];

const CONSENT_OPTS = [
  { v: "", l: "Autorización: todos" },
  { v: "yes", l: "Autorizó tratamiento" },
  { v: "no", l: "Sin autorización" },
];

export function CandidatesToolbar({
  selected,
  allInView,
  eligibleForPractical = [],
  eligibleForTheoretical = [],
}: {
  selected: string[];
  allInView: number;
  eligibleForPractical?: string[];
  eligibleForTheoretical?: string[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [openBulk, setOpenBulk] = useState(false);

  // Los botones se habilitan si hay candidatos seleccionados
  // La validación detallada de elegibilidad ocurre en el backend
  const hasSelected = selected.length > 0;

  function updateParam(name: string, value: string) {
    const u = new URLSearchParams(sp.toString());
    if (value) u.set(name, value);
    else u.delete(name);
    startTransition(() => {
      router.push(`/panel/candidatos?${u.toString()}`);
    });
  }

  function exportHref() {
    const u = new URLSearchParams(sp.toString());
    return `/panel/candidatos/export?${u.toString()}`;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          defaultValue={sp.get("q") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("q", (e.target as HTMLInputElement).value);
          }}
          placeholder="🔍 Buscar por nombre, correo o documento — Enter para aplicar"
          className="min-w-[280px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={sp.get("status") ?? ""}
          onChange={(e) => updateParam("status", e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <select
          value={sp.get("payment") ?? ""}
          onChange={(e) => updateParam("payment", e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {PAYMENT_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <select
          value={sp.get("consent") ?? ""}
          onChange={(e) => updateParam("consent", e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {CONSENT_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <input
          type="date"
          value={sp.get("from") ?? ""}
          onChange={(e) => updateParam("from", e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
        />
        <input
          type="date"
          value={sp.get("to") ?? ""}
          onChange={(e) => updateParam("to", e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            startTransition(() => router.push("/panel/candidatos"));
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2">
        <div className="text-xs text-slate-600">
          {pending ? "Actualizando…" : `${allInView} candidato(s) en vista · ${selected.length} seleccionado(s)`}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={exportHref()}
            className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            ⬇ Exportar CSV / Excel
          </a>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => setOpenBulk(true)}
            className="rounded-lg btn-grad-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            ✉ Enviar correo a {selected.length || "0"}
          </button>
          <BulkEnableExamButton
            selectedEnrollmentIds={selected}
            examType="PRACTICAL"
            disabled={!hasSelected}
          />
          <BulkEnableExamButton
            selectedEnrollmentIds={selected}
            examType="THEORETICAL"
            disabled={!hasSelected}
          />
        </div>
      </div>

      <BulkEmailComposer open={openBulk} selected={selected} onClose={() => setOpenBulk(false)} />
    </div>
  );
}
