"use client";

import { useEffect, useMemo, useState } from "react";

export interface BookingLite {
  id: string;
  candidateName: string;
  candidateEmail: string;
  documentLabel: string;
  enrollmentCode: string | null;
  status: string;
}

export interface SessionLite {
  id: string;
  examName: string;
  examShort: string;
  title: string | null;
  startsAtISO: string; // ISO UTC string
  durationMin: number | null;
  modality: "ONLINE" | "ONSITE" | "HYBRID" | string;
  location: string | null;
  meetingLink: string | null;
  capacity: number;
  bookings: BookingLite[];
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const WEEKDAYS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

const STATUS_LABEL: Record<string, string> = {
  RESERVED: "Reservado",
  CONFIRMED: "Confirmado",
  CHECKED_IN: "Asistió",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  NO_SHOW: "No asistió",
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatTimeLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function formatTimeUTC(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}
function formatDateTimeLocal(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short", hour12: false });
}

export function AgendaCalendar({ sessions }: { sessions: SessionLite[] }) {
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [tzLabel, setTzLabel] = useState<string>("UTC");

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const minutes = -new Date().getTimezoneOffset();
      const sign = minutes >= 0 ? "+" : "-";
      const abs = Math.abs(minutes);
      const off = `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
      setTzLabel(`${tz} (UTC${off})`);
    } catch { /* keep default */ }
  }, []);

  // Agrupa sesiones por día local
  const sessionsByDayKey = useMemo(() => {
    const m = new Map<string, SessionLite[]>();
    for (const s of sessions) {
      const d = new Date(s.startsAtISO);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    }
    return m;
  }, [sessions]);

  // Construye la grilla 7×N del mes (lunes a domingo)
  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    // dow: 0=domingo … queremos lunes=0
    const dowFirst = (first.getDay() + 6) % 7;
    const totalDays = last.getDate();
    const cells: Array<{ date: Date | null; inMonth: boolean }> = [];
    for (let i = 0; i < dowFirst; i++) cells.push({ date: null, inMonth: false });
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), inMonth: true });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, inMonth: false });
    return cells;
  }, [cursor]);

  const today = new Date();
  const openSession = useMemo(() => sessions.find((s) => s.id === openSessionId) ?? null, [sessions, openSessionId]);

  function prev() { setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1)); }
  function next() { setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1)); }
  function jumpToday() { setCursor(new Date()); }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={prev} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">←</button>
          <button type="button" onClick={jumpToday} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Hoy</button>
          <button type="button" onClick={next} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">→</button>
          <h3 className="ml-2 text-base font-bold text-slate-900">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h3>
        </div>
        <div className="text-xs text-slate-500">
          Zona horaria del navegador: <strong className="font-mono text-slate-700">{tzLabel}</strong>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((cell, i) => {
            if (!cell.date) return <div key={i} className="min-h-[88px] border-b border-r border-slate-100 bg-slate-50/40" />;
            const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
            const list = sessionsByDayKey.get(key) ?? [];
            const isToday = isSameDay(cell.date, today);
            return (
              <div key={i} className={`min-h-[88px] border-b border-r border-slate-100 p-1.5 ${isToday ? "bg-brand-50/40" : ""}`}>
                <div className={`text-[10px] font-bold ${isToday ? "text-brand-800" : "text-slate-500"}`}>{cell.date.getDate()}</div>
                <ul className="mt-1 space-y-1">
                  {list.sort((a, b) => new Date(a.startsAtISO).getTime() - new Date(b.startsAtISO).getTime()).map((s) => {
                    const filled = s.bookings.filter((b) => b.status !== "CANCELLED" && b.status !== "NO_SHOW").length;
                    const tone = s.modality === "ONLINE" ? "bg-cyan-100 text-cyan-800 hover:bg-cyan-200" : "bg-brand-100 text-brand-900 hover:bg-brand-200";
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setOpenSessionId(s.id)}
                          className={`block w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-semibold leading-tight ${tone}`}
                          title={`${s.examName} · ${formatDateTimeLocal(s.startsAtISO)} · ${formatTimeUTC(s.startsAtISO)}`}
                        >
                          <span>{formatTimeLocal(s.startsAtISO)}</span>
                          <span className="ml-1 truncate">{s.examShort}</span>
                          <span className="ml-1 opacity-70">({filled}{s.capacity > 0 ? `/${s.capacity}` : ""})</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-cyan-300" /> En línea</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-brand-300" /> Presencial / Híbrida</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-brand-50 ring-1 ring-brand-200" /> Hoy</span>
        <span className="ml-auto">Las horas mostradas son en su zona local. Pase el cursor sobre una sesión para ver la hora UTC.</span>
      </div>

      {openSession ? (
        <SessionDetailDialog session={openSession} onClose={() => setOpenSessionId(null)} />
      ) : null}
    </div>
  );
}

function SessionDetailDialog({ session, onClose }: { session: SessionLite; onClose: () => void }) {
  const filled = session.bookings.filter((b) => b.status !== "CANCELLED" && b.status !== "NO_SHOW").length;
  const endIso = session.durationMin
    ? new Date(new Date(session.startsAtISO).getTime() + session.durationMin * 60_000).toISOString()
    : null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{session.title || session.examName}</h3>
            <p className="mt-1 text-xs text-slate-500">{session.examName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Cerrar</button>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-slate-400">Inicio (local)</dt>
            <dd className="font-semibold text-slate-800">{formatDateTimeLocal(session.startsAtISO)}</dd>
            <dd className="text-xs text-slate-500">{formatTimeUTC(session.startsAtISO)}</dd>
          </div>
          {endIso ? (
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-slate-400">Fin estimado</dt>
              <dd className="font-semibold text-slate-800">{formatDateTimeLocal(endIso)}</dd>
              <dd className="text-xs text-slate-500">{formatTimeUTC(endIso)} · {session.durationMin} min</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-slate-400">Modalidad</dt>
            <dd className="font-semibold text-slate-800">{session.modality === "ONLINE" ? "En línea" : session.modality === "ONSITE" ? "Presencial" : "Híbrida"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-slate-400">Cupos</dt>
            <dd className="font-semibold text-slate-800">{session.capacity > 0 ? `${filled} / ${session.capacity}` : `${filled} inscritos · sin tope`}</dd>
          </div>
          {session.location ? (
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-wider text-slate-400">Lugar</dt>
              <dd className="text-slate-800">{session.location}</dd>
            </div>
          ) : null}
          {session.meetingLink ? (
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-wider text-slate-400">Enlace</dt>
              <dd><a className="text-brand-800 underline" href={session.meetingLink} target="_blank" rel="noopener noreferrer">{session.meetingLink}</a></dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="text-sm font-bold text-slate-900">Candidatos agendados ({session.bookings.length})</h4>
          {session.bookings.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Aún no hay candidatos reservados en esta sesión.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {session.bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <div className="font-semibold text-slate-800">{b.candidateName}</div>
                    <div className="text-xs text-slate-500">{b.candidateEmail} · {b.documentLabel}{b.enrollmentCode ? ` · ${b.enrollmentCode}` : ""}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    b.status === "CONFIRMED" || b.status === "RESERVED" ? "bg-emerald-100 text-emerald-700" :
                    b.status === "COMPLETED" || b.status === "CHECKED_IN" ? "bg-brand-100 text-brand-800" :
                    "bg-slate-100 text-slate-600"
                  }`}>{STATUS_LABEL[b.status] ?? b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
