import { BRAND } from "@/lib/brand";

// Mockup premium ilustrativo de un certificado RISKS INTERNATIONAL.
// NO es un certificado real; soporte visual de la landing.
export function CertificateMock({ tilt = true }: { tilt?: boolean }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-md select-none rounded-2xl bg-white shadow-premium ring-1 ring-slate-200 ${tilt ? "rotate-[-2deg]" : ""}`}
    >
      {/* Marca de agua */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl">
        <span className="rotate-[-20deg] text-[80px] font-black text-brand-800 opacity-[0.04] tracking-tighter">RISKS</span>
      </div>

      <div className="relative m-3 rounded-xl border-gold-fine p-5">
        <div className="rounded-lg border-2 border-brand-800/10 p-5 text-center">
          {/* Encabezado: monograma + nombre */}
          <div className="flex items-center justify-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.monogramUrl} alt="" className="h-8 w-auto" />
            <div className="text-left leading-tight">
              <div className="text-[10px] font-extrabold tracking-[0.3em] text-brand-800">
                {BRAND.shortName}
              </div>
              <div className="text-[8px] uppercase tracking-wider text-slate-400">
                S.A.S. · {BRAND.isoNorm}
              </div>
            </div>
          </div>

          <div className="mt-4 inline-block rounded-full border border-gold-500 px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold-600">
            Certificado de Competencias
          </div>

          <p className="mt-4 text-[11px] text-slate-500">Certifica que</p>
          <p className="mt-1 text-lg font-bold text-brand-800">Nombre del Profesional</p>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            ha demostrado idoneidad y cumple con los estándares de competencia para la certificación
          </p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            Oficial de Cumplimiento SARLAFT
          </p>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="text-left text-[10px] leading-tight text-slate-500">
              <div><span className="font-semibold text-slate-700">Emisión:</span> 03 jun 2026</div>
              <div><span className="font-semibold text-slate-700">Vigencia:</span> 03 jun 2029</div>
              <div className="mt-3 border-t border-slate-300 pt-1">
                <div className="font-semibold text-slate-700">Firma autorizada</div>
                <div className="text-[8px] uppercase tracking-wider text-slate-400">{BRAND.shortName}</div>
              </div>
            </div>
            <div className="text-center">
              <div className="relative grid h-16 w-16 place-items-center rounded bg-brand-800 text-[8px] font-bold text-white">
                <div className="absolute inset-1 grid grid-cols-5 gap-px">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <span
                      key={i}
                      className={i % 3 === 0 || i === 7 || i === 12 || i === 17 ? "bg-white" : "bg-transparent"}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-1 font-mono text-[10px] text-slate-700">CERT-2026-A4F2</div>
              <div className="mt-0.5 rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                VIGENTE
              </div>
            </div>
          </div>
        </div>
      </div>

      <span className="absolute -right-3 -top-3 rotate-[8deg] rounded-full bg-gold-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
        Verificable
      </span>
    </div>
  );
}
