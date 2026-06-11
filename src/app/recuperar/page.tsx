import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ForgotForm } from "@/components/forgot-form";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Recuperar contraseña" };

const APP_NAME = "CIOC";

/**
 * /recuperar — pantalla de solicitud de restablecimiento.
 *
 * Cambios respecto a la versión anterior:
 *  - Layout amplio con dos columnas en desktop: branding a la izquierda,
 *    formulario a la derecha. Mantiene tarjeta centrada en mobile.
 *  - Reemplaza el input libre de "slug de la organización" por un SELECT
 *    con la lista de SUSCRIPTORES ACTIVOS (TRIAL + ACTIVE). El candidato
 *    elige por nombre comercial y NO tiene que recordar el slug.
 *  - Paleta navy + grises del manual de marca de RISKS (sin gradiente
 *    azul-magenta antiguo). Tipografía consistente con el resto del sitio.
 *  - El logo del organismo aparece a la izquierda cuando hay uno solo
 *    publicado, dándole continuidad visual al candidato.
 */
export default async function RecuperarPage() {
  const subscribers = await prisma.subscriber.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    orderBy: { legalName: "asc" },
    select: { id: true, slug: true, tradeName: true, legalName: true, logoUrl: true },
  });
  const orgs = subscribers.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.tradeName ?? s.legalName,
    logoUrl: s.logoUrl,
  }));
  const featuredLogo = orgs.length === 1 ? orgs[0].logoUrl : null;
  const featuredName = orgs.length === 1 ? orgs[0].name : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        {/* ── Columna izquierda: branding (solo desktop) ── */}
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 p-12 lg:flex lg:flex-col lg:justify-between">
          {/* Halos decorativos */}
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

          <header className="relative">
            <Link href="/" className="inline-flex items-center gap-3 text-white">
              {featuredLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featuredLogo} alt={featuredName ?? APP_NAME} className="h-12 w-auto rounded-md bg-white p-1.5" />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-md bg-white text-base font-extrabold text-brand-900">
                  CI
                </div>
              )}
              <div className="leading-tight">
                <div className="font-display text-2xl font-extrabold">{APP_NAME}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                  {BRAND.shortName ?? "RISKS"} · {BRAND.isoNorm ?? "ISO/IEC 17024"}
                </div>
              </div>
            </Link>
          </header>

          <div className="relative">
            <h2 className="font-display text-3xl font-bold leading-tight text-white">
              ¿Olvidó su contraseña?
            </h2>
            <p className="mt-3 max-w-sm text-sm text-white/70">
              No se preocupe. Le enviaremos a su correo institucional un enlace seguro para
              definir una nueva contraseña — válido por <strong className="text-white">1 hora</strong>.
            </p>

            <ul className="mt-8 space-y-3 text-sm text-white/80">
              <Step n="1" text="Indique su correo y su organización." />
              <Step n="2" text="Recibirá un correo con un enlace personal y temporal." />
              <Step n="3" text="Al abrirlo, define una nueva contraseña y queda listo." />
            </ul>
          </div>

          <footer className="relative text-[11px] text-white/50">
            <p>Por su seguridad, el enlace expira automáticamente y solo es válido una vez.</p>
          </footer>
        </aside>

        {/* ── Columna derecha: formulario ── */}
        <section className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-white p-8 shadow-premium ring-1 ring-slate-200">
              <h1 className="text-xl font-bold text-brand-900">Recuperar contraseña</h1>
              <p className="mt-1 text-sm text-slate-500">
                Ingrese el correo de su cuenta y la organización a la que pertenece. Le enviaremos
                las instrucciones a su bandeja de entrada.
              </p>
              <div className="mt-6">
                <ForgotForm orgs={orgs} />
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] text-slate-400">
              ¿Tiene problemas para acceder? Contacte al administrador de su organismo o a{" "}
              <Link href="/contacto" className="font-semibold text-brand-700 hover:underline">
                soporte
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15 text-[11px] font-bold text-white ring-1 ring-white/20">
        {n}
      </span>
      <span className="leading-snug">{text}</span>
    </li>
  );
}
