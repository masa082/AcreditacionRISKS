import Link from "next/link";
import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { CertificateMock } from "@/components/landing/certificate-mock";
import { FAQList } from "@/components/landing/faq";
import { SchemaJsonLd } from "@/components/landing/schema-jsonld";
import { BRAND, CTAS, CERTIFICATIONS, formatCOP } from "@/lib/brand";

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

const TRUST_METRICS = [
  { value: "+10 años", label: "de experiencia en compliance y LA/FT" },
  { value: "100%", label: "evaluaciones digitales y trazables" },
  { value: "QR", label: "certificados verificables públicamente" },
  { value: "ISO/IEC", label: "17024 — principios de certificación" },
];

const BENEFITS = [
  { icon: "📈", title: "Fortalece tu hoja de vida", desc: "Acredita formalmente lo que sabes y diferénciate en el mercado." },
  { icon: "🛡️", title: "Demuestra competencia ante empleadores", desc: "Tu certificado se verifica en línea por terceros." },
  { icon: "🔁", title: "Recibe alertas de recertificación", desc: "Mantén tu vigencia y actualización de conocimientos." },
  { icon: "⚡", title: "Proceso 100% digital", desc: "Inscríbete, paga, presenta y recibe tu certificado en línea." },
  { icon: "🔍", title: "Trazabilidad y antifraude", desc: "Pruebas con control de tiempo, integridad y auditoría." },
  { icon: "🎓", title: "Respaldo institucional", desc: "Emitido por RISKS INTERNATIONAL, con código único." },
];

const STEPS = [
  { n: "01", title: "Crea tu cuenta", desc: "Regístrate con tu correo y datos personales." },
  { n: "02", title: "Autoriza el tratamiento de datos", desc: "Confidencialidad garantizada conforme a la ley." },
  { n: "03", title: "Selecciona la certificación", desc: "Elige el programa alineado a tu rol profesional." },
  { n: "04", title: "Realiza el pago", desc: "Inscripción segura desde la plataforma." },
  { n: "05", title: "Agenda la prueba", desc: "Escoge la fecha y horario disponibles." },
  { n: "06", title: "Presenta la evaluación", desc: "Examen en línea con control de integridad." },
  { n: "07", title: "Recibe tu resultado", desc: "Calificación automática y revisión cuando aplique." },
  { n: "08", title: "Descarga tu diploma", desc: "Certificado en PDF con QR de verificación." },
  { n: "09", title: "Verifica tu certificado", desc: "Cualquier tercero puede validar autenticidad." },
  { n: "10", title: "Recertifícate a tiempo", desc: "El sistema te avisa antes del vencimiento." },
];

const FEATURED_CERTS = CERTIFICATIONS.slice(0, 4);

const HOME_FAQ = [
  { q: "¿Qué es una certificación de competencias?", a: "Es el proceso mediante el cual una entidad evalúa formalmente si una persona cumple con los conocimientos y habilidades de un perfil profesional, bajo los principios de la norma ISO/IEC 17024. Al aprobarlo, recibe un certificado verificable." },
  { q: "¿Cómo puedo certificarme con RISKS INTERNATIONAL?", a: "Crea tu cuenta, elige la certificación de tu interés, paga la inscripción, agenda y presenta la evaluación en línea. Si apruebas, descargas tu diploma con código único y QR." },
  { q: "¿Las pruebas son virtuales?", a: "Sí. Todas las evaluaciones se presentan en una plataforma digital segura, con tiempo controlado, registro de presentación y reglas de antifraude básico." },
  { q: "¿El certificado se puede verificar en línea?", a: "Sí. Cada certificado tiene un código único y QR que cualquier persona puede validar públicamente desde la página de verificación." },
  { q: "¿Cuánto tiempo tiene vigencia la certificación?", a: "La vigencia depende del esquema; los programas principales tienen una validez de 3 años. Antes del vencimiento recibirás recordatorios para iniciar la recertificación." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingHeader />

      {/* HERO */}
      <section className="bg-hero-grad text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              Organismo de Certificación de Personas · {BRAND.isoNorm}
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
              Certifica tus competencias profesionales con <span className="text-cyan-300">RISKS INTERNATIONAL</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-200">
              Presenta evaluaciones digitales, acredita tus conocimientos y obtén certificados verificables que fortalecen tu perfil profesional en cumplimiento, riesgos, debida diligencia y prevención LA/FT.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={CTAS.certify.href} className="rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-gold-500/30 hover:bg-gold-400">
                Iniciar mi certificación
              </Link>
              <Link href={CTAS.certifications.href} className="rounded-lg border border-white/30 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10">
                Ver certificaciones
              </Link>
              <Link href={CTAS.verify.href} className="rounded-lg px-5 py-3 text-sm font-semibold text-cyan-200 hover:text-cyan-100">
                Verificar certificado →
              </Link>
            </div>
            <ul className="mt-8 grid max-w-md grid-cols-2 gap-3 text-xs text-slate-200">
              <li className="flex items-center gap-2"><span className="text-cyan-300">●</span> Certificado QR verificable</li>
              <li className="flex items-center gap-2"><span className="text-cyan-300">●</span> Evaluaciones trazables</li>
              <li className="flex items-center gap-2"><span className="text-cyan-300">●</span> Plataforma segura</li>
              <li className="flex items-center gap-2"><span className="text-cyan-300">●</span> Recertificación automática</li>
            </ul>
          </div>

          <div className="relative">
            <div className="animate-float-soft">
              <CertificateMock />
            </div>
            <div className="absolute -left-4 bottom-6 hidden rounded-xl bg-white p-3 shadow-xl ring-1 ring-slate-200 sm:block">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Estado</div>
              <div className="text-sm font-bold text-emerald-700">✓ Verificado</div>
            </div>
            <div className="absolute -right-2 top-2 hidden rounded-xl bg-white p-3 shadow-xl ring-1 ring-slate-200 sm:block">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Vigencia</div>
              <div className="text-sm font-bold text-brand-800">3 años</div>
            </div>
          </div>
        </div>
      </section>

      {/* AUTORIDAD / CONFIANZA */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Más de una década fortaleciendo sistemas de prevención y cumplimiento
            </h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              {BRAND.shortName} acredita personas que trabajan en compliance, debida diligencia y gestión del riesgo, con procesos trazables, objetivos y respaldados por tecnología.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_METRICS.map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 text-center">
                <div className="text-2xl font-bold text-brand-800">{m.value}</div>
                <div className="mt-1 text-xs leading-snug text-slate-500">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CERTIFICACIONES DESTACADAS */}
      <section id="certificaciones" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Certificaciones profesionales disponibles
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Programas estructurados para acreditar competencias en LA/FT, compliance y debida diligencia.
              </p>
            </div>
            <Link href="/certificaciones" className="text-sm font-semibold text-brand-800 hover:text-brand-900">Ver todas →</Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_CERTS.map((c) => (
              <article key={c.slug} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">{c.category}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">{c.level}</span>
                </div>
                <h3 className="mt-3 text-base font-bold leading-snug text-slate-900">{c.shortName}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-3">{c.description}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-500">
                  <dt>Duración</dt><dd className="text-right font-semibold text-slate-700">{c.durationMin} min</dd>
                  <dt>Vigencia</dt><dd className="text-right font-semibold text-slate-700">{c.validityMonths} meses ({Math.round(c.validityMonths / 12)} años)</dd>
                  <dt>Inversión</dt><dd className="text-right font-semibold text-brand-800">{c.priceCOP ? `${formatCOP(c.priceCOP)} + IVA` : "Consultar"}</dd>
                </dl>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Link href={`/certificaciones/${c.slug}`} className="text-xs font-semibold text-brand-800 hover:underline">Ver detalles</Link>
                  <Link href={`/registro?cert=${c.slug}`} className="rounded-lg bg-brand-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-900">Inscribirme</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section id="beneficios" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">¿Por qué certificarte con RISKS INTERNATIONAL?</h2>
            <p className="mt-3 text-sm text-slate-600">Demuestra a empleadores y clientes que tus competencias están acreditadas y verificadas.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-2xl">{b.icon}</div>
                <h3 className="mt-2 font-bold text-slate-900">{b.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESO 10 PASOS */}
      <section id="proceso" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Proceso de certificación paso a paso</h2>
            <p className="mt-3 text-sm text-slate-600">Diez pasos claros desde el registro hasta la recertificación.</p>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-600">Paso {s.n}</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{s.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* EVALUACIÓN ONLINE */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Evaluaciones digitales seguras y trazables</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              Presenta tus pruebas desde una plataforma intuitiva, segura y trazable, diseñada para evaluar conocimientos, competencias y habilidades de manera objetiva.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Preguntas aleatorias por banco y nivel de dificultad",
                "Tiempo controlado con guardado automático",
                "Calificación automática u manual con rúbricas",
                "Registro de presentación e integridad (antifraude)",
                "Revisión por evaluadores y comité cuando aplique",
                "Resultados digitales con trazabilidad completa",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">✓</span>
                  <span className="text-slate-700">{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
            <div className="rounded-xl bg-white p-5 shadow-inner ring-1 ring-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Examen Teórico — SARLAFT</span>
                <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-rose-700">⏱ 14:32</span>
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-900">
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

      {/* CERTIFICADOS QR */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <CertificateMock tilt={false} />
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Certificados digitales verificables</h2>
            <p className="mt-3 text-slate-200">
              Cada certificado emitido por {BRAND.shortName} cuenta con código único y QR de verificación, permitiendo validar su autenticidad en línea.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-200">
              <li>Código único trazable</li>
              <li>QR de verificación pública</li>
              <li>Fecha de emisión y vigencia</li>
              <li>Estado en tiempo real</li>
              <li>Firma autorizada del organismo</li>
              <li>Histórico de recertificación</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={CTAS.verify.href} className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand-900 hover:bg-slate-100">{CTAS.verify.label}</Link>
              <Link href={CTAS.certify.href} className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">{CTAS.certify.label}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* VERIFICACIÓN PÚBLICA — Form rápido */}
      <section id="verificar" className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Verifica un certificado</h2>
          <p className="mt-2 text-sm text-slate-600">
            Empresas, empleadores, clientes y terceros pueden verificar la autenticidad y vigencia de los certificados emitidos por {BRAND.shortName}.
          </p>
          <form action="/verificar" method="get" className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
            <input
              name="code"
              required
              placeholder="Ingrese el código (p. ej. CERT-2026-XXXX)"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
            <button type="submit" className="rounded-lg bg-brand-800 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-900">Verificar</button>
          </form>
          <p className="mt-3 text-xs text-slate-400">También puede escanear el QR impreso en el diploma.</p>
        </div>
      </section>

      {/* RECERTIFICACIÓN */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Recertificación y control de vigencia</h2>
              <p className="mt-3 text-sm text-slate-600">
                Las competencias profesionales deben mantenerse actualizadas. Por eso, el sistema te notifica cuando tu certificación está próxima a vencer y te permite iniciar la recertificación de forma sencilla.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
              {[
                ["📬", "Recordatorios automáticos antes del vencimiento"],
                ["✉️", "Alertas por correo electrónico"],
                ["🔁", "Renovación digital sin trámites presenciales"],
                ["📜", "Histórico completo de tus certificaciones"],
                ["🟢", "Estado en tiempo real: vigente, vencido o anulado"],
                ["🔒", "Confidencialidad y trazabilidad de toda la operación"],
              ].map(([icon, text]) => (
                <li key={text} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm text-slate-700">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Lo que dicen quienes ya se certificaron</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              { q: "Certificar mis conocimientos me permitió fortalecer mi perfil como oficial de cumplimiento.", by: "Profesional · sector financiero" },
              { q: "La plataforma fue clara, rápida y fácil de usar. La verificación por QR genera mucha confianza.", by: "Oficial de cumplimiento · transporte" },
              { q: "El certificado digital verificable da seguridad ante clientes y empleadores.", by: "Consultora · compliance LA/FT" },
            ].map((t) => (
              <figure key={t.by} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
                <blockquote className="text-sm italic text-slate-700">&ldquo;{t.q}&rdquo;</blockquote>
                <figcaption className="mt-3 text-xs font-semibold text-brand-800">{t.by}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Preguntas frecuentes</h2>
            <p className="mt-2 text-sm text-slate-600">¿Tienes más dudas? Visita la <Link href="/preguntas-frecuentes" className="font-semibold text-brand-800 hover:underline">página completa de preguntas frecuentes</Link>.</p>
          </div>
          <div className="mt-8">
            <FAQList items={HOME_FAQ} />
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-hero-grad text-white">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Da el siguiente paso en tu crecimiento profesional</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-200">
            Certifica tus conocimientos, demuestra tus competencias y fortalece tu perfil con el respaldo de {BRAND.shortName}.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={CTAS.certify.href} className="rounded-lg bg-gold-500 px-6 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-gold-500/30 hover:bg-gold-400">Certifícate ahora</Link>
            <Link href={CTAS.register.href} className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">Crear mi cuenta</Link>
            <Link href={CTAS.certifications.href} className="rounded-lg px-6 py-3 text-sm font-semibold text-cyan-200 hover:text-cyan-100">Ver certificaciones disponibles →</Link>
          </div>
        </div>
      </section>

      <LandingFooter />

      {/* Schema markup: Organization */}
      <SchemaJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: BRAND.legalName,
          alternateName: BRAND.shortName,
          url: BRAND.appUrl,
          logo: `${BRAND.appUrl}/og-default.png`,
          email: BRAND.contactEmail,
          address: BRAND.address,
          sameAs: [BRAND.social.linkedin].filter(Boolean),
          description: BRAND.description,
        }}
      />
    </main>
  );
}
