import "server-only";
import { prisma } from "./prisma";
import type { AuthContext } from "./session";

// ============================================================================
//  Aislamiento multitenant a nivel de aplicación (defensa primaria).
//  En producción se complementa con Row-Level Security (ver prisma/rls.sql).
// ============================================================================

/// Modelos con columna subscriberId (alcance de tenant).
const TENANT_MODELS = new Set([
  "Role",
  "User",
  "Candidate",
  "CertificationScheme",
  "Program",
  "Competency",
  "Topic",
  "QuestionBank",
  "Question",
  "Exam",
  "Enrollment",
  "Payment",
  "FeeConfig",
  "RequiredDocument",
  "ExamSession",
  "ExamAttempt",
  "Certificate",
  "PrivacyPolicyVersion",
  "ConsentPurpose",
  "DataConsent",
  "CommitteeReview",
  "Appeal",
]);

const LIST_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
]);

/// Cliente Prisma con inyección automática de subscriberId en operaciones de
/// lista y de creación. Para operaciones por id único, usar getScoped().
export function tenantPrisma(subscriberId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) {
            return query(args);
          }
          const a = args as Record<string, unknown>;
          if (LIST_OPS.has(operation)) {
            a.where = { ...((a.where as object) ?? {}), subscriberId };
          } else if (operation === "create") {
            a.data = { ...((a.data as object) ?? {}), subscriberId };
          } else if (operation === "createMany") {
            const d = a.data;
            a.data = Array.isArray(d)
              ? d.map((x) => ({ ...x, subscriberId }))
              : { ...((d as object) ?? {}), subscriberId };
          }
          return query(args);
        },
      },
    },
  });
}

/// Resuelve el subscriberId efectivo para una operación de tenant.
/// - Usuarios de suscriptor/candidato: su propio subscriberId.
/// - Plataforma (superadmin): debe indicar explícitamente el tenant objetivo.
export function resolveSubscriberId(
  ctx: AuthContext,
  explicit?: string | null,
): string {
  if (ctx.type === "PLATFORM") {
    if (!explicit) {
      throw new Error(
        "Un usuario de plataforma debe especificar el suscriptor objetivo.",
      );
    }
    return explicit;
  }
  if (!ctx.subscriberId) {
    throw new Error("El usuario no está asociado a un suscriptor.");
  }
  if (explicit && explicit !== ctx.subscriberId) {
    throw new Error("Acceso cruzado entre suscriptores denegado.");
  }
  return ctx.subscriberId;
}

/// Verifica que una entidad pertenezca al tenant esperado (defensa por-id).
export function assertSameTenant(
  entity: { subscriberId?: string | null } | null,
  subscriberId: string,
): void {
  if (!entity || entity.subscriberId !== subscriberId) {
    throw new Error("NOT_FOUND_OR_FORBIDDEN");
  }
}
