import Link from "next/link";
import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { BRAND } from "@/lib/brand";
import { getServerLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/locale";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/**
 * /documentacion — Catálogo público de documentos del proceso de
 * certificación. Lee de la tabla `Documentation` y muestra:
 *
 *   - Todos los documentos GLOBALES (subscriberId = null), publicados
 *     por el SUPERADMIN para todos los tenants del SaaS.
 *   - Si hay sesión activa de un usuario que pertenece a un suscriptor
 *     (candidato o usuario del organismo), también muestra los
 *     documentos propios de ese tenant.
 *
 * La página es pública (sin auth). El acceso a archivos protegidos se
 * controla en la ruta /api/docs-file/[...key].
 */

export const metadata: Metadata = {
  title: "Documentación del proceso de certificación",
  description:
    "Documentos oficiales del proceso de certificación CIOC: los 4 pasos, módulos por rol, multilenguaje, habeas data, ONAC y verificación pública.",
  alternates: { canonical: "/documentacion" },
  openGraph: {
    title: "Documentación oficial — Proceso de certificación CIOC",
    description: "Documentos oficiales del proceso de certificación de RISKS INTERNATIONAL bajo la norma ISO/IEC 17024.",
    url: `${BRAND.appUrl}/documentacion`,
    type: "article",
    locale: "es_CO",
  },
};

export default async function DocumentacionPage() {
  const locale = await getServerLocale();
  const tr = (k: string) => t(k, locale);

  // Si el visitante está autenticado, también vemos sus docs de tenant.
  const ctx = await getCurrentUser();
  let userSubscriberId: string | null = null;
  if (ctx?.type === "SUBSCRIBER" && ctx.subscriberId) {
    userSubscriberId = ctx.subscriberId;
  } else if (ctx?.type === "CANDIDATE") {
    const c = await prisma.candidate.findFirst({
      where: { userId: ctx.userId },
      select: { subscriberId: true },
    });
    userSubscriberId = c?.subscriberId ?? null;
  }

  const docs = await prisma.documentation.findMany({
    where: {
      visible: true,
      OR: [{ subscriberId: null }, ...(userSubscriberId ? [{ subscriberId: userSubscriberId }] : [])],
    },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <LandingHeader />

      <section className="relative bg-premium-light">
        <div className="mx-auto max-w-5xl px-6 py-14 lg:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-800">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-700" />
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
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-700">
          {tr("docs.available")}
        </h2>

        {docs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No hay documentos publicados todavía.
          </div>
        ) : (
          // Grid de tarjetas con miniatura tipo "estante de biblioteca":
          // cada documento muestra una vista previa del PDF, sus metadatos
          // y un único CTA "Ver PDF". El Word queda intencionalmente fuera
          // — los documentos oficiales solo se distribuyen en PDF.
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((d) => (
              <DocCard key={d.id} doc={d} tr={tr} />
            ))}
          </div>
        )}

        <div className="mt-10 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:grid-cols-3">
          <InfoTile icon="🎓" titleKey="docs.tile.candidate.title" bodyKey="docs.tile.candidate.body" tr={tr} />
          <InfoTile icon="🏛️" titleKey="docs.tile.subscriber.title" bodyKey="docs.tile.subscriber.body" tr={tr} />
          <InfoTile icon="⚙️" titleKey="docs.tile.admin.title" bodyKey="docs.tile.admin.body" tr={tr} />
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-700">
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

/**
 * Tarjeta visual de documento con miniatura PDF arriba y CTA único
 * "Ver PDF". Mantiene aspect-ratio Letter (8.5×11 ≈ 1:1.29) y muestra
 * sombra "papel" para sensación de catálogo físico.
 */
function DocCard({
  doc: d,
  tr,
}: {
  doc: {
    id: string;
    title: string;
    description: string | null;
    version: string | null;
    pdfUrl: string | null;
    pdfSizeKB: number | null;
    thumbnailUrl: string | null;
    subscriberId: string | null;
    audience: string[];
    publishedAt: Date;
  };
  tr: (k: string) => string;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-300 hover:shadow-premium">
      {/* Miniatura — relación de aspecto Letter, fondo navy si no hay thumb */}
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
        {/* Etiqueta esquina superior derecha */}
        <span className="absolute right-3 top-3 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 shadow-sm ring-1 ring-slate-200">
          PDF
        </span>
        {/* Overlay hover con "Abrir PDF" */}
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-brand-900/70 via-brand-900/0 to-transparent opacity-0 transition group-hover:opacity-100">
          <span className="mb-5 rounded-lg bg-white px-4 py-2 text-sm font-bold text-brand-900 shadow-sm">
            🔍 Abrir documento
          </span>
        </div>
      </a>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {d.version ? (
            <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800 ring-1 ring-brand-100">
              {d.version}
            </span>
          ) : null}
          {d.subscriberId ? (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200">
              Organismo
            </span>
          ) : (
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
              Oficial
            </span>
          )}
        </div>

        <h3 className="text-base font-bold leading-tight text-brand-900">{d.title}</h3>
        {d.description ? (
          <p className="line-clamp-3 text-[12.5px] leading-relaxed text-slate-600">{d.description}</p>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          <span>{new Intl.DateTimeFormat("es-CO", { year: "numeric", month: "long" }).format(d.publishedAt)}</span>
          {d.pdfSizeKB ? <span>· {d.pdfSizeKB} KB</span> : null}
        </div>

        {/* CTA único — solo PDF, intencionalmente sin opción de Word. */}
        <div className="mt-auto pt-2">
          {d.pdfUrl ? (
            <a
              href={d.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg btn-grad-navy px-4 py-2.5 text-center text-sm font-bold text-white shadow-sm transition hover:shadow-premium"
            >
              📄 {tr("docs.downloadPdf")}
            </a>
          ) : (
            <span className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-sm font-semibold text-slate-400">
              PDF no disponible
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function InfoTile({ icon, titleKey, bodyKey, tr }: { icon: string; titleKey: string; bodyKey: string; tr: (k: string) => string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-2xl">{icon}</div>
      <h3 className="mt-2 text-sm font-bold text-brand-900">{tr(titleKey)}</h3>
      <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{tr(bodyKey)}</p>
    </div>
  );
}

function RelatedLink({ href, emoji, labelKey, tr }: { href: string; emoji: string; labelKey: string; tr: (k: string) => string }) {
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
