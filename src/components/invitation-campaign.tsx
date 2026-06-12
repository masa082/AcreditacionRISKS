"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { sendInvitationCampaign, logInvitationWhatsApp } from "@/lib/actions/invitations";
import type { ActionResult } from "@/lib/actions/schemes";

/**
 * UI completa para enviar invitaciones masivas a certificarse por
 * correo y WhatsApp.
 *
 * Tres bloques:
 *   1. Lista de contactos — paste de hoja de cálculo + import desde leads
 *      existentes + edición fila por fila.
 *   2. Plantilla de mensaje — editable, con variables clickeables
 *      ({nombre}, {organismo}, {url_registro}). Asunto + cuerpo HTML
 *      (editor simple WYSIWYG) para correo. Texto plano para WhatsApp.
 *   3. Acciones:
 *      - 📨 Enviar correos (server action sendInvitationCampaign).
 *      - 💬 Generar wa.me — abre uno por uno o todos en pestañas.
 *
 * El parser detecta automáticamente las columnas: si una columna tiene
 * "@" es email; si solo dígitos+espacios es teléfono; el resto es
 * nombre. Soporta tab, coma, punto y coma como separador.
 */

export interface SeedContact {
  name: string;
  email: string;
  phone: string | null;
  sourceLabel: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_VARS = [
  { key: "nombre", label: "Nombre" },
  { key: "nombre_completo", label: "Nombre completo" },
  { key: "correo", label: "Correo" },
  { key: "organismo", label: "Organismo" },
  { key: "fecha", label: "Fecha de hoy" },
  { key: "url_registro", label: "URL de registro" },
  { key: "url_landing", label: "URL de la landing" },
] as const;

const WA_VARS = [
  { key: "nombre", label: "Nombre" },
  { key: "organismo", label: "Organismo" },
  { key: "url_registro", label: "URL de registro" },
];

export function InvitationCampaign({
  orgName,
  seedLeads,
  defaultSubject,
  defaultBodyHtml,
  defaultWhatsApp,
}: {
  orgName: string;
  seedLeads: SeedContact[];
  defaultSubject: string;
  defaultBodyHtml: string;
  defaultWhatsApp: string;
}) {
  // ─── Estado ──────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const editorRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const [waMessage, setWaMessage] = useState(defaultWhatsApp);
  const [focusTarget, setFocusTarget] = useState<"subject" | "body" | "wa">("body");
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    sendInvitationCampaign,
    { ok: false },
  );
  const [waInfo, setWaInfo] = useState<string | null>(null);

  const withEmail = contacts.filter((c) => EMAIL_RX.test(c.email));
  const withPhone = contacts.filter((c) => digitsOnly(c.phone).length >= 7);

  // ─── Parser de lista pegada ──────────────────────────────────────
  function parsePastedList() {
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const next: Contact[] = [...contacts];
    let added = 0;
    for (const line of lines) {
      // Tab, coma o punto-y-coma como separador
      const cells = line
        .split(/[\t,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      let email = "";
      let phone = "";
      const nameParts: string[] = [];
      for (const cell of cells) {
        if (!email && EMAIL_RX.test(cell)) {
          email = cell;
        } else if (!phone && looksLikePhone(cell)) {
          phone = cell;
        } else {
          nameParts.push(cell);
        }
      }
      if (!email) continue;
      // Evitar duplicados por email
      if (next.some((c) => c.email.toLowerCase() === email.toLowerCase())) continue;
      next.push({
        id: cryptoRandomId(),
        name: nameParts.join(" ").trim() || email.split("@")[0],
        email,
        phone,
      });
      added++;
    }
    setContacts(next);
    setPasteText("");
    if (added === 0) {
      alert("No se reconocieron contactos en la lista. Use una línea por persona con email obligatorio.");
    }
  }

  function importFromLeads() {
    let added = 0;
    setContacts((prev) => {
      const seen = new Set(prev.map((c) => c.email.toLowerCase()));
      const out = [...prev];
      for (const l of seedLeads) {
        const e = l.email.toLowerCase();
        if (seen.has(e)) continue;
        seen.add(e);
        out.push({
          id: cryptoRandomId(),
          name: l.name,
          email: l.email,
          phone: l.phone ?? "",
        });
        added++;
      }
      return out;
    });
    if (added === 0) alert("Todos los leads ya están en la lista.");
  }

  function updateContact(id: string, patch: Partial<Contact>) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeContact(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }
  function clearAll() {
    if (confirm("¿Limpiar toda la lista de contactos?")) setContacts([]);
  }

  // ─── Editor de cuerpo (contentEditable) ──────────────────────────
  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  function insertVariable(varKey: string) {
    const token = `{${varKey}}`;
    if (focusTarget === "subject") insertInInput(subjectRef.current, token);
    else if (focusTarget === "wa") insertInTextarea(token);
    else insertInEditor(escapeHtml(token));
  }

  function insertInInput(inp: HTMLInputElement | null, text: string) {
    if (!inp) return;
    const start = inp.selectionStart ?? inp.value.length;
    const end = inp.selectionEnd ?? inp.value.length;
    const next = inp.value.slice(0, start) + text + inp.value.slice(end);
    inp.value = next;
    setSubject(next);
    inp.focus();
    const pos = start + text.length;
    inp.setSelectionRange(pos, pos);
  }
  function insertInTextarea(text: string) {
    setWaMessage((m) => m + text);
  }
  function insertInEditor(html: string) {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    document.execCommand("insertHTML", false, html);
  }

  // ─── Submit del correo ───────────────────────────────────────────
  async function handleSubmit(formData: FormData) {
    const html = editorRef.current?.innerHTML ?? defaultBodyHtml;
    formData.set("bodyHtml", html);
    formData.set("subject", subject);
    formData.set(
      "contacts",
      JSON.stringify(
        withEmail.map((c) => ({
          name: c.name,
          email: c.email,
          phone: c.phone || null,
        })),
      ),
    );
    await action(formData);
  }

  // ─── Acciones WhatsApp ───────────────────────────────────────────
  function waLinkFor(c: Contact): string {
    const phone = digitsOnly(c.phone);
    const msg = applyVars(waMessage, {
      nombre: firstWord(c.name) || c.name,
      nombre_completo: c.name,
      correo: c.email,
      organismo: orgName,
      url_registro: "https://www.okacreditado.com/registro",
      url_landing: "https://www.okacreditado.com",
    });
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }
  function openOneWa(c: Contact) {
    window.open(waLinkFor(c), "_blank", "noopener,noreferrer");
  }
  async function openAllWa() {
    if (withPhone.length === 0) return;
    if (
      !confirm(
        `Se abrirán ${withPhone.length} pestañas de WhatsApp Web (una por contacto). ¿Continuar?`,
      )
    )
      return;
    for (const c of withPhone) {
      window.open(waLinkFor(c), "_blank", "noopener,noreferrer");
      // Pequeño delay para que el navegador no bloquee las pestañas.
      await sleep(150);
    }
    const res = await logInvitationWhatsApp({
      contacts: withPhone.map((c) => ({ name: c.name, phone: digitsOnly(c.phone) })),
      messagePreview: waMessage,
    });
    setWaInfo(`✓ ${res.count} enlaces abiertos y registrados en la auditoría.`);
  }

  const allCount = contacts.length;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      {/* ═══════════ Columna izquierda: Contactos ═══════════ */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <header className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-brand-900">1. Lista de contactos</h2>
            <p className="text-[11px] text-slate-500">
              Pegue una lista (Excel, Google Sheets, LinkedIn) o importe de sus Leads.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-800">
              {allCount} en total
            </span>
            {allCount > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-semibold text-rose-600 hover:underline"
              >
                Limpiar
              </button>
            ) : null}
          </div>
        </header>

        {/* Paste box */}
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
          <label className="block text-[11px] font-semibold text-slate-700">
            Pegue una persona por línea — columnas: <em>nombre, correo, teléfono</em>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={4}
              placeholder={`Pedro Mujica\tpedro@example.com\t+57 310 4864742\nMaría García, maria@example.com, 3201234567`}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-[12px] outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={parsePastedList}
              disabled={!pasteText.trim()}
              className="rounded-lg btn-grad-navy px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              ＋ Agregar a la lista
            </button>
            <button
              type="button"
              onClick={importFromLeads}
              disabled={seedLeads.length === 0}
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-900 disabled:opacity-50"
              title="Trae los contactos de la tabla de Leads que ya tiene en el sistema"
            >
              📥 Importar de mis Leads ({seedLeads.length})
            </button>
            <span className="text-[10.5px] text-slate-500">
              Separadores válidos: tab, coma o punto y coma · El email es obligatorio.
            </span>
          </div>
        </div>

        {/* Lista actual */}
        {contacts.length > 0 ? (
          <div className="mt-3 max-h-[420px] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold text-slate-700">Nombre</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Correo</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Teléfono</th>
                  <th className="w-12 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => {
                  const emailOk = EMAIL_RX.test(c.email);
                  const phoneOk = digitsOnly(c.phone).length >= 7;
                  return (
                    <tr key={c.id} className="border-t border-slate-100">
                      <td className="px-2 py-1">
                        <input
                          value={c.name}
                          onChange={(e) => updateContact(c.id, { name: e.target.value })}
                          className="w-full rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-brand-600 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="email"
                          value={c.email}
                          onChange={(e) => updateContact(c.id, { email: e.target.value })}
                          className={`w-full rounded border px-2 py-1 outline-none focus:border-brand-600 ${
                            emailOk ? "border-transparent hover:border-slate-200" : "border-rose-300 bg-rose-50"
                          }`}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="tel"
                          value={c.phone}
                          onChange={(e) => updateContact(c.id, { phone: e.target.value })}
                          placeholder="opcional"
                          className={`w-full rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-brand-600 focus:outline-none ${
                            c.phone && !phoneOk ? "border-amber-300 bg-amber-50" : ""
                          }`}
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeContact(c.id)}
                          aria-label="Quitar"
                          className="text-rose-500 hover:text-rose-700"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-6 text-center text-xs text-slate-400">
            Sin contactos todavía. Pegue una lista arriba o importe de sus leads.
          </p>
        )}

        {/* Resumen */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-800">
            📨 Con correo: {withEmail.length}
          </div>
          <div className="rounded-md bg-green-50 px-3 py-2 text-[12px] font-semibold text-green-800">
            💬 Con WhatsApp: {withPhone.length}
          </div>
        </div>
      </section>

      {/* ═══════════ Columna derecha: Mensaje + acciones ═══════════ */}
      <section className="space-y-4">
        {/* Variables comunes */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Variables — se reemplazan por los datos reales al enviar
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EMAIL_VARS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                title={`Insertar {${v.key}} en ${
                  focusTarget === "subject" ? "el asunto"
                  : focusTarget === "wa" ? "el mensaje de WhatsApp"
                  : "el cuerpo del correo"
                }`}
                className="rounded-full border border-brand-200 bg-white px-2.5 py-1 font-mono text-[11px] text-brand-800 hover:bg-brand-50"
              >
                {`{${v.key}}`}
              </button>
            ))}
          </div>
        </div>

        {/* Correo masivo */}
        <form action={handleSubmit} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <header className="flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-900">2. Correo de invitación</h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              {withEmail.length} destinatario(s)
            </span>
          </header>

          <label className="mt-3 block">
            <span className="text-xs font-semibold text-slate-700">Asunto *</span>
            <input
              ref={subjectRef}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setFocusTarget("subject")}
              required
              maxLength={180}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <div className="mt-3">
            <span className="text-xs font-semibold text-slate-700">Mensaje *</span>
            <div className="mt-1 flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-slate-300 bg-slate-50 p-1.5">
              <ToolBtn onClick={() => exec("bold")} title="Negrita"><strong>B</strong></ToolBtn>
              <ToolBtn onClick={() => exec("italic")} title="Cursiva"><em>I</em></ToolBtn>
              <ToolBtn onClick={() => exec("underline")} title="Subrayado"><span className="underline">U</span></ToolBtn>
              <ToolBtn onClick={() => exec("insertUnorderedList")} title="Lista">• Lista</ToolBtn>
              <ToolBtn onClick={() => exec("insertOrderedList")} title="Numerada">1. Num</ToolBtn>
              <ToolBtn
                onClick={() => {
                  const url = prompt("URL del enlace (https://…):");
                  if (url) exec("createLink", url);
                }}
                title="Enlace"
              >🔗</ToolBtn>
              <ToolBtn onClick={() => exec("removeFormat")} title="Quitar formato">⌫</ToolBtn>
            </div>
            <div
              ref={editorRef}
              contentEditable
              role="textbox"
              suppressContentEditableWarning
              onFocus={() => setFocusTarget("body")}
              className="min-h-[200px] max-h-[360px] overflow-auto rounded-b-lg border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-800 outline-none focus:border-brand-600 [&_a]:text-brand-700 [&_a]:underline [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal"
              dangerouslySetInnerHTML={{ __html: defaultBodyHtml }}
            />
          </div>

          {state.error ? (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              {state.message ?? "Invitaciones enviadas."}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending || withEmail.length === 0}
            className="mt-4 w-full rounded-lg btn-grad-navy px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50"
          >
            {pending ? "Enviando…" : `📨 Enviar correo a ${withEmail.length} contacto(s)`}
          </button>
        </form>

        {/* WhatsApp */}
        <div className="rounded-2xl border-2 border-green-300 bg-green-50/30 p-5 shadow-sm">
          <header className="flex items-center justify-between">
            <h2 className="text-base font-bold text-green-900">3. WhatsApp de invitación</h2>
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-800">
              {withPhone.length} con teléfono
            </span>
          </header>

          <label className="mt-3 block">
            <span className="text-xs font-semibold text-green-900">Mensaje (texto plano)</span>
            <textarea
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              onFocus={() => setFocusTarget("wa")}
              rows={5}
              className="mt-1 w-full rounded-lg border border-green-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </label>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {WA_VARS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => {
                  setFocusTarget("wa");
                  insertInTextarea(`{${v.key}}`);
                }}
                className="rounded-full border border-green-200 bg-white px-2.5 py-1 font-mono text-[11px] text-green-800 hover:bg-green-50"
              >
                {`{${v.key}}`}
              </button>
            ))}
          </div>

          <p className="mt-3 text-[11.5px] text-green-900/80">
            WhatsApp no permite envío masivo automatizado por su API gratuita. Generamos un
            enlace <code className="rounded bg-white px-1 text-[10.5px]">wa.me</code> personalizado
            por cada contacto; usted los abre y pulsa &quot;Enviar&quot;.
          </p>

          {waInfo ? (
            <p className="mt-2 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-900">
              {waInfo}
            </p>
          ) : null}

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={openAllWa}
              disabled={withPhone.length === 0}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              💬 Abrir todos ({withPhone.length})
            </button>
            <span className="self-center text-[11px] text-green-900">
              o pulse 💬 en cada fila para abrir uno por uno
            </span>
          </div>

          {/* Lista corta con botón individual */}
          {withPhone.length > 0 ? (
            <ul className="mt-3 max-h-[200px] overflow-auto rounded-lg border border-green-200 bg-white">
              {withPhone.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between border-b border-green-50 px-3 py-1.5 text-xs last:border-b-0"
                >
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <span className="ml-2 text-slate-400">{c.phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openOneWa(c)}
                    className="ml-2 rounded-md bg-green-100 px-2 py-1 text-[11px] font-bold text-green-800 hover:bg-green-200"
                  >
                    💬 Abrir
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}

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

// ─── Utilidades ────────────────────────────────────────────────────
function digitsOnly(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}
function looksLikePhone(s: string): boolean {
  const digits = digitsOnly(s);
  return digits.length >= 7 && digits.length <= 15 && !/@/.test(s);
}
function firstWord(s: string): string {
  return (s ?? "").trim().split(/\s+/)[0] ?? "";
}
function applyVars(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k.toLowerCase()];
    return v != null ? v : `{${k}}`;
  });
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
