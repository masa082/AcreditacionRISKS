"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Miniatura de un PDF que se renderiza dentro de un <iframe> con el
 * visor nativo del navegador. Lazy-loaded por IntersectionObserver para
 * no descargar todos los PDF al abrir la página.
 *
 * UX:
 *  - Mientras no está visible: muestra el ícono placeholder (📕).
 *  - Cuando entra al viewport: crea el iframe que carga el PDF con
 *    parámetros de URL para esconder toolbar/scrollbar y ajustar al
 *    ancho ("FitH").
 *  - El iframe queda en pointer-events:none para que el clic sobre la
 *    tarjeta dispare el link contenedor (abrir en pestaña nueva), en
 *    lugar de pelearse con el visor.
 *  - Si el browser no muestra el PDF (rare en Chrome/Edge/Safari de
 *    escritorio; sí pasa en algunos móviles), el placeholder queda
 *    visible bajo el iframe.
 */
export function PdfThumb({ url, alt }: { url: string; alt?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current || visible) return;
    const el = containerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  // Parámetros del visor de PDF nativo: oculta toolbar y barras, ajusta
  // al ancho. Estos hash params son interpretados por Chrome/Edge.
  const src = `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&page=1`;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-50"
      aria-label={alt}
    >
      {/* Placeholder de fondo — siempre visible para que si el iframe
          tarda o falla, el usuario vea algo significativo. */}
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-rose-50 to-rose-100/40 text-4xl">
        📕
      </div>

      {visible ? (
        <iframe
          src={src}
          title={alt ?? "Vista previa"}
          className="pointer-events-none absolute inset-0 h-full w-full"
          // NOTA: NO se pone sandbox. El visor de PDF integrado de Chrome
          // (PDFium) necesita ejecutar sus propios scripts internos para
          // renderizar el documento; un sandbox restrictivo lo bloquea y
          // muestra el ícono ⚠ de "no se pudo cargar".
          // La seguridad se mantiene porque el archivo viene de nuestro
          // mismo origen (X-Frame-Options: SAMEORIGIN en /api/files/*),
          // y el pointer-events:none del wrapper impide interacción del
          // visor mientras el clic en la tarjeta abre el PDF en pestaña.
        />
      ) : null}
    </div>
  );
}
