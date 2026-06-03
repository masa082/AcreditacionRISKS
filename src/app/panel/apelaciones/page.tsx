import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge, StatTile } from "@/components/ui";
import { AppealResolveForm } from "@/components/appeal-resolve-form";
import { APPEAL_TYPE_LABELS } from "@/lib/appeals";
import { dateTime } from "@/lib/format";

export const metadata = { title: "Apelaciones y quejas" };

const STATUS: Record<string, { label: string; tone: "amber" | "blue" | "green" | "red" }> = {
  OPEN: { label: "Abierto", tone: "amber" },
  IN_REVIEW: { label: "En revisión", tone: "blue" },
  RESOLVED: { label: "Resuelto", tone: "green" },
  REJECTED: { label: "No procedente", tone: "red" },
};

export default async function AppealsPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.APPEAL_MANAGE)) redirect("/panel");
  const canManage = can(ctx, PERMISSIONS.APPEAL_MANAGE);

  const appeals = await prisma.appeal.findMany({
    where: { subscriberId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { candidate: { select: { firstName: true, lastName: true } }, enrollment: { select: { code: true } } },
  });
  const open = appeals.filter((a) => a.status === "OPEN" || a.status === "IN_REVIEW").length;

  return (
    <>
      <PageHeader title="Apelaciones y quejas" subtitle="Atienda apelaciones, quejas, solicitudes y correcciones de los candidatos." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Casos abiertos" value={open} tone={open ? "warn" : "default"} />
        <StatTile label="Total" value={appeals.length} />
        <StatTile label="Resueltos" value={appeals.filter((a) => a.status === "RESOLVED").length} tone="good" />
      </div>

      <Card>
        <div className="p-5">
          {appeals.length === 0 ? (
            <EmptyState>No hay apelaciones ni quejas registradas.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {appeals.map((a) => {
                const st = STATUS[a.status] ?? STATUS.OPEN;
                return (
                  <li key={a.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-slate-800">{a.subject}</span>
                        <span className="ml-2 text-xs text-slate-400">
                          {APPEAL_TYPE_LABELS[a.type]} · {a.candidate?.firstName} {a.candidate?.lastName}
                          {a.enrollment ? ` · ${a.enrollment.code}` : ""} · {dateTime(a.createdAt)}
                        </span>
                      </div>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{a.body}</p>
                    {a.resolution ? <p className="mt-2 text-sm text-slate-500"><strong>Respuesta:</strong> {a.resolution}</p> : null}
                    {canManage && a.status !== "RESOLVED" && a.status !== "REJECTED" ? (
                      <AppealResolveForm appealId={a.id} currentStatus={a.status} resolution={a.resolution} />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
