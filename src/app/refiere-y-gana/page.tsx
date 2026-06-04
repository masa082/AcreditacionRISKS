import Link from "next/link";
import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { WhatsAppFloat } from "@/components/landing/whatsapp-float";
import { ReferrerForm } from "@/components/landing/referrer-form";
import { REFERRAL_PROGRAM } from "@/lib/referrals";
import { BRAND, CTAS, formatCOP } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Refiere y gana — Programa de referidos",
  description:
    "Comparta su código de referido de RISKS INTERNATIONAL: cada persona que se certifique obtiene 10 % de descuento y usted gana 10 % del valor del programa.",
  alternates: { canonical: "/refiere-y-gana" },
  openGraph: {
    title: "Refiere y gana — RISKS INTERNATIONAL",
    description: "10 % de descuento para el referido + 10 % de recompensa para usted por cada profesional certificado.",
    url: `${BRAND.appUrl}/refiere-y-gana`,
    type: "website",
    locale: "es_CO",
  },
};

// SARLAFT como ejemplo del valor: descuento 10 % sobre $650k y recompensa 10 %.
const EXAMPLE = {
  basePrice: 650000,
  discount: 650000 * (REFERRAL_PROGRAM.discountPercent / 100),
  reward: 650000 * (REFERRAL_PROGRAM.rewardPercent / 100),
};

export default function ReferralProgramPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <LandingHeader />

      <section className="bg-premium-light">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Programa de referidos
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-brand-900 sm:text-5xl">
              Refiere profesionales y <span className="text-emerald-700">gana {formatCOP(EXAMPLE.reward)}</span> por cada uno
            </h1>
            <p className="mt-4 text-base text-slate-600">
              Comparta su código personal con colegas, equipos de cumplimiento y empresas. Por cada persona que se certifique con su código:
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">10%</span>
                <span><strong className="text-brand-900">{REFERRAL_PROGRAM.discountPercent}% de descuento</strong> al referido — paga {formatCOP(EXAMPLE.basePrice - EXAMPLE.discount)} en lugar de {formatCOP(EXAMPLE.basePrice)} en SARLAFT.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">$$</span>
                <span><strong className="text-brand-900">{REFERRAL_PROGRAM.rewardPercent}% para usted</strong> — {formatCOP(EXAMPLE.reward)} por cada referido confirmado, pagado a su cuenta bancaria.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">✓</span>
                <span>Sin límite de referidos · pago cuando el referido aprueba su inscripción · trazabilidad completa.</span>
              </li>
            </ul>
            <div className="mt-7 grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-lg font-bold text-brand-800">1</div>
                <div className="text-slate-500">Genere su código</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-lg font-bold text-brand-800">2</div>
                <div className="text-slate-500">Comparta el enlace</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-lg font-bold text-brand-800">3</div>
                <div className="text-slate-500">Reciba su recompensa</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-premium sm:p-8">
            <h2 className="text-xl font-bold text-brand-900">Conviértase en referidor</h2>
            <p className="mt-1 text-sm text-slate-600">Registre sus datos y reciba su código personal en este momento.</p>
            <div className="mt-6">
              <ReferrerForm />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-brand-900 sm:text-3xl">Términos del programa</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              { t: "Sin tope", d: "Sin límite de referidos. Cuanto más comparta, más gana." },
              { t: "Pago al APPROVED", d: "La recompensa se confirma cuando el pago del referido es aprobado por RISKS." },
              { t: "Transparente", d: "Verá el estado de cada referido en su panel personal del programa." },
              { t: "Anti-auto-referido", d: "No puede referirse a sí mismo. El sistema valida automáticamente." },
              { t: "Datos seguros", d: "Sus datos y los del referido se tratan conforme a la Ley 1581/2012." },
              { t: "Cancelable", d: "Puede pedir baja del programa en cualquier momento; los referidos ya confirmados se respetan." },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <div className="text-sm font-bold text-brand-900">{x.t}</div>
                <p className="mt-1 text-xs text-slate-600">{x.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href={CTAS.certify.href} className="rounded-lg btn-grad-navy px-5 py-3 text-sm font-bold text-white">{CTAS.certify.label}</Link>
            <Link href={CTAS.certifications.href} className="rounded-lg border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50">{CTAS.certifications.label}</Link>
          </div>
        </div>
      </section>

      <LandingFooter />
      <WhatsAppFloat />
    </main>
  );
}
