"use client";

import { useActionState, useState } from "react";
import { updateThemeConfig, resetThemeConfig } from "@/lib/actions/organization";
import type { ActionResult } from "@/lib/actions/schemes";

/// Tokens visibles al usuario con su descripción de UX, agrupados en
/// "Bloques que se ven en el PDF" para que el operador entienda qué cambia.
const TOKENS: { key: TokenKey; label: string; hint: string }[] = [
  { key: "primary",     label: "Color primario",
    hint: "Títulos de sección, nombre del titular y datos principales del informe/diploma." },
  { key: "accent",      label: "Color de acento",
    hint: "Líneas, franjas decorativas, dorado del diploma y badge ONAC." },
  { key: "headerBg",    label: "Fondo del encabezado",
    hint: "Fondo de la franja superior del PDF. Use un tono CLARO para que cualquier logo se vea." },
  { key: "sectionBg",   label: "Fondo de sección",
    hint: "Color de fondo de los títulos de cada bloque del informe (Datos personales, Pagos…)." },
  { key: "sectionText", label: "Texto de sección",
    hint: "Color del texto en los títulos de cada bloque." },
  { key: "rule",        label: "Línea separadora",
    hint: "Líneas finas que separan filas y bloques internos." },
  { key: "body",        label: "Texto del cuerpo",
    hint: "Color del texto principal." },
  { key: "muted",       label: "Texto auxiliar",
    hint: "Color del texto secundario (etiquetas, fechas, leyendas, IP)." },
];

type TokenKey = "primary" | "accent" | "headerBg" | "sectionBg" | "sectionText" | "rule" | "body" | "muted";

const DEFAULTS: Record<TokenKey, string> = {
  primary:     "#0b1d44",
  accent:      "#c89a35",
  headerBg:    "#fdfbf4",
  sectionBg:   "#f1f6ff",
  sectionText: "#0b1d44",
  rule:        "#d9dde6",
  body:        "#0f172a",
  muted:       "#64748b",
};

export function ThemeConfigForm({
  initial,
}: {
  initial: Partial<Record<TokenKey, string>>;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    updateThemeConfig,
    { ok: false },
  );
  const [palette, setPalette] = useState<Record<TokenKey, string>>(() => {
    const out: Record<TokenKey, string> = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS) as TokenKey[]) {
      const v = initial?.[k];
      if (v && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) out[k] = v;
    }
    return out;
  });

  function setKey(k: TokenKey, v: string) {
    setPalette((p) => ({ ...p, [k]: v }));
  }

  async function handleReset() {
    setPalette({ ...DEFAULTS });
    await resetThemeConfig();
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <header className="mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <span aria-hidden>🎨</span> Paleta de colores del Informe y del Diploma
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Personalice los colores que se usan en la <strong>Hoja de Vida del Candidato (PDF)</strong>{" "}
          y en el <strong>Diploma</strong>. Los cambios se aplican a partir del próximo informe
          generado. La vista previa a la derecha refleja la combinación elegida.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form action={action} className="space-y-3">
          {TOKENS.map((t) => (
            <div key={t.key} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <label
                htmlFor={`theme-${t.key}`}
                className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-slate-300"
                title={`Cambiar ${t.label}`}
              >
                <span className="absolute inset-0" style={{ background: palette[t.key] }} />
                <input
                  id={`theme-${t.key}`}
                  name={t.key}
                  type="color"
                  value={palette[t.key]}
                  onChange={(e) => setKey(t.key, e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-800">{t.label}</div>
                <div className="text-[11px] text-slate-500">{t.hint}</div>
              </div>
              <input
                aria-label={`Hex de ${t.label}`}
                type="text"
                value={palette[t.key]}
                onChange={(e) => setKey(t.key, e.target.value)}
                className="w-24 rounded-md border border-slate-300 px-2 py-1 font-mono text-[11px] uppercase outline-none focus:border-brand-700"
              />
            </div>
          ))}

          {state.error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {state.error}
            </p>
          ) : null}
          {state.ok ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
              {state.message ?? "Paleta guardada."}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Restablecer por defecto
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar paleta"}
            </button>
          </div>
        </form>

        <ThemePreview palette={palette} />
      </div>
    </section>
  );
}

/// Mini-preview que reproduce la cabecera + un par de bloques con los
/// colores elegidos para que el operador vea el efecto al instante.
function ThemePreview({ palette }: { palette: Record<TokenKey, string> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
        Vista previa del PDF
      </div>
      <div className="bg-white p-3">
        <div
          className="relative rounded-md p-3"
          style={{ background: palette.headerBg, borderBottom: `3px solid ${palette.accent}` }}
        >
          <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: palette.accent }}>
            HOJA DE VIDA DEL CANDIDATO
          </div>
          <div className="mt-0.5 text-sm font-bold" style={{ color: palette.primary }}>
            Manuel Rojas
          </div>
          <div className="text-[10px]" style={{ color: palette.muted }}>
            CC 1234 · masa082@gmail.com
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div
            className="flex items-center gap-2 rounded-r px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: palette.sectionBg, color: palette.sectionText, borderLeft: `3px solid ${palette.primary}` }}
          >
            Datos de conocimiento
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-1 px-1 text-[10px]">
            <span className="font-bold" style={{ color: palette.muted }}>Alcance</span>
            <span style={{ color: palette.body }}>Marco normativo SARLAFT del sector transporte.</span>
            <span className="font-bold" style={{ color: palette.muted }}>Vigencia</span>
            <span style={{ color: palette.body }}>36 meses</span>
          </div>
          <hr style={{ borderColor: palette.rule }} />
          <div
            className="flex items-center gap-2 rounded-r px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: palette.sectionBg, color: palette.sectionText, borderLeft: `3px solid ${palette.primary}` }}
          >
            Pagos
          </div>
          <div className="text-[10px]" style={{ color: palette.body }}>
            <strong style={{ color: palette.primary }}>APPROVED</strong> · rapyd · $ 650.000
          </div>
        </div>

        <div
          className="mt-3 inline-flex items-center gap-1 rounded px-2 py-1 text-[8px] font-bold uppercase"
          style={{ background: "white", color: palette.primary, border: `1px solid ${palette.accent}` }}
        >
          En proceso de acreditación · ONAC
        </div>
      </div>
    </div>
  );
}
