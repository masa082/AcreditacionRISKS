import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader, Badge } from "@/components/ui";
import { SchemeForm } from "@/components/scheme-form";
import { updateScheme, toggleSchemeActive } from "@/lib/actions/schemes";

export const metadata = { title: "Editar esquema" };

export default async function EditSchemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.SCHEME_MANAGE)) redirect("/panel/esquemas");

  const scheme = await prisma.certificationScheme.findUnique({ where: { id } });
  if (!scheme || scheme.subscriberId !== subscriberId) notFound();

  const boundUpdate = updateScheme.bind(null, id);
  const boundToggle = toggleSchemeActive.bind(null, id);

  return (
    <>
      <PageHeader
        title={scheme.name}
        subtitle={`Esquema ${scheme.code}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={scheme.isActive ? "green" : "slate"}>
              {scheme.isActive ? "Activo" : "Inactivo"}
            </Badge>
            <form action={boundToggle}>
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                {scheme.isActive ? "Desactivar" : "Activar"}
              </button>
            </form>
            <Link href="/panel/esquemas" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Volver
            </Link>
          </div>
        }
      />
      <Card className="max-w-3xl p-6">
        <SchemeForm
          action={boundUpdate}
          initial={{
            code: scheme.code,
            name: scheme.name,
            description: scheme.description,
            scope: scheme.scope,
            normReference: scheme.normReference,
            validityMonths: scheme.validityMonths,
          }}
          submitLabel="Guardar cambios"
        />
      </Card>
    </>
  );
}
