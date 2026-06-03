import Link from "next/link";
import { activateAccount } from "@/lib/actions/registration";

export const metadata = { title: "Activar cuenta" };

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AcreditaPro";

export default async function ActivatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await activateAccount(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <Link href="/" className="text-xl font-bold text-brand-800">
          {APP_NAME}
        </Link>
        <div
          className={`mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
            result.ok ? "bg-emerald-100" : "bg-rose-100"
          }`}
        >
          {result.ok ? "✅" : "⚠️"}
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">
          {result.ok ? "Activación de cuenta" : "No se pudo activar"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{result.message}</p>
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
