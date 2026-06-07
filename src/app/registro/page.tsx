import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "@/components/register-form";
import { CERTIFICATIONS } from "@/lib/brand";
import { OnacBadge } from "@/components/onac-badge";
import { ProcessSteps } from "@/components/process-steps";
import { getServerLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/language-switcher";

export const metadata = { title: "Registro de candidato" };

const APP_NAME = "CIOC";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; cert?: string }>;
}) {
  const { org, cert } = await searchParams;
  const locale = await getServerLocale();

  const subscribers = await prisma.subscriber.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    orderBy: { legalName: "asc" },
    select: { slug: true, tradeName: true, legalName: true, logoUrl: true },
  });
  const orgs = subscribers.map((s) => ({
    slug: s.slug,
    name: s.tradeName ?? s.legalName,
    logoUrl: s.logoUrl,
  }));

  const lockedOrg =
    org && orgs.some((o) => o.slug === org) ? org : undefined;

  // Si la URL trae ?org=<slug> o solo hay un suscriptor disponible, mostramos
  // su logo de forma destacada en el encabezado del formulario. Si hay varios,
  // dejamos el branding genérico CIOC arriba (el form ya muestra el selector
  // de entidad certificadora) — esto evita mostrar un logo equivocado.
  const featuredOrg =
    orgs.length === 1
      ? orgs[0]
      : orgs.find((o) => o.slug === lockedOrg) ?? null;

  const certOptions = CERTIFICATIONS.map((c) => ({
    slug: c.slug,
    name: c.shortName,
    available: c.status === "AVAILABLE",
    status: c.status,
  }));
  const preselectedCert =
    cert && certOptions.some((o) => o.slug === cert && o.available) ? cert : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-b from-slate-50 to-white px-4 py-10">
      <div className="w-full max-w-4xl space-y-4">
        {/* Selector de idioma flotante: la página de registro no usa el
            header del landing, así que mantenemos el switcher visible para
            que el candidato pueda cambiar idioma antes de llenar el form. */}
        <div className="flex justify-end">
          <LanguageSwitcher initial={locale} />
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <div className="mb-6 text-center">
            {featuredOrg?.logoUrl ? (
              <div className="mb-4 flex items-center justify-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredOrg.logoUrl}
                  alt={featuredOrg.name}
                  className="h-16 w-auto object-contain"
                />
                <span className="text-2xl text-slate-300" aria-hidden>×</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/onac-logo.svg" alt="ONAC" className="h-14 w-auto object-contain" />
              </div>
            ) : null}
            <Link href="/" className="text-xl font-bold text-brand-800">
              {APP_NAME}
            </Link>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">
              Certificado de Idoneidad como Oficial de Cumplimiento
            </p>
            {featuredOrg ? (
              <p className="mt-2 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
                Organismo certificador: {featuredOrg.name}
              </p>
            ) : null}
            <h1 className="mt-4 text-lg font-semibold text-slate-900">
              {t("registro.title", locale)}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{t("registro.subtitle", locale)}</p>
            <div className="mt-3 inline-flex items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-800">
              EN PROCESO DE CERTIFICACIÓN ONAC
            </div>
          </div>

          {orgs.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-center text-sm text-amber-700 ring-1 ring-amber-200">
              No hay entidades certificadoras disponibles para registro en este
              momento.
            </p>
          ) : (
            <RegisterForm
              orgs={orgs.map(({ slug, name }) => ({ slug, name }))}
              lockedOrg={lockedOrg}
              certifications={certOptions}
              preselectedCert={preselectedCert}
              locale={locale}
            />
          )}
        </div>

        {/* Mapa de los 4 pasos del proceso de certificación. El primero
            (Registro) se marca como "actual" para que el candidato vea
            exactamente dónde está y qué viene después. */}
        <ProcessSteps currentStep={1} />

        {/* Badge ONAC visible bajo la tarjeta para reforzar respaldo */}
        <div className="flex justify-center">
          <OnacBadge variant="default" />
        </div>
      </div>
    </main>
  );
}
