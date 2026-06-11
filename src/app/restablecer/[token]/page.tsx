import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ResetForm } from "@/components/reset-form";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Restablecer contraseña" };

const APP_NAME = "CIOC";

/**
 * /restablecer/[token] — pantalla para definir la nueva contraseña.
 *
 * Validamos server-side que el token sea VÁLIDO y NO HAYA EXPIRADO antes
 * de renderizar el formulario. Si está vencido o no existe, mostramos un
 * mensaje claro con la opción de volver a solicitar el correo — sin
 * exponer el formulario para no permitir intentos a ciegas.
 *
 * Mantiene el mismo layout dos-columnas de /recuperar para coherencia
 * visual; usa la paleta navy del manual de marca de RISKS.
 */
export default async function RestablecerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const isValid = token && token.length >= 8
    ? !!(await prisma.user.findFirst({
        where: { resetToken: token, resetTokenExpires: { gt: new Date() } },
        select: { id: true },
      }))
    : false;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        {/* ── Columna izquierda: branding ── */}
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 p-12 lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

          <header className="relative">
            <Link href="/" className="inline-flex items-center gap-3 text-white">
              <div className="grid h-12 w-12 place-items-center rounded-md bg-white text-base font-extrabold text-brand-900">
                CI
              </div>
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
              Defina su nueva contraseña
            </h2>
            <p className="mt-3 max-w-sm text-sm text-white/70">
              Una vez la confirme, todas las sesiones activas se cerrarán y volveremos a la
              pantalla de inicio de sesión.
            </p>

            <ul className="mt-8 space-y-3 text-sm text-white/80">
              <Tip text="Mínimo 8 caracteres." />
              <Tip text="Use combinaciones difíciles de adivinar: letras, números y símbolos." />
              <Tip text="No reutilice contraseñas de otros servicios." />
            </ul>
          </div>

          <footer className="relative text-[11px] text-white/50">
            <p>Enlace de un solo uso. Si cierra esta página, deberá solicitar uno nuevo.</p>
          </footer>
        </aside>

        {/* ── Columna derecha ── */}
        <section className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-white p-8 shadow-premium ring-1 ring-slate-200">
              {isValid ? (
                <>
                  <h1 className="text-xl font-bold text-brand-900">Nueva contraseña</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Defina una nueva contraseña para su cuenta. Necesita 8 caracteres como mínimo.
                  </p>
                  <div className="mt-6">
                    <ResetForm token={token} />
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-3xl">
                    ⛔
                  </div>
                  <h1 className="mt-3 text-xl font-bold text-brand-900">Enlace no válido</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Este enlace de restablecimiento ya expiró, fue utilizado o nunca existió.
                    Por su seguridad, solicite uno nuevo y úselo dentro de la hora siguiente.
                  </p>
                  <Link
                    href="/recuperar"
                    className="mt-5 inline-flex items-center justify-center rounded-lg btn-grad-navy px-5 py-2.5 text-sm font-bold text-white shadow-sm"
                  >
                    Solicitar un nuevo enlace
                  </Link>
                  <div className="mt-3 text-[12px]">
                    <Link href="/login" className="font-semibold text-brand-700 hover:underline">
                      ← Volver a iniciar sesión
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <p className="mt-4 text-center text-[11px] text-slate-400">
              ¿No fue usted quien solicitó el cambio? Ignore este correo y notifique al
              administrador de su organismo.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-[10px] text-white ring-1 ring-white/20">
        ✓
      </span>
      <span className="leading-snug">{text}</span>
    </li>
  );
}
