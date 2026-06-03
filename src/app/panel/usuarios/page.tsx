import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { TeamUserForm } from "@/components/team-user-form";
import { TeamRowActions } from "@/components/team-row-actions";
import { dateOnly } from "@/lib/format";

export const metadata = { title: "Usuarios del equipo" };

export default async function TeamPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.USER_MANAGE)) redirect("/panel");

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: { subscriberId, type: "SUBSCRIBER" },
      orderBy: { createdAt: "asc" },
      include: { role: { select: { id: true, name: true } } },
    }),
    prisma.role.findMany({ where: { subscriberId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Usuarios del equipo" subtitle="Cree y administre los usuarios internos de su organización y sus roles." />

      <Card className="mb-6">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Nuevo usuario</h2></div>
        <div className="p-6">
          {roles.length === 0 ? <EmptyState>Cree un rol primero.</EmptyState> : <TeamUserForm roles={roles} />}
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Equipo ({users.length})</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Usuario</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Último ingreso</th>
                <th className="px-5 py-3">Rol y acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{u.firstName} {u.lastName}{u.id === ctx.userId ? <span className="ml-2 text-xs text-brand-700">(usted)</span> : null}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={u.status === "ACTIVE" ? "green" : u.status === "SUSPENDED" ? "red" : "amber"}>{u.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{u.lastLoginAt ? dateOnly(u.lastLoginAt) : "—"}</td>
                  <td className="px-5 py-3">
                    <TeamRowActions userId={u.id} currentRoleId={u.role?.id ?? null} status={u.status} roles={roles} isSelf={u.id === ctx.userId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
