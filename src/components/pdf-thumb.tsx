"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Miniatura de un PDF que se renderiza dentro de un <iframe> con el
 * visor nativo del navegador (PDFium en Chrome/Edge, Preview en Safari).
 *
 * IMPORTANTE — por qué se usa CSS transform:scale en vez de un iframe
 * directamente al tamaño deseado:
 *   PDFium se rehúsa a renderizar correctamente cuando el iframe es
 *   muy pequeño (menos de ~300 px de ancho). Para sortearlo, dibujamos
 *   el iframe a tamaño "natural" de PDF (595 px de ancho) y lo
 *   escalamos con transform al tamaño del contenedor padre. Así PDFium
 *   ve un viewport "normal" y rinde la primera página sin problemas.
 *
 * El tamaño del padre se mide con ResizeObserver y se reescala en vivo
 * si el layout cambia (responsivo).
 *
 * Lazy-loaded por IntersectionObserver con rootMargin 200 px para no
 * descargar todos los PDFs al abrir la página.
 *
 * El placeholder 📕 queda detrás del iframe — si el visor falla o el
 * browser bloquea la incrustación, el usuario sigue viendo algo
 * significativo en lugar de un cuadro blanco.
 */
const NATURAL_W = 595;  // ancho "carta/A4" en px que PDFium acepta cómodo
const NATURAL_H = 770;  // alto proporcional para fit-height

export function PdfThumb({ url, alt }: { url: string; alt?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // Lazy-load: solo creamos el iframe cuando el contenedor entra (o se
  // aproxima a) el viewport.
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

  // Medimos el tamaño del contenedor para calcular el factor de escala.
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        if (width > 0 && height > 0) setSize({ w: width, h: height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Parámetros del visor PDF nativo: oculta toolbar y barras, fit-width.
  const src = `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&page=1`;

  // Escala = min(ancho_contenedor/ancho_natural, alto_contenedor/alto_natural)
  // para que la página completa quepa sin overflow visible.
  const scale = size ? Math.min(size.w / NATURAL_W, size.h / NATURAL_H) : 0.25;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-50"
      aria-label={alt}
    >
      {/* Placeholder de fondo — siempre visible. Si el iframe falla, no
          queda un cuadro blanco. */}
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-rose-50 to-rose-100/40 text-4xl">
        📕
      </div>

      {visible ? (
        <iframe
          src={src}
          title={alt ?? "Vista previa"}
          className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
          style={{
            width: NATURAL_W,
            height: NATURAL_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      ) : null}
    </div>
  );
}
