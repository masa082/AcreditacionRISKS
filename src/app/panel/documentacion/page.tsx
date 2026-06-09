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
  publishedAt: Date;
  seedSlug: string | null;
}

function DocTable({ scope, docs }: { scope: "subscriber" | "platform"; docs: DocRow[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {docs.map((d) => (
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
                <a
                  href={d.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-semibold text-brand-700 hover:bg-brand-50"
                >
                  📄 PDF{d.pdfSizeKB ? ` · ${d.pdfSizeKB} KB` : ""}
                </a>
              ) : null}
              {d.docxUrl ? (
                <a
                  href={d.docxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-semibold text-brand-700 hover:bg-brand-50"
                >
                  📝 Word{d.docxSizeKB ? ` · ${d.docxSizeKB} KB` : ""}
                </a>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:flex-col sm:items-end">
            {!d.seedSlug ? (
              <>
                <DocFormDialog scope={scope} doc={d} />
                <DeleteDocButton id={d.id} scope={scope} title={d.title} />
              </>
            ) : (
              <span className="text-[10px] text-slate-400">no editable</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReadOnlyTable({ docs }: { docs: DocRow[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {docs.map((d) => (
        <li key={d.id} className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-800">{d.title}</span>
              {d.version ? (
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 ring-1 ring-brand-100">
                  {d.version}
                </span>
              ) : null}
              <Badge tone="blue">Global</Badge>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">{dateOnly(d.publishedAt)}</div>
            {d.description ? (
              <p className="mt-1 text-[12px] text-slate-500 line-clamp-2">{d.description}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            {d.pdfUrl ? (
              <a href={d.pdfUrl} target="_blank" rel="noopener noreferrer" className="rounded-md btn-grad-navy px-3 py-1 text-[11px] font-bold text-white">
                PDF
              </a>
            ) : null}
            {d.docxUrl ? (
              <a href={d.docxUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border border-slate-300 px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                Word
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
