import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformPage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { PlatformUserEdit } from "@/components/platform-user-edit";
import { dateOnly } from "@/lib/format";

export const metadata = { title: "Usuarios del suscriptor" };

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "slate"> = {
  ACTIVE: "green",
  SUSPENDED: "red",
  PENDING_VERIFICATION: "amber",
};

/// Vista de SUPERADMIN para listar y editar los usuarios de un suscriptor
/// específico. Cubre el caso en que el admin del suscriptor pierde acceso o
/// hay datos incorrectos que el suscriptor no puede arreglar por sí mismo.
export default async function PlatformSubscriberUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformPage();
  const { id } = await params;
  const subscriber = await prisma.subscriber.findUnique({
    where: { id },
    select: { id: true, tradeName: true, legalName: true, slug: true },
  });
  if (!subscriber) notFound();

  const users = await prisma.user.findMany({
    where: { subscriberId: id },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    include: { role: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader
        title={`Usuarios de ${subscriber.tradeName ?? subscriber.legalName}`}
        subtitle={`/${subscriber.slug} · ${users.length} usuario(s). Edición autorizada del SUPERADMIN.`}
      />
      <div className="mb-4">
        <Link href="/admin/suscriptores" className="text-sm text-brand-700 hover:underline">
          ← Volver al listado de suscriptores
        </Link>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Usuario</th>
                <th className="px-5 py-3">Tipo · Rol</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Último ingreso</th>
                <th className="px-5 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                    {u.additionalEmails?.length ? (
                      <div className="mt-1 text-[10px] text-slate-400">
                        Alternos: {u.additionalEmails.join(", ")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    <div className="font-medium">{u.type}</div>
                    <div className="text-xs text-slate-400">{u.role?.name ?? "—"}</div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[u.status] ?? "slate"}>{u.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{u.lastLoginAt ? dateOnly(u.lastLoginAt) : "—"}</td>
                  <td className="px-5 py-3">
                    <PlatformUserEdit
                      userId={u.id}
                      initial={{
                        firstName: u.firstName,
                        lastName: u.lastName,
                        email: u.email,
                        phone: u.phone,
                        status: u.status as "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION",
                      }}
                    />
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
