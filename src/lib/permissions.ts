// ============================================================================
//  Catálogo de permisos (RBAC) y roles del sistema.
//  Los permisos son cadenas "modulo.accion". El comodín "*" concede todo;
//  "modulo.*" concede todas las acciones de un módulo.
// ============================================================================

export const PERMISSIONS = {
  // Plataforma (SUPERADMIN)
  PLATFORM_MANAGE: "platform.manage",
  SUBSCRIBER_MANAGE: "subscriber.manage",
  PLAN_MANAGE: "plan.manage",
  PLATFORM_BILLING: "platform.billing",
  PLATFORM_LOGS: "platform.logs",

  // Configuración del suscriptor
  ORG_MANAGE: "org.manage",
  USER_MANAGE: "user.manage",
  ROLE_MANAGE: "role.manage",

  // Estructura de certificación
  SCHEME_MANAGE: "scheme.manage",
  PROGRAM_MANAGE: "program.manage",

  // Preguntas
  QUESTION_CREATE: "question.create",
  QUESTION_EDIT: "question.edit",
  QUESTION_REVIEW: "question.review",
  QUESTION_APPROVE: "question.approve",
  QUESTION_VIEW: "question.view",

  // Evaluaciones
  EXAM_MANAGE: "exam.manage",
  EXAM_VIEW: "exam.view",

  // Candidatos / inscripciones
  CANDIDATE_MANAGE: "candidate.manage",
  ENROLLMENT_MANAGE: "enrollment.manage",
  DOCUMENT_REVIEW: "document.review",

  // Pagos
  PAYMENT_MANAGE: "payment.manage",
  PAYMENT_VIEW: "payment.view",

  // Agenda
  SCHEDULE_MANAGE: "schedule.manage",

  // Calificación
  GRADE_AUTO: "grade.auto",
  GRADE_MANUAL: "grade.manual",
  GRADE_VIEW: "grade.view",

  // Comité evaluador
  COMMITTEE_REVIEW: "committee.review",
  COMMITTEE_DECIDE: "committee.decide",

  // Certificados
  CERTIFICATE_ISSUE: "certificate.issue",
  CERTIFICATE_REVOKE: "certificate.revoke",
  CERTIFICATE_VIEW: "certificate.view",

  // Vencimientos / recertificación
  RENEWAL_MANAGE: "renewal.manage",

  // Reportes / auditoría
  REPORT_VIEW: "report.view",
  AUDIT_VIEW: "audit.view",

  // Apelaciones / quejas
  APPEAL_MANAGE: "appeal.manage",

  // Leads comerciales (formularios de landing)
  LEAD_VIEW: "lead.view",
  LEAD_MANAGE: "lead.manage",

  // Referidos
  REFERRAL_VIEW: "referral.view",
  REFERRAL_MANAGE: "referral.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const P = PERMISSIONS;

export type SystemRoleKey =
  | "SUPERADMIN"
  | "PLATFORM_SUPPORT"
  | "SUBSCRIBER_ADMIN"
  | "COORDINATOR"
  | "QUESTION_AUTHOR"
  | "QUESTION_REVIEWER"
  | "EVALUATOR"
  | "COMMITTEE_MEMBER"
  | "INTERNAL_AUDITOR"
  | "SUBSCRIBER_SUPPORT"
  | "CANDIDATE";

export interface SystemRoleDef {
  key: SystemRoleKey;
  name: string;
  description: string;
  scope: "PLATFORM" | "SUBSCRIBER" | "CANDIDATE";
  permissions: string[];
}

export const SYSTEM_ROLES: SystemRoleDef[] = [
  {
    key: "SUPERADMIN",
    name: "Superadministrador",
    description: "Dueño general del SaaS. Acceso total a la plataforma.",
    scope: "PLATFORM",
    permissions: ["*"],
  },
  {
    key: "PLATFORM_SUPPORT",
    name: "Soporte de plataforma",
    description: "Soporte interno del SaaS, sin modificar decisiones de certificación.",
    scope: "PLATFORM",
    permissions: [P.SUBSCRIBER_MANAGE, P.PLATFORM_LOGS, P.REPORT_VIEW],
  },
  {
    key: "SUBSCRIBER_ADMIN",
    name: "Administrador del suscriptor",
    description: "Administra toda la operación de la entidad certificadora.",
    scope: "SUBSCRIBER",
    permissions: ["org.*", "user.*", "role.*", "scheme.*", "program.*", "question.*", "exam.*", "candidate.*", "enrollment.*", "document.*", "payment.*", "schedule.*", "grade.*", "committee.*", "certificate.*", "renewal.*", "report.*", "audit.*", "appeal.*", "lead.*", "referral.*"],
  },
  {
    key: "COORDINATOR",
    name: "Coordinador académico / de certificación",
    description: "Coordina esquemas, evaluaciones, agenda y emisión.",
    scope: "SUBSCRIBER",
    permissions: [
      P.SCHEME_MANAGE, P.PROGRAM_MANAGE, P.EXAM_MANAGE, P.EXAM_VIEW,
      P.QUESTION_VIEW, P.CANDIDATE_MANAGE, P.ENROLLMENT_MANAGE,
      P.DOCUMENT_REVIEW, P.SCHEDULE_MANAGE, P.GRADE_VIEW,
      P.CERTIFICATE_ISSUE, P.CERTIFICATE_VIEW, P.RENEWAL_MANAGE,
      P.REPORT_VIEW, P.APPEAL_MANAGE, P.PAYMENT_VIEW,
      P.LEAD_VIEW, P.LEAD_MANAGE,
    ],
  },
  {
    key: "QUESTION_AUTHOR",
    name: "Creador de preguntas (deshabilitado)",
    description:
      "DEPRECADO por política: la gestión del banco de preguntas es exclusiva " +
      "del SUPERADMINISTRADOR y del Administrador del Suscriptor. Este rol " +
      "conserva solo visualización por compatibilidad con usuarios existentes.",
    scope: "SUBSCRIBER",
    permissions: [P.QUESTION_VIEW, P.EXAM_VIEW],
  },
  {
    key: "QUESTION_REVIEWER",
    name: "Revisor de preguntas (deshabilitado)",
    description:
      "DEPRECADO por política: la gestión del banco de preguntas es exclusiva " +
      "del SUPERADMINISTRADOR y del Administrador del Suscriptor. Este rol " +
      "conserva solo visualización por compatibilidad con usuarios existentes.",
    scope: "SUBSCRIBER",
    permissions: [P.QUESTION_VIEW],
  },
  {
    key: "EVALUATOR",
    name: "Evaluador",
    description: "Califica preguntas abiertas, casos y evidencias.",
    scope: "SUBSCRIBER",
    permissions: [P.GRADE_MANUAL, P.GRADE_VIEW, P.DOCUMENT_REVIEW, P.EXAM_VIEW],
  },
  {
    key: "COMMITTEE_MEMBER",
    name: "Miembro del comité evaluador",
    description: "Revisa resultados y vota decisiones de certificación.",
    scope: "SUBSCRIBER",
    permissions: [P.COMMITTEE_REVIEW, P.COMMITTEE_DECIDE, P.GRADE_VIEW, P.CERTIFICATE_VIEW],
  },
  {
    key: "INTERNAL_AUDITOR",
    name: "Auditor interno",
    description: "Acceso de solo lectura a trazabilidad y reportes.",
    scope: "SUBSCRIBER",
    permissions: [P.AUDIT_VIEW, P.REPORT_VIEW, P.GRADE_VIEW, P.CERTIFICATE_VIEW, P.PAYMENT_VIEW],
  },
  {
    key: "SUBSCRIBER_SUPPORT",
    name: "Soporte del suscriptor",
    description: "Atiende candidatos, inscripciones y apelaciones.",
    scope: "SUBSCRIBER",
    permissions: [P.CANDIDATE_MANAGE, P.ENROLLMENT_MANAGE, P.APPEAL_MANAGE, P.PAYMENT_VIEW, P.LEAD_VIEW, P.LEAD_MANAGE],
  },
  {
    key: "CANDIDATE",
    name: "Candidato",
    description: "Persona que presenta evaluaciones.",
    scope: "CANDIDATE",
    permissions: [],
  },
];

/// Comprueba si un conjunto de permisos satisface el permiso requerido.
export function hasPermission(granted: string[], required: string): boolean {
  if (!required) return true;
  if (granted.includes("*")) return true;
  if (granted.includes(required)) return true;
  const [mod] = required.split(".");
  if (granted.includes(`${mod}.*`)) return true;
  return false;
}

export function hasAnyPermission(granted: string[], required: string[]): boolean {
  return required.some((r) => hasPermission(granted, r));
}
