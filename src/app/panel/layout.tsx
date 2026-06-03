import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/panel", label: "Resumen" },
  { href: "/panel/organizacion", label: "Organización" },
  { href: "/panel/usuarios", label: "Usuarios" },
  { href: "/panel/roles", label: "Roles y permisos" },
  { href: "/panel/esquemas", label: "Esquemas de certificación" },
  { href: "/panel/preguntas", label: "Banco de preguntas" },
  { href: "/panel/evaluaciones", label: "Evaluaciones" },
  { href: "/panel/candidatos", label: "Candidatos" },
  { href: "/panel/agenda", label: "Agenda de pruebas" },
  { href: "/panel/calificacion", label: "Calificación" },
  { href: "/panel/comite", label: "Comité evaluador" },
  { href: "/panel/apelaciones", label: "Apelaciones y quejas" },
  { href: "/panel/certificados", label: "Certificados" },
  { href: "/panel/vencimientos", label: "Vencimientos" },
  { href: "/panel/reportes", label: "Reportes" },
  { href: "/panel/auditoria", label: "Auditoría" },
  { href: "/panel/cuenta", label: "Mi cuenta" },
];

export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { ctx, subscriberId } = await requireSubscriberPage();
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { tradeName: true, legalName: true },
  });
  const orgName = subscriber?.tradeName ?? subscriber?.legalName ?? "Suscriptor";

  return (
    <DashboardShell
      area={orgName}
      nav={NAV}
      user={{
        name: `${ctx.firstName} ${ctx.lastName}`,
        role: ctx.roleName ?? "Suscriptor",
      }}
    >
      {children}
    </DashboardShell>
  );
}
