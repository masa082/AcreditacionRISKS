"use client";

import { useEffect, useRef, useState } from "react";
import { recordAttemptEvent } from "@/lib/actions/attempt";

/// Diálogo modal de honestidad académica que aparece UNA VEZ al inicio
/// del intento (persistencia local por attemptId). El candidato debe
/// marcar 3 declaraciones para iniciar la prueba: no recibir ayudas
/// externas, presentar a conciencia y aceptar el monitoreo.
export function HonestyGate({
  attemptId,
  candidateCode,
}: {
  attemptId: string;
  candidateCode: string;
}) {
  const storageKey = `exam-honesty:${attemptId}`;
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [c, setC] = useState(false);

  useEffect(() => {
    try {
      const accepted = sessionStorage.getItem(storageKey);
      if (!accepted) setOpen(true);
    } catch { setOpen(true); }
  }, [storageKey]);

  if (!open) return null;
  const canStart = a && b && c;

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-amber-50 px-6 py-4">
          <div className="flex items-start gap-3">
            <span aria-hidden className="text-3xl leading-none">🛡️</span>
            <div>
              <h1 className="text-lg font-bold text-amber-900">Compromiso de honestidad académica</h1>
              <p className="text-xs text-amber-800">
                Esta prueba es individual, sin ayudas externas y bajo monitoreo. Lea con atención
                antes de continuar.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5 text-sm text-slate-700">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
            <strong>Su código de candidato</strong> ·{" "}
            <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">{candidateCode}</code>
            <span className="ml-2 text-slate-500">aparecerá como marca de agua durante toda la prueba.</span>
          </p>

          <ul className="space-y-3">
            <li>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={a} onChange={(e) => setA(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600" />
                <span>
                  Declaro que esta evaluación la presento <strong>a conciencia y por mis propios medios</strong>,
                  sin uso de ayudas externas, materiales no autorizados, ni la asistencia de terceros.
                  El uso de cualquier ayuda externa se considerará <strong>fraude</strong> y será causal de
                  anulación del intento.
                </span>
              </label>
            </li>
            <li>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={b} onChange={(e) => setB(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600" />
                <span>
                  Acepto que el sistema <strong>registre eventos de monitoreo</strong>: salida de pantalla,
                  cambio de pestaña, intentos de copia, pulsación de la tecla de captura y tiempo en
                  cada pregunta. Esta información queda asociada a mi intento para auditoría.
                </span>
              </label>
            </li>
            <li>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={c} onChange={(e) => setC(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600" />
                <span>
                  Entiendo que las preguntas y respuestas son <strong>confidenciales</strong> y que la
                  reproducción total o parcial (copias, fotos, capturas, divulgación) está
                  estrictamente prohibida y podrá ser sancionada conforme a las políticas del
                  organismo certificador.
                </span>
              </label>
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <span className="text-[10px] text-slate-500">Pulse Aceptar para iniciar.</span>
          <button
            type="button"
            disabled={!canStart}
            onClick={() => {
              try { sessionStorage.setItem(storageKey, new Date().toISOString()); } catch { /* ignore */ }
              setOpen(false);
            }}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white shadow hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Aceptar y comenzar
          </button>
        </div>
      </div>
    </div>
  );
}

/// Banner discreto fijo arriba con el aviso de monitoreo activo durante
/// toda la prueba. No depende de modal.
export function MonitoringBanner({ candidateCode }: { candidateCode: string }) {
  return (
    <div className="sticky top-0 z-30 -mx-6 mb-4 border-b border-amber-200 bg-amber-50/90 px-6 py-1.5 text-[11px] font-semibold text-amber-900 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <span aria-hidden>🛡️</span>
          Monitoreo activo · prueba a conciencia, sin ayudas externas.
        </span>
        <span className="font-mono text-[10px] tracking-wider text-amber-700">{candidateCode}</span>
      </div>
    </div>
  );
}

/// Hooks de antifraude que se montan en silencio: detecta intentos de
/// captura de pantalla (PrintScreen), copy/cut, click derecho, posible
/// apertura de DevTools y bloquea el comportamiento por defecto cuando
/// es posible. Cada incidente queda registrado en AttemptEvent.
export function AntifraudHooks({
  attemptId,
  onIncident,
}: {
  attemptId: string;
  onIncident?: (type: string) => void;
}) {
  const lastSent = useRef<Record<string, number>>({});
  function fire(type: string, details?: string) {
    const now = Date.now();
    if (now - (lastSent.current[type] ?? 0) < 800) return;
    lastSent.current[type] = now;
    onIncident?.(type);
    void recordAttemptEvent(attemptId, type, details ? { details } : undefined);
  }

  useEffect(() => {
    // ── 1. Tecla Print Screen ──────────────────────────────────────
    function onKey(e: KeyboardEvent) {
      const key = (e.key || "").toLowerCase();
      // PrintScreen en Windows
      if (key === "printscreen" || e.code === "PrintScreen") {
        // Intentamos limpiar el portapapeles del posible recorte
        navigator.clipboard.writeText("[Prueba CIOC — captura no autorizada]").catch(() => {});
        e.preventDefault();
        fire("print_screen", "PrintScreen");
        return;
      }
      // Cmd/Ctrl + Shift + 3/4/5 en macOS (capturas nativas)
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.shiftKey && ["3", "4", "5"].includes(key)) {
        fire("print_screen", `${e.metaKey ? "Cmd" : "Ctrl"}+Shift+${key}`);
      }
      // Cmd/Ctrl + S (guardar) y Cmd/Ctrl + P (imprimir)
      if (meta && (key === "s" || key === "p")) {
        e.preventDefault();
        fire("print_screen", `${e.metaKey ? "Cmd" : "Ctrl"}+${key.toUpperCase()}`);
      }
    }

    // ── 2. Copy / Cut ─────────────────────────────────────────────
    function onCopy(e: ClipboardEvent) {
      e.preventDefault();
      // Sustituimos el clipboard por un texto inocuo con el código del intento
      try { e.clipboardData?.setData("text/plain", "[Contenido protegido · CIOC]"); } catch {}
      fire("copy");
    }
    function onCut(e: ClipboardEvent) {
      e.preventDefault();
      try { e.clipboardData?.setData("text/plain", "[Contenido protegido · CIOC]"); } catch {}
      fire("cut");
    }

    // ── 3. Click derecho ──────────────────────────────────────────
    function onContext(e: MouseEvent) {
      e.preventDefault();
      fire("context_menu");
    }

    // ── 4. DevTools heuristic (diferencia de tamaño ventana/viewport) ──
    let devToolsOpen = false;
    function devToolsCheck() {
      const threshold = 160;
      const w = window.outerWidth - window.innerWidth;
      const h = window.outerHeight - window.innerHeight;
      const open = w > threshold || h > threshold;
      if (open && !devToolsOpen) {
        devToolsOpen = true;
        fire("dev_tools");
      } else if (!open) {
        devToolsOpen = false;
      }
    }
    const devInt = window.setInterval(devToolsCheck, 1500);

    // ── 5. Bloqueo de selección y drag ────────────────────────────
    document.addEventListener("keydown", onKey);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContext);

    // CSS: deshabilita selección a nivel documento (no afecta inputs)
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none" as unknown as string;

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContext);
      document.body.style.userSelect = prev;
      window.clearInterval(devInt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  return null;
}

/// Hook para medir tiempo del candidato en cada pregunta visible.
/// Cuando cambia la pregunta activa, envía el ms acumulado al server
/// y resetea el cronómetro. Si el intento se descarga (unmount), envía
/// el último delta antes de cerrar.
export function useQuestionTimer({
  attemptId,
  currentQuestionId,
}: {
  attemptId: string;
  currentQuestionId: string | null;
}) {
  const startedAt = useRef<number>(Date.now());
  const lastQ = useRef<string | null>(null);

  useEffect(() => {
    const now = Date.now();
    const previous = lastQ.current;
    const ms = now - startedAt.current;

    if (previous && previous !== currentQuestionId && ms >= 1000) {
      // Disparo el tiempo de la pregunta anterior
      void recordAttemptEvent(attemptId, "question_time", { questionId: previous, ms });
      if (currentQuestionId) {
        void recordAttemptEvent(attemptId, "question_change", { questionId: currentQuestionId });
      }
    }
    lastQ.current = currentQuestionId;
    startedAt.current = now;
  }, [attemptId, currentQuestionId]);

  // Antes de desmontar, registramos el último tramo (submit, recarga, etc.)
  useEffect(() => {
    function flush() {
      const ms = Date.now() - startedAt.current;
      const q = lastQ.current;
      if (q && ms >= 1000) {
        // navigator.sendBeacon no funciona con server actions, pero el
        // fetch en visibilitychange suele alcanzar a salir antes de unload.
        void recordAttemptEvent(attemptId, "question_time", { questionId: q, ms });
      }
    }
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
    };
  }, [attemptId]);
}
