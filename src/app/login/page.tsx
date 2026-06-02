import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/session";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AcreditaPro";
const HOME: Record<string, string> = {
  PLATFORM: "/admin",
  SUBSCRIBER: "/panel",
  CANDIDATE: "/portal",
};

export const metadata = { title: "Ingresar" };

export default async function LoginPage() {
  const ctx = await getCurrentUser();
  if (ctx) redirect(HOME[ctx.type] ?? "/portal");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 to-brand-600 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            {APP_NAME}
          </Link>
          <p className="mt-1 text-sm text-brand-100">
            Evaluación y certificación de personas · ISO/IEC 17024
          </p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">
            Iniciar sesión
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Acceda a su panel de administración o portal de candidato.
          </p>
          <LoginForm />
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
