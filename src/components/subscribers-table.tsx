"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { PlanAssign } from "@/components/plan-assign";
import { setSubscriberStatus } from "@/lib/actions/platform";
import { useSortableRows, SortableHeader } from "@/components/sortable";

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "slate"> = {
  ACTIVE: "green",
  TRIAL: "amber",
  SUSPENDED: "red",
  CANCELLED: "slate",
};

export interface SubscriberRow {
  id: string;
  slug: string;
  legalName: string;
  tradeName: string | null;
  status: string;
  planId: string | null;
  planName: string | null;
  createdAtISO: string;
  users: number;
  candidates: number;
  certificates: number;
}

export function SubscribersTable({
  subs,
  plans,
}: {
  subs: SubscriberRow[];
  plans: { id: string; name: string }[];
}) {
  const { sorted, sort, setSort } = useSortableRows(subs, {
    org:        (r) => r.tradeName ?? r.legalName,
    plan:       (r) => r.planName ?? "",
    status:     (r) => r.status,
    users:      (r) => r.users,
    candidates: (r) => r.candidates,
    certs:      (r) => r.certificates,
    created:    (r) => r.createdAtISO,
  }, { key: "created", dir: "desc" });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-5 py-3"><SortableHeader label="Organización" sortKey="org" current={sort} onSort={setSort} /></th>
            <th className="px-5 py-3"><SortableHeader label="Plan" sortKey="plan" current={sort} onSort={setSort} /></th>
            <th className="px-5 py-3"><SortableHeader label="Estado" sortKey="status" current={sort} onSort={setSort} /></th>
            <th className="px-5 py-3"><SortableHeader label="Usuarios" sortKey="users" current={sort} onSort={setSort} /></th>
            <th className="px-5 py-3"><SortableHeader label="Candidatos" sortKey="candidates" current={sort} onSort={setSort} /></th>
            <th className="px-5 py-3"><SortableHeader label="Certificados" sortKey="certs" current={sort} onSort={setSort} /></th>
            <th className="px-5 py-3"><SortableHeader label="Creado" sortKey="created" current={sort} onSort={setSort} /></th>
            <th className="px-5 py-3"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3">
                <div className="font-medium text-slate-800">{s.tradeName ?? s.legalName}</div>
                <div className="text-xs text-slate-400">/{s.slug}</div>
              </td>
              <td className="px-5 py-3"><PlanAssign subscriberId={s.id} plans={plans} current={s.planId} /></td>
              <td className="px-5 py-3"><Badge tone={STATUS_TONE[s.status] ?? "slate"}>{s.status}</Badge></td>
              <td className="px-5 py-3 text-slate-600">{s.users}</td>
              <td className="px-5 py-3 text-slate-600">{s.candidates}</td>
              <td className="px-5 py-3 text-slate-600">{s.certificates}</td>
              <td className="px-5 py-3 text-slate-500">{new Date(s.createdAtISO).toLocaleDateString("es-CO")}</td>
              <td className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/suscriptores/${s.id}/usuarios`}
                    className="rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                  >
                    Usuarios
                  </Link>
                  {s.status === "SUSPENDED" || s.status === "CANCELLED" ? (
                    <form action={setSubscriberStatus.bind(null, s.id, "ACTIVE")}>
                      <button type="submit" className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">Activar</button>
                    </form>
                  ) : (
                    <form action={setSubscriberStatus.bind(null, s.id, "SUSPENDED")}>
                      <button type="submit" className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">Suspender</button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
