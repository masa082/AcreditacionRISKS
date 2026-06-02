import type { ReactNode } from "react";
import { requireCandidatePage } from "@/lib/guards";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/portal", label: "Mi proceso" },
  { href: "/portal/evaluaciones", label: "Evaluaciones disponibles" },
  { href: "/portal/pagos", label: "Mis pagos" },
  { href: "/portal/agenda", label: "Mi agenda" },
  { href: "/portal/certificados", label: "Mis certificados", disabled: true },
  { href: "/portal/perfil", label: "Mi perfil" },
];

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const { ctx } = await requireCandidatePage();
  return (
    <DashboardShell
      area="Portal del candidato"
      nav={NAV}
      user={{ name: `${ctx.firstName} ${ctx.lastName}`, role: "Candidato" }}
    >
      {children}
    </DashboardShell>
  );
}
