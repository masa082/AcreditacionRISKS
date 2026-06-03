import { BRAND } from "@/lib/brand";

interface MiniCert {
  title: string;
  scope: string;
  code: string;
  status?: "VIGENTE" | "POR VENCER";
  accent?: "navy" | "gold";
}

const SAMPLES: MiniCert[] = [
  { title: "Oficial de Cumplimiento SARLAFT", scope: "Supertransporte", code: "CERT-2026-A4F2", status: "VIGENTE", accent: "navy" },
  { title: "Oficial de Cumplimiento SAGRILAFT", scope: "Supersociedades", code: "CERT-2026-B7K9", status: "VIGENTE", accent: "gold" },
  { title: "Compliance Officer", scope: "Programa avanzado", code: "CERT-2026-C1D4", status: "POR VENCER", accent: "navy" },
];

function MiniCertificate({ data, rotate }: { data: MiniCert; rotate: string }) {
  const borderClass = data.accent === "gold" ? "border-gold-500/40" : "border-brand-800/20";
  return (
    <div
      className={`relative w-72 shrink-0 rounded-2xl bg-white p-3 shadow-premium ring-1 ring-slate-200 transition hover:-translate-y-1 ${rotate}`}
    >
      <div className={`rounded-xl border ${borderClass} p-4`}>
        <div className="flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.monogramUrl} alt="" className="h-7 w-auto" />
          <div className="text-right">
            <div className="text-[8px] font-extrabold tracking-[0.25em] text-brand-800">
              {BRAND.shortName}
            </div>
            <div className="text-[7px] uppercase tracking-wider text-slate-400">
              S.A.S. · {BRAND.isoNorm}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className={`inline-block rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest ${data.accent === "gold" ? "border border-gold-500 text-gold-600" : "border border-brand-300 text-brand-700"}`}>
            Certificado de Competencias
          </div>
          <p className="mt-3 text-[10px] text-slate-500">Certifica que</p>
          <p className="mt-1 text-sm font-bold text-brand-800">Profesional Acreditado</p>
          <p className="mt-2 text-[10px] leading-snug text-slate-500">en</p>
          <p className="text-xs font-bold text-slate-800">{data.title}</p>
          <p className="text-[10px] text-slate-500">{data.scope}</p>
        </div>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div className="text-[8px] leading-tight text-slate-500">
            <div>Emisión: 2026</div>
            <div>Vigencia: 2029</div>
          </div>
          <div className="text-center">
            <div className="grid h-12 w-12 place-items-center rounded bg-brand-800 text-[7px] font-bold text-white">
              <div className="grid grid-cols-4 gap-px p-1">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} className={i % 2 === 0 ? "h-1 w-1 bg-white" : ""} />
                ))}
              </div>
            </div>
            <div className="mt-1 font-mono text-[8px] text-slate-700">{data.code}</div>
            <div className={`mt-0.5 rounded px-1 text-[7px] font-bold uppercase tracking-wider ${data.status === "VIGENTE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {data.status}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CertificateGallery() {
  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-center gap-6 lg:flex-nowrap">
        <MiniCertificate data={SAMPLES[0]} rotate="rotate-[-4deg]" />
        <MiniCertificate data={SAMPLES[1]} rotate="rotate-[2deg]" />
        <MiniCertificate data={SAMPLES[2]} rotate="rotate-[-1deg]" />
      </div>
    </div>
  );
}
