"use client";

import { useMemo, useState } from "react";
import { COUNTRIES } from "@/lib/geo/countries";
import { COLOMBIA_FLAT_CITIES, COLOMBIA_DEPARTMENTS } from "@/lib/geo/colombia";

/**
 * Selector de ubicación con cascada inteligente:
 *
 * 1. País: dropdown único con bandera + nombre.
 * 2. Si el país es Colombia (CO):
 *    - Autocompletado de municipio (busca en TODA la lista DANE).
 *    - Departamento se INFIERE automáticamente cuando el usuario
 *      selecciona el municipio. Quedan ambos para Hoja de Vida.
 * 3. Si el país NO es Colombia:
 *    - Campo libre "Departamento / Estado / Provincia" + "Ciudad".
 *
 * Todos los valores se envían al form como inputs ocultos para que el
 * server action los reciba sin ceremonia: country, countryName,
 * state, stateCode, city, address.
 */
export function LocationPicker({
  defaultCountry = "CO",
}: { defaultCountry?: string }) {
  const [countryCode, setCountryCode] = useState(defaultCountry);
  const country = useMemo(() => COUNTRIES.find((c) => c.code === countryCode), [countryCode]);

  // Estado para Colombia
  const [coCity, setCoCity] = useState("");
  const [coDept, setCoDept] = useState("");
  const [coDeptCode, setCoDeptCode] = useState("");

  // Estado para otros países
  const [otherCity, setOtherCity] = useState("");
  const [otherState, setOtherState] = useState("");

  const [address, setAddress] = useState("");

  // Autocomplete de municipio para Colombia.
  const [cityQuery, setCityQuery] = useState("");
  const [cityOpen, setCityOpen] = useState(false);

  const cityMatches = useMemo(() => {
    if (countryCode !== "CO") return [];
    const q = cityQuery.trim().toLowerCase();
    if (q.length < 1) return COLOMBIA_FLAT_CITIES.slice(0, 30);
    return COLOMBIA_FLAT_CITIES
      .filter((c) => c.name.toLowerCase().includes(q) || c.departmentName.toLowerCase().includes(q))
      .slice(0, 50);
  }, [countryCode, cityQuery]);

  function pickCity(c: { name: string; departmentName: string; departmentCode: string }) {
    setCoCity(c.name);
    setCoDept(c.departmentName);
    setCoDeptCode(c.departmentCode);
    setCityQuery(`${c.name} — ${c.departmentName}`);
    setCityOpen(false);
  }

  // Cuando el usuario cambia el departamento (override manual), la
  // lista del autocomplete se filtra a ese departamento.
  const cityMatchesFiltered = useMemo(() => {
    if (countryCode !== "CO" || !coDeptCode) return cityMatches;
    return cityMatches.filter((c) => c.departmentCode === coDeptCode);
  }, [cityMatches, countryCode, coDeptCode]);

  const isCO = countryCode === "CO";
  const isOther = countryCode === "OTHER";

  // Valores que envía el form al server (a través de inputs ocultos).
  const sendCity = isCO ? coCity : otherCity;
  const sendState = isCO ? coDept : otherState;
  const sendStateCode = isCO ? coDeptCode : "";
  const countryName = country?.name ?? "";

  return (
    <fieldset className="space-y-4">
      {/* Inputs ocultos: lo que finalmente llega al server action */}
      <input type="hidden" name="country" value={countryCode} />
      <input type="hidden" name="countryName" value={countryName} />
      <input type="hidden" name="state" value={sendState} />
      <input type="hidden" name="stateCode" value={sendStateCode} />
      <input type="hidden" name="city" value={sendCity} />
      <input type="hidden" name="address" value={address} />

      {/* País */}
      <div>
        <label htmlFor="loc-country" className="mb-1 block text-sm font-medium text-slate-700">
          País de residencia <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <select
            id="loc-country"
            value={countryCode}
            onChange={(e) => {
              setCountryCode(e.target.value);
              setCoCity(""); setCoDept(""); setCoDeptCode(""); setCityQuery("");
              setOtherCity(""); setOtherState("");
            }}
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm outline-none transition focus:border-brand-700 focus:ring-4 focus:ring-brand-100"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
            ))}
          </select>
          <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
        </div>
      </div>

      {isCO ? (
        // ───────── Colombia: autocomplete + departamento inferido ─────────
        <>
          <div>
            <label htmlFor="loc-city" className="mb-1 block text-sm font-medium text-slate-700">
              Municipio <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="loc-city"
                type="text"
                autoComplete="off"
                placeholder="Empiece a escribir su municipio…"
                value={cityQuery}
                onChange={(e) => { setCityQuery(e.target.value); setCityOpen(true); setCoCity(""); }}
                onFocus={() => setCityOpen(true)}
                onBlur={() => setTimeout(() => setCityOpen(false), 200)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-700 focus:ring-4 focus:ring-brand-100"
              />
              {cityOpen && cityMatchesFiltered.length > 0 ? (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {cityMatchesFiltered.map((c) => (
                    <li key={`${c.departmentCode}-${c.name}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); pickCity(c); }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50"
                      >
                        <span className="font-medium text-slate-900">{c.name}</span>
                        <span className="text-[11px] text-slate-500">{c.departmentName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {cityOpen && cityQuery.trim().length > 0 && cityMatchesFiltered.length === 0 ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500 shadow-lg">
                  No encontramos ese municipio. Si su municipio no está en la lista,
                  seleccione el departamento abajo y escriba el nombre.
                </div>
              ) : null}
            </div>
            {coCity ? (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                ✓ {coCity} — {coDept}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-500">El departamento se completará solo al seleccionar el municipio.</p>
            )}
          </div>

          <div>
            <label htmlFor="loc-dept" className="mb-1 block text-sm font-medium text-slate-700">
              Departamento <span className="text-slate-400">(se infiere del municipio)</span>
            </label>
            <div className="relative">
              <select
                id="loc-dept"
                value={coDeptCode}
                onChange={(e) => {
                  const dep = COLOMBIA_DEPARTMENTS.find((d) => d.code === e.target.value);
                  setCoDeptCode(e.target.value);
                  setCoDept(dep?.name ?? "");
                  // Reset municipio si ya no aplica al nuevo departamento.
                  if (coCity && !dep?.cities.includes(coCity)) {
                    setCoCity(""); setCityQuery("");
                  }
                }}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm outline-none transition focus:border-brand-700 focus:ring-4 focus:ring-brand-100"
              >
                <option value="">— Seleccionar departamento (opcional) —</option>
                {COLOMBIA_DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>{d.name}</option>
                ))}
              </select>
              <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
            </div>
          </div>
        </>
      ) : (
        // ───────── Otros países: campos libres ─────────
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Departamento / Estado / Provincia {isOther ? "" : <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              value={otherState}
              onChange={(e) => setOtherState(e.target.value)}
              placeholder="Ej. Buenos Aires, Estado de México, Lima…"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Ciudad {isOther ? "" : <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              value={otherCity}
              onChange={(e) => setOtherCity(e.target.value)}
              placeholder="Ej. CABA, Toluca, Lima…"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-100"
            />
          </div>
        </div>
      )}

      {/* Dirección — siempre opcional */}
      <div>
        <label htmlFor="loc-address" className="mb-1 block text-sm font-medium text-slate-700">
          Dirección <span className="text-slate-400">(opcional)</span>
        </label>
        <input
          id="loc-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ej. Cra 7 # 30-12, Apto 502"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-100"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Se incluirá únicamente en su Hoja de Vida; no se publica con su certificado.
        </p>
      </div>
    </fieldset>
  );
}
