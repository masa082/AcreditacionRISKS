"use client";

export function PrintButton({ label = "Descargar / Imprimir PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-900 print:hidden"
    >
      {label}
    </button>
  );
}
