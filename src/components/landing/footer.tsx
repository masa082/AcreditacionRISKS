import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { getBrandAssets } from "@/lib/brand-assets";

export async function LandingFooter() {
  const year = 2026;
  const { logoUrl } = await getBrandAssets();
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={BRAND.shortName} className="h-12 w-auto brightness-0 invert" />
              ) : (
                <strong className="text-sm text-white">{BRAND.shortName} S.A.S.</strong>
              )}
            </div>
            <p className="mt-2 text-xs italic text-slate-300">&ldquo;{BRAND.slogan}&rdquo;</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              {BRAND.description} Operamos bajo los principios de la norma {BRAND.isoNorm} para la certificación de personas.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Certificaciones</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/certificaciones/sarlaft" className="hover:text-white">SARLAFT — Supertransporte</Link></li>
              <li><Link href="/certificaciones/sagrilaft" className="hover:text-white">SAGRILAFT — Supersociedades <span className="text-[10px] text-amber-300">(próx.)</span></Link></li>
              <li><Link href="/certificaciones" className="text-cyan-300 hover:text-cyan-200">Ver catálogo →</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plataforma</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/verificar" className="hover:text-white">Verificar certificado</Link></li>
              <li><Link href="/registro" className="hover:text-white">Crear cuenta</Link></li>
              <li><Link href="/login" className="hover:text-white">Iniciar sesión</Link></li>
              <li><Link href="/refiere-y-gana" className="hover:text-white">Refiere y gana 💸</Link></li>
              <li><Link href="/preguntas-frecuentes" className="hover:text-white">Preguntas frecuentes</Link></li>
              <li><Link href="/contacto" className="hover:text-white">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/terminos" className="hover:text-white">Términos y condiciones</Link></li>
              <li><Link href="/privacidad" className="hover:text-white">Política de tratamiento de datos</Link></li>
            </ul>
            {BRAND.contactEmail ? (
              <p className="mt-4 text-xs text-slate-400">
                <span className="block font-semibold text-slate-300">Contacto</span>
                <a href={`mailto:${BRAND.contactEmail}`} className="hover:text-white">{BRAND.contactEmail}</a>
              </p>
            ) : null}
            {BRAND.social.linkedin ? (
              <a href={BRAND.social.linkedin} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-cyan-300 hover:text-cyan-200">LinkedIn ↗</a>
            ) : null}
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-xs text-slate-500">
          <p>© {year} {BRAND.legalName}. Todos los derechos reservados. {BRAND.shortName} es un organismo de certificación de personas que opera bajo los principios de la norma {BRAND.isoNorm}.</p>
        </div>
      </div>
    </footer>
  );
}
