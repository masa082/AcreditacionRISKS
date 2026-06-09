import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireSubscriberPage } from "@/lib/guards";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

// Menú lateral del SUSCRIPTOR organizado por dominios funcionales
// siguiendo prácticas de UX: lo más usado arriba, agrupado por intención.
const NAV: NavItem[] = [
  // INICIO ─ punto de entrada
  { href: "/panel", label: "Resumen", icon: "■" },

  // OPERACIÓN ─ flujos del día a día del proceso de certificación
  { href: "/panel/candidatos", label: "Candidatos", group: "Operación", icon: "👥" },
  { href: "/panel/evaluaciones", label: "Evaluaciones", group: "Operación", icon: "📝" },
  { href: "/panel/agenda", label: "Agenda de pruebas", group: "Operación", icon: "📅" },
  { href: "/panel/calificacion", label: "Calificación", group: "Operación", icon: "✓" },
  { href: "/panel/comite", label: "Comité evaluador", group: "Operación", icon: "⚖" },
  { href: "/panel/certificados", label: "Certificados", group: "Operación", icon: "🎓" },
  { href: "/panel/vencimientos", label: "Vencimientos", group: "Operación", icon: "⏰" },

  // COMERCIAL ─ captación, cobros y referidos
  { href: "/panel/leads", label: "Leads comerciales", group: "Comercial", icon: "🎯" },
  { href: "/panel/referidos", label: "Programa de referidos", group: "Comercial", icon: "🤝" },
  { href: "/panel/pagos", label: "Pagos recibidos", group: "Comercial", icon: "💳" },
  { href: "/panel/tarifas", label: "Tarifas y precios", group: "Comercial", icon: "💲" },

  // CATÁLOGO ─ configuración técnica del esquema
  { href: "/panel/esquemas", label: "Esquemas de certificación", group: "Catálogo", icon: "📚" },
  { href: "/panel/preguntas", label: "Banco de preguntas", group: "Catálogo", icon: "❓" },

  // GOBIERNO ─ calidad, cumplimiento y trazabilidad
  { href: "/panel/apelaciones", label: "Apelaciones y quejas", group: "Gobierno", icon: "📣" },
  { href: "/panel/reportes", label: "Reportes", group: "Gobierno", icon: "📊" },
  { href: "/panel/auditoria", label: "Auditoría", group: "Gobierno", icon: "🔍" },
  // Catálogo de documentos del organismo + acceso a la vista pública.
  // El admin del suscriptor publica políticas, manuales y plantillas
  // propias que aparecerán en /documentacion para sus candidatos.
  { href: "/panel/documentacion", label: "Documentación", group: "Gobierno", icon: "📄" },

  // CONFIGURACIÓN ─ parametrización del suscriptor
  { href: "/panel/organizacion", label: "Organización", group: "Configuración", icon: "🏢" },
  { href: "/panel/usuarios", label: "Usuarios", group: "Configuración", icon: "👤" },
  { href: "/panel/roles", label: "Roles y permisos", group: "Configuración", icon: "🔐" },
  { href: "/panel/cuenta", label: "Mi cuenta", group: "Configuración", icon: "⚙" },
];

export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { ctx, subscriberId } = await requireSubscriberPage();
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { tradeName: true, legalName: true, logoUrl: true },
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
      subscriberLogo={subscriber?.logoUrl ?? null}
      subscriberName={orgName}
    >
      {children}
    </DashboardShell>
  );
}
