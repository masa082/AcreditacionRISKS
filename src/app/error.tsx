"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El detalle del error no se expone al usuario final.
    console.error("App error:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <div className="text-5xl">⚠️</div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Algo salió mal</h1>
        <p className="mt-2 text-sm text-slate-500">
          Ocurrió un error inesperado. Puede intentar de nuevo; si persiste, contacte al soporte.
        </p>
        {error.digest ? <p className="mt-2 font-mono text-xs text-slate-400">Ref: {error.digest}</p> : null}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => reset()} className="rounded-lg btn-grad-navy px-5 py-2.5 text-sm font-semibold text-white">
            Reintentar
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- recarga completa intencional desde el error boundary */}
          <a href="/" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Ir al inicio
          </a>
        </div>
      </div>
    </main>
  );
}
