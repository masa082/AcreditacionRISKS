import type { ReactNode } from "react";
import { requirePlatformPage } from "@/lib/guards";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: "■" },

  // SaaS ─ clientes y monetización
  { href: "/admin/suscriptores", label: "Suscriptores", group: "SaaS", icon: "🏢" },
  { href: "/admin/planes", label: "Planes", group: "SaaS", icon: "📦" },
  { href: "/admin/tarifas", label: "Tarifas y precios", group: "SaaS", icon: "💲" },

  // PLATAFORMA ─ operación y trazabilidad global
  { href: "/admin/feedback", label: "Feedback de usuarios", group: "Plataforma", icon: "💬" },
  { href: "/admin/logs", label: "Logs globales", group: "Plataforma", icon: "🗂" },
  // Catálogo de documentos del SaaS. SUPERADMIN gestiona los globales
  // y supervisa los publicados por cada tenant.
  { href: "/admin/documentacion", label: "Documentación", group: "Plataforma", icon: "📄" },

  // CONFIGURACIÓN
  { href: "/admin/cuenta", label: "Mi cuenta", group: "Configuración", icon: "⚙" },
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
