import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { OnacBadge } from "@/components/onac-badge";


export const dynamic = 'force-dynamic';
const APP_NAME = "CIOC";
const HOME: Record<string, string> = {
  PLATFORM: "/admin",
  SUBSCRIBER: "/panel",
  CANDIDATE: "/portal",
};

export const metadata = { title: "Ingresar" };

/// Pantalla de login con diseño split-screen profesional:
///   – Izquierda (lg+): panel de marca con bullets de valor + ONAC.
///   – Derecha: formulario de acceso en tarjeta blanca con bordes
///     redondeados y sombra sutil.
///
/// El campo "Identificador de organización" SOLO aparece cuando hay
/// más de un suscriptor activo en la plataforma — si RISKS es el único
/// organismo, se oculta para simplificar el formulario.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const ctx = await getCurrentUser();
  if (ctx) redirect(HOME[ctx.type] ?? "/portal");
  const { reset } = await searchParams;

  // Conteo de suscriptores activos para decidir si mostrar el campo "org".
  const activeSubscribers = await prisma.subscriber.count({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
  });
  const showOrgField = activeSubscribers > 1;

  // Datos del único suscriptor para personalizar el panel izquierdo
  const featured =
    activeSubscribers === 1
      ? await prisma.subscriber.findFirst({
          where: { status: { in: ["ACTIVE", "TRIAL"] } },
          select: { tradeName: true, legalName: true, logoUrl: true },
        })
      : null;
  const orgName = featured?.tradeName ?? featured?.legalName ?? null;

  return (
    <main className="relative min-h-screen bg-slate-50">
      {/* Decoración sutil de fondo: gradientes radiales muy claros */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-100 opacity-50 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-100 opacity-40 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-0 lg:grid-cols-2">
        {/* ─── Columna izquierda: marca y propuesta de valor ────────── */}
        <aside className="hidden flex-col justify-between p-12 lg:flex">
          <Link href="/" className="inline-flex items-center gap-3">
            {featured?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={featured.logoUrl} alt={orgName ?? ""} className="h-14 w-auto rounded bg-white p-1 ring-1 ring-slate-200" />
            ) : null}
            <div>
              <div className="text-2xl font-bold text-brand-900">{APP_NAME}</div>
              {orgName ? (
                <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                  {orgName}
                </div>
              ) : null}
            </div>
          </Link>

          <div className="my-12 max-w-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
              Plataforma oficial · ISO/IEC 17024
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900">
              Certifique competencias con respaldo y trazabilidad.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Acceda a su panel para gestionar candidatos, programar evaluaciones, emitir
              certificados verificables y operar todo su organismo certificador desde un solo
              lugar.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              {[
                ["✓", "Procesos auditables con AuditLog y evidencia digital."],
                ["✓", "Pagos en línea y consignación con soporte verificable."],
                ["✓", "Certificados con QR público y validación criptográfica."],
                ["✓", "Multi-suscriptor con datos aislados por organismo."],
              ].map(([icon, text]) => (
                <li key={text} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-end justify-between gap-4">
            <p className="max-w-[18rem] text-[10px] leading-relaxed text-slate-500">
              Plataforma operada por el organismo certificador con respaldo del proceso de
              acreditación.
            </p>
            <OnacBadge variant="default" />
          </div>
        </aside>

        {/* ─── Columna derecha: formulario ──────────────────────────── */}
        <section className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md">
            {/* Branding minimal visible también en móvil */}
            <div className="mb-6 text-center lg:hidden">
              <Link href="/" className="inline-block text-2xl font-bold text-brand-900">
                {APP_NAME}
              </Link>
              {orgName ? <div className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700">{orgName}</div> : null}
              <p className="mt-1 text-xs text-slate-500">ISO/IEC 17024</p>
            </div>

            <div className="rounded-2xl bg-white p-7 shadow-xl shadow-slate-200/60 ring-1 ring-slate-200 sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Iniciar sesión</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Acceda a su panel de administración o al portal del candidato.
                </p>
              </div>

              {reset ? (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
                  <span aria-hidden className="text-base">✓</span>
                  <span>Su contraseña se actualizó. Inicie sesión con la nueva contraseña.</span>
                </div>
              ) : null}

              <LoginForm showOrgField={showOrgField} />

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-center text-sm text-slate-600">
                  ¿No tiene cuenta?{" "}
                  <Link href="/registro" className="font-semibold text-brand-700 hover:text-brand-900 hover:underline">
                    Regístrese como candidato
                  </Link>
                </p>
              </div>
            </div>

            {/* Enlaces legales y badge ONAC para móvil */}
            <div className="mt-6 lg:hidden">
              <div className="flex justify-center">
                <OnacBadge variant="default" />
              </div>
            </div>
            <p className="mt-5 text-center text-[10px] text-slate-400">
              Al ingresar acepta nuestros{" "}
              <Link href="/terminos" className="underline hover:text-slate-600">Términos</Link>{" "}
              y la{" "}
              <Link href="/privacidad" className="underline hover:text-slate-600">Política de Datos</Link>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
