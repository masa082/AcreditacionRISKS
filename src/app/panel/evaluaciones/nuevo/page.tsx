import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader } from "@/components/ui";
import { ExamForm } from "@/components/exam-form";
import { createExam } from "@/lib/actions/exams";

export const metadata = { title: "Nueva evaluación" };

export default async function NewExamPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.EXAM_MANAGE)) redirect("/panel/evaluaciones");

  const schemes = await prisma.certificationScheme.findMany({
    where: { subscriberId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true },
  });

  return (
    <>
      <PageHeader
        title="Nueva evaluación"
        subtitle="Defina la configuración general. Luego agregará secciones de preguntas."
        actions={<Link href="/panel/evaluaciones" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Volver</Link>}
      />
      <Card className="max-w-4xl p-6">
        <ExamForm action={createExam} schemes={schemes} submitLabel="Crear evaluación" />
      </Card>
    </>
  );
}
