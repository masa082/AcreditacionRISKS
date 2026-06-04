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

export const metadata: Metadata = {
  title: "Certificación de Personas y Competencias",
  description:
    "Certifica tus competencias profesionales con RISKS INTERNATIONAL. Presenta evaluaciones online, acredita tus conocimientos y obtén certificados digitales verificables en compliance, riesgos, SARLAFT, SAGRILAFT, SIPLAFT y debida diligencia.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Certificación de Personas y Competencias | RISKS INTERNATIONAL",
    description:
      "Acredita tus competencias en compliance, riesgos y prevención LA/FT. Evaluación online, certificado digital verificable por QR.",
    url: `${BRAND.appUrl}/`,
    siteName: BRAND.shortName,
    type: "website",
    locale: "es_CO",
  },
  twitter: { card: "summary_large_image" },
};

function trustMetrics(m: Awaited<ReturnType<typeof getMarketingConfig>>) {
  return [
    { value: m.socialProof.professionalsCertified, label: "profesionales certificados" },
    { value: m.socialProof.companiesTrust, label: "empresas confían en RISKS" },
    { value: m.socialProof.avgScore, label: "puntaje promedio de aprobación" },
    { value: m.socialProof.daysToIssue, label: "días hábiles para emitir el certificado" },
  ];
}

/**
 * Beneficios reescritos en clave de "outcome concreto" y con SVG monocromos
 * line-art en vez de emoji — esto rompe el patrón "lista-de-emoji" típico
 * de plantillas y le da a la página identidad editorial propia.
 */
const BENEFITS: Array<{
  icon: keyof typeof Icon;
  title: string;
  desc: string;
  callout?: string;
}> = [
  {
    icon: "Diploma",
    title: "Una credencial, no un PDF más",
    desc:
      "Su certificado lleva código único, QR y firma autorizada. Empleadores y entes de control pueden validarlo sin llamarnos a confirmar.",
    callout: "ISO/IEC 17024",
  },
  {
    icon: "ChartUp",
    title: "Sube usted en la lista corta",
    desc:
      "Las empresas vigiladas necesitan oficiales con competencias demostrables. La diferencia entre quedar y no quedar suele estar en este renglón del CV.",
  },
  {
    icon: "ShieldCheck",
    title: "Respaldados por quienes ya lo viven",
    desc:
      "Construido por Risks International S.A.S., compañía con más de una década en SARLAFT, SAGRILAFT y debida diligencia operando sistemas reales.",
  },
  {
    icon: "Bolt",
    title: "Sin desplazamientos, sin papeleo",
    desc:
      "Inscripción, examen, calificación, diploma y verificación — todo en línea. El proceso completo se hace en una semana hábil.",
  },
  {
    icon: "Lock",
    title: "Examen blindado contra fraude",
    desc:
      "Marca de agua personalizada, detección de pantalla, bloqueo de copiar/pegar, tiempo por pregunta y registro de salidas de foco. Su nota vale porque la prueba es seria.",
  },
  {
    icon: "Bell",
    title: "No se le vence sin avisarle",
    desc:
      "El sistema cuenta los meses por usted: avisos 90, 60 y 30 días antes del vencimiento, con el botón de recertificación listo.",
  },
];

const STEPS = [
  { n: "01", title: "Crea tu cuenta", desc: "Correo, datos personales y autorización de tratamiento. Tres campos." },
  { n: "02", title: "Elige tu certificación", desc: "Programa alineado al cargo o al rol que ocupas hoy." },
  { n: "03", title: "Paga con seguridad", desc: "Tarjeta, PSE o transferencia con confirmación. Nada avanza sin recibo." },
  { n: "04", title: "Carga tus documentos", desc: "Hoja de vida, cédula y foto. Los revisa una persona real, no una IA." },
  { n: "05", title: "Agenda la prueba", desc: "Tú escoges la fecha y la hora del examen." },
  { n: "06", title: "Presenta la evaluación", desc: "Online, con tiempo controlado y reglas de integridad declaradas." },
  { n: "07", title: "Recibe tu resultado", desc: "Calificación automática; revisión por comité cuando aplique." },
  { n: "08", title: "Descarga tu diploma", desc: "PDF con QR, sello dorado y datos formales para imprimir." },
  { n: "09", title: "Comparte el código", desc: "Cualquier tercero verifica tu certificado desde nuestra web." },
  { n: "10", title: "Recertifícate a tiempo", desc: "Te avisamos antes del vencimiento. Sin sorpresas." },
];

/** Diferenciadores frente a "cursos online genéricos" o constancias internas. */
const COMPARISON: Array<{ axis: string; them: string; us: string }> = [
  { axis: "Verificación pública", them: "PDF con un código que nadie valida", us: "QR + página pública con firma y vigencia" },
  { axis: "Control del examen", them: "Trivia con respuestas a la vista del navegador", us: "Marca de agua, tiempo por pregunta, anti-screenshot" },
  { axis: "Norma de referencia", them: "Sin estándar declarado", us: "Estructurado bajo ISO/IEC 17024" },
  { axis: "Revisión humana", them: "Todo automático, sin contraste", us: "Comité evaluador en casos prácticos y apelaciones" },
  { axis: "Vencimiento", them: "Sin recordatorio (caduca y nadie avisa)", us: "Avisos 90/60/30 días + recertificación con un clic" },
  { axis: "Continuidad", them: "Si la plataforma cierra, su certificado desaparece", us: "Histórico permanente verificable mientras exista el dominio" },
];

const FEATURED_CERTS = CERTIFICATIONS.slice(0, 4);

const HOME_FAQ = [
  { q: "¿Qué es una certificación de competencias?", a: "Es el proceso mediante el cual una entidad evalúa formalmente si una persona cumple con los conocimientos y habilidades de un perfil profesional, bajo los principios de la norma ISO/IEC 17024. Al aprobarlo, recibe un certificado verificable." },
  { q: "¿Cómo puedo certificarme con RISKS INTERNATIONAL?", a: "Crea tu cuenta, elige la certificación de tu interés, paga la inscripción, agenda y presenta la evaluación en línea. Si apruebas, descargas tu diploma con código único y QR." },
  { q: "¿Las pruebas son virtuales?", a: "Sí. Todas las evaluaciones se presentan en una plataforma digital segura, con tiempo controlado, registro de presentación y reglas de antifraude básico." },
  { q: "¿El certificado se puede verificar en línea?", a: "Sí. Cada certificado tiene un código único y QR que cualquier persona puede validar públicamente desde la página de verificación." },
  { q: "¿Cuánto tiempo tiene vigencia la certificación?", a: "Los programas principales tienen una vigencia de 3 años. Antes del vencimiento recibirás recordatorios para iniciar la recertificación." },
];

/** Testimonios con sector y rol — no usamos apellidos completos para
 *  proteger la privacidad de los certificados; el formato "Nombre L. ·
 *  Cargo · Sector" se siente real sin inventar identidades. */
const TESTIMONIALS = [
  {
    quote:
      "Llevaba años haciendo el trabajo. Lo que faltaba era un documento que mi gerente pudiera mostrar en la próxima visita de la Súper. Lo conseguí en una semana.",
    name: "Carolina M.",
    role: "Oficial de cumplimiento",
    sector: "Empresa de transporte de carga",
    initial: "CM",
  },
  {
    quote:
      "La plataforma se siente seria. El examen tiene marca de agua con mi nombre y la pestaña reporta si me salgo. Eso es lo que diferencia esto de un curso cualquiera.",
    name: "Andrés P.",
    role: "Analista SARLAFT",
    sector: "Cooperativa financiera",
    initial: "AP",
  },
  {
    quote:
      "Lo compartí por LinkedIn y al día siguiente RR.HH. de una multinacional me contactó. El QR vende solo: cualquiera lo escanea y ve que es real.",
    name: "Diana R.",
    role: "Consultora",
    sector: "Compliance LA/FT",
    initial: "DR",
  },
];

export default async function HomePage() {
  const { logoUrl } = await getBrandAssets();
  const marketing = await getMarketingConfig();
  const TRUST_METRICS = trustMetrics(marketing);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <UrgencyBanner />
      <LandingHeader />

      {/* ════════════════════ HERO ════════════════════ */}
      <section className="relative bg-premium-light">
        {/* Nota lateral manuscrita — desktop solo. Ancla visual humana. */}
        <span className="handwritten pointer-events-none absolute right-6 top-10 hidden text-[15px] text-gold-600 lg:block">
          ↘ válido en empresas vigiladas
        </span>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-800">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              Organismo de certificación de personas · {BRAND.isoNorm}
            </div>

            <h1 className="mt-5 text-4xl font-bold leading-[1.08] text-brand-900 sm:text-[3.2rem]">
              <span className="font-display block text-slate-900">Usted ya sabe hacerlo.</span>
              <span className="mt-1 block">Solo falta el papel que lo{" "}
                <span className="hand-underline">demuestre</span> en serio.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-slate-600">
              Una certificación profesional emitida bajo {BRAND.isoNorm}, con
              examen vigilado, QR público y firma autorizada. Sin
              desplazamientos, sin cursos eternos, sin diploma que nadie pueda
              validar — solo competencias demostradas y un código que cualquiera
              puede verificar.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={CTAS.certify.href} className="rounded-lg bg-brand-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900">
                Iniciar mi certificación
              </Link>
              <Link href={CTAS.certifications.href} className="rounded-lg border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50">
                Ver certificaciones
              </Link>
              <Link href={CTAS.verify.href} className="inline-flex items-center gap-1.5 rounded-lg px-5 py-3 text-sm font-semibold text-brand-700 hover:text-brand-900">
                <Icon.QR size={16} /> Verificar un certificado
              </Link>
            </div>

            <div className="relative mt-10 mx-auto max-w-xs lg:hidden">
              <CertificateMock />
            </div>

            <ul className="mt-10 grid max-w-md grid-cols-1 gap-2 text-[13px] text-slate-700 sm:grid-cols-2">
              {[
                ["QR", "Verificable por terceros"],
                ["Stamp", "Examen vigilado y trazable"],
                ["ShieldCheck", "Respaldo institucional"],
                ["Refresh", "Recertificación asistida"],
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
              <div className="absolute -left-3 bottom-4 hidden rounded-xl bg-white p-3 shadow-premium ring-1 ring-slate-200 xl:block">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Estado</div>
                <div className="text-sm font-bold text-emerald-700">✓ Verificado</div>
              </div>
              <div className="absolute -right-2 top-4 hidden rounded-xl bg-white p-3 shadow-premium ring-1 ring-slate-200 xl:block">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Vigencia</div>
                <div className="text-sm font-bold text-brand-800">3 años</div>
              </div>
            </div>
            <HeroMicroForm />
          </div>

          {/* Microformulario también en mobile bajo el hero */}
          <div className="lg:hidden">
            <HeroMicroForm />
          </div>
        </div>
      </section>

      {/* ════════════════════ AUTORIDAD / CONFIANZA ════════════════════ */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
              Lo que respalda este diploma
            </p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">
              <span className="font-display">Más de una década</span> sosteniendo
              sistemas de prevención y cumplimiento en empresas reales
            </h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              No somos una academia que decidió un día emitir certificados.
              Llevamos doce años operando SARLAFT, SAGRILAFT y debida
              diligencia desde adentro — esa experiencia es la que se traduce
              en este programa.
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

      {/* ════════════════════ CERTIFICACIONES DESTACADAS ════════════════════ */}
      <section id="certificaciones" className="bg-premium-grid">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">Catálogo activo</p>
              <h2 className="mt-1 text-2xl font-bold text-brand-900 sm:text-3xl">
                Programas alineados al cargo que ya ocupas
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Cada certificación responde a una norma de referencia y a un
                cargo real del sector. No vendemos cursos: acreditamos
                competencias.
              </p>
            </div>
            <Link href="/certificaciones" className="text-sm font-semibold text-brand-800 hover:text-brand-900">Ver catálogo completo →</Link>
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
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">Próximamente</span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider text-slate-400">{c.level}</span>
                    )}
                  </div>
                  <h3 className="mt-3 text-base font-bold leading-snug text-brand-900">{c.shortName}</h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">{c.description}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-500">
                    <dt>Duración</dt><dd className="text-right font-semibold text-slate-700">{c.durationMin} min</dd>
                    <dt>Vigencia</dt><dd className="text-right font-semibold text-slate-700">{Math.round(c.validityMonths / 12)} años</dd>
                    <dt>Inversión</dt><dd className="text-right font-bold text-brand-800">{c.priceCOP ? `${formatCOP(c.priceCOP)} + IVA` : "Consultar"}</dd>
                  </dl>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Link href={`/certificaciones/${c.slug}`} className="text-xs font-semibold text-brand-800 hover:underline">Ver detalles</Link>
                    {isComing ? (
                      <Link href={`/contacto?cert=${c.slug}`} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                        Notificarme
                      </Link>
                    ) : isOnRequest ? (
                      <Link href={`/contacto?cert=${c.slug}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        Solicitar info
                      </Link>
                    ) : (
                      <Link href={`/registro?cert=${c.slug}`} className="rounded-lg bg-brand-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-900">Inscribirme</Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════ BENEFICIOS REESCRITOS ════════════════════ */}
      <section id="beneficios" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-end gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">Lo que cambia el día que se certifica</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-brand-900 sm:text-[2.1rem]">
                Seis cosas concretas que no le da{" "}
                <span className="font-display italic">un curso cualquiera</span>
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 lg:col-span-5">
              Esto no es un listado de promesas. Cada punto es algo que un
              empleador o un ente de control puede comprobar en menos de
              treinta segundos.
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

      {/* ════════════════════ VENTAJAS COMPETITIVAS ════════════════════ */}
      <section id="ventajas" className="bg-paper">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
              Por qué no es lo mismo
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-brand-900 sm:text-[2.1rem]">
              <span className="font-display italic">Diploma colgado en la pared</span>{" "}
              vs. credencial que aguanta una auditoría
            </h2>
            <p className="mt-3 text-[15px] text-slate-600">
              Hay muchos cursos. Muy pocos terminan en algo que un auditor de
              la Súper, un cliente nuevo o un reclutador puedan verificar
              ellos mismos. Esta es la diferencia, punto por punto.
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-12 px-4 py-3 sm:col-span-4 sm:py-4">Criterio</div>
              <div className="col-span-6 px-4 py-3 sm:col-span-4 sm:py-4">Curso o constancia común</div>
              <div className="col-span-6 border-l border-slate-200 px-4 py-3 text-brand-800 sm:col-span-4 sm:py-4">
                Certificación CIOC · {BRAND.shortName}
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
            Si su programa actual tiene todas las columnas verdes, perfecto.
            Si no — hablemos.
          </p>
        </div>
      </section>

      {/* ════════════════════ NOTA EDITORIAL / ORIGEN ════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-premium sm:p-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
              Carta abierta del equipo
            </p>
            <h2 className="mt-3 font-display text-[1.9rem] leading-[1.18] text-brand-900 sm:text-[2.4rem]">
              &ldquo;Construimos esto porque a nosotros nos hizo falta
              cuando empezamos.&rdquo;
            </h2>

            <div className="mt-8 grid gap-6 text-[15px] leading-relaxed text-slate-700 sm:grid-cols-2">
              <p>
                Durante años acompañamos a oficiales de cumplimiento que
                hacían bien su trabajo, pero no tenían cómo demostrarlo
                cuando llegaba una nueva visita de la Súper, un cambio de
                empleador o una postulación grande. El conocimiento estaba.
                El soporte formal, no.
              </p>
              <p>
                Esta plataforma es nuestra respuesta. Una credencial digital,
                construida bajo {BRAND.isoNorm}, con examen serio, QR
                público y vigencia controlada — para que el trabajo bien
                hecho no se pierda en una hoja sin sello.
              </p>
            </div>

            <hr className="dashed-rule my-8" />

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="handwritten text-[28px] leading-none text-brand-900">Equipo {BRAND.shortName}</p>
                <p className="mt-1 text-xs text-slate-500">Compliance · SARLAFT · SAGRILAFT · Debida diligencia · {BRAND.address}</p>
              </div>
              <Link href={CTAS.contact.href} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-900">
                <Icon.Handshake size={18} /> Hablar con nosotros
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
              Cómo funciona, sin letra menuda
            </p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">
              Diez pasos desde &ldquo;quiero certificarme&rdquo; hasta el QR en el LinkedIn
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Tiempo total medio: una semana hábil. Sin filas, sin
              fotocopias, sin viajar.
            </p>
          </div>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-premium">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-600">Paso {s.n}</div>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">Examen, no formulario</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">
              Si la prueba es seria, el certificado pesa
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              Cada candidato presenta sobre un banco aleatorio de preguntas, con
              su nombre marcado en pantalla, tiempo por pregunta y registro de
              todo lo que pasa durante el examen. No es trivia: es evaluación
              real.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                ["Bolt", "Preguntas aleatorias por banco y nivel de dificultad"],
                ["Clock", "Tiempo controlado con guardado automático"],
                ["Check", "Calificación automática + manual con rúbricas"],
                ["Lock", "Marca de agua personal + bloqueo de PrintScreen"],
                ["Eye", "Registro de salidas de pantalla y foco"],
                ["Handshake", "Revisión por evaluador y comité cuando aplique"],
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
              Diploma final
            </span>
            <h2 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">
              <span className="font-display italic">Diseñado para imprimirlo</span> y
              enmarcarlo — o para colgarlo en su firma de correo
            </h2>
            <p className="mt-3 text-[15px] text-slate-600">
              Cada certificado emitido por {BRAND.shortName} S.A.S. lleva
              código único, QR de verificación, firma autorizada y la marca
              institucional. Inspira confianza ante empleadores, clientes y
              autoridades.
            </p>
          </div>
          <div className="mt-12">
            <CertificateGallery />
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link href={CTAS.verify.href} className="rounded-lg bg-brand-800 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-900">
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
            <Icon.QR size={12} /> Verificación pública abierta
          </span>
          <h2 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">
            ¿Le pasaron un certificado? Confírmelo en diez segundos
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Empresas, empleadores, clientes y entes de control validan
            cualquier certificado emitido por {BRAND.shortName} con solo el
            código o el QR del documento.
          </p>
          <form action="/verificar" method="get" className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
            <input
              name="code"
              required
              placeholder="Ingrese el código (p. ej. CERT-2026-XXXX)"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
            <button type="submit" className="rounded-lg bg-brand-800 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-900">Verificar</button>
          </form>
          <p className="mt-3 text-xs text-slate-400">También puede escanear el QR impreso en el diploma.</p>
        </div>
      </section>

      {/* ════════════════════ RECERTIFICACIÓN ════════════════════ */}
      <section className="bg-premium-grid">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">Vigencia bajo control</p>
              <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">
                Su certificado no se le vence a la mala
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Una competencia profesional se mantiene. Por eso el sistema
                cuenta los meses por usted y le abre la puerta para
                recertificarse antes de que el diploma quede en rojo.
              </p>
              <Link href={CTAS.certifications.href} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:text-brand-900">
                Ver mis opciones de recertificación →
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
              {[
                { I: Icon.Bell, t: "Avisos 90, 60 y 30 días antes" },
                { I: Icon.Mail, t: "Notificaciones por correo electrónico" },
                { I: Icon.Refresh, t: "Renovación digital sin trámites presenciales" },
                { I: Icon.Archive, t: "Histórico permanente de tus certificaciones" },
                { I: Icon.Eye, t: "Estado en tiempo real: vigente, vencido o anulado" },
                { I: Icon.Lock, t: "Confidencialidad y trazabilidad de cada operación" },
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

      {/* ════════════════════ TESTIMONIOS HUMANIZADOS ════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">Lo dicen ellos, no nosotros</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">
              <span className="font-display italic">Tres historias breves</span> de profesionales que ya tienen el papel
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="paper-fold relative flex h-full flex-col rounded-2xl border border-slate-200 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-premium">
                <Icon.Quote size={22} className="text-gold-500" />
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
        </div>
      </section>

      {/* ════════════════════ FAQ ════════════════════ */}
      <section id="faq" className="bg-premium-light">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">Lo que más nos preguntan</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">Preguntas frecuentes</h2>
            <p className="mt-2 text-sm text-slate-600">
              ¿Quedó algo en el aire? Mire la{" "}
              <Link href="/preguntas-frecuentes" className="font-semibold text-brand-800 hover:underline">
                página completa de FAQ
              </Link>{" "}
              o escríbanos por WhatsApp.
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
            {marketing.slogan}
          </p>
          <h2 className="font-display text-3xl leading-tight sm:text-[2.6rem]">
            El próximo nombre verificable puede ser{" "}
            <span className="italic text-gold-400">el suyo</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-200">
            Una semana hábil entre el clic y el diploma. Sin desplazamientos.
            Con el respaldo de {BRAND.shortName} S.A.S.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={CTAS.certify.href} className="rounded-lg bg-gold-500 px-6 py-3 text-sm font-bold text-brand-900 shadow-lg shadow-gold-500/20 hover:bg-gold-400">
              Certifícate ahora
            </Link>
            <Link href={CTAS.register.href} className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Crear mi cuenta
            </Link>
            <Link href={CTAS.certifications.href} className="rounded-lg px-6 py-3 text-sm font-semibold text-cyan-200 hover:text-cyan-100">
              Ver certificaciones disponibles →
            </Link>
          </div>
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
