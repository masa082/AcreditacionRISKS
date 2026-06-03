import { requireSubscriberPage } from "@/lib/guards";
import { PageHeader, Card } from "@/components/ui";
import { ChangePasswordForm } from "@/components/change-password-form";

export const metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const { ctx } = await requireSubscriberPage();
  return (
    <>
      <PageHeader title="Mi cuenta" subtitle={`${ctx.firstName} ${ctx.lastName} · ${ctx.email}`} />
      <Card className="max-w-xl p-6">
        <h2 className="mb-4 font-semibold text-slate-900">Cambiar contraseña</h2>
        <ChangePasswordForm />
      </Card>
    </>
  );
}
