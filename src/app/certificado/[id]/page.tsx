import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { qrDataUrl } from "@/lib/certificate";
import { Diploma } from "@/components/diploma";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Certificado" };

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      subscriber: { select: { tradeName: true, legalName: true, authorizedSigner: true, logoUrl: true } },
      scheme: { select: { normReference: true } },
      candidate: { select: { userId: true } },
    },
  });
  if (!cert) notFound();

  // Autorización: candidato dueño o personal del suscriptor (mismo tenant).
  let allowed = false;
  if (ctx.type === "CANDIDATE") allowed = cert.candidate.userId === ctx.userId;
  else if (ctx.type === "SUBSCRIBER") allowed = ctx.subscriberId === cert.subscriberId && (can(ctx, PERMISSIONS.CERTIFICATE_VIEW) || can(ctx, PERMISSIONS.CERTIFICATE_ISSUE));
  if (!allowed) redirect(ctx.type === "CANDIDATE" ? "/portal" : "/panel");

  const qr = await qrDataUrl(cert.code);
  const back = ctx.type === "CANDIDATE" ? "/portal/certificados" : "/panel/certificados";

  return (
    <main className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[297mm] items-center justify-between print:hidden">
        <Link href={back} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
          Volver
        </Link>
        <PrintButton />
      </div>
      <Diploma
        data={{
          code: cert.code,
          type: cert.type,
          title: cert.title,
          holderName: cert.holderName,
          documentNumber: cert.documentNumber,
          scope: cert.scope,
          issuedAt: cert.issuedAt,
          expiresAt: cert.expiresAt,
          status: cert.status,
          org: {
            name: cert.subscriber.tradeName ?? cert.subscriber.legalName,
            legalName: cert.subscriber.legalName,
            authorizedSigner: cert.subscriber.authorizedSigner,
            logoUrl: cert.subscriber.logoUrl,
            normReference: cert.scheme?.normReference ?? null,
          },
          qr,
        }}
      />
    </main>
  );
}
