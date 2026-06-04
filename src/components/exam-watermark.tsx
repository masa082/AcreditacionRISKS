"use client";

/// Capa fija de marcas de agua en grid diagonal que se superpone con
/// opacidad muy baja por encima del contenido del examen. Si alguien
/// toma una captura de pantalla, el código y datos del candidato
/// quedan inscritos en el pixel del screenshot.
export function ExamWatermark({ token }: { token: string }) {
  // Repetimos el token suficientes veces para llenar la pantalla en
  // cualquier resolución. La opacidad muy baja + el blur leve mantiene
  // legibilidad de la pregunta pero deja huella en una captura JPG.
  const repeated = ` ${token}  •  `.repeat(40);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden"
      style={{
        // Mosaico de líneas diagonales con el código del candidato
        background:
          "repeating-linear-gradient(135deg, transparent 0 60px, rgba(15, 23, 42, 0.035) 60px 61px)",
      }}
    >
      <div
        className="absolute inset-0 flex flex-wrap content-around"
        style={{
          transform: "rotate(-22deg) scale(1.25)",
          transformOrigin: "center",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "10px",
          letterSpacing: "0.05em",
          lineHeight: 2.4,
          color: "rgba(15, 23, 42, 0.075)",
          textShadow: "0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="w-full whitespace-nowrap">{repeated}</div>
        ))}
      </div>
    </div>
  );
}
