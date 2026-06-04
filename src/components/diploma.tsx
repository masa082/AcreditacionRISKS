import { verifyUrl } from "@/lib/certificate";

export interface DiplomaData {
  code: string;
  type?: string; // CERTIFICATION | EXAM_PRESENTATION
  title: string;
  holderName: string;
  documentNumber: string | null;
  scope: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  status: string;
  org: {
    name: string;
    legalName: string;
    authorizedSigner: string | null;
    logoUrl: string | null;
    signatureImageUrl: string | null;
    normReference: string | null;
  };
  /** Paleta personalizada del suscriptor; si está vacía usa el default. */
  theme?: {
    primary?: string;  // navy / títulos
    accent?: string;   // dorado / líneas
  };
  qr: string; // data URL
}

const STATUS_LABEL: Record<string, string> = {
  VALID: "VIGENTE",
  EXPIRED: "VENCIDO",
  SUSPENDED: "SUSPENDIDO",
  WITHDRAWN: "ANULADO",
  CANCELLED: "ANULADO",
};

function d(date: Date): string {
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

/// Diploma imprimible (A4 horizontal) estilo formal:
/// - Marco doble dorado con esquineros ornamentales.
/// - Microtexto antifraude en los bordes.
/// - Marca de agua diagonal del nombre del organismo.
/// - Tipografía serif para títulos (Garamond).
/// - Sello circular dorado bajo la firma.
/// - Logo de acreditación ONAC en el pie.
export function Diploma({ data }: { data: DiplomaData }) {
  const annulled = ["WITHDRAWN", "CANCELLED"].includes(data.status);
  const isPresentation = data.type === "EXAM_PRESENTATION";
  // Texto repetido para microtexto perimetral (antifalsificación visual).
  const micro = `${data.org.legalName} · ${data.code} · ISO/IEC 17024 · `.repeat(30);
  // Paleta del suscriptor con fallback institucional. Usamos CSS variables
  // para que TODO el árbol del diploma respete los colores configurados
  // sin pasar props a cada subcomponente.
  const accent  = data.theme?.accent  ?? "#c89a35";
  const primary = data.theme?.primary ?? "#0b1d44";
  const styleVars = { "--diploma-accent": accent, "--diploma-primary": primary } as React.CSSProperties;

  return (
    <div
      className="diploma mx-auto bg-white text-slate-900 shadow-lg ring-1 ring-slate-200 print:shadow-none print:ring-0"
      style={styleVars}
    >
      <div className="relative">
        {/* Marco doble dorado + brand — usan las CSS vars de la paleta */}
        <div className="absolute inset-0 border-[6px] border-double" style={{ borderColor: accent }} />
        <div className="absolute inset-3 border" style={{ borderColor: `${accent}b3` }} />
        <div className="absolute inset-4 border-2" style={{ borderColor: primary }} />

        {/* Listones / esquineros ornamentales en las 4 esquinas */}
        <CornerOrnament className="absolute left-2 top-2" />
        <CornerOrnament className="absolute right-2 top-2 -scale-x-100" />
        <CornerOrnament className="absolute left-2 bottom-2 -scale-y-100" />
        <CornerOrnament className="absolute right-2 bottom-2 -scale-x-100 -scale-y-100" />

        {/* Microtexto antifraude (borde superior e inferior) */}
        <div className="pointer-events-none absolute left-10 right-10 top-[22px] overflow-hidden whitespace-nowrap text-center text-[5px] tracking-wider text-brand-800/40">
          {micro}
        </div>
        <div className="pointer-events-none absolute left-10 right-10 bottom-[22px] overflow-hidden whitespace-nowrap text-center text-[5px] tracking-wider text-brand-800/40">
          {micro}
        </div>

        {/* Marca de agua diagonal del organismo */}
        <div className="pointer-events-none absolute inset-12 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rotate-[-22deg] whitespace-nowrap text-[120px] font-black tracking-[0.2em] text-brand-800/[0.04]">
              {data.org.name}
            </span>
          </div>
        </div>

        {annulled ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <span className="rotate-[-20deg] text-[110px] font-black tracking-widest text-rose-300/70">ANULADO</span>
          </div>
        ) : null}

        {/* Contenido del diploma */}
        <div className="relative z-10 p-14">
          <div className="text-center">
            {data.org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.org.logoUrl} alt={data.org.name} className="mx-auto mb-2 h-20 w-auto object-contain" />
            ) : null}
            <div className="text-base font-extrabold uppercase tracking-[0.45em] text-brand-800">
              {data.org.name}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.3em] text-slate-600">{data.org.legalName}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-slate-400">
              Organismo de Certificación de Personas · ISO/IEC 17024
            </div>

            {/* Línea decorativa central */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--diploma-accent,#c89a35)] to-[var(--diploma-accent,#c89a35)]" />
              <span className="text-2xl text-[var(--diploma-accent,#c89a35)]">❖</span>
              <span className="h-px w-24 bg-gradient-to-l from-transparent via-[var(--diploma-accent,#c89a35)] to-[var(--diploma-accent,#c89a35)]" />
            </div>

            <h1 className="mt-4 font-serif text-[2.6rem] font-bold leading-tight text-brand-900">
              {isPresentation ? "Constancia de Presentación de Examen" : "Certificado de Competencias"}
            </h1>

            <p className="mt-5 text-sm italic text-slate-500">
              {isPresentation ? "Hace constar que" : "Certifica que"}
            </p>
            <p className="mt-1 font-serif text-[2.1rem] font-bold tracking-wide text-brand-900">
              {data.holderName}
            </p>
            {data.documentNumber ? (
              <p className="mt-1 text-sm text-slate-500">Documento de identidad N.º {data.documentNumber}</p>
            ) : null}

            <p className="mx-auto mt-5 max-w-3xl text-sm leading-relaxed text-slate-600">
              {isPresentation
                ? "presentó la evaluación correspondiente a"
                : "ha demostrado idoneidad y cumple con los estándares de competencia definidos para la certificación profesional de"}
            </p>
            <p className="mt-2 font-serif text-xl font-bold text-slate-900">{data.title}</p>
            {data.scope ? (
              <p className="mx-auto mt-3 max-w-3xl text-[11px] italic leading-relaxed text-slate-500">
                Alcance: {data.scope}
              </p>
            ) : null}
          </div>

          {/* Pie del diploma: fechas / firma+sello / QR */}
          <div className="mt-10 grid grid-cols-3 items-end gap-8">
            <div className="text-[11px] text-slate-500">
              <div><span className="font-bold text-slate-700">Emisión:</span> {d(data.issuedAt)}</div>
              <div className="mt-0.5"><span className="font-bold text-slate-700">Vigencia hasta:</span> {data.expiresAt ? d(data.expiresAt) : "No vence"}</div>
              {data.org.normReference ? (
                <div className="mt-1 italic">Ref.: {data.org.normReference}</div>
              ) : null}
            </div>

            <div className="relative text-center">
              {/* Sello circular dorado detrás de la firma */}
              <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2">
                <div className="relative grid h-32 w-32 place-items-center rounded-full border-[3px] border-double border-[var(--diploma-accent,#c89a35)] bg-white/40">
                  <div className="grid h-24 w-24 place-items-center rounded-full border border-[var(--diploma-accent,#c89a35)]/70">
                    <div className="text-center">
                      <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--diploma-accent,#c89a35)]">Sello</div>
                      <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-[var(--diploma-accent,#c89a35)]">Oficial</div>
                      <div className="mt-1 text-[7px] font-bold text-brand-800">{data.org.name.split(" ")[0]}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-28">
                {data.org.signatureImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.org.signatureImageUrl} alt="Firma autorizada" className="mx-auto h-14 w-auto object-contain" />
                ) : (
                  <div className="h-14" />
                )}
                <div className="mx-auto w-56 border-t-2 border-slate-700 pt-1">
                  <div className="text-xs font-bold text-slate-800">{data.org.authorizedSigner ?? "Director del Organismo de Certificación de Personas (OCP)"}</div>
                  <div className="text-[9px] uppercase tracking-[0.25em] text-slate-400">Firma autorizada</div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="inline-block rounded-lg border-2 border-brand-800/30 bg-white p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.qr} alt="Código QR de verificación" className="h-28 w-28" />
              </div>
              <div className="mt-1 font-mono text-[11px] font-bold text-brand-800">{data.code}</div>
              <div className="text-[8px] text-slate-500">Verifique en {verifyUrl(data.code).replace(/^https?:\/\//, "")}</div>
              <div className={`mt-1 inline-block rounded px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.2em] ${
                annulled || data.status === "EXPIRED" ? "bg-rose-100 text-rose-700"
                : data.status === "VALID" ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-700"
              }`}>
                Estado: {STATUS_LABEL[data.status] ?? data.status}
              </div>
            </div>
          </div>

          {/* Footer: acreditación ONAC */}
          <div className="mt-8 flex items-center justify-between gap-6 border-t border-[var(--diploma-accent,#c89a35)]/40 pt-4">
            <div className="text-[9px] uppercase tracking-[0.25em] text-slate-500">
              Documento con valor probatorio
            </div>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/onac-logo.svg" alt="ONAC" className="h-10 w-auto" />
              <div className="leading-tight">
                <div className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-amber-700">
                  En proceso de acreditación
                </div>
                <div className="text-[7px] uppercase tracking-[0.2em] text-slate-500">
                  Organismo Nacional de Acreditación de Colombia
                </div>
              </div>
            </div>
            <div className="text-right text-[9px] uppercase tracking-[0.25em] text-slate-500">
              ISO/IEC 17024
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .diploma { width: 297mm; max-width: 100%; font-family: 'Garamond', 'EB Garamond', 'Cormorant Garamond', Georgia, 'Times New Roman', serif; }
        .diploma .font-serif { font-family: 'Garamond', 'EB Garamond', 'Cormorant Garamond', Georgia, 'Times New Roman', serif; }
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { background: white; }
          .diploma { width: 297mm; height: 210mm; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}

/// Esquinero ornamental dorado (90×90). Se replica con flips en las 4 esquinas.
function CornerOrnament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 90" width="90" height="90" className={className} aria-hidden="true">
      <g fill="none" stroke="#c89a35" strokeWidth="1.5">
        <path d="M 10 30 L 10 10 L 30 10" />
        <path d="M 14 34 L 14 14 L 34 14" />
        <path d="M 25 25 L 18 18 L 25 11 L 32 18 Z" fill="#c89a35" />
        <path d="M 14 35 Q 25 40 35 35" />
        <path d="M 35 14 Q 40 25 35 35" />
      </g>
    </svg>
  );
}
