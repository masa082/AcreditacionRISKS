import { BRAND } from "@/lib/brand";
import { getBrandAssets } from "@/lib/brand-assets";

/**
 * Mockup premium ilustrativo de un certificado RISKS INTERNATIONAL.
 * NO es un certificado real; soporte visual del hero de la landing.
 *
 * Decisiones de estilo (alineadas con el manual de marca de RISKS):
 *  - Paleta NAVY + grises. Sin dorado ni amarillo.
 *  - Doble marco "papel" con sutil rotación para sensación de profundidad.
 *  - Marca de agua MUY discreta (opacity-[0.025]) sin tapar nada legible.
 *  - SIN texto lateral rotado (versión anterior se superponía sobre el
 *    cuerpo del certificado; reemplazado por un chip "ISO/IEC 17024"
 *    en la base, que respira y no colisiona).
 *  - QR animado con halo "ping" que llama la atención a la verificación
 *    pública.
 *  - Sello "VERIFICABLE" con shimmer + hover-rotate.
 *  - Entrada con fade-in + scale al cargar; flotación continua suave.
 *
 * Las animaciones declaradas aquí usan utilidades extra de globals.css
 * (animate-shimmer, animate-ping-soft, cert-reveal).
 */
export async function CertificateMock({ tilt = true }: { tilt?: boolean }) {
  const { logoUrl } = await getBrandAssets();
  return (
    <div className="certificate-mock relative mx-auto w-full max-w-md select-none">
      {/* Capa "sombra de papel" detrás — dos hojas que dan sensación de
          expediente con varias copias. */}
      <div
        aria-hidden
        className={`absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${
          tilt ? "rotate-[2deg]" : ""
        }`}
      />
      <div
        aria-hidden
        className={`absolute inset-0 -translate-x-2 -translate-y-2 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 ${
          tilt ? "rotate-[-3deg] opacity-60" : ""
        }`}
      />

      {/* Certificado principal — la "hoja" del frente */}
      <div
        className={`certificate-paper group relative rounded-2xl bg-white shadow-premium ring-1 ring-slate-200 transition-all duration-700 ${
          tilt ? "rotate-[-1.5deg]" : ""
        } hover:rotate-0 hover:scale-[1.015] hover:shadow-[0_24px_60px_rgba(11,31,58,0.18)]`}
      >
        {/* Marca de agua MUY sutil en diagonal — no compite con el texto.
            Antes era 0.04; bajamos a 0.025 para que no se note como un
            "texto superpuesto" sino como una textura de fondo. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl">
          <span className="rotate-[-20deg] text-[110px] font-black tracking-tighter text-brand-900 opacity-[0.025]">
            RISKS
          </span>
        </div>

        {/* Marco interno con anillo navy. */}
        <div className="relative m-3 rounded-xl ring-1 ring-brand-900/15">
          {/* Esquinas decorativas tipo diploma. */}
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />

          {/* Padding generoso para evitar colisiones con esquinas. */}
          <div className="rounded-lg px-6 py-7 text-center">
            {/* Encabezado: logo oficial o wordmark */}
            <div className="flex items-center justify-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={BRAND.shortName} className="h-10 w-auto" />
              ) : (
                <div className="text-left leading-tight">
                  <div className="text-[11px] font-extrabold tracking-[0.3em] text-brand-900">
                    {BRAND.shortName}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400">
                    S.A.S. · {BRAND.isoNorm}
                  </div>
                </div>
              )}
            </div>

            {/* Etiqueta "Certificado de Competencias" con shimmer ligero. */}
            <div className="relative mt-4 inline-flex overflow-hidden rounded-full bg-brand-50 px-3 py-0.5 ring-1 ring-brand-900/15">
              <span className="text-[9px] font-bold uppercase tracking-widest text-brand-900">
                Certificado de Competencias
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent"
              />
            </div>

            {/* Cuerpo del certificado */}
            <p className="mt-5 text-[11px] text-slate-500">Certifica que</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-brand-900">
              Nombre del Profesional
            </p>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">
              ha demostrado idoneidad y cumple con los estándares de competencia para la certificación
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800">
              Oficial de Cumplimiento SARLAFT
            </p>

            {/* Bloque inferior: datos a la izquierda, QR a la derecha. */}
            <div className="mt-6 flex items-end justify-between gap-3">
              <div className="text-left text-[10px] leading-tight text-slate-500">
                <div>
                  <span className="font-semibold text-slate-700">Emisión:</span> 03 jun 2026
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Vigencia:</span> 03 jun 2029
                </div>
                <div className="mt-2 border-t border-slate-300 pt-1">
                  <div className="font-semibold text-slate-700">Firma autorizada</div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-400">
                    {BRAND.shortName}
                  </div>
                </div>
              </div>

              {/* QR + estado VIGENTE. */}
              <div className="text-center">
                <div className="relative">
                  <span
                    aria-hidden
                    className="absolute -inset-1 animate-ping-soft rounded-md bg-brand-900/15"
                  />
                  <div className="relative grid h-16 w-16 place-items-center rounded bg-brand-900 text-[8px] font-bold text-white">
                    <div className="absolute inset-1 grid grid-cols-5 gap-px">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <span
                          key={i}
                          className={
                            i % 3 === 0 || i === 7 || i === 12 || i === 17
                              ? "bg-white"
                              : "bg-transparent"
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-700">
                  CERT-2026-A4F2
                </div>
                <div className="mt-0.5 inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  VIGENTE
                </div>
              </div>
            </div>

            {/* Chip "ISO/IEC 17024" en la base — reemplaza la banda lateral
                rotada que se superponía sobre el contenido. */}
            <div className="mt-5 flex items-center justify-center gap-1.5">
              <span aria-hidden className="h-px w-6 bg-slate-300" />
              <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.3em] text-brand-900/60">
                {BRAND.isoNorm}
              </span>
              <span aria-hidden className="h-px w-6 bg-slate-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Sello "VERIFICABLE" — navy con LED verde + shimmer + hover-rotate. */}
      <span
        aria-hidden
        className="absolute -right-3 -top-3 inline-flex items-center gap-1 overflow-hidden rounded-full bg-brand-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-xl transition-transform duration-500 group-hover:rotate-12"
      >
        <span className="relative z-10 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40" />
        <span className="relative z-10">Verificable</span>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
      </span>
    </div>
  );
}

/** Esquina decorativa estilo "diploma" — 4 ángulos navy en cada vértice. */
function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = "pointer-events-none absolute h-3 w-3 border-brand-900/40";
  const cls = {
    tl: "left-1 top-1 border-l-2 border-t-2",
    tr: "right-1 top-1 border-r-2 border-t-2",
    bl: "left-1 bottom-1 border-l-2 border-b-2",
    br: "right-1 bottom-1 border-r-2 border-b-2",
  }[pos];
  return <span aria-hidden className={`${base} ${cls}`} />;
}
