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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {globalDocs.map((d) => (
                <article
                  key={d.id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-300 hover:shadow-premium"
                >
                  <a
                    href={d.pdfUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-[8.5/11] w-full overflow-hidden border-b border-slate-200 bg-slate-50"
                  >
                    {d.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.thumbnailUrl} alt={`Vista previa: ${d.title}`} className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]" loading="lazy" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-50 to-slate-100 text-5xl">📄</div>
                    )}
                    <span className="absolute right-3 top-3 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 shadow-sm ring-1 ring-slate-200">PDF</span>
                    {!d.visible ? (
                      <span className="absolute left-3 top-3 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 shadow-sm ring-1 ring-amber-200">Oculto</span>
                    ) : null}
                  </a>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {d.version ? (
                        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 ring-1 ring-brand-100">{d.version}</span>
                      ) : null}
                      {d.seedSlug ? <Badge tone="blue">Sistema</Badge> : null}
                    </div>
                    <h3 className="text-sm font-bold leading-tight text-brand-900">{d.title}</h3>
                    <div className="text-[11px] text-slate-400">slug: <span className="font-mono">{d.slug}</span></div>
                    {d.description ? (
                      <p className="line-clamp-2 text-[12px] text-slate-500">{d.description}</p>
                    ) : null}
                    <div className="text-[10px] text-slate-400">
                      {dateOnly(d.publishedAt)}{d.pdfSizeKB ? ` · ${d.pdfSizeKB} KB` : ""}
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      {d.pdfUrl ? (
                        <a href={d.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-md btn-grad-navy px-3 py-1.5 text-center text-[12px] font-bold text-white">📄 Ver PDF</a>
                      ) : (
                        <span className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-[12px] font-semibold text-slate-400">Sin PDF</span>
                      )}
                      <DocFormDialog scope="platform" doc={d} />
                      {!d.seedSlug ? <DeleteDocButton id={d.id} scope="platform" title={d.title} /> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
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
