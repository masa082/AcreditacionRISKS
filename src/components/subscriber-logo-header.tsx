"use client";

import { useState } from "react";

/// Logo del suscriptor en el header. Si el src no carga (por ejemplo, porque
/// la URL guardada en /panel/organizacion no apunta a un archivo válido o
/// está rota), cae automáticamente a un avatar con la inicial del nombre
/// del organismo. Esto evita el "ícono de imagen rota" en producción.
export function SubscriberLogoHeader({
  src,
  name,
}: {
  src: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        title={`${name} (logo no disponible)`}
        className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500"
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      title={name}
      onError={() => setFailed(true)}
      className="h-10 w-auto rounded border border-slate-200 bg-white object-contain p-0.5"
    />
  );
}
