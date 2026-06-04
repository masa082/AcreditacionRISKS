import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export const metadata = { title: "Banco de preguntas" };

export default async function BanksPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  const create = can(ctx, PERMISSIONS.QUESTION_CREATE);

  const banks = await prisma.questionBank.findMany({
    where: { subscriberId },
    orderBy: { createdAt: "desc" },
    include: {
      scheme: { select: { name: true } },
      _count: { select: { questions: true } },
    },
  });

  // Conteo de aprobadas por banco para indicar madurez.
  const approved = await prisma.question.groupBy({
    by: ["bankId"],
    where: { subscriberId, status: "APPROVED" },
    _count: { _all: true },
  });
  const approvedMap = new Map(approved.map((a) => [a.bankId, a._count._all]));

  return (
    <>
      <PageHeader
        title="Banco de preguntas"
        subtitle="Organice preguntas por banco, esquema y versión."
        actions={
          <div className="flex gap-2">
            <Link href="/panel/preguntas/clasificacion" className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Competencias y temas
            </Link>
            {create ? (
              <Link href="/panel/preguntas/nuevo" className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white">
                + Nuevo banco
              </Link>
            ) : null}
          </div>
        }
      />

      {banks.length === 0 ? (
        <EmptyState>Aún no hay bancos de preguntas. Cree el primero para empezar a redactar preguntas.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((b) => (
            <Link key={b.id} href={`/panel/preguntas/${b.id}`} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow">
              <div className="flex items-start justify-between">
                <div className="font-semibold text-slate-800">{b.name}</div>
                <Badge tone={b.isActive ? "green" : "slate"}>{b.version}</Badge>
              </div>
              <div className="mt-1 font-mono text-xs text-slate-400">{b.code}</div>
              <div className="mt-3 text-sm text-slate-500">{b.scheme?.name ?? "Sin esquema"}</div>
              <div className="mt-4 flex gap-4 text-sm">
                <span className="text-slate-700"><b>{b._count.questions}</b> preguntas</span>
                <span className="text-emerald-600"><b>{approvedMap.get(b.id) ?? 0}</b> aprobadas</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
