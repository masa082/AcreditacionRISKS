import Link from "next/link";
import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { BRAND } from "@/lib/brand";
import { getServerLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/locale";

/**
 * /documentacion — sección PÚBLICA con todos los documentos
 * descriptivos del proceso de certificación. Accesible a candidatos,
 * suscriptores, administradores y visitantes sin login. El link aparece
 * en los sidebars de portal/panel/admin y en el footer del landing.
 *
 * Los archivos se sirven estáticamente desde /public/docs (Vercel
 * cachea con TTL largo). Cada documento expone descarga en .pdf y .docx
 * para uso flexible (firmar, distribuir, archivar).
 */

export const metadata: Metadata = {
  title: "Documentación del proceso de certificación",
  description:
    "Documento descriptivo completo del proceso de certificación CIOC: los 4 pasos, módulos por rol, multilenguaje, habeas data, ONAC y verificación pública.",
  alternates: { canonical: "/documentacion" },
  openGraph: {
    title: "Documentación oficial — Proceso de certificación CIOC",
    description:
      "Documento oficial del proceso de certificación de RISKS INTERNATIONAL bajo la norma ISO/IEC 17024.",
    url: `${BRAND.appUrl}/documentacion`,
    type: "article",
    locale: "es_CO",
  },
};

interface DocItem {
  /** Slug del archivo en /public/docs (sin extensión). */
  file: string;
  titleKey: string;
  descKey: string;
  /** Tag corto a la izquierda (versión / categoría). */
  tag: string;
  /** Tamaño aproximado de cada formato — info útil antes de descargar. */
  pdfKB: number;
  docxKB: number;
  /** Fecha de publicación (mostrada como texto). */
  updated: string;
  /** Roles a los que aplica — solo informativo, todos pueden descargar. */
  audience: string[];
}

const DOCS: DocItem[] = [
  {
    file: "Proceso-Certificacion-okacreditado",
    titleKey: "docs.cioc.title",
    descKey: "docs.cioc.desc",
    tag: "v1.0",
    pdfKB: 738,
    docxKB: 72,
    updated: "Junio 2026",
    audience: ["Candidato", "Suscriptor", "SUPERADMIN"],
  },
];

export default async function DocumentacionPage() {
  const locale = await getServerLocale();
  const tr = (k: string) => t(k, locale);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <LandingHeader />

      <section className="relative bg-premium-light">
        <div className="mx-auto max-w-5xl px-6 py-14 lg:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-800">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
            {tr("docs.eyebrow")}
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-brand-900 sm:text-4xl">
            {tr("docs.title")}
          </h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-600">
            {tr("docs.subtitle")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gold-600">
          {tr("docs.available")}
        </h2>

        <div className="space-y-4">
          {DOCS.map((d) => (
            <article
              key={d.file}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-300 hover:shadow-premium"
            >
              <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 ring-1 ring-brand-100">
                      {d.tag}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {tr("docs.updated")} · {d.updated}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-brand-900">{tr(d.titleKey)}</h3>
                  <p className="mt-1 text-sm text-slate-600">{tr(d.descKey)}</p>

                  {/* Quién puede consumir el documento */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-semibold uppercase tracking-wider text-slate-400">
                      {tr("docs.audience")}:
                    </span>
                    {d.audience.map((a) => (
                      <span
                        key={a}
                        className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  <a
                    href={`/docs/${d.file}.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg btn-grad-navy px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:shadow-premium"
                  >
                    📄 {tr("docs.downloadPdf")}
                    <span className="text-[10px] opacity-70">{d.pdfKB} KB</span>
                  </a>
                  <a
                    href={`/docs/${d.file}.docx`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-5 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
                  >
                    📝 {tr("docs.downloadDocx")}
                    <span className="text-[10px] opacity-70">{d.docxKB} KB</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Bloque informativo: cómo se usa esta documentación */}
        <div className="mt-10 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:grid-cols-3">
          <InfoTile icon="🎓" titleKey="docs.tile.candidate.title" bodyKey="docs.tile.candidate.body" tr={tr} />
          <InfoTile icon="🏛️" titleKey="docs.tile.subscriber.title" bodyKey="docs.tile.subscriber.body" tr={tr} />
          <InfoTile icon="⚙️" titleKey="docs.tile.admin.title" bodyKey="docs.tile.admin.body" tr={tr} />
        </div>

        {/* Enlaces relacionados (todos públicos y traducidos) */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gold-600">
            {tr("docs.related")}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            <RelatedLink href="/preguntas-frecuentes" emoji="❓" labelKey="docs.related.faq" tr={tr} />
            <RelatedLink href="/verificar" emoji="🔍" labelKey="docs.related.verify" tr={tr} />
            <RelatedLink href="/certificaciones" emoji="📜" labelKey="docs.related.certs" tr={tr} />
            <RelatedLink href="/privacidad" emoji="🛡️" labelKey="docs.related.privacy" tr={tr} />
          </ul>
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          {tr("docs.footnote.prefix")}{" "}
          <Link href="/contacto" className="text-brand-700 hover:underline">
            {tr("docs.footnote.contact")}
          </Link>
          .
        </p>
      </section>

      <LandingFooter />
    </main>
  );
}

function InfoTile({
  icon,
  titleKey,
  bodyKey,
  tr,
}: {
  icon: string;
  titleKey: string;
  bodyKey: string;
  tr: (k: string) => string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-2xl">{icon}</div>
      <h3 className="mt-2 text-sm font-bold text-brand-900">{tr(titleKey)}</h3>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{tr(bodyKey)}</p>
    </div>
  );
}

function RelatedLink({
  href,
  emoji,
  labelKey,
  tr,
}: {
  href: string;
  emoji: string;
  labelKey: string;
  tr: (k: string) => string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-800"
      >
        <span aria-hidden className="text-base">{emoji}</span>
        <span className="flex-1">{tr(labelKey)}</span>
        <span className="text-brand-600 transition group-hover:translate-x-0.5">→</span>
      </Link>
    </li>
  );
}
