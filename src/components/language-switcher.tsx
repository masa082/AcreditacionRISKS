"use client";

import { useState, useTransition } from "react";
import { setLocale } from "@/lib/actions/locale";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/locale";

/**
 * Selector de idioma con dropdown discreto. UX:
 *  - Muestra solo el código del idioma actual (ES / EN / PT) con bandera
 *    para no robar espacio en headers ya cargados.
 *  - Click → dropdown con las 3 opciones, nombre nativo + check del actual.
 *  - Al elegir: server action setea la cookie y recarga la vista.
 *  - Mientras transiciona, deshabilita los botones.
 */
export function LanguageSwitcher({
  initial,
  variant = "default",
}: {
  initial: Locale;
  /** "compact" para headers oscuros (texto blanco). */
  variant?: "default" | "compact" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const [busy, startTx] = useTransition();
  const [active, setActive] = useState<Locale>(initial);

  function pick(loc: Locale) {
    setActive(loc);
    setOpen(false);
    startTx(async () => {
      await setLocale(loc);
    });
  }

  const isDark = variant === "dark";
  const buttonCls = isDark
    ? "inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-white/20"
    : "inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-50";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={LOCALE_LABELS[active].native}
        className={buttonCls}
      >
        <span aria-hidden>{LOCALE_LABELS[active].flag}</span>
        <span className="uppercase tracking-wider">{active}</span>
        <span aria-hidden className="text-[10px] opacity-70">▾</span>
      </button>

      {open ? (
        <>
          {/* backdrop click-outside */}
          <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" />
          <ul
            role="listbox"
            className="absolute right-0 z-20 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            {LOCALES.map((loc) => {
              const meta = LOCALE_LABELS[loc];
              const selected = loc === active;
              return (
                <li key={loc} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => pick(loc)}
                    disabled={busy}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                      selected ? "bg-brand-50 font-semibold text-brand-900" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden>{meta.flag}</span>
                      <span>{meta.native}</span>
                    </span>
                    {selected ? <span aria-hidden className="text-brand-700">✓</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
