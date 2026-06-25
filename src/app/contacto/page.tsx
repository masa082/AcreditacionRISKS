import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { LeadForm } from "@/components/landing/lead-form";
import { BRAND } from "@/lib/brand";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Contacto y solicitud de información",
  description:
    "Solicita información sobre los programas de certificación profesional de RISKS INTERNATIONAL. Atendemos a profesionales, empresas y áreas de cumplimiento.",
  alternates: { canonical: "/contacto" },
  openGraph: {
    title: "Contacto | RISKS INTERNATIONAL",
    description: "Solicita información sobre certificaciones, evaluaciones y procesos de acreditación.",
    url: `${BRAND.appUrl}/contacto`,
    type: "website",
    locale: "es_CO",
  },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ cert?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="min-h-screen bg-white">
      <LandingHeader />
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">Contacto</span>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Hablemos de tu certificación</h1>
              <p className="mt-3 text-sm text-slate-600 sm:text-base">
                Si tienes preguntas sobre los programas, necesitas información para tu empresa o quieres una asesoría personalizada, déjanos tus datos y te contactaremos.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {BRAND.contactEmail ? (
                  <li className="flex items-center gap-3"><span>✉️</span><a href={`mailto:${BRAND.contactEmail}`} className="font-semibold text-brand-800 hover:underline">{BRAND.contactEmail}</a></li>
                ) : null}
                <li className="flex items-center gap-3"><span>🏢</span><span className="text-slate-700">{BRAND.legalName}</span></li>
                <li className="flex items-center gap-3"><span>🇨🇴</span><span className="text-slate-700">{BRAND.address}</span></li>
                {BRAND.social.linkedin ? (
                  <li className="flex items-center gap-3"><span>💼</span><a href={BRAND.social.linkedin} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-800 hover:underline">LinkedIn</a></li>
                ) : null}
              </ul>
              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Confidencialidad garantizada</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Todos los datos enviados se tratan conforme a nuestra Política de Tratamiento de Datos Personales y la normativa aplicable.
                </p>
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold text-slate-900">Solicitar información</h2>
                <p className="mt-1 text-sm text-slate-600">Te responderemos dentro de las próximas horas hábiles.</p>
                <div className="mt-6">
                  <LeadForm kind="INFORMATION" source="contacto" defaultCertification={sp.cert} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
