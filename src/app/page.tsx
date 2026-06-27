import Link from "next/link";
import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { CertificateMock } from "@/components/landing/certificate-mock";
import { CertificateGallery } from "@/components/landing/certificate-gallery";
import { FAQList } from "@/components/landing/faq";
import { SchemaJsonLd } from "@/components/landing/schema-jsonld";
import { UrgencyBanner } from "@/components/landing/urgency-banner";
import { HeroMicroForm } from "@/components/landing/hero-micro-form";
import { GuaranteesSection } from "@/components/landing/guarantees-section";
import { ExamPreview } from "@/components/landing/exam-preview";
import { WhatsAppFloat } from "@/components/landing/whatsapp-float";
import { FeedbackButton } from "@/components/feedback-button";
import { MobileStickyCTA } from "@/components/landing/mobile-sticky-cta";
import { Icon } from "@/components/landing/icon";
import { BRAND, CTAS, CERTIFICATIONS, formatCOP } from "@/lib/brand";
import { getMarketingConfig } from "@/lib/marketing-config";
import { getBrandAssets } from "@/lib/brand-assets";
import { getServerLocale } from "@/lib/i18n/server";
import { t, type Locale } from "@/lib/i18n/locale";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Certificación profesional que abre puertas — RISKS INTERNATIONAL",
  description:
    "Conviértase en Profesional Certificado bajo ISO/IEC 17024 en SARLAFT, SAGRILAFT y debida diligencia. Suba en la lista corta, pida lo que vale, demuestre el conocimiento que ya tiene. Examen online, diploma con QR público, 1 semana hábil.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Profesional Certificado — la credencial que cambia su próximo salario",
    description:
      "Certificación de personas bajo ISO/IEC 17024 en compliance, riesgos y prevención LA/FT. Diploma verificable por QR público — listo para LinkedIn, RR.HH. y entes de control.",
    url: `${BRAND.appUrl}/`,
    siteName: BRAND.shortName,
    type: "website",
    locale: "es_CO",
  },
  twitter: { card: "summary_large_image" },
};

type Tr = (k: string) => string;

function trustMetrics(m: Awaited<ReturnType<typeof getMarketingConfig>>, tr: Tr) {
  return [
    { value: m.socialProof.professionalsCertified, label: tr("trust.professionals") },
    { value: m.socialProof.companiesTrust, label: tr("trust.companies") },
    { value: m.socialProof.avgScore, label: tr("trust.avgScore") },
    { value: m.socialProof.daysToIssue, label: tr("trust.daysToIssue") },
  ];
}

/**
 * Beneficios reescritos en clave comercial + crecimiento personal/profesional.
 * Cada card responde una pregunta concreta que el candidato se hace antes
 * de pagar: ¿qué me cambia esto en mi carrera?
 */
function buildBenefits(tr: Tr): Array<{
  icon: keyof typeof Icon;
  title: string;
  desc: string;
  callout?: string;
}> {
  return [
    { icon: "ChartUp", title: tr("benefit.salary.title"), desc: tr("benefit.salary.desc"), callout: tr("benefit.salary.callout") },
    { icon: "Briefcase", title: tr("benefit.shortlist.title"), desc: tr("benefit.shortlist.desc"), callout: tr("benefit.shortlist.callout") },
    { icon: "Rocket", title: tr("benefit.promotion.title"), desc: tr("benefit.promotion.desc"), callout: tr("benefit.promotion.callout") },
    { icon: "Linkedin", title: tr("benefit.linkedin.title"), desc: tr("benefit.linkedin.desc"), callout: tr("benefit.linkedin.callout") },
    { icon: "BadgeCheck", title: tr("benefit.recognition.title"), desc: tr("benefit.recognition.desc"), callout: tr("benefit.recognition.callout") },
    { icon: "Sparkles", title: tr("benefit.continuity.title"), desc: tr("benefit.continuity.desc"), callout: tr("benefit.continuity.callout") },
  ];
}

function buildSteps(tr: Tr) {
  return [
    { n: "01", title: tr("step.01.title"), desc: tr("step.01.desc") },
    { n: "02", title: tr("step.02.title"), desc: tr("step.02.desc") },
    { n: "03", title: tr("step.03.title"), desc: tr("step.03.desc") },
    { n: "04", title: tr("step.04.title"), desc: tr("step.04.desc") },
    { n: "05", title: tr("step.05.title"), desc: tr("step.05.desc") },
    { n: "06", title: tr("step.06.title"), desc: tr("step.06.desc") },
    { n: "07", title: tr("step.07.title"), desc: tr("step.07.desc") },
    { n: "08", title: tr("step.08.title"), desc: tr("step.08.desc") },
    { n: "09", title: tr("step.09.title"), desc: tr("step.09.desc") },
    { n: "10", title: tr("step.10.title"), desc: tr("step.10.desc") },
  ];
}

/** Diferenciadores frente a "cursos online genéricos" o constancias internas. */
function buildComparison(tr: Tr): Array<{ axis: string; them: string; us: string }> {
  return [
    { axis: tr("comp.pub.axis"), them: tr("comp.pub.them"), us: tr("comp.pub.us") },
    { axis: tr("comp.exam.axis"), them: tr("comp.exam.them"), us: tr("comp.exam.us") },
    { axis: tr("comp.norm.axis"), them: tr("comp.norm.them"), us: tr("comp.norm.us") },
    { axis: tr("comp.human.axis"), them: tr("comp.human.them"), us: tr("comp.human.us") },
    { axis: tr("comp.expiry.axis"), them: tr("comp.expiry.them"), us: tr("comp.expiry.us") },
    { axis: tr("comp.continuity.axis"), them: tr("comp.continuity.them"), us: tr("comp.continuity.us") },
  ];
}

const FEATURED_CERTS = CERTIFICATIONS.slice(0, 4);

function buildHomeFaq(tr: Tr) {
  return [
    { q: tr("faq.q1.q"), a: tr("faq.q1.a") },
    { q: tr("faq.q2.q"), a: tr("faq.q2.a") },
    { q: tr("faq.q3.q"), a: tr("faq.q3.a") },
    { q: tr("faq.q4.q"), a: tr("faq.q4.a") },
    { q: tr("faq.q5.q"), a: tr("faq.q5.a") },
  ];
}

/** Testimonios redactados con foco en outcome de carrera concreto: ascenso,
 *  aumento, mejor oferta, postulación ganada. Sin apellidos completos por
 *  privacidad. */
function buildTestimonials(tr: Tr) {
  return [
    {
      quote: tr("testimonial.carolina.quote"),
      name: "Carolina M.",
      role: tr("testimonial.carolina.role"),
      sector: tr("testimonial.carolina.sector"),
      outcome: tr("testimonial.carolina.outcome"),
      initial: "CM",
    },
    {
      quote: tr("testimonial.andres.quote"),
      name: "Andrés P.",
      role: tr("testimonial.andres.role"),
      sector: tr("testimonial.andres.sector"),
      outcome: tr("testimonial.andres.outcome"),
      initial: "AP",
    },
    {
      quote: tr("testimonial.diana.quote"),
      name: "Diana R.",
      role: tr("testimonial.diana.role"),
      sector: tr("testimonial.diana.sector"),
      outcome: tr("testimonial.diana.outcome"),
      initial: "DR",
    },
  ];
}

/** Personas-tipo a las que la certificación les rinde inmediato. */
function buildPersonas(tr: Tr): Array<{
  icon: keyof typeof Icon;
  who: string;
  pain: string;
  promise: string;
}> {
  return [
    { icon: "Briefcase", who: tr("persona.officer.who"), pain: tr("persona.officer.pain"), promise: tr("persona.officer.promise") },
    { icon: "ChartUp", who: tr("persona.analyst.who"), pain: tr("persona.analyst.pain"), promise: tr("persona.analyst.promise") },
    { icon: "Handshake", who: tr("persona.consultant.who"), pain: tr("persona.consultant.pain"), promise: tr("persona.consultant.promise") },
    { icon: "Sparkles", who: tr("persona.transition.who"), pain: tr("persona.transition.pain"), promise: tr("persona.transition.promise") },
  ];
}

/** Inventario de lo que recibe el candidato — UX de "unboxing". */
function buildDeliverables(tr: Tr): Array<{
  icon: keyof typeof Icon;
  title: string;
  detail: string;
}> {
  return [
    { icon: "Diploma", title: tr("deliverable.diploma.title"), detail: tr("deliverable.diploma.detail") },
    { icon: "QR", title: tr("deliverable.qr.title"), detail: tr("deliverable.qr.detail") },
    { icon: "BadgeCheck", title: tr("deliverable.badge.title"), detail: tr("deliverable.badge.detail") },
    { icon: "Archive", title: tr("deliverable.evidence.title"), detail: tr("deliverable.evidence.detail") },
    { icon: "Bell", title: tr("deliverable.bell.title"), detail: tr("deliverable.bell.detail") },
    { icon: "Refresh", title: tr("deliverable.recert.title"), detail: tr("deliverable.recert.detail") },
  ];
}

/** ROI — datos concretos para que el candidato calcule si vale la pena. */
function buildRoi(tr: Tr): Array<{ label: string; value: string; hint: string }> {
  return [
    { label: tr("roi.salary.label"), value: tr("roi.salary.value"), hint: tr("roi.salary.hint") },
    { label: tr("roi.time.label"), value: tr("roi.time.value"), hint: tr("roi.time.hint") },
    { label: tr("roi.payback.label"), value: tr("roi.payback.value"), hint: tr("roi.payback.hint") },
    { label: tr("roi.life.label"), value: tr("roi.life.value"), hint: tr("roi.life.hint") },
  ];
}

export default async function HomePage() {
  const { logoUrl } = await getBrandAssets();
  const marketing = await getMarketingConfig();
  const locale: Locale = await getServerLocale();
  const tr = (k: string) => t(k, locale);

  // Builders dependientes del locale — se invocan una vez por render.
  const TRUST_METRICS = trustMetrics(marketing, tr);
  const BENEFITS = buildBenefits(tr);
  const STEPS = buildSteps(tr);
  const COMPARISON = buildComparison(tr);
  const HOME_FAQ = buildHomeFaq(tr);
  const TESTIMONIALS = buildTestimonials(tr);
  const PERSONAS = buildPersonas(tr);
  const DELIVERABLES = buildDeliverables(tr);
  const ROI = buildRoi(tr);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <UrgencyBanner />
      <LandingHeader />

      {/* ════════════════════ HERO ════════════════════ */}
      <section className="relative bg-premium-light">
        {/* Nota lateral manuscrita — desktop solo. Ancla visual humana. */}
        <span className="handwritten pointer-events-none absolute right-6 top-10 hidden text-[15px] text-gold-600 lg:block">
          {tr("land.hero.note")}
        </span>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-800">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              {tr("land.hero.eyebrow")} · {BRAND.isoNorm}
            </div>

            <h1 className="mt-5 text-4xl font-bold leading-[1.08] text-brand-900 sm:text-[3.2rem]">
              <span className="font-display block text-slate-900">{tr("land.hero.title.1")}</span>
              <span className="mt-1 block">
                <span className="hand-underline">{tr("land.hero.title.2")}</span>
              </span>
              <span className="mt-1 block font-display text-[1.65rem] font-medium text-slate-500 sm:text-[2rem]">
                {tr("land.hero.title.3")}
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-slate-600">
              {tr("land.hero.body")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={CTAS.certify.href} className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 px-6 py-4 text-base font-bold text-brand-900 shadow-lg shadow-gold-500/20 transition hover:from-gold-400 hover:to-gold-500 hover:shadow-gold-500/40">
                {tr("land.hero.cta.primary")}
                <span className="transition group-hover:translate-x-0.5">→</span>
              </Link>
              <Link href={CTAS.certifications.href} className="rounded-lg border border-brand-200 bg-white px-6 py-4 text-base font-semibold text-brand-800 transition hover:bg-brand-50">
                {tr("land.hero.cta.secondary")}
              </Link>
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              {tr("land.hero.disclaimer")}
            </p>

            <div className="relative mt-10 mx-auto max-w-xs lg:hidden">
              <CertificateMock />
            </div>

            <ul className="mt-10 grid max-w-md grid-cols-1 gap-2 text-[13px] text-slate-700 sm:grid-cols-2">
              {[
                ["QR", tr("land.hero.feat.qr")],
                ["Stamp", tr("land.hero.feat.proctor")],
                ["ShieldCheck", tr("land.hero.feat.backing")],
                ["Refresh", tr("land.hero.feat.recert")],
              ].map(([k, txt]) => {
                const I = Icon[k as keyof typeof Icon];
                return (
                  <li key={txt} className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white text-brand-800 ring-1 ring-brand-100">
                      <I size={15} />
                    </span>
                    <span>{txt}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="hidden lg:col-span-5 lg:block">
            <div className="relative mb-6">
              <div className="animate-float-soft">
                <CertificateMock />
              </div>

              {/* Badge flotante inferior izquierdo — "Estado: Verificado".
                  Delay en la entrada para que aparezca después del certificado;
                  hover sutil que sube el badge. */}
              <div className="absolute -left-3 bottom-4 hidden rounded-xl bg-white p-3 shadow-premium ring-1 ring-slate-200 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(11,31,58,0.18)] xl:block animate-float-soft" style={{ animationDelay: "1.2s" }}>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{tr("land.hero.mock.status")}</div>
                <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {tr("land.hero.mock.statusValue")}
                </div>
              </div>

              {/* Badge flotante superior derecho — "Vigencia 3 años".
                  Color del valor pasó de brand-800 a brand-900 (más consistencia). */}
              <div className="absolute -right-2 top-4 hidden rounded-xl bg-white p-3 shadow-premium ring-1 ring-slate-200 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(11,31,58,0.18)] xl:block animate-float-soft" style={{ animationDelay: "0.4s" }}>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{tr("land.hero.mock.validity")}</div>
                <div className="text-sm font-bold text-brand-900">{tr("land.hero.mock.validityValue")}</div>
              </div>
            </div>
            <HeroMicroForm locale={locale} />
          </div>

          {/* Microformulario también en mobile bajo el hero */}
          <div className="lg:hidden">
            <HeroMicroForm locale={locale} />
          </div>
        </div>
      </section>

      {/* ════════════════════ GARANTÍA (RISK REVERSAL) ════════════════════ */}
      <section className="border-b border-slate-100 bg-emerald-50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-xl border border-emerald-200 bg-white px-6 py-5 text-center">
            <p className="text-[13px] leading-relaxed text-emerald-900">
              <strong>✓ Garantía 30 días sin riesgo:</strong> Si no apruebas el examen en tu primer intento, tendrás reintentos gratis. Si no estás satisfecho con el proceso, devolvemos tu dinero sin preguntas.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════ AUTORIDAD / CONFIANZA ════════════════════ */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
              {tr("land.trust.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">
              <span className="font-display">{tr("land.trust.title.1")}</span> {tr("land.trust.title.2")}
            </h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              {tr("land.trust.body")}
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_METRICS.map((m) => (
              <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:shadow-premium">
                <div className="text-3xl font-extrabold text-brand-800">{m.value}</div>
                <div className="mt-1 text-xs leading-snug text-slate-500">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ PARA QUIÉN ES ESTO ════════════════════ */}
      <section id="para-quien" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
              {tr("land.personas.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-brand-900 sm:text-[2.1rem]">
              <span className="font-display italic">{tr("land.personas.title.1")}</span>{" "}
              {tr("land.personas.title.2")}
            </h2>
            <p className="mt-3 text-[15px] text-slate-600">
              {tr("land.personas.body")}
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PERSONAS.map((p) => {
              const I = Icon[p.icon];
              return (
                <article
                  key={p.who}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-premium"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100 transition group-hover:bg-brand-800 group-hover:text-white">
                    <I size={22} />
                  </span>
                  <h3 className="mt-5 text-[15px] font-bold leading-snug text-brand-900">{p.who}</h3>
                  <p className="mt-2 grow text-[13px] leading-relaxed text-slate-600">
                    <span className="block text-slate-500">↘ {p.pain}</span>
                    <span className="mt-2 block font-medium text-brand-900">→ {p.promise}</span>
                  </p>
                </article>
              );
            })}
          </div>

          <p className="mx-auto mt-10 max-w-2xl text-center text-[13px] italic text-slate-500">
            {tr("land.personas.foot.before")}
            <Link href={CTAS.contact.href} className="font-semibold text-brand-800 not-italic hover:underline">
              {tr("land.personas.foot.link")}
            </Link>
            {tr("land.personas.foot.after")}
          </p>
        </div>
      </section>

      {/* ════════════════════ CERTIFICACIONES DESTACADAS ════════════════════ */}
      <section id="certificaciones" className="bg-premium-grid">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">{tr("land.catalog.eyebrow")}</p>
              <h2 className="mt-1 text-2xl font-bold text-brand-900 sm:text-3xl">
                {tr("land.catalog.title")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                {tr("land.catalog.body")}
              </p>
            </div>
            <Link href="/certificaciones" className="text-sm font-semibold text-brand-800 hover:text-brand-900">{tr("land.catalog.link")}</Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_CERTS.map((c) => {
              const isComing = c.status === "COMING_SOON";
              const isOnRequest = c.status === "ON_REQUEST";
              return (
                <article key={c.slug} className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-premium ${isComing ? "border-amber-200" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800">{c.category}</span>
                    {isComing ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">{tr("land.cert.comingSoon")}</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">{c.level}</span>
                    )}
                  </div>
                  <h3 className="mt-3 text-base font-bold leading-snug text-brand-900">{c.shortName}</h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">{c.description}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-500">
                    <dt>{tr("land.cert.duration")}</dt><dd className="text-right font-semibold text-slate-700">{c.durationMin} {tr("land.cert.min")}</dd>
                    <dt>{tr("land.cert.validity")}</dt><dd className="text-right font-semibold text-slate-700">{Math.round(c.validityMonths / 12)} {tr("land.cert.years")}</dd>
                    <dt>{tr("land.cert.investment")}</dt><dd className="text-right font-bold text-brand-800">{c.priceCOP ? `${formatCOP(c.priceCOP)} + IVA` : tr("land.cert.consult")}</dd>
                  </dl>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Link href={`/certificaciones/${c.slug}`} className="text-xs font-semibold text-brand-800 hover:underline">{tr("land.cert.details")}</Link>
                    {isComing ? (
                      <Link href={`/contacto?cert=${c.slug}`} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                        {tr("land.cert.notifyMe")}
                      </Link>
                    ) : isOnRequest ? (
                      <Link href={`/contacto?cert=${c.slug}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        {tr("land.cert.requestInfo")}
                      </Link>
                    ) : (
                      <Link href={`/registro?cert=${c.slug}`} className="rounded-lg btn-grad-navy px-3 py-1.5 text-xs font-semibold text-white">{tr("land.cert.enroll")}</Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════ BENEFICIOS — CRECIMIENTO PROFESIONAL ════════════════════ */}
      <section id="beneficios" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-end gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
                {tr("land.benefits.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-brand-900 sm:text-[2.1rem]">
                {tr("land.benefits.title.1")}{" "}
                <span className="font-display italic">{tr("land.benefits.title.2")}</span> {tr("land.benefits.title.3")}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 lg:col-span-5">
              {tr("land.benefits.body")}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => {
              const I = Icon[b.icon];
              return (
                <article
                  key={b.title}
                  className="group relative rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-premium"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-800 ring-1 ring-brand-100 transition group-hover:bg-brand-800 group-hover:text-white">
                      <I size={22} />
                    </span>
                    {b.callout ? (
                      <span className="rounded-full border border-gold-500/40 bg-gold-500/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold-600">
                        {b.callout}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-5 text-[15px] font-bold leading-snug text-brand-900">{b.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">{b.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════ LO QUE SE LLEVA A CASA ════════════════════ */}
      <section id="entregables" className="bg-premium-grid">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-end gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
                {tr("land.deliv.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-brand-900 sm:text-[2.1rem]">
                {tr("land.deliv.title.1")}{" "}
                <span className="font-display italic">{tr("land.deliv.title.2")}</span> {tr("land.deliv.title.3")}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 lg:col-span-5">
              {tr("land.deliv.body")}
            </p>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DELIVERABLES.map((d, i) => {
              const I = Icon[d.icon];
              return (
                <li
                  key={d.title}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-premium"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gold-500/10 text-gold-600 ring-1 ring-gold-500/30 transition group-hover:bg-gold-500 group-hover:text-white">
                    <I size={22} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-[14px] font-bold text-brand-900">{d.title}</h3>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{d.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
            <p className="text-[13.5px] text-emerald-900">
              <strong className="font-bold">{tr("land.deliv.note.bold")}</strong>
              {tr("land.deliv.note.rest")}
            </p>
            <Link
              href={CTAS.certify.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              {tr("land.deliv.cta")}
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════ VENTAJAS COMPETITIVAS ════════════════════ */}
      <section id="ventajas" className="bg-paper">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
              {tr("land.comp.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-brand-900 sm:text-[2.1rem]">
              <span className="font-display italic">{tr("land.comp.title.1")}</span>{" "}
              {tr("land.comp.title.2")}
            </h2>
            <p className="mt-3 text-[15px] text-slate-600">
              {tr("land.comp.body")}
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-12 px-4 py-3 sm:col-span-4 sm:py-4">{tr("comp.col.criterion")}</div>
              <div className="col-span-6 px-4 py-3 sm:col-span-4 sm:py-4">{tr("comp.col.them")}</div>
              <div className="col-span-6 border-l border-slate-200 px-4 py-3 text-brand-800 sm:col-span-4 sm:py-4">
                {tr("comp.col.us.prefix")} {BRAND.shortName}
              </div>
            </div>
            <ul>
              {COMPARISON.map((row, i) => (
                <li
                  key={row.axis}
                  className={`grid grid-cols-12 items-start gap-y-2 border-b border-slate-100 px-4 py-4 text-[13.5px] last:border-b-0 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}
                >
                  <div className="col-span-12 font-semibold text-brand-900 sm:col-span-4">
                    {row.axis}
                  </div>
                  <div className="col-span-6 flex items-start gap-2 text-slate-500 sm:col-span-4">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600">
                      <Icon.X size={12} />
                    </span>
                    <span>{row.them}</span>
                  </div>
                  <div className="col-span-6 flex items-start gap-2 border-l border-slate-100 pl-4 text-slate-800 sm:col-span-4">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <Icon.Check size={12} />
                    </span>
                    <span className="font-medium">{row.us}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-5 text-center text-xs italic text-slate-500">
            {tr("land.comp.footer")}
          </p>
        </div>
      </section>

      {/* ════════════════════ NOTA EDITORIAL / ORIGEN ════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-premium sm:p-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
              {tr("land.letter.eyebrow")}
            </p>
            <h2 className="mt-3 font-display text-[1.9rem] leading-[1.18] text-brand-900 sm:text-[2.4rem]">
              {tr("land.letter.quote")}
            </h2>

            <div className="mt-8 grid gap-6 text-[15px] leading-relaxed text-slate-700 sm:grid-cols-2">
              <p>
                {tr("land.letter.p1")}
              </p>
              <p>
                {tr("land.letter.p2.before")}{BRAND.isoNorm}{tr("land.letter.p2.after")}
              </p>
            </div>

            <hr className="dashed-rule my-8" />

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="handwritten text-[28px] leading-none text-brand-900">{tr("land.letter.signLabel")} {BRAND.shortName}</p>
                <p className="mt-1 text-xs text-slate-500">{tr("land.letter.signSub")}{BRAND.address}</p>
              </div>
              <Link href={CTAS.contact.href} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-900">
                <Icon.Handshake size={18} /> {tr("land.letter.contactCta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ PROCESO 10 PASOS ════════════════════ */}
      <section id="proceso" className="bg-premium-grid">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
              {tr("land.process.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">
              {tr("land.process.title")}
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              {tr("land.process.body")}
            </p>
          </div>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-premium">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-600">{tr("land.process.stepLabel")} {s.n}</div>
                <div className="mt-1 text-sm font-bold text-brand-900">{s.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ════════════════════ GARANTÍAS ════════════════════ */}
      <GuaranteesSection />

      {/* ════════════════════ VISTA PREVIA DEL EXAMEN ════════════════════ */}
      <ExamPreview />

      {/* ════════════════════ EVALUACIÓN ONLINE ════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">{tr("land.examPrev.eyebrow")}</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">
              {tr("land.examPrev.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              {tr("land.examPrev.body")}
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                ["Bolt", tr("land.examPrev.f1")],
                ["Clock", tr("land.examPrev.f2")],
                ["Check", tr("land.examPrev.f3")],
                ["Lock", tr("land.examPrev.f4")],
                ["Eye", tr("land.examPrev.f5")],
                ["Handshake", tr("land.examPrev.f6")],
              ].map(([k, txt]) => {
                const I = Icon[k as keyof typeof Icon];
                return (
                  <li key={txt} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      <I size={14} />
                    </span>
                    <span className="text-slate-700">{txt}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-premium">
            <div className="rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-brand-800">Examen Teórico — SARLAFT</span>
                <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-rose-700">⏱ 14:32</span>
              </div>
              <div className="mt-3 text-sm font-semibold text-brand-900">
                7. Una operación inusual de un cliente con vínculos en jurisdicciones no cooperantes debe…
              </div>
              <div className="mt-3 space-y-2 text-xs">
                {["Ignorarse si el monto es bajo", "Reportarse como ROS a la UIAF si hay sospecha fundada", "Cerrar la cuenta automáticamente", "Discutirse con el cliente antes de reportar"].map((o, i) => (
                  <label key={o} className={`flex items-center gap-2 rounded-lg border p-2 ${i === 1 ? "border-brand-300 bg-brand-50" : "border-slate-200"}`}>
                    <input type="radio" disabled defaultChecked={i === 1} />
                    <span className={i === 1 ? "font-semibold text-brand-900" : "text-slate-600"}>{o}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>Respondidas 6 / 25</span>
                <span className="text-amber-600">⚠ 0 salidas de pantalla</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════ CERTIFICADOS DIGITALES — GALERÍA ════════════════════ */}
      <section className="bg-premium-light">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full border border-gold-500 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold-600">
              {tr("land.gallery.badge")}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">
              <span className="font-display italic">{tr("land.gallery.title.1")}</span> {tr("land.gallery.title.2")}
            </h2>
            <p className="mt-3 text-[15px] text-slate-600">
              {tr("land.gallery.body.before")}{BRAND.shortName}{tr("land.gallery.body.after")}
            </p>
          </div>
          <div className="mt-12">
            <CertificateGallery />
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link href={CTAS.verify.href} className="rounded-lg btn-grad-navy px-5 py-3 text-sm font-semibold text-white">
              {CTAS.verify.label}
            </Link>
            <Link href={CTAS.certify.href} className="rounded-lg border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50">
              {CTAS.certify.label}
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════ VERIFICACIÓN PÚBLICA ════════════════════ */}
      <section id="verificar" className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-800">
            <Icon.QR size={12} /> {tr("land.verify.badge")}
          </span>
          <h2 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">
            {tr("land.verify.title")}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {tr("land.verify.body.before")}{BRAND.shortName}{tr("land.verify.body.after")}
          </p>
          <form action="/verificar" method="get" className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
            <input
              name="code"
              required
              placeholder={tr("land.verify.placeholder")}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
            <button type="submit" className="rounded-lg btn-grad-navy px-5 py-3 text-sm font-semibold text-white">{tr("land.verify.btn")}</button>
          </form>
          <p className="mt-3 text-xs text-slate-400">{tr("land.verify.alt")}</p>
        </div>
      </section>

      {/* ════════════════════ RECERTIFICACIÓN ════════════════════ */}
      <section className="bg-premium-grid">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">{tr("land.recert.eyebrow")}</p>
              <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">
                {tr("land.recert.title")}
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                {tr("land.recert.body")}
              </p>
              <Link href={CTAS.certifications.href} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:text-brand-900">
                {tr("land.recert.link")}
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
              {[
                { I: Icon.Bell, t: tr("land.recert.f1") },
                { I: Icon.Mail, t: tr("land.recert.f2") },
                { I: Icon.Refresh, t: tr("land.recert.f3") },
                { I: Icon.Archive, t: tr("land.recert.f4") },
                { I: Icon.Eye, t: tr("land.recert.f5") },
                { I: Icon.Lock, t: tr("land.recert.f6") },
              ].map(({ I, t }) => (
                <li key={t} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-premium">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-800 ring-1 ring-brand-100">
                    <I size={18} />
                  </span>
                  <span className="pt-1 text-sm text-slate-700">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ════════════════════ ROI — ¿VALE LA PENA? ════════════════════ */}
      <section id="roi" className="bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
                {tr("land.roi.eyebrow")}
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-brand-900 sm:text-[2.3rem]">
                <span className="font-display italic">{tr("land.roi.title.1")}</span>{" "}
                {tr("land.roi.title.2")}
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-slate-700">
                {tr("land.roi.body")}
              </p>
              <p className="mt-4 text-[14px] italic leading-relaxed text-slate-500">
                {tr("land.roi.note")}
              </p>
              <Link
                href={CTAS.certify.href}
                className="mt-7 inline-flex items-center gap-2 rounded-lg btn-grad-navy px-5 py-3 text-sm font-semibold text-white shadow-sm transition"
              >
                <Icon.Rocket size={16} /> {tr("land.roi.cta")}
              </Link>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
              {ROI.map((r, i) => (
                <li
                  key={r.label}
                  className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-premium ${i === 0 ? "sm:col-span-2" : ""}`}
                >
                  <div
                    className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold-500/10 transition group-hover:scale-125 ${i === 0 ? "bg-emerald-500/10" : ""}`}
                  />
                  <div className="relative">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {r.label}
                    </p>
                    <p
                      className={`mt-1 font-display text-[2.6rem] leading-none ${i === 0 ? "text-emerald-700" : "text-brand-900"}`}
                    >
                      {r.value}
                    </p>
                    <p className="mt-2 text-[12.5px] leading-snug text-slate-500">
                      {r.hint}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ════════════════════ MANIFIESTO / FRASE FUERTE ════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <Icon.Quote size={28} className="mx-auto text-gold-500" />
          <p className="mt-4 font-display text-[1.75rem] leading-[1.3] text-brand-900 sm:text-[2.4rem]">
            &ldquo;{tr("land.manifesto.quote.1")}{" "}
            <span className="italic text-slate-500">{tr("land.manifesto.quote.2")}</span>{tr("land.manifesto.quote.3")}{" "}
            <span className="hand-underline">{tr("land.manifesto.quote.4")}</span>.&rdquo;
          </p>
          <hr className="dashed-rule mx-auto my-7 w-32" />
          <p className="text-[13px] uppercase tracking-[0.18em] text-slate-500">
            {tr("land.manifesto.foot.before")} {BRAND.shortName} {tr("land.manifesto.foot.after")}
          </p>
        </div>
      </section>

      {/* ════════════════════ TESTIMONIOS — CON OUTCOME DE CARRERA ════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
              {tr("land.testimonials.eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">
              <span className="font-display italic">{tr("land.testimonials.title.1")}</span> {tr("land.testimonials.title.2")}
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              {tr("land.testimonials.body")}
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="paper-fold relative flex h-full flex-col rounded-2xl border border-slate-200 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-premium"
              >
                <div className="flex items-center justify-between">
                  <Icon.Quote size={22} className="text-gold-500" />
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
                    {t.outcome}
                  </span>
                </div>
                <blockquote className="mt-3 grow text-[14.5px] italic leading-relaxed text-slate-700">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-800 ring-1 ring-brand-100">
                    {t.initial}
                  </span>
                  <span className="text-xs leading-snug">
                    <span className="block font-bold text-brand-900">{t.name}</span>
                    <span className="text-slate-600">{t.role} · {t.sector}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>

          <p className="mt-8 text-center text-[12px] italic text-slate-500">
            {tr("land.testimonials.foot")}
          </p>
        </div>
      </section>

      {/* ════════════════════ FAQ ════════════════════ */}
      <section id="faq" className="bg-premium-light">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">{tr("land.faq.eyebrow")}</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">{tr("land.faq.title")}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {tr("land.faq.body.before")}
              <Link href="/preguntas-frecuentes" className="font-semibold text-brand-800 hover:underline">
                {tr("land.faq.body.link")}
              </Link>
              {tr("land.faq.body.after")}
            </p>
          </div>
          <div className="mt-8">
            <FAQList items={HOME_FAQ} />
          </div>
        </div>
      </section>

      {/* ════════════════════ CTA FINAL ════════════════════ */}
      <section className="bg-hero-grad text-white">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <p className="mb-4 inline-block rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold-400">
            <Icon.Trophy size={11} className="-mt-0.5 mr-1 inline" />
            {marketing.slogan}
          </p>
          <h2 className="font-display text-3xl leading-tight sm:text-[2.8rem]">
            {tr("land.finalCta.title.1")}{" "}
            <span className="italic text-gold-400">{tr("land.finalCta.title.2")}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-200">
            {tr("land.finalCta.body")}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href={CTAS.certify.href}
              className="group inline-flex items-center gap-2 rounded-lg bg-gold-500 px-7 py-3.5 text-sm font-bold text-brand-900 shadow-lg shadow-gold-500/20 transition hover:bg-gold-400 hover:shadow-gold-500/40"
            >
              {tr("land.finalCta.primary")}
              <span className="transition group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href={CTAS.register.href}
              className="rounded-lg border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {tr("land.finalCta.secondary")}
            </Link>
            <Link
              href={CTAS.certifications.href}
              className="rounded-lg px-6 py-3.5 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
            >
              {tr("land.finalCta.tertiary")}
            </Link>
          </div>

          <p className="handwritten mt-10 text-[20px] text-gold-300">
            {tr("land.finalCta.handwritten")}
          </p>
        </div>
      </section>

      <LandingFooter />

      {/* Componentes flotantes globales */}
      <WhatsAppFloat />
      <FeedbackButton authenticated={false} />
      <MobileStickyCTA />

      {/* Schema markup: Organization */}
      <SchemaJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: BRAND.legalName,
          alternateName: BRAND.shortName,
          url: BRAND.appUrl,
          logo: logoUrl ? (logoUrl.startsWith("http") ? logoUrl : `${BRAND.appUrl}${logoUrl}`) : undefined,
          email: BRAND.contactEmail,
          address: BRAND.address,
          sameAs: [BRAND.social.linkedin].filter(Boolean),
          description: BRAND.description,
          slogan: marketing.slogan,
        }}
      />
    </main>
  );
}
