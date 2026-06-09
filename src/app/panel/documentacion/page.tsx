import Link from "next/link";
import { requireSubscriberPage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { dateOnly } from "@/lib/format";
import { DocFormDialog, DeleteDocButton } from "./client-parts";

export const metadata = { title: "Documentación" };

/**
 * /panel/documentacion — Gestión de documentos por SUSCRIPTOR.
 *
 * El suscriptor (organismo certificador) ve y administra los documentos
 * PROPIOS de su tenant + los documentos GLOBALES que el SUPERADMIN
 * publicó (en modo solo lectura). Los globales son los que aparecen
 * para todos los clientes del SaaS (CIOC, política, términos).
 *
 * El subscriberId queda fijado del contexto en las server actions —
 * el suscriptor jamás puede tocar documentos de otros tenants.
 */
export default async function PanelDocumentacionPage() {
  const { subscriberId } = await requireSubscriberPage();
  const [ownDocs, globalDocs] = await Promise.all([
    prisma.documentation.findMany({
      where: { subscriberId },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    }),
    prisma.documentation.findMany({
      where: { subscriberId: null, visible: true },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Documentación"
        subtitle="Administre los documentos oficiales de su organismo. Aparecen en la sección pública /documentacion para sus candidatos."
        actions={<DocFormDialog scope="subscriber" />}
      />

      {/* Documentos propios del suscriptor */}
      <Card className="mb-6">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Mis documentos</h2>
          <p className="text-[12px] text-slate-500">
            Documentos publicados por su organismo. Visibles para sus candidatos en /documentacion.
          </p>
        </div>
        <div className="p-5">
          {ownDocs.length === 0 ? (
            <EmptyState>Aún no ha publicado documentos propios. Use “Nuevo documento” para empezar.</EmptyState>
          ) : (
            <DocTable scope="subscriber" docs={ownDocs} />
          )}
        </div>
      </Card>

      {/* Documentos globales del SaaS — solo lectura para el suscriptor */}
      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Documentos del sistema</h2>
          <p className="text-[12px] text-slate-500">
            Publicados por el administrador de la plataforma. Aparecen para todos los suscriptores y son solo de lectura desde aquí.
          </p>
        </div>
        <div className="p-5">
          {globalDocs.length === 0 ? (
            <EmptyState>No hay documentos globales disponibles.</EmptyState>
          ) : (
            <ReadOnlyTable docs={globalDocs} />
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

// Componentes locales (server) que enlazan la edición/eliminación.
interface DocRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  version: string | null;
  category: string | null;
  audience: string[];
  visible: boolean;
  pdfUrl: string | null;
  docxUrl: string | null;
  pdfSizeKB: number | null;
  docxSizeKB: number | null;
  thumbnailUrl: string | null;
  publishedAt: Date;
  seedSlug: string | null;
}

function DocTable({ scope, docs }: { scope: "subscriber" | "platform"; docs: DocRow[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((d) => (
        <AdminDocCard key={d.id} doc={d} scope={scope} editable />
      ))}
    </div>
  );
}

function ReadOnlyTable({ docs }: { docs: DocRow[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((d) => (
        <AdminDocCard key={d.id} doc={d} scope="subscriber" editable={false} />
      ))}
    </div>
  );
}

/**
 * Tarjeta visual del catálogo en el panel administrativo. Muestra la
 * miniatura del PDF, metadatos básicos y acciones (Ver PDF + Editar/
 * Eliminar cuando corresponda). El Word queda oculto a propósito —
 * los documentos solo se distribuyen como PDF.
 */
function AdminDocCard({
  doc: d,
  scope,
  editable,
}: {
  doc: DocRow;
  scope: "subscriber" | "platform";
  editable: boolean;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-300 hover:shadow-premium">
      <a
        href={d.pdfUrl ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir PDF: ${d.title}`}
        className="relative block aspect-[8.5/11] w-full overflow-hidden border-b border-slate-200 bg-slate-50"
      >
        {d.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={d.thumbnailUrl}
            alt={`Vista previa: ${d.title}`}
            className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-50 to-slate-100 text-5xl">
            📄
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 shadow-sm ring-1 ring-slate-200">
          PDF
        </span>
        {!d.visible ? (
          <span className="absolute left-3 top-3 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 shadow-sm ring-1 ring-amber-200">
            Oculto
          </span>
        ) : null}
      </a>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {d.version ? (
            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 ring-1 ring-brand-100">
              {d.version}
            </span>
          ) : null}
          {d.seedSlug ? <Badge tone="blue">Sistema</Badge> : null}
        </div>
        <h3 className="text-sm font-bold leading-tight text-brand-900">{d.title}</h3>
        <div className="text-[11px] text-slate-400">
          slug: <span className="font-mono">{d.slug}</span>
        </div>
        {d.description ? (
          <p className="line-clamp-2 text-[12px] text-slate-500">{d.description}</p>
        ) : null}
        <div className="text-[10px] text-slate-400">
          {dateOnly(d.publishedAt)}
          {d.pdfSizeKB ? ` · ${d.pdfSizeKB} KB` : ""}
        </div>
        <div className="mt-auto flex items-center gap-2 pt-2">
          {d.pdfUrl ? (
            <a
              href={d.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-md btn-grad-navy px-3 py-1.5 text-center text-[12px] font-bold text-white"
            >
              📄 Ver PDF
            </a>
          ) : (
            <span className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-[12px] font-semibold text-slate-400">
              Sin PDF
            </span>
          )}
          {editable && !d.seedSlug ? (
            <>
              <DocFormDialog scope={scope} doc={d} />
              <DeleteDocButton id={d.id} scope={scope} title={d.title} />
            </>
          ) : null}
          {editable && d.seedSlug ? (
            <span className="text-[10px] text-slate-400">no editable</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
