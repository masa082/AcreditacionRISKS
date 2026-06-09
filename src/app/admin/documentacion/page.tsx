import Link from "next/link";
import { requirePlatformPage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { dateOnly } from "@/lib/format";
import { DocFormDialog, DeleteDocButton } from "@/app/panel/documentacion/client-parts";

export const metadata = { title: "Documentación · Admin" };

/**
 * /admin/documentacion — Gestión GLOBAL del catálogo de documentos.
 *
 * El SUPERADMIN administra documentos con subscriberId = null que se
 * publican para TODOS los suscriptores y candidatos del SaaS (los
 * documentos seed son creados aquí: política, términos, CIOC).
 *
 * Esta vista también muestra una pestaña con los documentos propios de
 * cada tenant — útil para soporte y auditoría — pero la edición de
 * documentos por tenant sigue la responsabilidad del suscriptor desde
 * /panel/documentacion.
 */
export default async function AdminDocumentacionPage() {
  await requirePlatformPage();
  const [globalDocs, tenantDocs] = await Promise.all([
    prisma.documentation.findMany({
      where: { subscriberId: null },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    }),
    prisma.documentation.findMany({
      where: { subscriberId: { not: null } },
      include: { subscriber: { select: { slug: true, tradeName: true, legalName: true } } },
      orderBy: [{ subscriberId: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Documentación"
        subtitle="Catálogo global del SaaS y vista consolidada de los documentos publicados por cada suscriptor."
        actions={<DocFormDialog scope="platform" />}
      />

      <Card className="mb-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Documentos globales</h2>
          <p className="text-[12px] text-slate-500">
            Publicados por el administrador del SaaS — visibles para todos los suscriptores y candidatos.
          </p>
        </div>
        <div className="p-5">
          {globalDocs.length === 0 ? (
            <EmptyState>No hay documentos globales. Use “Nuevo documento” para crear el primero.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {globalDocs.map((d) => (
                <li key={d.id} className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">{d.title}</span>
                      {d.version ? (
                        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 ring-1 ring-brand-100">
                          {d.version}
                        </span>
                      ) : null}
                      {!d.visible ? <Badge tone="amber">Oculto</Badge> : null}
                      {d.seedSlug ? <Badge tone="blue">Sistema</Badge> : null}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      slug: <span className="font-mono">{d.slug}</span> · {dateOnly(d.publishedAt)}
                    </div>
                    {d.description ? (
                      <p className="mt-1 text-[12px] text-slate-500 line-clamp-2">{d.description}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      {d.pdfUrl ? (
                        <a href={d.pdfUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-semibold text-brand-700 hover:bg-brand-50">
                          📄 PDF{d.pdfSizeKB ? ` · ${d.pdfSizeKB} KB` : ""}
                        </a>
                      ) : null}
                      {d.docxUrl ? (
                        <a href={d.docxUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-semibold text-brand-700 hover:bg-brand-50">
                          📝 Word{d.docxSizeKB ? ` · ${d.docxSizeKB} KB` : ""}
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <DocFormDialog scope="platform" doc={d} />
                    {!d.seedSlug ? <DeleteDocButton id={d.id} scope="platform" title={d.title} /> : <span className="text-[10px] text-slate-400">seed</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Documentos por suscriptor</h2>
          <p className="text-[12px] text-slate-500">
            Vista consolidada de los documentos publicados por cada tenant. El SUPERADMIN puede editarlos si requiere soporte.
          </p>
        </div>
        <div className="p-5">
          {tenantDocs.length === 0 ? (
            <EmptyState>Ningún suscriptor ha publicado documentos propios todavía.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tenantDocs.map((d) => (
                <li key={d.id} className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">{d.title}</span>
                      <Badge tone="slate">
                        {d.subscriber?.tradeName ?? d.subscriber?.legalName ?? d.subscriber?.slug ?? "(tenant)"}
                      </Badge>
                      {!d.visible ? <Badge tone="amber">Oculto</Badge> : null}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      slug: <span className="font-mono">{d.slug}</span> · {dateOnly(d.publishedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <DocFormDialog scope="platform" doc={d} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <p className="mt-6 text-center text-[12px] text-slate-400">
        Ver la sección pública:{" "}
        <Link href="/documentacion" className="text-brand-700 hover:underline">
          /documentacion →
        </Link>
      </p>
    </>
  );
}
