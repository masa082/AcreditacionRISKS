import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { FAQList } from "@/components/landing/faq";
import { SchemaJsonLd } from "@/components/landing/schema-jsonld";
import { CERTIFICATIONS, BRAND, CTAS, formatCOP } from "@/lib/brand";

export function generateStaticParams() {
  return CERTIFICATIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = CERTIFICATIONS.find((x) => x.slug === slug);
  if (!c) return { title: "Certificación no encontrada" };
  return {
    title: c.shortName,
    description: c.metaDescription,
    keywords: c.keywords,
    alternates: { canonical: `/certificaciones/${c.slug}` },
    openGraph: {
      title: c.metaTitle,
      description: c.metaDescription,
      url: `${BRAND.appUrl}/certificaciones/${c.slug}`,
      type: "article",
      locale: "es_CO",
    },
  };
}

export default async function CertDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = CERTIFICATIONS.find((x) => x.slug === slug);
  if (!c) notFound();

  const faqs = [
    { q: `¿A quién va dirigida la ${c.shortName}?`, a: c.audience },
    { q: `¿Cuánto cuesta el programa?`, a: c.priceCOP
        ? `La inversión es de ${formatCOP(c.priceCOP)} pesos colombianos más IVA. Incluye las dos evaluaciones (Caso Práctico y Examen Teórico) y la emisión del certificado al aprobar.`
        : `El valor del programa se confirma al solicitar información, en función del esquema y la cohorte. Escríbenos y te enviamos la cotización formal.` },
    { q: `¿Cuántas evaluaciones incluye?`, a: `El programa incluye dos evaluaciones: un Caso Práctico y un Examen Teórico. Al aprobar ambas se emite el certificado.` },
    { q: `¿Cuál es la vigencia del certificado?`, a: `El certificado tiene una vigencia de ${Math.round(c.validityMonths / 12)} años (${c.validityMonths} meses). Antes de su vencimiento se notifica al titular para iniciar la recertificación.` },
    { q: `¿Cómo se verifica el certificado?`, a: `Cada certificado tiene un código único y QR. Cualquier tercero puede verificar la autenticidad y vigencia en la página pública de verificación.` },
    { q: `¿Qué pasa si no apruebo una de las evaluaciones?`, a: `Podrá presentarla nuevamente según las reglas del esquema. Recibirá una constancia de presentación que documenta su intento. El certificado final se emite cuando ambas evaluaciones están aprobadas.` },
  ];

  return (
    <main className="min-h-screen bg-white">
      <LandingHeader />

      <section className="bg-hero-grad text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <nav className="mb-4 text-xs text-cyan-200">
            <Link href="/" className="hover:text-white">Inicio</Link>
            <span className="px-2">/</span>
            <Link href="/certificaciones" className="hover:text-white">Certificaciones</Link>
            <span className="px-2">/</span>
            <span className="text-white">{c.shortName}</span>
          </nav>
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-white/20">
            {c.category} · {c.level}
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold sm:text-4xl">{c.name}</h1>
          <p className="mt-4 max-w-2xl text-slate-200">{c.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={`/registro?cert=${c.slug}`} className="rounded-lg bg-gold-500 px-5 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-gold-500/30 hover:bg-gold-400">Inscribirme ahora</Link>
            <Link href={`/contacto?cert=${c.slug}`} className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Solicitar información</Link>
          </div>
        </div>
      </section>

      {/* Ficha técnica */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 py-10 sm:grid-cols-4 lg:grid-cols-5">
          {[
            ["Duración", `${c.durationMin} min`],
            ["Vigencia", `${Math.round(c.validityMonths / 12)} años`],
            ["Modalidad", c.modality],
            ["Nivel", c.level],
            ["Inversión", c.priceCOP ? `${formatCOP(c.priceCOP)} + IVA` : "Consultar"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <div className="text-[11px] uppercase tracking-wider text-slate-400">{k}</div>
              <div className="mt-1 text-lg font-bold text-brand-800">{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-slate-900">A quién está dirigida</h2>
            <p className="mt-3 text-slate-600">{c.audience}</p>

            <h2 className="mt-10 text-2xl font-bold text-slate-900">Competencias que acredita</h2>
            <ul className="mt-3 space-y-2">
              {c.competencies.map((x) => (
                <li key={x} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">✓</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>

            <h2 className="mt-10 text-2xl font-bold text-slate-900">Temario / áreas evaluadas</h2>
            <ol className="mt-3 space-y-2">
              {c.syllabus.map((x, i) => (
                <li key={x} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-800">{i + 1}</span>
                  <span>{x}</span>
                </li>
              ))}
            </ol>

            <h2 className="mt-10 text-2xl font-bold text-slate-900">Requisitos</h2>
            <ul className="mt-3 space-y-2">
              {c.requirements.map((x) => (
                <li key={x} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">•</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>

            <h2 className="mt-10 text-2xl font-bold text-slate-900">Preguntas frecuentes sobre esta certificación</h2>
            <div className="mt-4">
              <FAQList items={faqs} />
            </div>
          </div>

          {/* Sidebar de inscripción */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Proceso</h3>
              <ol className="space-y-2 text-sm text-slate-700">
                <li>1. Crea tu cuenta</li>
                <li>2. Selecciona esta certificación</li>
                <li>3. Adjunta tus soportes</li>
                <li>4. Realiza el pago</li>
                <li>5. Agenda y presenta la prueba</li>
                <li>6. Descarga tu diploma verificable</li>
              </ol>
              <Link href={`/registro?cert=${c.slug}`} className="block rounded-lg bg-brand-800 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-900">Inscribirme</Link>
              <Link href={`/contacto?cert=${c.slug}`} className="block rounded-lg border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">Solicitar información</Link>
              <Link href={CTAS.verify.href} className="block text-center text-xs font-semibold text-brand-800 hover:underline">Verificar un certificado existente →</Link>
            </div>
          </aside>
        </div>
      </section>

      <LandingFooter />

      <SchemaJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "EducationalOccupationalCredential",
          name: c.name,
          description: c.description,
          credentialCategory: "certification",
          competencyRequired: c.competencies,
          recognizedBy: { "@type": "Organization", name: BRAND.legalName, url: BRAND.appUrl },
          url: `${BRAND.appUrl}/certificaciones/${c.slug}`,
          validFor: `P${Math.round(c.validityMonths / 12)}Y`,
        }}
      />
    </main>
  );
}
