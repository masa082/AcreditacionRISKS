import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "@/components/register-form";
import { CERTIFICATIONS } from "@/lib/brand";

export const metadata = { title: "Registro de candidato" };

const APP_NAME = "CIOC";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; cert?: string }>;
}) {
  const { org, cert } = await searchParams;

  const subscribers = await prisma.subscriber.findMany({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    orderBy: { legalName: "asc" },
    select: { slug: true, tradeName: true, legalName: true },
  });
  const orgs = subscribers.map((s) => ({
    slug: s.slug,
    name: s.tradeName ?? s.legalName,
  }));

  const lockedOrg =
    org && orgs.some((o) => o.slug === org) ? org : undefined;

  const certOptions = CERTIFICATIONS.map((c) => ({
    slug: c.slug,
    name: c.shortName,
    available: c.status === "AVAILABLE",
    status: c.status,
  }));
  const preselectedCert =
    cert && certOptions.some((o) => o.slug === cert && o.available) ? cert : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-bold text-brand-800">
            {APP_NAME}
          </Link>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">
            Certificado de Idoneidad como Oficial de Cumplimiento
          </p>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">
            Cree su cuenta de candidato
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Regístrese para inscribirse en procesos de evaluación y
            certificación de personas.
          </p>
        </div>

        {orgs.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-center text-sm text-amber-700 ring-1 ring-amber-200">
            No hay entidades certificadoras disponibles para registro en este
            momento.
          </p>
        ) : (
          <RegisterForm
            orgs={orgs}
            lockedOrg={lockedOrg}
            certifications={certOptions}
            preselectedCert={preselectedCert}
          />
        )}
      </div>
    </main>
  );
}
