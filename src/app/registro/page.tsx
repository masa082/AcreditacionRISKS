import Link from "next/link";

export const metadata = { title: "Registro de candidato" };

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AcreditaPro";

export default function RegistroPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <Link href="/" className="text-xl font-bold text-brand-800">
          {APP_NAME}
        </Link>
        <h1 className="mt-6 text-lg font-semibold text-slate-900">
          Registro de candidatos
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          El registro de candidatos (wizard de 14 pasos: cuenta, validación de
          correo, autorización de datos, selección de evaluación, documentos,
          pago y agenda) se habilita en la Fase 3 del desarrollo.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Por ahora puede ingresar con la cuenta de candidato de demostración.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
