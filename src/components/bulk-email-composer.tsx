"use client";

import { useActionState, useRef, useState, useEffect, useCallback } from "react";
import { sendBulkEmail } from "@/lib/actions/candidates";
import type { ActionResult } from "@/lib/actions/schemes";

/**
 * Composer enriquecido para envío masivo de correos.
 *
 * Características:
 *  - Variables clickeables como chips: insertan {nombre}, {apellido},
 *    {nombre_completo}, {correo}, {documento}, {organismo}, {fecha} en el
 *    cursor — del asunto o del cuerpo según dónde estaba el foco.
 *  - Editor WYSIWYG (contentEditable + execCommand): negrita, cursiva,
 *    subrayado, color, listas, links. El HTML resultante se sanitiza en
 *    el servidor.
 *  - Picker de emojis con grid de 96 emojis comunes (sin dependencias).
 *  - Adjuntos: input file multi-selección; thumbnails de imágenes con
 *    botón para quitarlas. Envío como base64 JSON.
 *  - Programación: checkbox "Programar envío" + datetime-local. El
 *    server guarda en ScheduledEmail y un cron lo procesa cada minuto.
 *
 * NOTA: execCommand está marcado deprecated pero sigue funcionando en
 * todos los browsers modernos y es la opción más simple para un editor
 * sin dependencias. Si en el futuro queremos features avanzados (tablas,
 * cell merging, etc.) migrar a TipTap.
 */

const VARIABLES = [
  { key: "nombre", label: "Nombre" },
  { key: "apellido", label: "Apellido" },
  { key: "nombre_completo", label: "Nombre completo" },
  { key: "correo", label: "Correo" },
  { key: "documento", label: "Documento" },
  { key: "organismo", label: "Organismo" },
  { key: "fecha", label: "Fecha de hoy" },
] as const;

const EMOJIS = [
  "😀","😃","😄","😁","😊","🙂","😉","😍","🤩","🥳",
  "😎","🤓","🧐","🤔","😅","😇","🤝","👍","👋","🙌",
  "👏","🙏","💪","✍️","✅","☑️","✔️","❌","⚠️","🚨",
  "ℹ️","💡","📌","📍","📎","📋","📅","📆","🗓️","🕐",
  "⏰","⏳","📨","📩","📤","📥","📧","✉️","📬","📭",
  "📞","☎️","📱","💻","🖥️","🖨️","📄","📃","📑","🧾",
  "📊","📈","📉","💰","💳","💵","💸","🏦","🎯","🏆",
  "🎓","🏅","🥇","🥈","🥉","🎉","🎊","🎁","🚀","✨",
  "⭐","🌟","🔥","💯","❤️","🧡","💛","💚","💙","💜",
  "🙋","🙇","🤷","🙆",
];

export function BulkEmailComposer({
  open,
  onClose,
  selected,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(sendBulkEmail, { ok: false });
  const editorRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  // Memoria del último input enfocado (asunto o cuerpo) para insertar
  // variables y emojis donde tenga sentido para el usuario.
  const [focusTarget, setFocusTarget] = useState<"subject" | "body">("body");
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachments, setAttachments] = useState<Array<{
    name: string;
    type: string;
    base64: string;
    size: number;
    preview: string | null;
  }>>([]);
  const [scheduled, setScheduled] = useState(false);
  // Por defecto, +1 hora desde ahora, redondeado a 5 min.
  const [scheduledFor, setScheduledFor] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    const m = d.getMinutes();
    d.setMinutes(m - (m % 5));
    return toLocalDatetime(d);
  });

  // Cierra el dialog cuando el server responde ok.
  useEffect(() => {
    if (state.ok && open) {
      // Pequeña pausa para que el usuario vea el mensaje.
      const t = setTimeout(() => onClose(), 1200);
      return () => clearTimeout(t);
    }
  }, [state.ok, open, onClose]);

  // ─── Helpers de inserción en editor ──────────────────────────────
  const insertHtmlAtCursor = useCallback((html: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ed.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const frag = range.createContextualFragment(html);
      range.insertNode(frag);
      // Mueve el cursor al final del insertado.
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      ed.innerHTML += html;
    }
    // Dispara input para que el form capture el cambio.
    ed.dispatchEvent(new Event("input", { bubbles: true }));
  }, []);

  const insertTextAtSubject = useCallback((text: string) => {
    const inp = subjectRef.current;
    if (!inp) return;
    const start = inp.selectionStart ?? inp.value.length;
    const end = inp.selectionEnd ?? inp.value.length;
    inp.value = inp.value.slice(0, start) + text + inp.value.slice(end);
    inp.focus();
    const pos = start + text.length;
    inp.setSelectionRange(pos, pos);
  }, []);

  const insertVariable = useCallback(
    (varKey: string) => {
      const token = `{${varKey}}`;
      if (focusTarget === "subject") insertTextAtSubject(token);
      else insertHtmlAtCursor(escapeHtml(token));
    },
    [focusTarget, insertHtmlAtCursor, insertTextAtSubject],
  );

  const insertEmoji = useCallback(
    (emoji: string) => {
      if (focusTarget === "subject") insertTextAtSubject(emoji);
      else insertHtmlAtCursor(emoji);
      setShowEmoji(false);
    },
    [focusTarget, insertHtmlAtCursor, insertTextAtSubject],
  );

  // ─── Toolbar: comandos del editor ────────────────────────────────
  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    // execCommand devuelve true en modernos browsers. Lo encapsulamos para
    // poder migrarlo a un comando alternativo en el futuro.
    document.execCommand(cmd, false, val);
  };

  // ─── Adjuntos ────────────────────────────────────────────────────
  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: typeof attachments = [...attachments];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      // 5 MB por archivo
      if (f.size > 5 * 1024 * 1024) {
        alert(`"${f.name}" excede 5 MB y no se adjuntará.`);
        continue;
      }
      const b64 = await fileToBase64(f);
      const preview = f.type.startsWith("image/") ? `data:${f.type};base64,${b64}` : null;
      next.push({ name: f.name, type: f.type, base64: b64, size: f.size, preview });
    }
    setAttachments(next);
  };
  const removeAttachment = (i: number) => {
    setAttachments(attachments.filter((_, idx) => idx !== i));
  };

  // ─── Submit ──────────────────────────────────────────────────────
  // Construye un FormData con el HTML del editor y los adjuntos JSON.
  const handleSubmit = async (formData: FormData) => {
    const html = editorRef.current?.innerHTML ?? "";
    formData.set("bodyHtml", html);
    formData.set(
      "attachments",
      JSON.stringify(
        attachments.map((a) => ({ filename: a.name, contentType: a.type, contentBase64: a.base64 })),
      ),
    );
    formData.set("candidateIds", selected.join(","));
    if (scheduled) {
      // Convierte datetime-local a ISO (tratada como hora local del navegador).
      const iso = new Date(scheduledFor).toISOString();
      formData.set("scheduledFor", iso);
    } else {
      formData.delete("scheduledFor");
    }
    await action(formData);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        action={handleSubmit}
        className="grid max-h-[92vh] w-full max-w-5xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
      >
        {/* ─── Header ─────────────────────────────────────────────── */}
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-brand-900">Enviar correo a {selected.length} candidato(s)</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Editor enriquecido · variables personalizadas · emojis · adjuntos · programación
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-700">✕</button>
        </header>

        {/* ─── Cuerpo ─────────────────────────────────────────────── */}
        <div className="grid gap-4 overflow-auto p-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            {/* Variables clickeables — chips que insertan en cursor */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Insertar variables</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="rounded-full border border-brand-200 bg-white px-2.5 py-1 font-mono text-[11px] text-brand-800 hover:bg-brand-50"
                    title={`Insertar {${v.key}} en ${focusTarget === "subject" ? "el asunto" : "el cuerpo"}`}
                  >
                    {`{${v.key}}`}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] text-slate-400">
                Las variables se reemplazan por los datos reales de cada candidato en el envío.
              </p>
            </div>

            {/* Asunto */}
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Asunto *</span>
              <input
                ref={subjectRef}
                name="subject"
                required
                maxLength={160}
                placeholder="Ej. Hola {nombre}, recordatorio de su inscripción"
                onFocus={() => setFocusTarget("subject")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </label>

            {/* Toolbar del editor */}
            <div>
              <span className="text-xs font-semibold text-slate-700">Mensaje *</span>
              <div className="mt-1 flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-slate-300 bg-slate-50 p-1.5">
                <ToolBtn onClick={() => exec("bold")} title="Negrita (⌘B)"><strong>B</strong></ToolBtn>
                <ToolBtn onClick={() => exec("italic")} title="Cursiva (⌘I)"><em>I</em></ToolBtn>
                <ToolBtn onClick={() => exec("underline")} title="Subrayado (⌘U)"><span className="underline">U</span></ToolBtn>
                <Sep />
                <ToolBtn onClick={() => exec("formatBlock", "h2")} title="Título">H2</ToolBtn>
                <ToolBtn onClick={() => exec("formatBlock", "h3")} title="Subtítulo">H3</ToolBtn>
                <ToolBtn onClick={() => exec("formatBlock", "p")} title="Párrafo">¶</ToolBtn>
                <Sep />
                <ToolBtn onClick={() => exec("insertUnorderedList")} title="Lista">• Lista</ToolBtn>
                <ToolBtn onClick={() => exec("insertOrderedList")} title="Numerada">1. Num.</ToolBtn>
                <Sep />
                <ToolBtn onClick={() => exec("justifyLeft")} title="Izq">⬅</ToolBtn>
                <ToolBtn onClick={() => exec("justifyCenter")} title="Centro">⬌</ToolBtn>
                <ToolBtn onClick={() => exec("justifyRight")} title="Der">➡</ToolBtn>
                <Sep />
                <ToolBtn
                  onClick={() => {
                    const url = prompt("URL del enlace (https://…):");
                    if (url) exec("createLink", url);
                  }}
                  title="Enlace"
                >
                  🔗
                </ToolBtn>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50" title="Color del texto">
                  🎨
                  <input
                    type="color"
                    defaultValue="#0b1d44"
                    onChange={(e) => exec("foreColor", e.target.value)}
                    className="h-0 w-0 opacity-0"
                  />
                </label>
                <Sep />
                {/* Emojis */}
                <div className="relative">
                  <ToolBtn onClick={() => setShowEmoji((v) => !v)} title="Insertar emoji">😀</ToolBtn>
                  {showEmoji ? (
                    <div className="absolute left-0 top-full z-10 mt-1 grid w-[280px] grid-cols-10 gap-0.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => insertEmoji(e)}
                          className="grid h-7 w-7 place-items-center rounded text-base hover:bg-slate-100"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Sep />
                <ToolBtn onClick={() => exec("removeFormat")} title="Quitar formato">⌫</ToolBtn>
              </div>

              {/* Editor contentEditable */}
              <div
                ref={editorRef}
                contentEditable
                role="textbox"
                aria-label="Cuerpo del mensaje"
                onFocus={() => setFocusTarget("body")}
                suppressContentEditableWarning
                className="min-h-[260px] max-h-[400px] overflow-auto rounded-b-lg border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-800 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 [&_a]:text-brand-700 [&_a]:underline [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-brand-900 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-brand-800 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal"
                data-placeholder="Hola {nombre}, le escribimos para…"
              />
            </div>

            {/* Adjuntos */}
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Adjuntos · {attachments.length}</span>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-brand-200 bg-white px-2 py-1 text-[11px] font-semibold text-brand-800 hover:bg-brand-50">
                  📎 Adjuntar archivos
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </label>
              </div>
              {attachments.length > 0 ? (
                <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {attachments.map((a, i) => (
                    <li key={i} className="relative flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-1.5">
                      {a.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.preview} alt={a.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded bg-white text-base ring-1 ring-slate-200">📄</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold text-slate-700">{a.name}</div>
                        <div className="text-[10px] text-slate-400">{formatBytes(a.size)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white"
                        aria-label="Quitar"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] text-slate-400">
                  Sin adjuntos. Máximo 5 MB por archivo, 12 MB en total. Acepta imágenes y PDF.
                </p>
              )}
            </div>

            {/* Programación */}
            <div className="rounded-lg border border-slate-200 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={scheduled}
                  onChange={(e) => setScheduled(e.target.checked)}
                />
                <span className="font-semibold text-slate-700">⏰ Programar envío</span>
              </label>
              {scheduled ? (
                <div className="mt-2">
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    El correo se enviará automáticamente a la hora indicada (zona horaria del navegador).
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">Sin programar — se enviará inmediatamente al pulsar “Enviar”.</p>
              )}
            </div>
          </div>

          {/* ─── Panel lateral: vista previa + ayuda ──────────── */}
          <aside className="hidden flex-col gap-3 lg:flex">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Destinatarios</div>
              <div className="mt-1 text-2xl font-bold text-brand-900">{selected.length}</div>
              <p className="mt-1 text-[11px] text-slate-500">
                Candidato(s) seleccionado(s). Cada uno recibe el correo con sus variables personalizadas.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
              <div className="font-bold text-slate-700">💡 Consejo</div>
              <ul className="mt-1 list-disc pl-4 leading-snug">
                <li>Haga clic en una variable para insertarla donde tenga el cursor.</li>
                <li>El emoji 😀 abre el selector con 96 caritas comunes.</li>
                <li>Use el color picker para resaltar texto.</li>
                <li>Adjunte imágenes desde su computador.</li>
                <li>Programe el envío para una fecha y hora futura.</li>
              </ul>
            </div>
          </aside>
        </div>

        {/* ─── Footer ─────────────────────────────────────────────── */}
        <footer className="border-t border-slate-200 px-6 py-4">
          {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
          {state.ok ? <p className="text-xs text-emerald-700">{state.message ?? "Enviado."}</p> : null}
          <div className="mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cerrar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg btn-grad-navy px-5 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60"
            >
              {pending ? (scheduled ? "Programando…" : "Enviando…") : (scheduled ? "📆 Programar envío" : "📨 Enviar ahora")}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

/** Botón de la toolbar del editor. Reusable. */
function ToolBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}
function Sep() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-slate-200" />;
}

// ─── Utilidades ────────────────────────────────────────────────────
function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result ?? "");
      // dataURL → solo la parte base64
      const ix = s.indexOf("base64,");
      resolve(ix >= 0 ? s.slice(ix + 7) : s);
    };
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function toLocalDatetime(d: Date): string {
  // Formato "YYYY-MM-DDTHH:mm" que requiere input[type=datetime-local].
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
