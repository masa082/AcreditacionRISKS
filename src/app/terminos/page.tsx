import Link from "next/link";

export const metadata = { title: "Términos y condiciones" };

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "CIOC";

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-brand-700 hover:underline">← {APP_NAME}</Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Términos y condiciones de uso</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600">
        <p>
          {APP_NAME} es una plataforma SaaS para la evaluación y certificación de personas conforme a los
          principios de la norma ISO/IEC 17024. El uso de la plataforma implica la aceptación de estos términos.
        </p>
        <h2 className="pt-2 text-base font-semibold text-slate-800">1. Objeto</h2>
        <p>
          La plataforma permite a organismos certificadores administrar procesos de evaluación, calificación y
          emisión de certificados, y a los candidatos presentar evaluaciones y obtener certificaciones.
        </p>
        <h2 className="pt-2 text-base font-semibold text-slate-800">2. Cuenta y responsabilidad</h2>
        <p>
          El usuario es responsable de la veracidad de la información suministrada y de la custodia de sus
          credenciales. El pago de derechos de evaluación no garantiza la obtención de la certificación, la cual
          depende del resultado del proceso.
        </p>
        <h2 className="pt-2 text-base font-semibold text-slate-800">3. Confidencialidad e imparcialidad</h2>
        <p>
          El organismo de certificación garantiza la confidencialidad de la información y la imparcialidad del
          proceso de certificación. Cada tipo de certificación es independiente y requiere evidencias específicas.
        </p>
        <h2 className="pt-2 text-base font-semibold text-slate-800">4. Tratamiento de datos</h2>
        <p>
          El tratamiento de datos personales se rige por la <Link href="/privacidad" className="text-brand-700 hover:underline">Política de Privacidad</Link> y la
          normativa aplicable (Ley 1581 de 2012 en Colombia).
        </p>
        <p className="pt-4 text-xs text-slate-400">Documento de demostración. El organismo certificador debe publicar sus términos definitivos.</p>
      </div>
    </main>
  );
}
