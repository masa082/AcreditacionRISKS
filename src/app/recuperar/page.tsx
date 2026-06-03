import Link from "next/link";
import { ForgotForm } from "@/components/forgot-form";

export const metadata = { title: "Recuperar contraseña" };

const APP_NAME = "CIOC";

export default function RecuperarPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <Link href="/" className="text-2xl font-bold tracking-tight">{APP_NAME}</Link>
          <p className="mt-1 text-xs uppercase tracking-wide text-brand-100">
            Certificado de Idoneidad como Oficial de Cumplimiento
          </p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">Recuperar contraseña</h1>
          <p className="mb-6 text-sm text-slate-500">
            Ingrese el correo de su cuenta y le enviaremos las instrucciones para restablecerla.
          </p>
          <ForgotForm />
        </div>
      </div>
    </div>
  );
}
