import { redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { RoleForm } from "@/components/role-form";
import { deleteRole } from "@/lib/actions/roles";

export const metadata = { title: "Roles y permisos" };

export default async function RolesPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.ROLE_MANAGE)) redirect("/panel");

  const roles = await prisma.role.findMany({
    where: { subscriberId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true } } },
  });

  return (
    <>
      <PageHeader title="Roles y permisos" subtitle="Defina roles personalizados con permisos a la medida de su organización." />

      <Card className="mb-6">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Nuevo rol personalizado</h2></div>
        <div className="p-6"><RoleForm /></div>
      </Card>

      <div className="space-y-3">
        {roles.map((r) => {
          const wildcard = r.permissions.includes("*");
          return (
            <Card key={r.id}>
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <span className="font-semibold text-slate-900">{r.name}</span>
                    <span className="ml-2 font-mono text-xs text-slate-400">{r.key}</span>
                    {r.isSystem ? <Badge tone="violet">Sistema</Badge> : <Badge tone="blue">Personalizado</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>{wildcard ? "Acceso total" : `${r.permissions.length} permiso(s)`}</span>
                    <span>{r._count.users} usuario(s)</span>
                    <span className="text-xs text-brand-700">{r.isSystem ? "Ver ▾" : "Editar ▾"}</span>
                  </div>
                </summary>
                <div className="border-t border-slate-200 p-6">
                  {r.isSystem ? (
                    <div className="text-sm text-slate-600">
                      <p className="mb-2">{r.description}</p>
                      <p className="text-xs text-slate-400">Permisos: {wildcard ? "todos (acceso total)" : r.permissions.join(", ")}</p>
                      <p className="mt-2 text-xs text-slate-400">Los roles del sistema no se pueden modificar; cree uno personalizado para ajustar permisos.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <RoleForm roleId={r.id} initial={{ name: r.name, description: r.description, permissions: r.permissions }} />
                      {r._count.users === 0 ? (
                        <form action={deleteRole.bind(null, r.id)} className="border-t border-slate-100 pt-3">
                          <button type="submit" className="text-xs font-medium text-rose-600 hover:underline">Eliminar este rol</button>
                        </form>
                      ) : (
                        <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">No se puede eliminar: tiene usuarios asignados.</p>
                      )}
                    </div>
                  )}
                </div>
              </details>
            </Card>
          );
        })}
      </div>
    </>
  );
}
