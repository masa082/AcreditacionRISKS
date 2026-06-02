import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/panel", label: "Resumen" },
  { href: "/panel/esquemas", label: "Esquemas de certificación" },
  { href: "/panel/preguntas", label: "Banco de preguntas" },
  { href: "/panel/evaluaciones", label: "Evaluaciones" },
  { href: "/panel/candidatos", label: "Candidatos" },
  { href: "/panel/agenda", label: "Agenda de pruebas" },
  { href: "/panel/calificacion", label: "Calificación", disabled: true },
  { href: "/panel/comite", label: "Comité evaluador", disabled: true },
  { href: "/panel/certificados", label: "Certificados", disabled: true },
  { href: "/panel/reportes", label: "Reportes", disabled: true },
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
