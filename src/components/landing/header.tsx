import Link from "next/link";
import { BRAND, CTAS } from "@/lib/brand";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/certificaciones", label: "Certificaciones" },
  { href: "/#beneficios", label: "Beneficios" },
  { href: "/#proceso", label: "Proceso" },
  { href: "/verificar", label: "Verificar certificado" },
  { href: "/preguntas-frecuentes", label: "FAQ" },
  { href: "/contacto", label: "Contacto" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-brand-800">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-800 to-cyan-600 text-sm font-black text-white shadow-sm">R</span>
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">{BRAND.shortName}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">{BRAND.tagline}</div>
          </div>
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
            className="rounded-lg bg-gradient-to-r from-brand-800 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-brand-900 hover:to-brand-700"
          >
            {CTAS.certify.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
