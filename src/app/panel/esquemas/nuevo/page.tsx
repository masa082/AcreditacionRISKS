import Link from "next/link";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { SchemeForm } from "@/components/scheme-form";
import { createScheme } from "@/lib/actions/schemes";

export const metadata = { title: "Nuevo esquema" };

export default async function NewSchemePage() {
  const { ctx } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.SCHEME_MANAGE)) redirect("/panel/esquemas");

  return (
    <>
      <PageHeader
        title="Nuevo esquema de certificación"
        subtitle="Cree un esquema bajo el cual operarán bancos y evaluaciones."
        actions={
          <Link href="/panel/esquemas" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Volver
          </Link>
        }
      />
      <Card className="max-w-3xl p-6">
        <SchemeForm action={createScheme} submitLabel="Crear esquema" />
      </Card>
    </>
  );
}
