/// Badge oficial con el logo de ONAC y la leyenda "EN PROCESO DE ACREDITACIÓN
/// ONAC". Pensado para footers públicos (landing) y para el sidebar del panel
/// interno. Si en el futuro RISKS recibe la acreditación, cambiar la leyenda
/// a "ACREDITADO POR ONAC" (con el mismo asset).
///
/// Variantes:
///  - "default": fondo blanco, texto navy (footers de landing claros).
///  - "dark":    fondo dark (slate-900), texto blanco (footer en sección oscura).
///  - "compact": versión pequeña para sidebar.
export function OnacBadge({ variant = "default" }: { variant?: "default" | "dark" | "compact" }) {
  if (variant === "compact") {
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg bg-white p-2 text-center ring-1 ring-slate-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/onac-logo.svg" alt="ONAC" className="h-8 w-auto" />
        <span className="text-[8px] font-bold uppercase leading-tight tracking-[0.15em] text-slate-700">
          En proceso de<br />acreditación ONAC
        </span>
      </div>
    );
  }

  const isDark = variant === "dark";
  return (
    <div
      className={`inline-flex items-center gap-3 rounded-lg border px-3 py-2 ${
        isDark
          ? "border-slate-700 bg-slate-800/60"
          : "border-slate-200 bg-white"
      }`}
      title="Organismo Nacional de Acreditación de Colombia"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/onac-logo.svg" alt="ONAC" className="h-12 w-auto" />
      <div className="leading-tight">
        <div className={`text-[10px] font-extrabold uppercase tracking-[0.2em] ${isDark ? "text-amber-300" : "text-amber-600"}`}>
          En proceso de acreditación
        </div>
        <div className={`text-[9px] uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          Organismo Nacional de Acreditación de Colombia
        </div>
      </div>
    </div>
  );
}
