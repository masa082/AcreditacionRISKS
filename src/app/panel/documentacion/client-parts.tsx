"use client";

import { useActionState, useState, useTransition } from "react";
import {
  upsertSubscriberDocAction,
  upsertGlobalDocAction,
  deleteDocAction,
} from "@/lib/actions/documentation";
import { Field, Input, Select, FormError, SubmitButton } from "@/components/form";

type Scope = "subscriber" | "platform";

interface DocLike {
  id?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  version?: string | null;
  category?: string | null;
  audience?: string[];
  visible?: boolean;
  pdfUrl?: string | null;
  docxUrl?: string | null;
}

/**
 * Botón + Dialog modal para crear o editar un documento. Mismo componente
 * sirve para ambos roles (suscriptor o SUPERADMIN): basta cambiar `scope`.
 *
 * UX:
 *  - Trigger: botón “Nuevo documento” (sin doc) o “Editar” (con doc).
 *  - Dialog usa <dialog> nativo; cierre con ESC o click backdrop.
 *  - Form acepta archivos (PDF/DOCX) opcionales — si se omiten en edición,
 *    se conservan los actuales.
 *  - El servidor revalida la página al guardar; cerramos el dialog al ok.
 */
export function DocFormDialog({ scope, doc }: { scope: Scope; doc?: DocLike }) {
  const [open, setOpen] = useState(false);
  const action = scope === "subscriber" ? upsertSubscriberDocAction : upsertGlobalDocAction;
  const [state, formAction] = useActionState(action, { ok: false });

  // Cuando state.ok pasa a true tras un submit, cerramos el dialog.
  // useEffect implícito vía render: usamos un truco sencillo con setTimeout.
  if (state.ok && open) {
    setTimeout(() => {
      setOpen(false);
      // forzar limpieza del state para que la siguiente apertura quede limpia
      // (no es perfecto — para producción haríamos un context, aquí basta)
    }, 80);
  }

  const triggerLabel = doc?.id ? "Editar" : "+ Nuevo documento";
  const triggerCls = doc?.id
    ? "inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
    : "inline-flex items-center gap-2 rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerCls}>
        {triggerLabel}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-xl">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-brand-900">
                  {doc?.id ? "Editar documento" : "Nuevo documento"}
                </h2>
                <p className="text-[12px] text-slate-500">
                  {scope === "platform"
                    ? "Este documento será GLOBAL — visible para todos los suscriptores."
                    : "Este documento será visible solo para sus candidatos."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </header>

            <form action={formAction} encType="multipart/form-data" className="space-y-4">
              {doc?.id ? <input type="hidden" name="id" value={doc.id} /> : null}

              <FormError error={state.error} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Título" htmlFor="title" required>
                  <Input id="title" name="title" required defaultValue={doc?.title ?? ""} maxLength={160} />
                </Field>
                <Field label="Slug (URL)" htmlFor="slug" required hint="letras minúsculas, números y guiones">
                  <Input id="slug" name="slug" required defaultValue={doc?.slug ?? ""} maxLength={80} pattern="^[a-z0-9](?:[a-z0-9-]{0,80}[a-z0-9])?$" />
                </Field>
              </div>

              <Field label="Descripción" htmlFor="description">
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  maxLength={2000}
                  defaultValue={doc?.description ?? ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Versión" htmlFor="version">
                  <Input id="version" name="version" defaultValue={doc?.version ?? ""} placeholder="v1.0" maxLength={40} />
                </Field>
                <Field label="Categoría" htmlFor="category">
                  <Select id="category" name="category" defaultValue={doc?.category ?? ""}>
                    <option value="">— sin categoría —</option>
                    <option value="legal">Legal</option>
                    <option value="proceso">Proceso</option>
                    <option value="manual">Manual</option>
                    <option value="plantilla">Plantilla</option>
                    <option value="otro">Otro</option>
                  </Select>
                </Field>
                <Field label="Orden" htmlFor="sortOrder" hint="menor sale primero">
                  <Input id="sortOrder" name="sortOrder" type="number" min={0} max={9999} defaultValue={String(doc as unknown as { sortOrder?: number })} />
                </Field>
              </div>

              <fieldset className="rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Audiencia (chips informativos)
                </legend>
                <div className="mt-1 flex flex-wrap gap-3 text-sm">
                  {(["CANDIDATE", "SUBSCRIBER", "SUPERADMIN"] as const).map((a) => (
                    <label key={a} className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        name="audience"
                        value={a}
                        defaultChecked={doc?.audience?.includes(a) ?? true}
                      />
                      <span>{a === "CANDIDATE" ? "Candidato" : a === "SUBSCRIBER" ? "Suscriptor" : "SUPERADMIN"}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Archivos
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="PDF (subir archivo)" htmlFor="pdf">
                    <input id="pdf" name="pdf" type="file" accept=".pdf,application/pdf" className="text-sm" />
                  </Field>
                  <Field label="Word (subir archivo)" htmlFor="docx">
                    <input id="docx" name="docx" type="file" accept=".docx" className="text-sm" />
                  </Field>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  O bien pegue URLs directas (útil para apuntar a documentos estáticos en /docs/...):
                </p>
                <div className="mt-1 grid gap-3 sm:grid-cols-2">
                  <Field label="URL PDF" htmlFor="pdfUrlRaw">
                    <Input id="pdfUrlRaw" name="pdfUrlRaw" placeholder="/docs/Mi-Doc.pdf" defaultValue={doc?.pdfUrl ?? ""} maxLength={500} />
                  </Field>
                  <Field label="URL Word" htmlFor="docxUrlRaw">
                    <Input id="docxUrlRaw" name="docxUrlRaw" placeholder="/docs/Mi-Doc.docx" defaultValue={doc?.docxUrl ?? ""} maxLength={500} />
                  </Field>
                </div>
              </fieldset>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="visible" defaultChecked={doc?.visible ?? true} />
                <span>Visible en /documentacion</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <SubmitButton pendingText="Guardando…">{doc?.id ? "Guardar cambios" : "Crear documento"}</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Botón “Eliminar” con confirmación inline. */
export function DeleteDocButton({ id, scope, title }: { id: string; scope: Scope; title: string }) {
  const [pending, startTx] = useTransition();
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 4000);
          return;
        }
        startTx(async () => {
          await deleteDocAction(id, scope);
        });
      }}
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
        armed
          ? "border-rose-500 bg-rose-50 text-rose-700"
          : "border-slate-300 text-slate-600 hover:bg-slate-50"
      }`}
      title={`Eliminar “${title}”`}
    >
      {pending ? "Eliminando…" : armed ? "Confirmar" : "Eliminar"}
    </button>
  );
}
