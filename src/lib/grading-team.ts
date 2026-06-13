import "server-only";
import { prisma } from "@/lib/prisma";

/// Devuelve los correos del equipo evaluador del suscriptor: admin del
/// suscriptor, evaluadores y miembros del comité. Detección por permisos
/// del rol — un usuario califica si su rol tiene `grade.manual`,
/// `committee.review`, `committee.decide`, alguna comodín `grade.*`,
/// `committee.*` o el global `*` (admin del suscriptor).
///
/// Tolera filas con rol nulo o sin permisos: simplemente no las incluye.
/// Dedup por correo. Devuelve también el nombre para personalizar el
/// saludo en algunos contextos (no se usa en todos los emails).
export async function getGradingTeamRecipients(
  subscriberId: string,
): Promise<{ email: string; fullName: string }[]> {
  const PERMS = [
    "*",
    "grade.*",
    "grade.manual",
    "grade.view",
    "committee.*",
    "committee.review",
    "committee.decide",
  ];

  const users = await prisma.user.findMany({
    where: {
      subscriberId,
      status: "ACTIVE",
      role: { permissions: { hasSome: PERMS } },
    },
    select: { email: true, firstName: true, lastName: true, additionalEmails: true },
  });

  const out: { email: string; fullName: string }[] = [];
  const seen = new Set<string>();
  for (const u of users) {
    const name = `${u.firstName} ${u.lastName}`.trim() || u.email;
    const candidates = [u.email, ...(u.additionalEmails ?? [])].filter(
      (e): e is string => typeof e === "string" && e.includes("@"),
    );
    for (const e of candidates) {
      const key = e.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ email: e, fullName: name });
    }
  }
  return out;
}
