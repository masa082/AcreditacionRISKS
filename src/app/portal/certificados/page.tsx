import Link from "next/link";
import { requireCandidatePage } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { dateOnly } from "@/lib/format";

export const metadata = { title: "Mis certificados" };

const STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "slate" }> = {
  VALID: { label: "Vigente", tone: "green" },
  EXPIRED: { label: "Vencido", tone: "amber" },
  SUSPENDED: { label: "Suspendido", tone: "red" },
  WITHDRAWN: { label: "Anulado", tone: "red" },
  CANCELLED: { label: "Anulado", tone: "slate" },
};

export default async function CandidateCertificatesPage() {
  const { candidateId } = await requireCandidatePage();
  const certs = await prisma.certificate.findMany({
    where: { candidateId },
    orderBy: { issuedAt: "desc" },
  });
  const now = new Date();

  return (
    <>
      <PageHeader title="Mis certificados" subtitle="Descargue y comparta sus certificados; cada uno es verificable por QR." />
      <Card>
        <div className="p-5">
          {certs.length === 0 ? (
            <EmptyState>Todavía no tiene certificados emitidos.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {certs.map((c) => {
                const expired = c.status === "VALID" && c.expiresAt && c.expiresAt < now;
                const st = STATUS[expired ? "EXPIRED" : c.status] ?? STATUS.VALID;
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <div className="font-medium text-slate-800">{c.title}</div>
                      <div className="text-xs text-slate-400">
                        Código {c.code} · emitido {dateOnly(c.issuedAt)}
                        {c.expiresAt ? ` · vence ${dateOnly(c.expiresAt)}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <Link href={`/certificado/${c.id}`} className="rounded-lg border border-brand-300 px-4 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50">
                        Ver / Descargar
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
