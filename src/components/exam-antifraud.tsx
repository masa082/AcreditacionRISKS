"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { recordAttemptEvent, acceptExamConsent } from "@/lib/actions/attempt";

/// Diálogo de consentimiento previo al examen.
///
/// El candidato DEBE marcar las 5 declaraciones y firmar (Aceptar) antes de
/// poder iniciar la prueba. La aceptación se registra server-side en
/// ExamAttempt.consentAcceptedAt + AuditLog (no solo sessionStorage), para
/// que quede trazabilidad ISO/IEC 17024.
///
/// La 5ª declaración cubre la solicitud expresa del organismo: el candidato
/// puede reportar novedades durante la prueba (botón "Reportar novedad").
export function HonestyGate({
  attemptId,
  candidateCode,
  alreadyAccepted = false,
}: {
  attemptId: string;
  candidateCode: string;
  /** Si el server ya tiene consentAcceptedAt no abre el gate. */
  alreadyAccepted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [c, setC] = useState(false);
  const [d, setD] = useState(false);
  const [e, setE] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, startTx] = useTransition();

  useEffect(() => {
    if (!alreadyAccepted) setOpen(true);
  }, [alreadyAccepted]);

  if (!open) return null;
  const canStart = a && b && c && d && e;

  function accept() {
    setErr(null);
    startTx(async () => {
      const res = await acceptExamConsent(attemptId);
      if (!res.ok) {
        setErr(res.error ?? "No se pudo registrar el consentimiento. Intente de nuevo.");
        return;
      }
      setOpen(false);
    });
  }

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-amber-50 px-6 py-4">
          <div className="flex items-start gap-3">
            <span aria-hidden className="text-3xl leading-none">🛡️</span>
            <div>
              <h1 className="text-lg font-bold text-amber-900">Reglas y consentimiento de la evaluación</h1>
              <p className="text-xs text-amber-800">
                Antes de iniciar, lea las 5 declaraciones y márquelas todas. Su aceptación queda
                firmada con fecha y hora en el expediente del intento.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5 text-sm text-slate-700">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
            <strong>Su código de candidato</strong> ·{" "}
            <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">{candidateCode}</code>
            <span className="ml-2 text-slate-500">aparecerá como marca de agua durante toda la prueba.</span>
          </p>

          <ul className="space-y-3">
            <li>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={a} onChange={(ev) => setA(ev.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600" />
                <span>
                  <strong>1. Acepto ser evaluado.</strong> Presento esta evaluación{" "}
                  <strong>a conciencia y por mis propios medios</strong>, sin uso de ayudas externas,
                  materiales no autorizados ni asistencia de terceros. Cualquier ayuda externa será
                  considerada fraude y causal de anulación del intento.
                </span>
              </label>
            </li>
            <li>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={b} onChange={(ev) => setB(ev.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600" />
                <span>
                  <strong>2. Acepto los resultados.</strong> Reconozco que el sistema calculará mi
                  puntaje de forma automática y acepto el resultado obtenido al cierre de la
                  evaluación.
                </span>
              </label>
            </li>
            <li>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={c} onChange={(ev) => setC(ev.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600" />
                <span>
                  <strong>3. Entiendo que mi resultado depende de mis respuestas.</strong> El
                  puntaje refleja exclusivamente lo que yo conteste durante esta presentación; no
                  habrá modificación de la calificación por causas ajenas a la prueba.
                </span>
              </label>
            </li>
            <li>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={d} onChange={(ev) => setD(ev.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600" />
                <span>
                  <strong>4. Acepto el monitoreo y la confidencialidad.</strong> El sistema registra
                  salidas de pantalla, cambios de pestaña, intentos de copia, captura y el tiempo en
                  cada pregunta. Las preguntas y respuestas son confidenciales y su reproducción
                  total o parcial está prohibida.
                </span>
              </label>
            </li>
            <li>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" checked={e} onChange={(ev) => setE(ev.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-600" />
                <span>
                  <strong>5. Puedo reportar novedades durante la prueba.</strong> Si ocurre algún
                  inconveniente (corte de luz, problema técnico, duda), usaré el botón{" "}
                  <em>&ldquo;Reportar novedad&rdquo;</em>. Cada reporte queda registrado con fecha y
                  hora para revisión del organismo.
                </span>
              </label>
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <span className="text-[10px] text-slate-500">
            {err ? <span className="text-rose-700">{err}</span> : "Su aceptación queda firmada server-side."}
          </span>
          <button
            type="button"
            disabled={!canStart || busy}
            onClick={accept}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white shadow hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? "Firmando…" : "Acepto y comienzo la evaluación"}
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
