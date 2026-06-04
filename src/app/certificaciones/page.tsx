import Link from "next/link";
import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { CERTIFICATIONS, BRAND, CTAS, formatCOP } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Certificaciones profesionales disponibles",
  description:
    "Catálogo de certificaciones profesionales en compliance, riesgos, debida diligencia, SARLAFT, SAGRILAFT, SIPLAFT y PTEE emitidas por RISKS INTERNATIONAL.",
  alternates: { canonical: "/certificaciones" },
  openGraph: {
    title: "Certificaciones profesionales | RISKS INTERNATIONAL",
    description: "Programas para acreditar tus competencias en compliance y prevención LA/FT.",
    url: `${BRAND.appUrl}/certificaciones`,
    type: "website",
    locale: "es_CO",
  },
};

export default function CertificationsPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingHeader />
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              Catálogo
            </span>
            <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Certificaciones profesionales disponibles</h1>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Programas diseñados para acreditar formalmente las competencias de profesionales en compliance, riesgos, debida diligencia, prevención LA/FT y protección de datos.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
            {CERTIFICATIONS.map((c) => {
              const isComing = c.status === "COMING_SOON";
              const isOnRequest = c.status === "ON_REQUEST";
              return (
                <article key={c.slug} className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md ${isComing ? "border-amber-200" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">{c.category}</span>
                    {isComing ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">Próximamente</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">{c.level} · {c.modality}</span>
                    )}
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-slate-900">{c.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">{c.description}</p>
                  <dl className="mt-5 grid grid-cols-3 gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <dt>Dirigido a</dt><dd className="col-span-2 text-slate-700">{c.audience.split(".")[0]}.</dd>
                    <dt>Duración</dt><dd className="col-span-2 font-semibold text-slate-700">{c.durationMin} min</dd>
                    <dt>Vigencia</dt><dd className="col-span-2 font-semibold text-slate-700">{c.validityMonths} meses ({Math.round(c.validityMonths / 12)} años)</dd>
                    <dt>Inversión</dt><dd className="col-span-2 font-semibold text-brand-800">{c.priceCOP ? `${formatCOP(c.priceCOP)} + IVA` : "Consultar"}</dd>
                  </dl>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <Link href={`/certificaciones/${c.slug}`} className="text-sm font-semibold text-brand-800 hover:underline">Ver detalles →</Link>
                    {isComing ? (
                      <Link href={`/contacto?cert=${c.slug}`} className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">
                        Notificarme cuando esté disponible
                      </Link>
                    ) : isOnRequest ? (
                      <Link href={`/contacto?cert=${c.slug}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        Solicitar información
                      </Link>
                    ) : (
                      <Link href={`/registro?cert=${c.slug}`} className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white">Inscribirme</Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-12 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center">
            <h2 className="text-xl font-bold text-slate-900">¿Necesitas otra certificación o asesoría?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Estamos ampliando el catálogo con programas en protección de datos, PTEE, monitoreo de listas y más. Cuéntanos qué necesitas.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href={CTAS.contact.href} className="rounded-lg btn-grad-navy px-5 py-2.5 text-sm font-semibold text-white">Solicitar información</Link>
              <Link href={CTAS.register.href} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Crear cuenta</Link>
            </div>
          </div>
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
