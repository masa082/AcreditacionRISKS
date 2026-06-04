"use client";

export function PrintButton({ label = "Descargar / Imprimir PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg btn-grad-navy px-5 py-2.5 text-sm font-semibold text-white print:hidden"
    >
      {label}
    </button>
  );
}
