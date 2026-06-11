import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { PdfThumb } from "@/components/pdf-thumb";

export const metadata = { title: "Carpeta del candidato" };

const ICONS: Record<string, { icon: string; cls: string }> = {
  pdf:  { icon: "📕", cls: "bg-rose-50 ring-rose-200 text-rose-700" },
  jpg:  { icon: "🖼", cls: "bg-cyan-50 ring-cyan-200 text-cyan-700" },
  jpeg: { icon: "🖼", cls: "bg-cyan-50 ring-cyan-200 text-cyan-700" },
  png:  { icon: "🖼", cls: "bg-cyan-50 ring-cyan-200 text-cyan-700" },
};

const STATUS_TONE: Record<string, "blue" | "green" | "red" | "slate"> = {
  SUBMITTED: "blue", APPROVED: "green", REJECTED: "red", PENDING: "slate",
};
const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "En revisión", APPROVED: "Aprobado", REJECTED: "Rechazado", PENDING: "Pendiente",
};

function extOf(name: string | null): string {
  if (!name) return "";
  return (name.split(".").pop() ?? "").toLowerCase();
}

/// Vista de "carpeta" del candidato: muestra en grid todos los archivos
/// (documentos de inscripción + soportes de pago) con su icono por tipo,
/// estado de revisión, fecha de carga y enlace al visor. Pensada para
/// que el SUSCRIPTOR pueda organizar visualmente los entregables.
export default async function CandidateFolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ctx, subscriberId } = await requireSubscriberPage();
  if (!can(ctx, PERMISSIONS.CANDIDATE_MANAGE) && !can(ctx, PERMISSIONS.ENROLLMENT_MANAGE)) {
    redirect("/panel");
  }

  const candidate = await prisma.candidate.findFirst({
    where: { id, subscriberId },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: {
          exam: { select: { name: true } },
          scheme: { select: { name: true } },
          documents: { include: { requiredDocument: { select: { name: true } } }, orderBy: { uploadedAt: "desc" } },
          payments: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!candidate) notFound();

  const docCount = candidate.enrollments.reduce((s, e) => s + e.documents.length, 0);
  const receiptCount = candidate.enrollments.reduce((s, e) => s + e.payments.filter((p) => p.receiptUrl).length, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Carpeta de ${candidate.firstName} ${candidate.lastName}`}
        subtitle={`${candidate.documentType ?? "CC"} ${candidate.documentNumber ?? "—"} · ${docCount} documento(s) · ${receiptCount} soporte(s) de pago`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/panel/candidatos/${candidate.id}`} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          ← Volver a la ficha
        </Link>
        <a
          href={`/panel/candidatos/${candidate.id}/cv`}
          className="rounded-md btn-grad-navy px-3 py-1.5 text-xs font-semibold text-white"
        >
          📄 Descargar Hoja de Vida (PDF)
        </a>
      </div>

      {candidate.enrollments.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">Este candidato aún no tiene inscripciones ni archivos.</Card>
      ) : (
        candidate.enrollments.map((e) => {
          const allItems: Array<{
            kind: "doc" | "receipt";
            key: string;
            name: string;
            fileName: string | null;
            fileUrl: string | null;
            ext: string;
            status?: string;
            uploadedAt: Date;
            href: string;
          }> = [];
          for (const d of e.documents) {
            allItems.push({
              kind: "doc",
              key: `d-${d.id}`,
              name: d.requiredDocument?.name ?? "Documento",
              fileName: d.fileName,
              fileUrl: d.fileUrl,
              ext: extOf(d.fileName),
              status: d.status,
              uploadedAt: d.uploadedAt,
              href: `/api/files/${d.id}`,
            });
          }
          for (const p of e.payments) {
            if (!p.receiptUrl) continue;
            const meta = (p.metadata as { receipt?: { fileName?: string; uploadedAt?: string } } | null) ?? {};
            allItems.push({
              kind: "receipt",
              key: `r-${p.id}`,
              name: `Soporte de pago · ${p.status}`,
              fileName: meta.receipt?.fileName ?? `soporte-${p.id.slice(-6)}.pdf`,
              fileUrl: p.receiptUrl,
              ext: extOf(meta.receipt?.fileName ?? p.receiptUrl),
              uploadedAt: meta.receipt?.uploadedAt ? new Date(meta.receipt.uploadedAt) : p.createdAt,
              href: `/api/payments/${p.id}/receipt`,
            });
          }

          return (
            <Card key={e.id}>
              <header className="border-b border-slate-100 px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{e.exam?.name ?? e.scheme?.name ?? "Inscripción"}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Folio {e.code ?? e.id.slice(-6)} · creada {dateTime(e.createdAt)}</div>
                  </div>
                  <Badge tone="slate">{e.status}</Badge>
                </div>
              </header>
              <div className="p-5">
                {allItems.length === 0 ? (
                  <p className="rounded bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">Sin archivos en esta inscripción.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {allItems.map((it) => {
                      const ic = ICONS[it.ext] ?? { icon: "📄", cls: "bg-slate-50 ring-slate-200 text-slate-700" };
                      const isImage = ["jpg", "jpeg", "png"].includes(it.ext);
                      const isPdf = it.ext === "pdf";
                      return (
                        <li key={it.key}>
                          <a
                            href={it.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`group flex h-full flex-col rounded-xl border bg-white p-3 shadow-sm ring-1 transition hover:shadow-md ${ic.cls}`}
                            title="Abrir en pestaña nueva"
                          >
                            {/* Área de preview: altura mayor (160px) para que
                                la miniatura del PDF sea legible. Hover scale
                                muy ligero para feedback visual. */}
                            <div className="relative h-40 w-full overflow-hidden rounded-md bg-white/60 ring-1 ring-slate-200">
                              {isImage && it.href ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={it.href}
                                  alt={it.name}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                />
                              ) : isPdf && it.href ? (
                                <>
                                  <PdfThumb url={it.href} alt={it.name} />
                                  <span className="absolute right-1.5 top-1.5 rounded-md bg-white/95 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-rose-700 shadow-sm ring-1 ring-rose-200">
                                    PDF
                                  </span>
                                  <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-brand-900/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100">
                                    <span className="mb-2 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-brand-900 shadow">
                                      🔍 Abrir
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="grid h-full w-full place-items-center text-5xl">
                                  <span aria-hidden>{ic.icon}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 min-w-0 flex-1">
                              <div className="truncate text-xs font-semibold text-slate-800" title={it.name}>{it.name}</div>
                              <div className="truncate text-[10px] text-slate-500" title={it.fileName ?? ""}>{it.fileName}</div>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                <span className="rounded bg-white/70 px-1 font-mono uppercase">{it.ext || "—"}</span>
                                <span>{dateTime(it.uploadedAt)}</span>
                              </div>
                              {it.kind === "doc" && it.status ? (
                                <div className="mt-1">
                                  <Badge tone={STATUS_TONE[it.status] ?? "slate"}>{STATUS_LABEL[it.status] ?? it.status}</Badge>
                                </div>
                              ) : null}
                            </div>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
