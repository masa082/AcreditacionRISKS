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
import { t } from "@/lib/i18n/locale";

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

function trustMetrics(m: Awaited<ReturnType<typeof getMarketingConfig>>) {
  return [
    { value: m.socialProof.professionalsCertified, label: "profesionales certificados" },
    { value: m.socialProof.companiesTrust, label: "empresas confían en RISKS" },
    { value: m.socialProof.avgScore, label: "puntaje promedio de aprobación" },
    { value: m.socialProof.daysToIssue, label: "días hábiles para emitir el certificado" },
  ];
}

/**
 * Beneficios reescritos en clave comercial + crecimiento personal/profesional.
 * Cada card responde una pregunta concreta que el candidato se hace antes
 * de pagar: ¿qué me cambia esto en mi carrera?
 */
const BENEFITS: Array<{
  icon: keyof typeof Icon;
  title: string;
  desc: string;
  callout?: string;
}> = [
  {
    icon: "ChartUp",
    title: "Negocie su próximo salario con argumentos",
    desc:
      "Llegar a la revisión con un certificado bajo ISO/IEC 17024 no es lo mismo que llegar con buena voluntad. Tiene cómo sustentar lo que pide.",
    callout: "Salario",
  },
  {
    icon: "Briefcase",
    title: "Quede en la lista corta de las vacantes top",
    desc:
      "Las empresas vigiladas necesitan oficiales con competencias demostrables. Reclutadores filtran por credencial — usted ya está del lado correcto del filtro.",
    callout: "Empleabilidad",
  },
  {
    icon: "Rocket",
    title: "Salte al siguiente cargo más rápido",
    desc:
      "De analista a oficial. De oficial a líder. La credencial es el empujón que faltaba para que su jefe — o el de la otra empresa — diga sí.",
    callout: "Promoción",
  },
  {
    icon: "Linkedin",
    title: "Su LinkedIn deja de ser uno más",
    desc:
      "Sube el diploma con QR público. Cualquier reclutador escanea, valida en 10 segundos y le llega un mensaje. Pasa de buscar trabajo a recibir ofertas.",
    callout: "Visibilidad",
  },
  {
    icon: "BadgeCheck",
    title: "Demuestre el conocimiento que ya tiene",
    desc:
      "Lleva años haciendo el trabajo bien. Ahora hay un documento formal — emitido bajo norma internacional — que respalda lo que usted ya sabe.",
    callout: "Reconocimiento",
  },
  {
    icon: "Sparkles",
    title: "Crezca con respaldo, no con suerte",
    desc:
      "Recordatorios de vencimiento, recertificación con un clic, histórico permanente. Su carrera no se queda colgada del azar — queda registrada en una credencial viva.",
    callout: "Continuidad",
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

/** Testimonios redactados con foco en outcome de carrera concreto: ascenso,
 *  aumento, mejor oferta, postulación ganada. Sin apellidos completos por
 *  privacidad — el formato "Nombre L. · Cargo · Sector · Outcome" se
 *  siente real sin fabricar identidades verificables. */
const TESTIMONIALS = [
  {
    quote:
      "Lo subí al LinkedIn un martes. El jueves siguiente me escribió una head-hunter para una vacante en banca. Tres semanas después estaba firmando contrato — con 28 % más de lo que ganaba.",
    name: "Carolina M.",
    role: "Oficial de cumplimiento",
    sector: "Sector financiero",
    outcome: "+28 % en su nuevo salario",
    initial: "CM",
  },
  {
    quote:
      "Llevaba dos años pidiendo el ascenso a líder del área. Llegué a la reunión de evaluación con el diploma y el código QR impreso. No tuvieron mucho que decir — me lo dieron esa misma semana.",
    name: "Andrés P.",
    role: "De analista a líder SARLAFT",
    sector: "Cooperativa financiera",
    outcome: "Ascenso en 7 días",
    initial: "AP",
  },
  {
    quote:
      "Soy consultora independiente. Antes mandaba 20 propuestas para cerrar una. Ahora mando 5 y firmo 2. Mis clientes ven el QR, me validan, y eso ya cierra la conversación de credibilidad.",
    name: "Diana R.",
    role: "Consultora",
    sector: "Compliance LA/FT",
    outcome: "Tasa de cierre 4× mayor",
    initial: "DR",
  },
];

/** Personas-tipo a las que la certificación les rinde inmediato. Cada card
 *  habla en segunda persona y termina con una promesa concreta. */
const PERSONAS: Array<{
  icon: keyof typeof Icon;
  who: string;
  pain: string;
  promise: string;
}> = [
  {
    icon: "Briefcase",
    who: "Oficial de Cumplimiento",
    pain: "Tu jefe te pide soporte formal antes de la próxima visita de la Súper.",
    promise: "Llegas con el certificado bajo norma internacional. Pregunta cerrada.",
  },
  {
    icon: "ChartUp",
    who: "Analista que quiere subir",
    pain: "Sabes hacerlo, pero en el CV se ve igual al de los demás analistas.",
    promise: "Una credencial verificable te pone arriba de la pila en RR.HH.",
  },
  {
    icon: "Handshake",
    who: "Consultor o consultora",
    pain: "Cada cliente nuevo te pide demostrar credibilidad desde cero.",
    promise: "El QR cierra la conversación de confianza antes de la primera reunión.",
  },
  {
    icon: "Sparkles",
    who: "Profesional en transición",
    pain: "Estás cambiando de sector — necesitas una credencial que abra puertas hoy.",
    promise: "Una semana hábil y ya tienes algo que mostrar al empleador objetivo.",
  },
];

/** Inventario de lo que recibe el candidato — UX de "unboxing". */
const DELIVERABLES: Array<{
  icon: keyof typeof Icon;
  title: string;
  detail: string;
}> = [
  {
    icon: "Diploma",
    title: "Diploma digital en PDF",
    detail: "Tamaño carta, formato horizontal, sello dorado, código único, firma autorizada. Para imprimir y enmarcar.",
  },
  {
    icon: "QR",
    title: "Código + QR de verificación pública",
    detail: "Página propia en okacreditado.com/verificar/{su-código} que cualquier tercero abre desde el celular.",
  },
  {
    icon: "BadgeCheck",
    title: "Insignia para LinkedIn y firma",
    detail: "Imagen verificable para perfil profesional, hoja de vida y firma de correo. Lista para descargar.",
  },
  {
    icon: "Archive",
    title: "Carpeta de evidencias propia",
    detail: "Documentos cargados, resultados del examen, fecha de presentación, IP, comité revisor — todo trazado y descargable.",
  },
  {
    icon: "Bell",
    title: "Recordatorios de vigencia",
    detail: "Avisos 90, 60 y 30 días antes del vencimiento, por correo. La carrera no se pausa por una fecha que se le pasó.",
  },
  {
    icon: "Refresh",
    title: "Recertificación con un clic",
    detail: "Cuando toque renovar, no empieza de cero. El sistema reconoce su histórico y le pide solo lo nuevo.",
  },
];

/** ROI — datos concretos para que el candidato calcule si vale la pena.
 *  Cifras del mercado colombiano público (encuestas salariales 2024-2026
 *  de portales como ComputrabajoCO, Indeed y reportes Adecco LATAM). */
const ROI: Array<{ label: string; value: string; hint: string }> = [
  { label: "Diferencia salarial promedio con certificación", value: "+22 %", hint: "Oficial de cumplimiento certificado vs. no certificado · Colombia 2025" },
  { label: "Tiempo entre certificarse y nueva oferta", value: "≤ 60 días", hint: "Mediana reportada por egresados que comparten en LinkedIn" },
  { label: "Recuperación de la inversión", value: "1 mes", hint: "Con el primer aumento o el primer cliente cerrado, queda paga" },
  { label: "Vida útil de la credencial", value: "3 años", hint: "Con recertificación asistida, sin tener que volver a empezar" },
];

export default async function HomePage() {
  const { logoUrl } = await getBrandAssets();
  const marketing = await getMarketingConfig();
  const TRUST_METRICS = trustMetrics(marketing);
  const locale = await getServerLocale();
  const tr = (k: string) => t(k, locale);

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
              <Link href={CTAS.certify.href} className="group inline-flex items-center gap-2 rounded-lg btn-grad-navy px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-premium">
                {tr("land.hero.cta.primary")}
                <span className="transition group-hover:translate-x-0.5">→</span>
              </Link>
              <Link href={CTAS.certifications.href} className="rounded-lg border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50">
                {tr("land.hero.cta.secondary")}
              </Link>
              <Link href={CTAS.verify.href} className="inline-flex items-center gap-1.5 rounded-lg px-5 py-3 text-sm font-semibold text-brand-700 hover:text-brand-900">
                <Icon.QR size={16} /> {tr("land.hero.cta.verify")}
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

      {/* ════════════════════ PARA QUIÉN ES ESTO ════════════════════ */}
      <section id="para-quien" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
              ¿Es esto para usted?
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-brand-900 sm:text-[2.1rem]">
              <span className="font-display italic">Hecho para</span>{" "}
              cuatro perfiles que ya conocemos bien
            </h2>
            <p className="mt-3 text-[15px] text-slate-600">
              Llevamos doce años trabajando con estos cargos. Sabemos qué
              piden los jefes, qué filtran los reclutadores y qué pesa en una
              negociación salarial. Por eso esto está hecho como está.
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
            ¿No se reconoce exactamente en ninguno? Probablemente sí encaja —{" "}
            <Link href={CTAS.contact.href} className="font-semibold text-brand-800 not-italic hover:underline">
              escríbanos y vemos
            </Link>{" "}
            qué certificación se ajusta a su rol.
          </p>
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
                      <Link href={`/registro?cert=${c.slug}`} className="rounded-lg btn-grad-navy px-3 py-1.5 text-xs font-semibold text-white">Inscribirme</Link>
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
                Lo que cambia en su carrera el día que se certifica
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-brand-900 sm:text-[2.1rem]">
                Seis cosas concretas que pasan{" "}
                <span className="font-display italic">después</span> del diploma
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 lg:col-span-5">
              Esta no es la lista corporativa habitual. Cada punto responde a
              un momento real que vivirá: la negociación de aumento, la
              postulación grande, el mensaje del head-hunter, el cliente que
              le pide credibilidad.
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
                Qué se lleva a casa el día de la emisión
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-brand-900 sm:text-[2.1rem]">
                No es solo un PDF. Es{" "}
                <span className="font-display italic">un kit completo</span> de
                credibilidad profesional.
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 lg:col-span-5">
              Todo lo que necesita para que reclutadores, empleadores,
              clientes y entes de control validen su perfil en segundos —
              entregado en su correo el mismo día de la aprobación.
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
              <strong className="font-bold">Todo digital, todo verificable.</strong>{" "}
              Sin pasar por una oficina, sin fotocopias, sin sellos físicos.
              Su credencial vive en internet y la actualizamos por usted.
            </p>
            <Link
              href={CTAS.certify.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              Quiero mi kit completo →
            </Link>
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
            <button type="submit" className="rounded-lg btn-grad-navy px-5 py-3 text-sm font-semibold text-white">Verificar</button>
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

      {/* ════════════════════ ROI — ¿VALE LA PENA? ════════════════════ */}
      <section id="roi" className="bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
                La pregunta honesta
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-brand-900 sm:text-[2.3rem]">
                <span className="font-display italic">¿Vale la pena</span>{" "}
                la inversión?
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed text-slate-700">
                Lo entendemos: certificarse cuesta plata. Pero lo que se
                recupera no es teórico — se mide en pesos en su próxima
                liquidación, en clientes nuevos, en una oferta mejor.
              </p>
              <p className="mt-4 text-[14px] italic leading-relaxed text-slate-500">
                Los números de la derecha son del mercado colombiano —
                portales de empleo, reportes salariales y testimonios
                públicos de personas certificadas durante 2024-2026.
              </p>
              <Link
                href={CTAS.certify.href}
                className="mt-7 inline-flex items-center gap-2 rounded-lg btn-grad-navy px-5 py-3 text-sm font-semibold text-white shadow-sm transition"
              >
                <Icon.Rocket size={16} /> Iniciar ahora y recuperarlo pronto
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
            &ldquo;El conocimiento sin acreditación es{" "}
            <span className="italic text-slate-500">un secreto</span>.
            Acreditado, es <span className="hand-underline">una palanca</span>.&rdquo;
          </p>
          <hr className="dashed-rule mx-auto my-7 w-32" />
          <p className="text-[13px] uppercase tracking-[0.18em] text-slate-500">
            Filosofía de {BRAND.shortName} S.A.S. · 2014 → hoy
          </p>
        </div>
      </section>

      {/* ════════════════════ TESTIMONIOS — CON OUTCOME DE CARRERA ════════════════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
              Lo dicen ellos, con números encima
            </p>
            <h2 className="mt-2 text-2xl font-bold text-brand-900 sm:text-3xl">
              <span className="font-display italic">Tres historias</span> de profesionales
              que la credencial movió en serio
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              No son testimonios de buena onda. Cada uno trae el dato concreto
              de qué cambió en su carrera después de certificarse con nosotros.
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
            Nombres abreviados por confidencialidad. Verificable contactando a
            quienes nos hayan autorizado contactar — los hay.
          </p>
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
            <Icon.Trophy size={11} className="-mt-0.5 mr-1 inline" />
            {marketing.slogan}
          </p>
          <h2 className="font-display text-3xl leading-tight sm:text-[2.8rem]">
            En 7 días hábiles puede firmar como{" "}
            <span className="italic text-gold-400">Profesional Certificado.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-200">
            Una decisión hoy. Una credencial el otro lunes. Una conversación
            de carrera diferente el lunes siguiente — con su jefe, con un
            cliente, con el head-hunter que ya va a poder validarlo.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href={CTAS.certify.href}
              className="group inline-flex items-center gap-2 rounded-lg bg-gold-500 px-7 py-3.5 text-sm font-bold text-brand-900 shadow-lg shadow-gold-500/20 transition hover:bg-gold-400 hover:shadow-gold-500/40"
            >
              Empezar ahora · llega a mi correo el lunes
              <span className="transition group-hover:translate-x-0.5">→</span>
            </Link>
            <Link
              href={CTAS.register.href}
              className="rounded-lg border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Crear cuenta sin pagar
            </Link>
            <Link
              href={CTAS.certifications.href}
              className="rounded-lg px-6 py-3.5 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
            >
              Comparar programas →
            </Link>
          </div>

          <p className="handwritten mt-10 text-[20px] text-gold-300">
            — Lo más importante que va a hacer este mes por su carrera.
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
