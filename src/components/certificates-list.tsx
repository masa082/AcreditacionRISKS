"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { CertificateShareActions } from "@/components/certificate-share-actions";
import { RevokeForm } from "@/components/revoke-form";
import { useSortableRows, SortableHeader } from "@/components/sortable";

export interface CertificateRow {
  id: string;
  code: string;
  holderName: string;
  holderEmail: string;
  holderPhone: string | null;
  title: string;
  status: "VALID" | "EXPIRED" | "SUSPENDED" | "WITHDRAWN" | "CANCELLED" | string;
  effectiveStatus: "VALID" | "EXPIRED" | "SUSPENDED" | "WITHDRAWN" | "CANCELLED" | string;
  issuedAtISO: string;
  expiresAtISO: string | null;
}

const STATUS_TONE: Record<string, string> = {
  VALID: "bg-emerald-100 text-emerald-700",
  EXPIRED: "bg-amber-100 text-amber-700",
  SUSPENDED: "bg-rose-100 text-rose-700",
  WITHDRAWN: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};
const STATUS_LABEL: Record<string, string> = {
  VALID: "Vigente",
  EXPIRED: "Vencido",
  SUSPENDED: "Suspendido",
  WITHDRAWN: "Anulado",
  CANCELLED: "Anulado",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function CertificatesList({
  rows,
  programs,
  canRevoke,
}: {
  rows: CertificateRow[];
  programs: string[];
  canRevoke: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  function updateParam(name: string, value: string) {
    const u = new URLSearchParams(sp.toString());
    if (value) u.set(name, value);
    else u.delete(name);
    startTransition(() => router.push(`/panel/certificados?${u.toString()}`));
  }

  const allPrograms = useMemo(() => Array.from(new Set(programs)).sort(), [programs]);

  const { sorted, sort, setSort } = useSortableRows(rows, {
    holder:  (r) => r.holderName,
    code:    (r) => r.code,
    program: (r) => r.title,
    issued:  (r) => r.issuedAtISO,
    expires: (r) => r.expiresAtISO ?? "9999",
    status:  (r) => r.effectiveStatus,
  }, { key: "issued", dir: "desc" });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          defaultValue={sp.get("q") ?? ""}
          onKeyDown={(e) => { if (e.key === "Enter") updateParam("q", (e.target as HTMLInputElement).value); }}
          placeholder="🔍 Buscar por titular, código o documento — Enter"
          className="min-w-[260px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={sp.get("program") ?? ""}
          onChange={(e) => updateParam("program", e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Programa: todos</option>
          {allPrograms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={sp.get("status") ?? ""}
          onChange={(e) => updateParam("status", e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Estado: todos</option>
          <option value="VALID">Vigente</option>
          <option value="EXPIRED">Vencido</option>
          <option value="SUSPENDED">Suspendido</option>
          <option value="WITHDRAWN">Anulado</option>
        </select>
        <input
          type="date"
          value={sp.get("from") ?? ""}
          onChange={(e) => updateParam("from", e.target.value)}
          title="Emitidos desde"
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
        />
        <input
          type="date"
          value={sp.get("to") ?? ""}
          onChange={(e) => updateParam("to", e.target.value)}
          title="Emitidos hasta"
          className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => startTransition(() => router.push("/panel/certificados"))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
        >
          Limpiar
        </button>
        {pending ? <span className="text-xs text-slate-500">Actualizando…</span> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] tracking-wider">
              <th className="px-3 py-2"><SortableHeader label="Titular" sortKey="holder" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2"><SortableHeader label="Código" sortKey="code" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 min-w-[260px]"><SortableHeader label="Programa" sortKey="program" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2"><SortableHeader label="Emisión" sortKey="issued" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2"><SortableHeader label="Vence" sortKey="expires" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2"><SortableHeader label="Estado" sortKey="status" current={sort} onSort={setSort} /></th>
              <th className="px-3 py-2 text-right"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Acciones</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 align-top">
                  <div className="font-semibold text-slate-900">{c.holderName}</div>
                  <div className="text-[11px] text-slate-500">{c.holderEmail}</div>
                </td>
                <td className="px-3 py-2 align-top font-mono text-xs text-brand-800">{c.code}</td>
                <td className="px-3 py-2 align-top text-xs text-slate-700">{c.title}</td>
                <td className="px-3 py-2 align-top text-xs text-slate-600">{fmtDate(c.issuedAtISO)}</td>
                <td className="px-3 py-2 align-top text-xs text-slate-600">{fmtDate(c.expiresAtISO)}</td>
                <td className="px-3 py-2 align-top">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_TONE[c.effectiveStatus] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABEL[c.effectiveStatus] ?? c.effectiveStatus}
                  </span>
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center justify-end gap-2">
                    <CertificateShareActions
                      certId={c.id}
                      defaultEmail={c.holderEmail}
                      defaultName={c.holderName}
                      defaultPhone={c.holderPhone ?? undefined}
                    />
                    {canRevoke && c.status === "VALID" ? <RevokeForm certificateId={c.id} /> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No hay certificados que coincidan con los filtros.
          </div>
        ) : null}
      </div>
    </div>
  );
}
