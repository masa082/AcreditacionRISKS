import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Verificación de certificados" };

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "CIOC";

async function search(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim();
  if (code) redirect(`/verificar/${encodeURIComponent(code)}`);
}

export default function VerificarPage() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex flex-col leading-none">
            <span className="text-lg font-bold text-brand-800">{APP_NAME}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">
              Certificado de Idoneidad como Oficial de Cumplimiento
            </span>
          </Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-brand-800">
            Ingresar
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">
          Verificar autenticidad de un certificado
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Ingrese el código del certificado (impreso en el documento o
          codificado en el QR) para validar su estado y vigencia.
        </p>

        <form action={search} className="mt-6 flex gap-2">
          <input
            name="code"
            required
            placeholder="Ej. CERT-2026-XXXX"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
          >
            Verificar
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400">
          Esta verificación es pública y no expone datos personales sensibles
          del titular.
        </p>
      </div>
    </main>
  );
}
