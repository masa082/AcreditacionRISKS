"use client";

/// Banner de felicitación con confetti y CTA al certificado, que se
/// muestra al candidato la PRIMERA vez que entra al portal después de
/// que se emite su certificado de competencias (type=CERTIFICATION).
///
/// Estrategia: el server le pasa la lista de certificados CERTIFICATION
/// vigentes con su `code`. Guardamos en `localStorage` los códigos ya
/// "celebrados" — si encontramos uno nuevo, animamos. El usuario puede
/// cerrar el banner manualmente; si lo hace, lo marcamos como visto.
///
/// El confetti se dibuja con un <canvas> + raf en ~5 segundos sin
/// dependencias externas (no instalamos `canvas-confetti`).

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface CelebrationCertificate {
  code: string;
  title: string;
  issuedAt: string;
}

const SEEN_KEY = "ciocCelebratedCertCodes";

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(codes: Set<string>): void {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...codes]));
  } catch { /* sin acceso a localStorage — modo incógnito, etc. */ }
}

export function CelebrationBanner({ certificates }: { certificates: CelebrationCertificate[] }) {
  const [toCelebrate, setToCelebrate] = useState<CelebrationCertificate | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Al montar, ver si hay un certificado nuevo no celebrado todavía.
  useEffect(() => {
    if (certificates.length === 0) return;
    const seen = loadSeen();
    const fresh = certificates.find((c) => !seen.has(c.code));
    if (fresh) setToCelebrate(fresh);
  }, [certificates]);

  // Confetti — partículas que caen desde la parte superior. Sin librerías.
  useEffect(() => {
    if (!toCelebrate) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const palette = ["#fbbf24", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ef4444", "#0ea5e9"];
    type Piece = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; color: string; shape: "rect" | "circle" };
    const pieces: Piece[] = Array.from({ length: 160 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * 0.4,
      vx: (Math.random() - 0.5) * 2.5,
      vy: 2 + Math.random() * 3.5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.25,
      size: 6 + Math.random() * 8,
      color: palette[Math.floor(Math.random() * palette.length)],
      shape: Math.random() > 0.4 ? "rect" : "circle",
    }));

    const start = performance.now();
    const duration = 6000;
    let raf = 0;
    const step = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.04; // gravedad
        if (p.y > window.innerHeight + 40) {
          p.y = -20;
          p.x = Math.random() * window.innerWidth;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size / 1.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (elapsed < duration) raf = requestAnimationFrame(step);
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [toCelebrate]);

  function dismiss() {
    if (!toCelebrate) return;
    const seen = loadSeen();
    seen.add(toCelebrate.code);
    saveSeen(seen);
    setToCelebrate(null);
  }

  if (!toCelebrate) return null;

  return (
    <>
      {/* Confetti — pointer-events:none para no bloquear clicks. */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[150]"
      />

      {/* Banner premium con tipografía grande y CTA al certificado. */}
      <section
        role="status"
        aria-live="polite"
        className="mb-6 overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-emerald-50 p-6 shadow-lg ring-2 ring-amber-200"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-3xl" aria-hidden>🎉</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 ring-1 ring-amber-300 animate-pulse">
                ¡Recién emitido!
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
              ¡Felicitaciones! Es ahora un profesional certificado.
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-700">
              Su certificado <strong>{toCelebrate.title}</strong> acaba de ser emitido
              <span className="ml-1 font-mono text-xs text-slate-500">({toCelebrate.code})</span>.
              Es completamente verificable por QR y queda disponible en su portal.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/60 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href="/portal/certificados"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 px-4 py-2 text-sm font-bold text-white shadow hover:from-amber-600 hover:to-amber-800"
          >
            🏆 Ver mi certificado
          </Link>
          <Link
            href={`/verificar/${encodeURIComponent(toCelebrate.code)}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            🔗 Página de verificación pública
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
          >
            ¡Gracias, lo entendí!
          </button>
        </div>
      </section>
    </>
  );
}
