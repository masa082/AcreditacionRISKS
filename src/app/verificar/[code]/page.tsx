import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Resultado de verificación" };

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AcreditaPro";

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
          <Link href="/" className="text-lg font-bold text-brand-800">
            {APP_NAME}
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
              className="mt-6 inline-block rounded-lg bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
            >
              Volver a verificar
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
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
          </div>
        )}
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
