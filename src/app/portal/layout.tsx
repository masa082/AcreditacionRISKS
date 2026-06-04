import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireCandidatePage } from "@/lib/guards";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/portal", label: "Mi proceso" },
  { href: "/portal/evaluaciones", label: "Evaluaciones disponibles" },
  { href: "/portal/pagos", label: "Mis pagos" },
  { href: "/portal/agenda", label: "Mi agenda" },
  { href: "/portal/certificados", label: "Mis certificados" },
  { href: "/portal/apelaciones", label: "Apelaciones y solicitudes" },
  { href: "/portal/perfil", label: "Mi perfil" },
];

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const { ctx, subscriberId } = await requireCandidatePage();
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { tradeName: true, legalName: true, logoUrl: true },
  });
  const orgName = subscriber?.tradeName ?? subscriber?.legalName ?? "Portal del candidato";
  return (
    <DashboardShell
      area="Portal del candidato"
      nav={NAV}
      user={{ name: `${ctx.firstName} ${ctx.lastName}`, role: "Candidato" }}
      subscriberLogo={subscriber?.logoUrl ?? null}
      subscriberName={orgName}
    >
      {children}
    </DashboardShell>
  );
}
