import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { OnacBadge } from "@/components/onac-badge";
import { BRAND } from "@/lib/brand";

/// Metadata Open Graph dinámica — LinkedIn, WhatsApp, X y otros
/// previsualizadores leen estos tags al pegar la URL de verificación.
/// La imagen viene de `/api/certificate/[code]/og` (Next ImageResponse
/// 1200×630) y muestra una insignia con el nombre del titular, el
/// esquema y el estado del certificado.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const decoded = decodeURIComponent(code);
  const cert = await prisma.certificate.findFirst({
    where: { OR: [{ code: decoded }, { verifyToken: decoded }] },
    select: { code: true, title: true, holderName: true, status: true, expiresAt: true },
  });
  const fallbackTitle = "Verificación de certificado";
  if (!cert) {
    return { title: fallbackTitle, description: "Verifique aquí la autenticidad de un certificado emitido por nuestro Organismo de Certificación de Personas." };
  }
  const isExpired = cert.expiresAt && cert.status === "VALID" && cert.expiresAt < new Date();
  const status = isExpired ? "VENCIDO" : cert.status === "VALID" ? "VIGENTE" : cert.status;
  const title = `${cert.holderName} · ${cert.title}`;
  const description = `Certificado ${status} ${cert.code}. Verifique la autenticidad de este certificado emitido conforme a ISO/IEC 17024.`;
  const ogUrl = `${BRAND.appUrl}/api/certificate/${encodeURIComponent(cert.code)}/og`;
  const pageUrl = `${BRAND.appUrl}/verificar/${encodeURIComponent(cert.code)}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `Insignia de certificación: ${cert.holderName}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

const APP_NAME = "CIOC";

const STATUS_INFO: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  VALID: { label: "VIGENTE", color: "text-emerald-700", bg: "bg-emerald-50 ring-emerald-200" },
  EXPIRED: { label: "VENCIDO", color: "text-amber-700", bg: "bg-amber-50 ring-amber-200" },
  SUSPENDED: { label: "SUSPENDIDO", color: "text-rose-700", bg: "bg-rose-50 ring-rose-200" },
  WITHDRAWN: { label: "RETIRADO", color: "text-rose-700", bg: "bg-rose-50 ring-rose-200" },
  CANCELLED: { label: "ANULADO", color: "text-rose-700", bg: "bg-rose-50 ring-rose-200" },
};

function maskDocument(doc?: string | null): string {
  if (!doc) return "—";
  if (doc.length <= 4) return "••••";
  return `${"•".repeat(Math.max(0, doc.length - 4))}${doc.slice(-4)}`;
}

export default async function VerificationResult({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const decoded = decodeURIComponent(code);

  const cert = await prisma.certificate.findFirst({
    where: { OR: [{ code: decoded }, { verifyToken: decoded }] },
    include: { subscriber: true, scheme: true },
  });

  // Recalcular vencimiento en caliente (sin alterar el estado almacenado).
  const isExpired =
    cert?.expiresAt && cert.status === "VALID" && cert.expiresAt < new Date();
  const effectiveStatus = isExpired ? "EXPIRED" : cert?.status;
  const info = effectiveStatus ? STATUS_INFO[effectiveStatus] : undefined;

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex flex-col leading-none">
            <span className="text-lg font-bold text-brand-800">{APP_NAME}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">
              Certificado de Idoneidad como Oficial de Cumplimiento
            </span>
          </Link>
          <Link href="/verificar" className="text-sm text-slate-600 hover:text-brand-800">
            Nueva verificación
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl px-6 py-12">
        {!cert ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <div className="text-5xl">🔍</div>
            <h1 className="mt-4 text-xl font-semibold text-slate-900">
              Certificado no encontrado
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              No existe ningún certificado con el código{" "}
              <span className="font-mono text-slate-700">{decoded}</span>.
              Verifique el código e intente nuevamente.
            </p>
            <Link
              href="/verificar"
              className="mt-6 inline-block rounded-lg btn-grad-navy px-5 py-2.5 text-sm font-semibold text-white"
            >
              Volver a verificar
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            {/* Encabezado de identidad: logo del suscriptor (izquierda) +
                logo ONAC con leyenda (derecha). Refuerza la confianza en el
                acto de la verificación. */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                {cert.subscriber.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cert.subscriber.logoUrl}
                    alt={cert.subscriber.tradeName ?? cert.subscriber.legalName}
                    className="h-12 w-auto object-contain"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-md bg-brand-50 text-base font-bold text-brand-800 ring-1 ring-brand-100">
                    {(cert.subscriber.tradeName ?? cert.subscriber.legalName).slice(0, 1)}
                  </div>
                )}
                <div className="leading-tight">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">
                    Organismo certificador
                  </div>
                  <div className="text-sm font-bold text-brand-900">
                    {cert.subscriber.tradeName ?? cert.subscriber.legalName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/onac-logo.svg" alt="ONAC" className="h-9 w-auto" />
                <div className="leading-tight">
                  <div className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-amber-800">
                    En proceso de
                  </div>
                  <div className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-amber-800">
                    Acreditación ONAC
                  </div>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-between px-6 py-4 ring-1 ${info?.bg ?? ""}`}>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Estado del certificado
                </div>
                <div className={`text-2xl font-bold ${info?.color ?? "text-slate-700"}`}>
                  {info?.label ?? effectiveStatus}
                </div>
              </div>
              <div className="text-4xl">
                {effectiveStatus === "VALID" ? "✅" : "⚠️"}
              </div>
            </div>

            <dl className="divide-y divide-slate-100 px-6 py-2 text-sm">
              <Row label="Certificado">{cert.title}</Row>
              <Row label="Código">
                <span className="font-mono">{cert.code}</span>
              </Row>
              <Row label="Titular">{cert.holderName}</Row>
              <Row label="Documento">{maskDocument(cert.documentNumber)}</Row>
              <Row label="Alcance">{cert.scope ?? cert.scheme?.scope ?? "—"}</Row>
              <Row label="Organismo certificador">
                {cert.subscriber.tradeName ?? cert.subscriber.legalName}
              </Row>
              <Row label="Fecha de emisión">
                {cert.issuedAt.toLocaleDateString("es-CO")}
              </Row>
              <Row label="Fecha de vencimiento">
                {cert.expiresAt
                  ? cert.expiresAt.toLocaleDateString("es-CO")
                  : "No vence"}
              </Row>
            </dl>
            <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
              Verificación pública generada el{" "}
              {new Date().toLocaleString("es-CO")}.
            </div>

            {/* Descarga segura del certificado. La URL usa el verifyToken
                (token aleatorio de 192 bits) en lugar de un ID secuencial,
                de modo que no es posible acceder a otros certificados
                cambiando un número en la URL. */}
            {(effectiveStatus === "VALID" || effectiveStatus === "EXPIRED") ? (
              <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    <strong className="text-slate-800">Descarga oficial protegida.</strong>{" "}
                    El enlace incluye un token criptográfico irreversible (≥192 bits) específico
                    de este certificado: no se pueden descargar certificados ajenos cambiando
                    secuencias en la URL.
                  </div>
                  <a
                    href={`/api/certificate/${cert.verifyToken}/pdf`}
                    rel="noopener"
                    className="inline-flex items-center gap-2 rounded-lg btn-grad-navy px-4 py-2 text-sm font-bold text-white shadow-sm"
                  >
                    <span aria-hidden>⬇</span>
                    Descargar certificado (PDF)
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        )}
        {/* Badge ONAC visible al pie del resultado de la verificación */}
        <div className="mt-6 flex justify-end">
          <OnacBadge variant="default" />
        </div>

        {/* Invitación abierta a otros profesionales — el candidato compartió
            esto en su LinkedIn. Aprovechamos el tráfico inbound como
            llamada a acción comercial. */}
        {cert && effectiveStatus === "VALID" ? (
          <section className="mt-8 overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                ¿También quiere certificarse en SARLAFT, SAGRILAFT u otro esquema?
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                Acabamos de verificar el certificado de un profesional. Inicie su propio
                proceso de certificación de personas conforme a <strong>ISO/IEC 17024</strong>
                con resultado verificable digitalmente como el que está viendo.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/registro"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 px-4 py-2 text-sm font-bold text-white shadow hover:from-brand-800 hover:to-brand-900"
              >
                🎯 Quiero certificarme
              </Link>
              <Link
                href="/certificaciones"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver certificaciones disponibles
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}
