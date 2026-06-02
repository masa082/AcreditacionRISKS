import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader } from "@/components/ui";
import { BankForm } from "@/components/bank-form";

export const metadata = { title: "Nuevo banco de preguntas" };

export default async function NewBankPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.QUESTION_CREATE)) redirect("/panel/preguntas");

  const schemes = await prisma.certificationScheme.findMany({
    where: { subscriberId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true },
  });

  return (
    <>
      <PageHeader
        title="Nuevo banco de preguntas"
        actions={
          <Link href="/panel/preguntas" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Volver
          </Link>
        }
      />
      <Card className="max-w-3xl p-6">
        <BankForm schemes={schemes} />
      </Card>
    </>
  );
}
