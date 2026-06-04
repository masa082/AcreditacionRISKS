"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitFeedback } from "@/lib/actions/feedback";
import type { ActionResult } from "@/lib/actions/schemes";

/// Botón flotante global de feedback. Se ancla al lateral derecho en
/// bottom-24 para no tapar el botón de WhatsApp (que usa bottom-6).
/// Cuando se pulsa abre un modal donde el usuario describe la idea o
/// reporte, elige una categoría y opcionalmente adjunta capturas/fotos.
/// Cada envío crea un ticket en /admin/feedback.
export function FeedbackButton({
  authenticated,
  initialName,
  initialEmail,
}: {
  authenticated: boolean;
  initialName?: string;
  initialEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-24 z-40 inline-flex items-center gap-2 rounded-full bg-violet-700 px-4 py-3 text-sm font-bold text-white shadow-lg ring-2 ring-white transition hover:bg-violet-800 hover:shadow-xl sm:right-6"
        title="Enviar feedback al equipo de la plataforma"
        aria-label="Enviar feedback"
      >
        <span aria-hidden className="text-lg leading-none">💬</span>
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open ? (
        <FeedbackModal
          onClose={() => setOpen(false)}
          authenticated={authenticated}
          initialName={initialName}
          initialEmail={initialEmail}
        />
      ) : null}
    </>
  );
}

interface FilePreview { file: File; url: string }

const CATEGORIES: { value: string; label: string; emoji: string; hint: string }[] = [
  { value: "SUGGESTION",  label: "Sugerencia",        emoji: "💡", hint: "Una idea para que la plataforma funcione mejor" },
  { value: "IMPROVEMENT", label: "Aspecto por mejorar", emoji: "🛠", hint: "Algo que ya existe pero podría ser mejor" },
  { value: "DEVELOPMENT", label: "Idea de desarrollo", emoji: "🚀", hint: "Una funcionalidad nueva que le gustaría ver" },
  { value: "BUG",         label: "Reporte de error",   emoji: "🐞", hint: "Algo no está funcionando como debería" },
  { value: "PRAISE",      label: "Felicitación",       emoji: "🎉", hint: "Cuéntenos qué funcionó bien y le gustó" },
  { value: "OTHER",       label: "Otro",               emoji: "💬", hint: "Cualquier otro comentario" },
];

function FeedbackModal({
  onClose,
  authenticated,
  initialName,
  initialEmail,
}: {
  onClose: () => void;
  authenticated: boolean;
  initialName?: string;
  initialEmail?: string;
}) {
  const [state, action, pending] = useActionState<ActionResult & { ticketNumber?: number }, FormData>(
    submitFeedback,
    { ok: false },
  );
  const [category, setCategory] = useState("SUGGESTION");
  const [files, setFiles] = useState<FilePreview[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextUrl, setContextUrl] = useState<string>("");

  // Url actual donde se está enviando el feedback (útil para el equipo)
  useEffect(() => {
    try { setContextUrl(window.location.href); } catch { /* ignore */ }
  }, []);

  // Pegar capturas desde el portapapeles (Ctrl+V / Cmd+V) dentro del modal
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const next: FilePreview[] = [];
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) next.push({ file: f, url: URL.createObjectURL(f) });
        }
      }
      if (next.length > 0) {
        setFiles((prev) => [...prev, ...next].slice(0, 5));
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  // Esc para cerrar
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pickFiles(list: FileList | File[] | null) {
    if (!list) return;
    const next: FilePreview[] = [];
    const arr = Array.from(list);
    for (const f of arr) {
      if (!/^image\/|^application\/pdf$/.test(f.type)) continue;
      next.push({ file: f, url: URL.createObjectURL(f) });
    }
    setFiles((prev) => [...prev, ...next].slice(0, 5));
  }
  function removeFile(i: number) {
    setFiles((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(i, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return copy;
    });
  }

  // Drag & drop
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    function onDragOver(e: DragEvent) { e.preventDefault(); el!.classList.add("ring-2", "ring-violet-300"); }
    function onDragLeave() { el!.classList.remove("ring-2", "ring-violet-300"); }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      el!.classList.remove("ring-2", "ring-violet-300");
      if (e.dataTransfer?.files) pickFiles(e.dataTransfer.files);
    }
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  if (state.ok) {
    return (
      <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl">🎉</div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">¡Gracias por su feedback!</h2>
          <p className="mt-2 text-sm text-slate-600">{state.message ?? "Su mensaje fue enviado al equipo."}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-lg btn-grad-navy px-4 py-2.5 text-sm font-semibold text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const selected = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-violet-50 px-5 py-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span aria-hidden>💬</span> Enviar feedback al equipo
            </h2>
            <p className="text-xs text-slate-600">
              Cada envío crea un <strong>ticket</strong> que llega al SUPERADMIN y le respondemos por correo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form action={action} className="space-y-4 px-5 py-4">
          <input type="hidden" name="contextUrl" value={contextUrl} />
          <input type="hidden" name="category" value={category} />

          {/* Categoría visual */}
          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-wider text-slate-500">Categoría</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => {
                const active = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs transition ${
                      active
                        ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200"
                        : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/40"
                    }`}
                    title={c.hint}
                  >
                    <span aria-hidden className="text-lg leading-none">{c.emoji}</span>
                    <span className={`font-semibold ${active ? "text-violet-900" : "text-slate-700"}`}>{c.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] italic text-slate-500">{selected.hint}</p>
          </fieldset>

          {/* Identidad solo en flujos públicos sin sesión */}
          {!authenticated ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="font-semibold text-slate-700">Su nombre *</span>
                <input
                  type="text"
                  name="authorName"
                  required
                  defaultValue={initialName ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
              </label>
              <label className="block text-xs">
                <span className="font-semibold text-slate-700">Correo para respondernos *</span>
                <input
                  type="email"
                  name="authorEmail"
                  required
                  defaultValue={initialEmail ?? ""}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
              </label>
            </div>
          ) : null}

          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Título breve *</span>
            <input
              type="text"
              name="title"
              required
              minLength={5}
              maxLength={140}
              placeholder="Ej. Sugerencia para el flujo de pago"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
            />
          </label>

          <label className="block text-xs">
            <span className="font-semibold text-slate-700">Mensaje detallado *</span>
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={4000}
              rows={5}
              placeholder="Cuéntenos qué quiere proponer, qué falló o qué le gustó. Sea lo más específico posible."
              className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Tip: si su feedback se refiere a una pantalla, puede pegar una captura con <kbd className="rounded bg-slate-100 px-1 font-mono text-[10px]">Ctrl/Cmd</kbd>+<kbd className="rounded bg-slate-100 px-1 font-mono text-[10px]">V</kbd> dentro de este formulario.
            </p>
          </label>

          {/* Zona de adjuntos */}
          <div>
            <div className="text-xs font-semibold text-slate-700">Adjuntos (capturas, fotos, PDF) — opcional, máx 5 · 10 MB c/u</div>
            <div
              ref={dropRef}
              className="mt-1 cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/60 p-3 text-center text-xs text-slate-500 hover:border-violet-300"
              onClick={() => fileInputRef.current?.click()}
              role="button"
            >
              <input
                ref={fileInputRef}
                type="file"
                name="attachments"
                accept=".png,.jpg,.jpeg,.pdf"
                multiple
                hidden
                onChange={(e) => pickFiles(e.target.files)}
              />
              Arrastre archivos aquí, pulse para seleccionar, o pegue una captura desde el portapapeles.
            </div>
            {files.length > 0 ? (
              <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {files.map((f, i) => (
                  <li key={i} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    {f.file.type.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.url} alt={f.file.name} className="h-20 w-full object-cover" />
                    ) : (
                      <div className="grid h-20 place-items-center bg-slate-50 text-2xl">📄</div>
                    )}
                    <div className="truncate px-1.5 py-1 text-[9px] text-slate-500" title={f.file.name}>{f.file.name}</div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow"
                      title="Quitar"
                      aria-label="Quitar archivo"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {state.error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{state.error}</p>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-500">
              Se enviará la URL actual y el navegador para ayudarnos a entender el contexto. No compartimos sus datos.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60"
              >
                {pending ? "Enviando…" : "Enviar feedback"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
