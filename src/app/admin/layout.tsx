import type { ReactNode } from "react";
import { requirePlatformPage } from "@/lib/guards";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/suscriptores", label: "Suscriptores" },
  { href: "/admin/planes", label: "Planes" },
  { href: "/admin/logs", label: "Logs globales" },
  { href: "/admin/cuenta", label: "Mi cuenta" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const ctx = await requirePlatformPage();
  return (
    <DashboardShell
      area="Superadministrador"
      nav={NAV}
      user={{ name: `${ctx.firstName} ${ctx.lastName}`, role: "Superadministrador" }}
    >
      {children}
    </DashboardShell>
  );
}
