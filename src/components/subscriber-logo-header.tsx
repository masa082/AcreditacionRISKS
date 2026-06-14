"use client";

import { useState } from "react";

/// Logo del suscriptor en el header. Si el src no carga (por ejemplo, porque
/// la URL guardada en /panel/organizacion no apunta a un archivo válido o
/// está rota), cae automáticamente a un avatar con la inicial del nombre
/// del organismo. Esto evita el "ícono de imagen rota" en producción.
export function SubscriberLogoHeader({
  src,
  name,
  variant = "header",
}: {
  src: string;
  name: string;
  /** "header" = avatar pequeño 40px (esquina superior derecha)
   *  "sidebar" = bloque cuadrado 48px (esquina superior izquierda)
   */
  variant?: "header" | "sidebar";
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    const size = variant === "sidebar" ? "h-12 w-12" : "h-10 w-10";
    return (
      <div
        title={`${name} (logo no disponible)`}
        className={`grid ${size} place-items-center rounded-md border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500`}
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  // Para sidebar y header usamos `w-auto` con un alto fijo: la mayoría
  // de logos corporativos son wordmarks horizontales (RISKS, por ej.
  // viene en 4:3). Forzar 48×48 cuadrado los aplastaba al punto de
  // volverlos ilegibles. Tope de ancho para que no rompa el layout
  // cuando el logo es muy ancho.
  const imgClass =
    variant === "sidebar"
      ? "h-12 w-auto max-w-[160px] rounded-md border border-slate-200 bg-white object-contain p-1"
      : "h-10 w-auto max-w-[140px] rounded border border-slate-200 bg-white object-contain p-0.5";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      title={name}
      onError={() => setFailed(true)}
      className={imgClass}
    />
  );
}
