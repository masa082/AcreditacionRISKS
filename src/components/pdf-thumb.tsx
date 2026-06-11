"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Miniatura de un PDF — renderiza la primera página a un <canvas>
 * usando pdf.js (Mozilla) y la muestra como imagen estática.
 *
 * Por qué pdf.js y NO iframe + visor nativo:
 *  - PDFium (Chrome) no rinde bien iframes pequeños y rechaza varias
 *    configuraciones (sandbox, headers, etc.). Ya probamos dos
 *    workarounds y ninguno dio una miniatura confiable.
 *  - pdf.js es JavaScript puro sobre canvas: funciona igual en todos
 *    los navegadores, sin depender de plugins del browser, sin
 *    restricciones de tamaño mínimo y sin issues de headers de seguridad.
 *
 * Costo: hay que descargar el PDF al cliente para renderizarlo. Para
 * mitigarlo:
 *  - Lazy-load por IntersectionObserver (rootMargin 200 px).
 *  - Solo se rinde la primera página y a baja resolución (escala 1.0).
 *  - El bundle de pdf.js se carga por dynamic import — no pesa en SSR
 *    ni en el primer paint de la página.
 *
 * Si la carga o el render fallan (PDF corrupto, red caída, archivo
 * inválido), queda el placeholder 📕 visible — nunca cuadro blanco.
 */
export function PdfThumb({ url, alt }: { url: string; alt?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");

  // Lazy-load: solo iniciamos la descarga + render cuando el contenedor
  // entra (o se aproxima a) el viewport.
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

  // Cuando es visible, descargamos pdf.js (dynamic import) + el PDF y
  // pintamos la primera página al canvas.
  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    let cancelled = false;
    setStatus("loading");

    (async () => {
      try {
        // Dynamic import: pdf.js es pesado y solo se necesita aquí.
        const pdfjsLib = await import("pdfjs-dist");

        // Configurar el worker. El archivo fue copiado a /public en
        // tiempo de build desde node_modules/pdfjs-dist/build/. Es la
        // forma más confiable en Next.js: un asset estático servido por
        // el mismo origen, sin depender de loaders del bundler.
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        const loadingTask = pdfjsLib.getDocument({ url, withCredentials: true });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        // Tamaño de render: el canvas tiene el tamaño del contenedor
        // pero internamente renderizamos a 2x para pantalla retina.
        const container = containerRef.current!;
        const cssW = container.clientWidth || 160;
        const cssH = container.clientHeight || 200;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Escala que hace caber la página completa en el contenedor.
        const viewport1 = page.getViewport({ scale: 1 });
        const scale = Math.min(cssW / viewport1.width, cssH / viewport1.height);
        const viewport = page.getViewport({ scale: scale * dpr });

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas 2d context");

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          // Falla silenciosa: el placeholder queda visible.
          console.warn("PdfThumb render failed:", err);
          setStatus("failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, url]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-50"
      aria-label={alt}
    >
      {/* Placeholder de fondo: visible mientras carga o si falla. */}
      <div
        className={`absolute inset-0 grid place-items-center bg-gradient-to-br from-rose-50 to-rose-100/40 text-4xl transition-opacity ${
          status === "ready" ? "opacity-0" : "opacity-100"
        }`}
      >
        <span aria-hidden>📕</span>
      </div>

      <canvas
        ref={canvasRef}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity ${
          status === "ready" ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
