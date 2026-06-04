import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WhatsAppFloat } from "@/components/landing/whatsapp-float";
import { InviteToCertifyForm } from "@/components/invite-to-certify-form";

export const metadata = {
  title: "Verificar certificado | RISKS INTERNATIONAL",
  description: "Verifique la autenticidad y vigencia de un certificado de competencias emitido por RISKS INTERNATIONAL. Búsqueda por código o por número de identificación.",
};

const APP_NAME = "CIOC";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  VALID: { label: "VIGENTE", tone: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  EXPIRED: { label: "VENCIDO", tone: "bg-amber-100 text-amber-700 ring-amber-200" },
  SUSPENDED: { label: "SUSPENDIDO", tone: "bg-rose-100 text-rose-700 ring-rose-200" },
  WITHDRAWN: { label: "ANULADO", tone: "bg-rose-100 text-rose-700 ring-rose-200" },
  CANCELLED: { label: "ANULADO", tone: "bg-slate-100 text-slate-600 ring-slate-200" },
};

function detectKind(value: string): "code" | "document" {
  const v = value.trim();
  // Si tiene guiones o letras es código; si son solo dígitos (≤ 20) es documento.
  if (/^\d{4,20}$/.test(v)) return "document";
  return "code";
}

async function search(formData: FormData) {
  "use server";
  const q = String(formData.get("q") ?? "").trim();
  if (!q) return;
  const kind = detectKind(q);
  if (kind === "code") {
    redirect(`/verificar/${encodeURIComponent(q)}`);
  } else {
    redirect(`/verificar?doc=${encodeURIComponent(q)}`);
  }
}

interface SP { doc?: string; q?: string }

export default async function VerificarPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const docQuery = sp.doc?.trim();
  const now = new Date();

  let matches: Awaited<ReturnType<typeof prisma.certificate.findMany>> = [];
  if (docQuery) {
    matches = await prisma.certificate.findMany({
      where: {
        type: "CERTIFICATION",
        OR: [
          { documentNumber: { contains: docQuery, mode: "insensitive" } },
          { candidate: { is: { documentNumber: docQuery } } },
        ],
      },
      orderBy: { issuedAt: "desc" },
      take: 20,
    });
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex flex-col leading-none">
            <span className="text-lg font-bold text-brand-800">{APP_NAME}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">
              Certificado de Idoneidad como Oficial de Cumplimiento
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/registro" className="text-sm font-semibold text-brand-800 hover:underline">
              Certifícate
            </Link>
            <Link href="/login" className="text-sm text-slate-600 hover:text-brand-800">
              Ingresar
            </Link>
          </div>
        </div>
      </header>

      {/* Formulario de verificación */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-3xl px-6 py-14">
          <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">
            Verificar autenticidad de un certificado
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Ingrese el <strong>código del certificado</strong> (impreso en el documento o codificado en el QR) <strong>o el número de identificación</strong> del titular para validar su estado y vigencia.
          </p>

          <form action={search} className="mt-6 flex gap-2">
            <input
              name="q"
              required
              defaultValue={sp.q ?? sp.doc ?? ""}
              placeholder="Ej. CERT-2026-XXXX  o  número de cédula"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
            >
              Verificar
            </button>
          </form>

          <p className="mt-3 text-xs text-slate-400">
            La verificación es pública. Sólo se muestra la información estrictamente necesaria para confirmar autenticidad y vigencia.
          </p>

          {/* Resultados por documento */}
          {docQuery ? (
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-sm font-bold text-brand-900">
                Resultados para el documento <span className="font-mono">{docQuery}</span>
              </h2>
              {matches.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No se encontraron certificados emitidos a nombre de este documento.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {matches.map((c) => {
                    const isExpired = c.status === "VALID" && c.expiresAt && c.expiresAt < now;
                    const st = STATUS_LABEL[isExpired ? "EXPIRED" : c.status] ?? STATUS_LABEL.VALID;
                    return (
                      <li key={c.id} className="rounded-lg bg-white p-4 ring-1 ring-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-brand-900">{c.holderName}</div>
                            <div className="text-xs text-slate-500">{c.title}</div>
                            <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
                              <span>Código: <span className="font-mono font-semibold text-brand-800">{c.code}</span></span>
                              <span>Emisión: {c.issuedAt.toLocaleDateString("es-CO")}</span>
                              <span>Vence: {c.expiresAt ? c.expiresAt.toLocaleDateString("es-CO") : "No vence"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${st.tone}`}>{st.label}</span>
                            <Link href={`/verificar/${encodeURIComponent(c.code)}`} className="rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-50">Ver verificación</Link>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* Sección educativa */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-700">
              Sobre la certificación de competencias
            </span>
            <h2 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">
              ¿Qué es certificarse en competencias profesionales?
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              La certificación de competencias es el proceso mediante el cual un organismo independiente evalúa formalmente si una persona cumple con los conocimientos, habilidades y criterio profesional definidos para un perfil. RISKS INTERNATIONAL opera bajo los principios de la norma <strong>ISO/IEC 17024</strong>.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              { icon: "🎯", title: "Acredita lo que sabes", desc: "El certificado prueba ante empleadores y clientes que sus competencias fueron evaluadas por un tercero independiente." },
              { icon: "🔍", title: "Verificable públicamente", desc: "Cada certificado tiene un código único y un QR que cualquier persona puede validar en esta página." },
              { icon: "📅", title: "Vigencia controlada", desc: "Los certificados tienen vigencia de 3 años. El sistema avisa al titular antes del vencimiento para iniciar la recertificación." },
            ].map((b) => (
              <div key={b.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-3xl">{b.icon}</div>
                <h3 className="mt-3 font-bold text-brand-900">{b.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* Proceso resumido */}
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-brand-900">El proceso de certificación en 6 pasos</h3>
            <ol className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["01", "Inscribirse", "Crea tu cuenta y elige el programa de tu interés."],
                ["02", "Autorizar datos", "Aceptas la política de tratamiento de datos personales."],
                ["03", "Pagar la inscripción", "Pago seguro con verificación humana o pasarela."],
                ["04", "Presentar evaluación", "Examen teórico + caso práctico, en línea con control de integridad."],
                ["05", "Recibir resultados", "Calificación automática u manual con rúbricas + revisión del comité."],
                ["06", "Obtener certificado", "Diploma digital con código QR para que cualquiera lo verifique."],
              ].map(([n, t, d]) => (
                <li key={n} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gold-600">Paso {n}</div>
                  <div className="mt-1 text-sm font-bold text-brand-900">{t}</div>
                  <p className="mt-1 text-xs text-slate-600">{d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 p-4">
              <div>
                <div className="text-sm font-bold text-brand-900">¿Quieres certificarte tú también?</div>
                <div className="text-xs text-slate-600">Conoce los programas activos y comienza tu proceso en línea.</div>
              </div>
              <div className="flex gap-2">
                <Link href="/certificaciones" className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50">Ver certificaciones</Link>
                <Link href="/registro?cert=sarlaft" className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-bold text-white hover:bg-brand-900">Certifícate ahora</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Invitación a certificarse */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              Invita a un colega
            </span>
            <h2 className="mt-3 text-2xl font-bold text-brand-900 sm:text-3xl">
              ¿Conoce a alguien que debería certificar sus competencias?
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Compártale información del programa. Le contactaremos con los detalles del proceso, costos y próxima cohorte. Si se inscribe, podrá apuntarse a nuestro <Link href="/refiere-y-gana" className="font-semibold text-brand-800 underline">programa de referidos</Link> y recibir una recompensa.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              {[
                "Sin compromiso: solo enviamos la información del programa.",
                "Datos tratados conforme a la Ley 1581/2012.",
                "También puede compartir directamente el enlace por WhatsApp.",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">✓</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={`https://wa.me/?text=${encodeURIComponent("Te recomiendo certificar tus competencias profesionales con RISKS INTERNATIONAL. Conoce los programas: https://www.okacreditado.com/certificaciones")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                🟢 Compartir por WhatsApp
              </Link>
              <Link
                href="/refiere-y-gana"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
              >
                Programa de referidos →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h3 className="text-base font-bold text-brand-900">Enviar información a un colega</h3>
            <p className="mt-1 text-xs text-slate-500">
              Diligencie los datos del referido — le contactaremos con la información del programa.
            </p>
            <div className="mt-4">
              <InviteToCertifyForm />
            </div>
          </div>
        </div>
      </section>

      <WhatsAppFloat />
    </main>
  );
}
