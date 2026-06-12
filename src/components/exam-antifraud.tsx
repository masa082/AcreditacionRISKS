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
                  <strong>4. Acepto el monitoreo, la confidencialidad y la prohibición expresa de
                  grabar/capturar la pantalla.</strong> Durante la evaluación:
                  <ul className="mt-1.5 ml-3 list-disc space-y-0.5 text-[12px] text-amber-900">
                    <li><strong>No es posible salir de la sesión</strong> — cambiar de pestaña,
                    abrir otra ventana o aplicación se considerará <strong>abandono de la
                    prueba</strong>. Tras 3 salidas el intento se cierra automáticamente.</li>
                    <li><strong>Prohibido grabar video, capturar pantalla, fotografiar o
                    reproducir el contenido</strong> por cualquier medio (atajos del SO,
                    aplicaciones de terceros, dispositivos externos). El intento se anula y se
                    aplican las sanciones del esquema.</li>
                    <li>El sistema registra: salidas de pantalla, cambios de pestaña, intentos
                    de copia/captura, atajos de teclado, tiempo en cada pregunta, IP y dispositivo.</li>
                    <li>Las preguntas y respuestas son <strong>confidenciales</strong> — su
                    reproducción total o parcial está prohibida.</li>
                  </ul>
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
    // ── 1. Atajos de teclado de captura / grabación / impresión ─────
    function onKey(e: KeyboardEvent) {
      const key = (e.key || "").toLowerCase();
      const meta = e.metaKey || e.ctrlKey;

      // PrintScreen (Windows). No se puede prevenir el screenshot
      // físico, pero sí limpiar el clipboard y registrar.
      if (key === "printscreen" || e.code === "PrintScreen") {
        navigator.clipboard
          .writeText("[Prueba CIOC — captura no autorizada]")
          .catch(() => {});
        e.preventDefault();
        fire("print_screen", "PrintScreen");
        return;
      }

      // Windows + Shift + S (Snipping Tool moderno). El SO captura el
      // evento ANTES del navegador, pero algunos teclados/IMEs lo dejan
      // pasar. Lo intentamos registrar.
      if (e.shiftKey && (e.metaKey || key === "meta") && key === "s") {
        fire("print_screen", "Win+Shift+S (Snipping Tool)");
      }

      // macOS — Cmd+Shift+3 / 4 (captura), Cmd+Shift+5 (grabar pantalla),
      // Cmd+Shift+6 (Touch Bar), Cmd+Ctrl+Shift+4 (clipboard).
      if (meta && e.shiftKey && ["3", "4", "5", "6"].includes(key)) {
        const isRecord = key === "5";
        const label = `${e.metaKey ? "Cmd" : "Ctrl"}+Shift+${key}`;
        if (isRecord) {
          fire("screen_record_attempt", `${label} (grabación de pantalla)`);
        } else {
          fire("print_screen", label);
        }
        // Cmd+Shift+5 abre el panel de captura — no podemos cancelarlo,
        // pero las otras combinaciones a veces sí.
        if (!isRecord) e.preventDefault();
      }

      // macOS — Cmd+Ctrl+Shift+3/4 (captura al portapapeles).
      if (e.metaKey && e.ctrlKey && e.shiftKey && ["3", "4"].includes(key)) {
        fire("print_screen", `Cmd+Ctrl+Shift+${key} (clipboard)`);
      }

      // Cmd/Ctrl + S (guardar página) y Cmd/Ctrl + P (imprimir).
      if (meta && (key === "s" || key === "p")) {
        e.preventDefault();
        fire("print_screen", `${e.metaKey ? "Cmd" : "Ctrl"}+${key.toUpperCase()}`);
      }

      // Cmd/Ctrl + Shift + S (Firefox screenshot tool).
      if (meta && e.shiftKey && key === "s") {
        fire("print_screen", `${e.metaKey ? "Cmd" : "Ctrl"}+Shift+S (Firefox screenshot)`);
      }

      // F12 / Cmd/Ctrl + Shift + I (DevTools): no podemos bloquear, pero
      // sí registrar la intención.
      if (key === "f12" || (meta && e.shiftKey && (key === "i" || key === "j"))) {
        fire("dev_tools", `tecla ${key.toUpperCase()}`);
      }

      // Windows + G (Game Bar — grabación nativa de Win10/11).
      // En navegador, la tecla Win/Meta NO siempre llega; lo intentamos
      // por si el SO la deja pasar.
      if (key === "g" && e.metaKey) {
        fire("screen_record_attempt", "Win+G (Game Bar)");
      }
    }

    // ── 2. Copy / Cut ─────────────────────────────────────────────
    function onCopy(e: ClipboardEvent) {
      e.preventDefault();
      try { e.clipboardData?.setData("text/plain", "[Contenido protegido · CIOC]"); } catch {}
      fire("copy");
    }
    function onCut(e: ClipboardEvent) {
      e.preventDefault();
      try { e.clipboardData?.setData("text/plain", "[Contenido protegido · CIOC]"); } catch {}
      fire("cut");
    }

    // ── 3. Click derecho y drag ──────────────────────────────────────
    function onContext(e: MouseEvent) {
      e.preventDefault();
      fire("context_menu");
    }
    function onDragStart(e: DragEvent) {
      e.preventDefault();
    }

    // ── 4. DevTools heuristic (diferencia ventana/viewport) ──────────
    let devToolsOpen = false;
    function devToolsCheck() {
      const threshold = 160;
      const w = window.outerWidth - window.innerWidth;
      const h = window.outerHeight - window.innerHeight;
      const open = w > threshold || h > threshold;
      if (open && !devToolsOpen) {
        devToolsOpen = true;
        fire("dev_tools", "diferencia de tamaño viewport");
      } else if (!open) {
        devToolsOpen = false;
      }
    }
    const devInt = window.setInterval(devToolsCheck, 1500);

    // ── 5. beforeunload — advertencia nativa antes de cerrar/navegar ─
    function onBeforeUnload(e: BeforeUnloadEvent) {
      fire("beforeunload_attempt");
      // Mensaje moderno: la mayoría de navegadores ignora el texto
      // personalizado y muestra uno fijo, pero el preventDefault dispara
      // el diálogo "¿Salir del sitio?".
      e.preventDefault();
      e.returnValue = "Hay una evaluación en curso. Si sale, se considerará abandono.";
      return "Hay una evaluación en curso. Si sale, se considerará abandono.";
    }

    // ── 6. Registro de listeners ────────────────────────────────────
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDragStart);
    window.addEventListener("beforeunload", onBeforeUnload);

    // CSS: deshabilita selección y callout móvil. Inputs y textareas
    // tienen `user-select: text` propio, así que no se afectan.
    const prevSelect = document.body.style.userSelect;
    const prevCallout = (document.body.style as CSSStyleDeclaration & {
      webkitTouchCallout?: string;
    }).webkitTouchCallout ?? "";
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none" as unknown as string;
    (document.body.style as CSSStyleDeclaration & {
      webkitTouchCallout?: string;
    }).webkitTouchCallout = "none";

    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.body.style.userSelect = prevSelect;
      (document.body.style as CSSStyleDeclaration & {
        webkitTouchCallout?: string;
      }).webkitTouchCallout = prevCallout;
      window.clearInterval(devInt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  return null;
}

/**
 * Cubierta de seguridad: cuando el navegador pierde el foco (cambio de
 * pestaña, ALT+TAB, abrir otra app), tapamos INMEDIATAMENTE el contenido
 * de la prueba con un panel negro + advertencia.
 *
 * Doble propósito:
 *  - Anti-grabación / anti-screenshot externo: si el candidato alterna
 *    a otra app para grabar/capturar la pantalla, lo que se ve durante
 *    el switch ya no es el examen — es la advertencia.
 *  - Anti-abandono: cada salida cuenta como una "infracción". Al llegar
 *    al tope (`maxIncidents`), el componente avisa al padre vía
 *    `onAbandon()` para que cierre el intento como `forced_abandon`.
 *
 * El candidato debe pulsar "Volver a la prueba" para retomar — la
 * confirmación queda como rastro de que vio la advertencia.
 *
 * En navegadores móviles, `visibilitychange` es la única señal fiable
 * (no hay `blur`). Cubrimos ambas.
 */
export function FocusGuard({
  attemptId,
  maxIncidents = 3,
  onAbandon,
}: {
  attemptId: string;
  /** Tope de infracciones antes de forzar el cierre. */
  maxIncidents?: number;
  /** Callback al superar el tope — el padre debe submit/abandonar. */
  onAbandon?: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  const [count, setCount] = useState(0);
  const lastFireRef = useRef<number>(0);
  const abandonedRef = useRef(false);

  useEffect(() => {
    function trigger(source: "visibility" | "blur") {
      // Dedupe — algunos navegadores disparan blur+visibilitychange a la
      // vez. Solo contamos un incidente por segundo.
      const now = Date.now();
      if (now - lastFireRef.current < 1000) {
        setHidden(true);
        return;
      }
      lastFireRef.current = now;

      setHidden(true);
      setCount((c) => {
        const next = c + 1;
        void recordAttemptEvent(attemptId, "abandonment_warning", {
          details: `salida #${next} por ${source}`,
        });
        // Llegó al tope → señalamos abandono.
        if (next >= maxIncidents && !abandonedRef.current) {
          abandonedRef.current = true;
          void recordAttemptEvent(attemptId, "forced_abandon", {
            details: `tope ${maxIncidents} salidas alcanzado`,
          });
          onAbandon?.();
        }
        return next;
      });
    }

    function onVis() {
      if (document.hidden) trigger("visibility");
    }
    function onBlur() {
      // Filtrar blurs originados por elementos del propio formulario.
      // Solo blur del WINDOW cuenta.
      trigger("blur");
    }

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [attemptId, maxIncidents, onAbandon]);

  if (!hidden) return null;

  const reached = count >= maxIncidents;
  const remaining = Math.max(0, maxIncidents - count);

  return (
    <div
      role="alertdialog"
      aria-modal
      // z-index muy alto + fondo negro opaco. Cubre el examen 100%
      // mientras la pestaña está en background.
      className="fixed inset-0 z-[100] grid place-items-center bg-black/95 p-6 text-white"
    >
      <div className="max-w-xl space-y-4 rounded-2xl border-2 border-rose-500 bg-slate-950 p-8 shadow-2xl">
        <div className="flex items-start gap-4">
          <span aria-hidden className="text-5xl">⚠️</span>
          <div>
            <h2 className="text-2xl font-bold text-rose-300">
              {reached ? "Evaluación cerrada por abandono" : "No puede salir de la prueba"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              Detectamos que cambió de pestaña, abrió otra ventana o intentó
              capturar/grabar la pantalla. Esta acción está prohibida durante
              la evaluación.
            </p>
          </div>
        </div>

        <ul className="space-y-1 rounded-lg bg-rose-950/40 px-4 py-3 text-xs text-rose-100 ring-1 ring-rose-500/40">
          <li>• No abra otras pestañas, ventanas o aplicaciones.</li>
          <li>• No realice capturas de pantalla ni grabaciones.</li>
          <li>• No use el portapapeles, el clic derecho ni atajos de teclado.</li>
          <li>• Las preguntas son confidenciales y su reproducción está prohibida.</li>
        </ul>

        {!reached ? (
          <p className="rounded-lg bg-amber-500/20 px-4 py-3 text-sm font-semibold text-amber-200 ring-1 ring-amber-400/40">
            ⏱ Salidas usadas: <strong>{count}/{maxIncidents}</strong> ·{" "}
            <strong>{remaining}</strong> intento(s) restante(s). Al agotarlas,
            el sistema cierra la evaluación automáticamente y se considerará
            <strong> abandono de la prueba</strong>.
          </p>
        ) : (
          <p className="rounded-lg bg-rose-500/30 px-4 py-3 text-sm font-bold text-rose-100 ring-1 ring-rose-300/50">
            Superó el tope permitido. El sistema está cerrando la evaluación
            como <strong>ABANDONADA</strong>. El intento queda registrado en
            su expediente con la causa y el comité del organismo será
            notificado.
          </p>
        )}

        <button
          type="button"
          disabled={reached}
          onClick={() => setHidden(false)}
          className="w-full rounded-lg bg-rose-600 px-5 py-3 text-base font-bold text-white shadow hover:bg-rose-700 disabled:opacity-60"
        >
          {reached ? "Cerrando…" : "✓ Entendido — Volver a la prueba"}
        </button>

        <p className="text-center text-[10.5px] text-slate-500">
          Cada salida queda registrada con fecha, hora e IP en su expediente
          de auditoría · ISO/IEC 17024
        </p>
      </div>
    </div>
  );
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
