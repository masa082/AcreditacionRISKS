import Link from "next/link";
import { BRAND, CTAS } from "@/lib/brand";
import { getBrandAssets } from "@/lib/brand-assets";
import { getServerLocale } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { t } from "@/lib/i18n/locale";

export async function LandingHeader() {
  const { logoUrl } = await getBrandAssets();
  const locale = await getServerLocale();
  // NAV se construye dentro de la función para que las etiquetas se traduzcan
  // según el locale del visitante (cookie `app-locale`).
  const NAV = [
    { href: "/", label: t("nav.home", locale) },
    { href: "/certificaciones", label: t("nav.certifications", locale) },
    { href: "/#beneficios", label: t("nav.benefits", locale) },
    { href: "/#proceso", label: t("nav.process", locale) },
    { href: "/verificar", label: t("nav.verify.long", locale) },
    { href: "/refiere-y-gana", label: t("nav.referrals", locale) },
    { href: "/preguntas-frecuentes", label: t("nav.faq", locale) },
    { href: "/contacto", label: t("nav.contact", locale) },
  ];
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
          <LanguageSwitcher initial={locale} />
          <Link
            href={CTAS.login.href}
            className="hidden rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-block"
          >
            {t("nav.login", locale)}
          </Link>
          <Link
            href={CTAS.certify.href}
            className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            {t("cta.start", locale)}
          </Link>
        </div>
      </div>
    </header>
  );
}
