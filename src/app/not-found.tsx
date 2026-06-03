import Link from "next/link";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "CIOC";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <div className="text-5xl">🔍</div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Página no encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">La página que busca no existe o fue movida.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-900">
          Volver al inicio de {APP_NAME}
        </Link>
      </div>
    </main>
  );
}
