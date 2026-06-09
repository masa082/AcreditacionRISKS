import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireCandidatePage } from "@/lib/guards";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/portal", label: "Mi proceso", icon: "■" },

  // Inscripción y proceso de certificación
  { href: "/portal/evaluaciones", label: "Evaluaciones disponibles", group: "Proceso", icon: "📝" },
  { href: "/portal/agenda", label: "Mi agenda", group: "Proceso", icon: "📅" },
  { href: "/portal/pagos", label: "Mis pagos", group: "Proceso", icon: "💳" },
  { href: "/portal/certificados", label: "Mis certificados", group: "Proceso", icon: "🎓" },

  // Soporte y gestión de la cuenta
  { href: "/portal/apelaciones", label: "Apelaciones y solicitudes", group: "Soporte", icon: "📣" },
  { href: "/portal/perfil", label: "Mi perfil", group: "Soporte", icon: "⚙" },
  // Documentación oficial — pública, abre en la sección pública
  // /documentacion en una pestaña nueva para preservar la sesión.
  { href: "/documentacion", label: "Documentación", group: "Soporte", icon: "📄" },
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
