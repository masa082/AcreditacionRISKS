import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSubscriberPage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { dateOnly } from "@/lib/format";

export const metadata = { title: "Certificados del candidato" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  CERTIFICATION: "Certificado de competencias",
  EXAM_PRESENTATION: "Constancia de presentación",
};

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "slate"> = {
  VALID: "green",
  EXPIRED: "amber",
  SUSPENDED: "red",
  WITHDRAWN: "red",
  CANCELLED: "slate",
};

const STATUS_LABEL: Record<string, string> = {
  VALID: "Vigente",
  EXPIRED: "Vencido",
  SUSPENDED: "Suspendido",
  WITHDRAWN: "Retirado",
  CANCELLED: "Anulado",
};

/**
 * Lista los certificados de un candidato — pensada para abrirse en
 * nueva pestaña desde el pill "🎓 Certificado" en la tabla de candidatos.
 * Cada certificado incluye links a:
 *  - PDF (token de verificación de 192 bits) en nueva pestaña
 *  - Página pública de verificación con QR
 *  - Insignia OG (LinkedIn preview)
 */
export default async function CandidateCertificatesPanelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { subscriberId } = await requireSubscriberPage();
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, documentNumber: true, email: true, subscriberId: true },
  });
  if (!candidate || candidate.subscriberId !== subscriberId) notFound();

  const certs = await prisma.certificate.findMany({
    where: { candidateId: id, subscriberId },
    orderBy: { issuedAt: "desc" },
    include: {
      enrollment: { select: { code: true } },
      scheme: { select: { name: true } },
    },
  });

  const fullName = `${candidate.firstName} ${candidate.lastName}`.trim();

  return (
    <>
      <PageHeader
        title={`Certificados de ${fullName}`}
        subtitle={`${candidate.documentNumber ?? "—"} · ${candidate.email}`}
        actions={
          <Link
            href={`/panel/candidatos/${candidate.id}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            ← Volver a la ficha
          </Link>
        }
      />

      {certs.length === 0 ? (
        <Card className="p-5"><EmptyState>Este candidato aún no tiene certificados emitidos.</EmptyState></Card>
      ) : (
        <div className="space-y-4">
          {certs.map((c) => {
            const isExpired = c.expiresAt && c.status === "VALID" && c.expiresAt < new Date();
            const effective = isExpired ? "EXPIRED" : c.status;
            const tone = STATUS_TONE[effective] ?? "slate";
            const typeLabel = TYPE_LABEL[c.type] ?? c.type;
            const isCertification = c.type === "CERTIFICATION";
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={tone}>{STATUS_LABEL[effective] ?? effective}</Badge>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${
                        isCertification
                          ? "bg-gold-50 text-gold-700 ring-gold-200"
                          : "bg-sky-50 text-sky-800 ring-sky-200"
                      }`}>
                        {isCertification ? "🎓 Certificación" : "📄 Constancia"}
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-base font-bold text-slate-900">{c.title}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {typeLabel}
                      {c.enrollment?.code ? <> · Folio <span className="font-mono">{c.enrollment.code}</span></> : null}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Código</div>
                    <div className="mt-0.5 font-mono text-xs font-bold text-slate-800">{c.code}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Emitido</div>
                    <div className="mt-0.5 text-sm text-slate-700">{dateOnly(c.issuedAt)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Vence</div>
                    <div className="mt-0.5 text-sm text-slate-700">{c.expiresAt ? dateOnly(c.expiresAt) : "—"}</div>
                  </div>
                </div>
                <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
                  <a
                    href={`/verificar/${encodeURIComponent(c.code)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    🔗 Página pública de verificación
                  </a>
                  <a
                    href={`/api/certificate/${encodeURIComponent(c.code)}/og`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[#0a66c2]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#0a66c2] hover:bg-[#eff6ff]"
                    title="Insignia que se ve en LinkedIn al compartir"
                  >
                    🎖️ Insignia (LinkedIn preview)
                  </a>
                  <a
                    href={`/api/certificate/${c.verifyToken}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg btn-grad-navy px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                  >
                    ⬇ Ver PDF
                  </a>
                </footer>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
