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
    normReference: string | null;
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

/// Diploma imprimible (A4 horizontal). Usa `window.print()` para exportar a PDF.
export function Diploma({ data }: { data: DiplomaData }) {
  const annulled = ["WITHDRAWN", "CANCELLED"].includes(data.status);
  return (
    <div className="diploma mx-auto bg-white text-slate-900 shadow-lg ring-1 ring-slate-200 print:shadow-none print:ring-0">
      <div className="relative border-[10px] border-double border-brand-800 p-10">
        {annulled ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rotate-[-20deg] text-7xl font-black tracking-widest text-rose-200">ANULADO</span>
          </div>
        ) : null}

        <div className="text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-700">
            {data.org.name}
          </div>
          <div className="mt-1 text-xs text-slate-500">{data.org.legalName}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">Organismo de Certificación de Personas · ISO/IEC 17024</div>

          <h1 className="mt-8 text-3xl font-bold text-slate-900">
            {data.type === "EXAM_PRESENTATION" ? "Constancia de Presentación de Examen" : "Certificado de Competencias"}
          </h1>
          <p className="mt-6 text-sm text-slate-500">{data.type === "EXAM_PRESENTATION" ? "Hace constar que" : "Certifica que"}</p>
          <p className="mt-2 text-2xl font-semibold text-brand-900">{data.holderName}</p>
          {data.documentNumber ? <p className="mt-1 text-sm text-slate-500">Documento de identidad N.º {data.documentNumber}</p> : null}

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-600">
            {data.type === "EXAM_PRESENTATION"
              ? "presentó la evaluación correspondiente a"
              : "ha demostrado idoneidad y cumple con los estándares de competencia definidos para la certificación"}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{data.title}</p>
          {data.scope ? <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-slate-500">Alcance: {data.scope}</p> : null}
        </div>

        <div className="mt-10 flex items-end justify-between gap-6">
          <div className="text-xs text-slate-500">
            <div><span className="font-semibold text-slate-700">Emisión:</span> {d(data.issuedAt)}</div>
            <div><span className="font-semibold text-slate-700">Vigencia hasta:</span> {data.expiresAt ? d(data.expiresAt) : "No vence"}</div>
            {data.org.normReference ? <div className="mt-1">Referencia: {data.org.normReference}</div> : null}
            <div className="mt-3 border-t border-slate-300 pt-1 text-center">
              <div className="font-semibold text-slate-700">{data.org.authorizedSigner ?? data.org.legalName}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Firma autorizada</div>
            </div>
          </div>

          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.qr} alt="Código QR de verificación" className="mx-auto h-28 w-28" />
            <div className="mt-1 font-mono text-xs text-slate-700">{data.code}</div>
            <div className="text-[10px] text-slate-400">Verifique en {verifyUrl(data.code).replace(/^https?:\/\//, "")}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Estado: {STATUS_LABEL[data.status] ?? data.status}</div>
          </div>
        </div>
      </div>

      <style>{`
        .diploma { width: 297mm; max-width: 100%; }
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { background: white; }
          .diploma { width: 297mm; height: 210mm; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
