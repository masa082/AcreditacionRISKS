"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { importLeadsBulk } from "@/lib/actions/leads";

/**
 * Importación masiva de leads. Dos modos:
 *
 * 1. Pegar desde Excel/portapapeles: textarea con tab-separated o CSV.
 * 2. Subir archivo CSV: file input → texto plano.
 *
 * En ambos modos el componente parsea las filas, muestra preview, y
 * deja al operador mapear cada columna detectada a uno de los campos
 * del Lead. Después envía el JSON normalizado al server action
 * `importLeadsBulk` y muestra el resumen (created/updated/skipped).
 */
const FIELDS = [
  { key: "ignore",                  label: "— Ignorar columna —" },
  { key: "fullName",                label: "Nombre completo *" },
  { key: "email",                   label: "Correo *" },
  { key: "phone",                   label: "Teléfono" },
  { key: "country",                 label: "País" },
  { key: "company",                 label: "Empresa" },
  { key: "jobTitle",                label: "Cargo" },
  { key: "certificationOfInterest", label: "Certificación de interés" },
  { key: "message",                 label: "Mensaje / nota" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

function detectSeparator(line: string): string {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  if (line.includes("|")) return "|";
  return ",";
}

/** Parser CSV/TSV mínimo con soporte de comillas dobles "..." y separador detectado. */
function parseRows(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const sep = detectSeparator(lines[0]);
  return lines.map((line) => {
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; continue; }
        inQ = !inQ; continue;
      }
      if (!inQ && ch === sep) { cells.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

/** Heurística: detecta el campo más probable según el header. */
function guessField(header: string): FieldKey {
  const h = header.toLowerCase();
  if (/(^|\b)(nombre|name)/.test(h)) return "fullName";
  if (/(correo|email|e-?mail)/.test(h)) return "email";
  if (/(tel[eé]fono|phone|celular|movil|m[oó]vil|whats)/.test(h)) return "phone";
  if (/(pa[ií]s|country)/.test(h)) return "country";
  if (/(empresa|company|organizaci[oó]n|company)/.test(h)) return "company";
  if (/(cargo|puesto|position|title|rol)/.test(h)) return "jobTitle";
  if (/(inter[eé]s|certificaci|interest|certific)/.test(h)) return "certificationOfInterest";
  if (/(mensaje|nota|message|observaci|coment)/.test(h)) return "message";
  return "ignore";
}

interface Summary {
  received: number; created: number; updated: number; skipped: number; errors: string[];
}

export function LeadsImport({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [busy, startTx] = useTransition();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseRows(text), [text]);
  const headerRow = hasHeader && parsed.length > 0 ? parsed[0] : null;
  const bodyRows = hasHeader ? parsed.slice(1) : parsed;
  const cols = headerRow?.length ?? parsed[0]?.length ?? 0;

  const [mapping, setMapping] = useState<Record<number, FieldKey>>({});

  // Auto-detección del mapping cuando se pega/carga texto nuevo. Se
  // dispara en useEffect (no en render) para evitar efectos secundarios
  // durante el render — los warnings de React Strict Mode se enfadan.
  // Las dependencias son `text` (cambio de fuente) y `cols`/`hasHeader`
  // (cambio de estructura).
  useEffect(() => {
    if (cols === 0) return;
    const m: Record<number, FieldKey> = {};
    for (let i = 0; i < cols; i++) {
      m[i] = headerRow
        ? guessField(headerRow[i] ?? "")
        : i === 0 ? "fullName" : i === 1 ? "email" : "ignore";
    }
    setMapping(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, cols, hasHeader]);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const t = String(reader.result ?? "");
      setText(t);
      setSummary(null);
      setError(null);
    };
    reader.readAsText(file, "utf-8");
  }

  function submit() {
    setError(null); setSummary(null);
    const usedFields = new Set(Object.values(mapping));
    if (!usedFields.has("fullName") || !usedFields.has("email")) {
      setError("Debe mapear al menos las columnas Nombre y Correo.");
      return;
    }
    const rows = bodyRows.map((cells) => {
      const obj: Record<string, string | null> = {};
      for (let i = 0; i < cells.length; i++) {
        const f = mapping[i];
        if (!f || f === "ignore") continue;
        const v = cells[i]?.trim();
        if (v) obj[f] = v;
      }
      return obj;
    }).filter((o) => o.fullName && o.email);

    if (rows.length === 0) {
      setError("No quedó ninguna fila válida tras el mapeo.");
      return;
    }

    startTx(async () => {
      const res = await importLeadsBulk(rows);
      if (!res.ok) { setError(res.error ?? "No se pudo importar."); return; }
      setSummary(res.summary ?? null);
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal>
      <button type="button" aria-label="Cerrar" onClick={onClose} className="flex-1 bg-slate-950/40 backdrop-blur-sm" />
      <aside className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Importar</p>
              <h2 className="text-lg font-bold text-slate-900">Cargar leads desde Excel / portapapeles / CSV</h2>
              <p className="text-xs text-slate-500">Pegue desde Excel (columnas con TAB), suba un archivo .csv, o cargue una hoja con la primera fila como encabezado.</p>
            </div>
            <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50">Cerrar ✕</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pegar desde Excel / portapapeles</span>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setSummary(null); setError(null); }}
                rows={6}
                placeholder={"Nombre\tCorreo\tTel\tEmpresa\nJuan Pérez\tjuan@empresa.com\t3001234567\tACME\n..."}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
              />
              <span className="mt-1 block text-[10px] text-slate-400">Detecta tab / coma / punto y coma automáticamente.</span>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">…o subir CSV</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                className="mt-1 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-800"
              />
              <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
                Primera fila es encabezado
              </label>
            </label>
          </div>

          {cols > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Mapeo de columnas ({cols}) · {bodyRows.length} fila(s) detectadas
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/60">
                      {Array.from({ length: cols }).map((_, i) => (
                        <th key={i} className="px-2 py-2 text-left">
                          <select
                            value={mapping[i] ?? "ignore"}
                            onChange={(e) => setMapping({ ...mapping, [i]: e.target.value as FieldKey })}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-[11px]"
                          >
                            {FIELDS.map((f) => (
                              <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                          </select>
                          {headerRow ? (
                            <div className="mt-1 truncate text-[10px] text-slate-400">{headerRow[i]}</div>
                          ) : null}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bodyRows.slice(0, 5).map((row, ri) => (
                      <tr key={ri} className="border-t border-slate-100">
                        {Array.from({ length: cols }).map((_, ci) => (
                          <td key={ci} className="max-w-[180px] truncate px-2 py-1.5 font-mono text-[11px] text-slate-700">{row[ci] ?? ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bodyRows.length > 5 ? (
                  <div className="border-t border-slate-100 px-3 py-1 text-[10px] text-slate-400">+ {bodyRows.length - 5} fila(s) más</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800 ring-1 ring-rose-200">{error}</p>
          ) : null}

          {summary ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <p className="font-bold">Importación completada</p>
              <ul className="mt-1.5 space-y-0.5">
                <li>Filas recibidas: {summary.received}</li>
                <li>Creados: <b>{summary.created}</b></li>
                <li>Actualizados (dedupe por correo): <b>{summary.updated}</b></li>
                <li>Omitidos (inválidos o duplicados): {summary.skipped}</li>
              </ul>
              {summary.errors.length > 0 ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-emerald-700">Ver primeros {summary.errors.length} errores</summary>
                  <ul className="mt-1 space-y-0.5 font-mono text-[10px] text-rose-700">
                    {summary.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-[10px] text-slate-500">Las filas duplicadas por correo en los últimos 60 días actualizan el lead existente; no crean uno nuevo.</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs">Cerrar</button>
            <button
              disabled={busy || bodyRows.length === 0}
              onClick={submit}
              className="rounded-md btn-grad-navy px-4 py-1.5 text-xs font-bold disabled:opacity-50"
            >
              {busy ? "Importando…" : `Importar ${bodyRows.length} fila(s)`}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
