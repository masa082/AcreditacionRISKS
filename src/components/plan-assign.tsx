"use client";

import { useTransition } from "react";
import { assignPlan } from "@/lib/actions/platform";

export function PlanAssign({
  subscriberId,
  plans,
  current,
}: {
  subscriberId: string;
  plans: { id: string; name: string }[];
  current: string | null;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={current ?? ""}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value || null;
        start(() => assignPlan(subscriberId, v));
      }}
      className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-brand-600 disabled:opacity-60"
    >
      <option value="">Sin plan</option>
      {plans.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}
