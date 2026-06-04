import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader, Badge, EmptyState } from "@/components/ui";

export const metadata = { title: "Esquemas de certificación" };

export default async function SchemesPage() {
  const { ctx, subscriberId } = await requireSubscriberPage();
  const manage = can(ctx, PERMISSIONS.SCHEME_MANAGE);

  const schemes = await prisma.certificationScheme.findMany({
    where: { subscriberId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questionBanks: true, exams: true, enrollments: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Esquemas de certificación"
        subtitle="Defina alcances, normas de referencia y vigencias."
        actions={
          manage ? (
            <Link
              href="/panel/esquemas/nuevo"
              className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white"
            >
              + Nuevo esquema
            </Link>
          ) : null
        }
      />

      {schemes.length === 0 ? (
        <EmptyState>
          Aún no hay esquemas de certificación. Cree el primero para asociar
          bancos de preguntas y evaluaciones.
        </EmptyState>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Esquema</th>
                  <th className="px-5 py-3">Norma</th>
                  <th className="px-5 py-3">Vigencia</th>
                  <th className="px-5 py-3">Bancos</th>
                  <th className="px-5 py-3">Evaluaciones</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schemes.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{s.name}</div>
                      <div className="font-mono text-xs text-slate-400">{s.code}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{s.normReference ?? "—"}</td>
                    <td className="px-5 py-3 text-slate-600">{s.validityMonths} meses</td>
                    <td className="px-5 py-3 text-slate-600">{s._count.questionBanks}</td>
                    <td className="px-5 py-3 text-slate-600">{s._count.exams}</td>
                    <td className="px-5 py-3">
                      <Badge tone={s.isActive ? "green" : "slate"}>
                        {s.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {manage ? (
                        <Link href={`/panel/esquemas/${s.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                          Editar
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
