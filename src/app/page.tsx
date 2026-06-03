import Link from "next/link";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AcreditaPro";

const FEATURES = [
  ["Banco de preguntas", "10 tipos de preguntas, versionado, revisión y aprobación editorial."],
  ["Evaluaciones online", "Temporizador, guardado automático, aleatorización y antifraude básico."],
  ["Pagos integrados", "Inscripción, examen, certificación y recertificación con pasarela."],
  ["Calificación", "Automática para objetivas y manual con rúbricas para abiertas."],
  ["Comité evaluador", "Revisión por terceros, votos, conflicto de interés y actas."],
  ["Certificados y QR", "Emisión de diplomas con verificación pública y control de vigencia."],
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-xl font-bold text-brand-800">{APP_NAME}</div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/verificar" className="text-slate-600 hover:text-brand-800">
              Verificar certificado
            </Link>
            <Link href="/registro" className="text-slate-600 hover:text-brand-800">
              Registrarme
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-brand-800 px-4 py-2 font-semibold text-white hover:bg-brand-900"
            >
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-br from-brand-800 to-brand-600 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            SaaS multitenant · ISO/IEC 17024
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Plataforma de evaluación y certificación de personas
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-brand-100">
            Cree procesos de certificación, administre bancos de preguntas,
            cobre, agende, califique, revise con comité, emita certificados con
            verificación por QR y controle vencimientos — todo en un solo lugar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-white px-5 py-3 font-semibold text-brand-800 hover:bg-brand-50"
            >
              Acceder a la plataforma
            </Link>
            <Link
              href="/verificar"
              className="rounded-lg border border-white/40 px-5 py-3 font-semibold text-white hover:bg-white/10"
            >
              Verificar un certificado
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-slate-900">
          Todo el ciclo de certificación
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, desc]) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="font-semibold text-brand-800">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-slate-500">
          <span>
            © {APP_NAME} · Plataforma de evaluación y certificación bajo los
            principios de la norma ISO/IEC 17024.
          </span>
          <nav className="flex gap-4">
            <Link href="/terminos" className="hover:text-brand-800">Términos</Link>
            <Link href="/privacidad" className="hover:text-brand-800">Privacidad</Link>
            <Link href="/verificar" className="hover:text-brand-800">Verificar certificado</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
