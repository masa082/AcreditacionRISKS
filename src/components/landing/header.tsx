import Link from "next/link";
import { BRAND, CTAS } from "@/lib/brand";
import { getBrandAssets } from "@/lib/brand-assets";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/certificaciones", label: "Certificaciones" },
  { href: "/#beneficios", label: "Beneficios" },
  { href: "/#proceso", label: "Proceso" },
  { href: "/verificar", label: "Verificar certificado" },
  { href: "/refiere-y-gana", label: "Refiere y gana" },
  { href: "/preguntas-frecuentes", label: "FAQ" },
  { href: "/contacto", label: "Contacto" },
];

export async function LandingHeader() {
  const { logoUrl } = await getBrandAssets();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-3 text-brand-800">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`${BRAND.shortName} ${BRAND.fullName}`} className="h-12 w-auto" />
          ) : (
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight text-brand-800">{BRAND.shortName}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">S.A.S. · {BRAND.isoNorm}</div>
            </div>
          )}
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-slate-600 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="font-medium hover:text-brand-800">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={CTAS.login.href}
            className="hidden rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-block"
          >
            {CTAS.login.label}
          </Link>
          <Link
            href={CTAS.certify.href}
            className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            {CTAS.certify.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
