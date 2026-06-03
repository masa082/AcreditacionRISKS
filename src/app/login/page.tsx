import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/session";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "CIOC";
const HOME: Record<string, string> = {
  PLATFORM: "/admin",
  SUBSCRIBER: "/panel",
  CANDIDATE: "/portal",
};

export const metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const ctx = await getCurrentUser();
  if (ctx) redirect(HOME[ctx.type] ?? "/portal");
  const { reset } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            {APP_NAME}
          </Link>
          <p className="mt-1 text-sm text-brand-100">
            Certificado de Idoneidad como Oficial de Cumplimiento · ISO/IEC 17024
          </p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">
            Iniciar sesión
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Acceda a su panel de administración o portal de candidato.
          </p>
          {reset ? (
            <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
              Su contraseña se actualizó. Inicie sesión con la nueva contraseña.
            </div>
          ) : null}
          <LoginForm />
          <p className="mt-4 text-center text-sm">
            <Link href="/recuperar" className="text-brand-700 hover:underline">
              ¿Olvidó su contraseña?
            </Link>
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-brand-100">
          ¿No tiene cuenta?{" "}
          <Link href="/registro" className="font-semibold underline">
            Regístrese como candidato
          </Link>
        </p>
      </div>
    </div>
  );
}
