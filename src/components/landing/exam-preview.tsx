import Link from "next/link";

/** Vista previa ilustrativa de cómo se presenta una pregunta del examen.
 *  Es un ejemplo de formato, no una pregunta del banco real. Reduce el
 *  miedo del visitante al examen mostrando exactamente cómo se ve. */
export function ExamPreview() {
  return (
    <section className="bg-premium-grid">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <span className="inline-block rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-700">
            Así se ve el examen
          </span>
          <h2 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">
            Sin sorpresas el día de la evaluación
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            La interfaz es clara, con tiempo controlado y guardado automático. Las preguntas se generan aleatoriamente del banco autorizado y miden criterio profesional, no memorización.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">✓</span> Tiempo visible, guardado automático en cada respuesta.</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">✓</span> Caso práctico con preguntas abiertas + Examen teórico con opción múltiple.</li>
            <li className="flex items-start gap-2"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">✓</span> Reglas de integridad (registro de presencia, antifraude básico).</li>
          </ul>
          <div className="mt-6">
            <Link href="/registro?cert=sarlaft" className="rounded-lg bg-brand-800 px-5 py-3 text-sm font-bold text-white hover:bg-brand-900">
              Comenzar mi inscripción →
            </Link>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-premium">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-brand-800">Examen Teórico — SARLAFT</span>
                <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-600">Ejemplo ilustrativo</span>
              </div>
              <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-rose-700">⏱ 28:14</span>
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] uppercase tracking-wider text-slate-500">
              Pregunta 3 de 25 · Caso de aplicación
            </div>
            <p className="mt-3 text-sm font-semibold text-brand-900">
              Al evaluar a una persona expuesta políticamente (PEP) en el SARLAFT, ¿qué tipo de debida diligencia debe aplicarse?
            </p>
            <div className="mt-3 space-y-2 text-sm">
              {[
                { t: "Ordinaria, sin distinción del nivel de exposición.", correct: false },
                { t: "Intensificada o reforzada, con aprobación de instancia superior.", correct: true },
                { t: "Simplificada, dado el carácter público del cliente.", correct: false },
                { t: "Ninguna, basta con verificar la identidad documental.", correct: false },
              ].map((o, i) => (
                <label
                  key={o.t}
                  className={`flex items-start gap-2 rounded-lg border p-2 ${o.correct ? "border-brand-300 bg-brand-50" : "border-slate-200"}`}
                >
                  <input type="radio" name="preview" disabled defaultChecked={o.correct} className="mt-1" />
                  <span className={o.correct ? "text-brand-900 font-semibold" : "text-slate-600"}>
                    <span className="mr-1 font-mono text-[11px] text-slate-400">{String.fromCharCode(65 + i)}.</span> {o.t}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>Respondidas <strong className="text-slate-700">2 / 25</strong></span>
              <span className="text-emerald-700">✓ Guardado automático</span>
            </div>
            <p className="mt-4 text-[10px] text-slate-400">
              Este es un formato de ejemplo. Las preguntas reales se generan aleatoriamente del banco oficial autorizado por RISKS INTERNATIONAL S.A.S.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
