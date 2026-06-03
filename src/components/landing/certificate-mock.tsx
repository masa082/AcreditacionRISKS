// Mockup ilustrativo de un certificado RISKS INTERNATIONAL. NO es un
// certificado emitido; sirve solo como soporte visual en la landing.
export function CertificateMock({ tilt = true }: { tilt?: boolean }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-md select-none rounded-xl border border-slate-200 bg-white p-6 shadow-2xl ring-1 ring-slate-100 ${tilt ? "rotate-[-2deg]" : ""}`}
    >
      <div className="rounded-lg border-[6px] border-double border-brand-800 p-5 text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-700">
          RISKS INTERNATIONAL
        </div>
        <div className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-400">
          Organismo de Certificación de Personas · ISO/IEC 17024
        </div>

        <h3 className="mt-4 text-xl font-bold text-slate-900">
          Certificado de Competencias
        </h3>
        <p className="mt-3 text-[11px] text-slate-500">Certifica que</p>
        <p className="mt-1 text-lg font-semibold text-brand-900">Nombre del Profesional</p>
        <p className="mt-2 text-[11px] leading-snug text-slate-500">
          ha demostrado idoneidad y cumple con los estándares de competencia para la certificación
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-800">
          Oficial de Cumplimiento SARLAFT
        </p>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="text-left text-[10px] leading-tight text-slate-500">
            <div><span className="font-semibold text-slate-700">Emisión:</span> 03 jun 2026</div>
            <div><span className="font-semibold text-slate-700">Vigencia:</span> 03 jun 2029</div>
            <div className="mt-2 border-t border-slate-300 pt-1">
              <div className="font-semibold text-slate-700">Firma autorizada</div>
            </div>
          </div>
          <div className="text-center">
            <div className="grid h-16 w-16 place-items-center rounded bg-slate-900 text-[8px] font-bold text-white">QR</div>
            <div className="mt-1 font-mono text-[10px] text-slate-700">CERT-2026-XXXX</div>
            <div className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
              VIGENTE
            </div>
          </div>
        </div>
      </div>

      <span className="absolute -right-3 -top-3 rounded-full bg-gold-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
        Verificable
      </span>
    </div>
  );
}
