// Catálogo agrupado de permisos para el editor de roles (cliente/servidor).
import { PERMISSIONS } from "./permissions";

export interface PermissionGroup {
  module: string;
  label: string;
  permissions: { key: string; label: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    module: "org",
    label: "Organización y equipo",
    permissions: [
      { key: PERMISSIONS.ORG_MANAGE, label: "Configurar la organización" },
      { key: PERMISSIONS.USER_MANAGE, label: "Gestionar usuarios del equipo" },
      { key: PERMISSIONS.ROLE_MANAGE, label: "Gestionar roles y permisos" },
    ],
  },
  {
    module: "scheme",
    label: "Estructura de certificación",
    permissions: [
      { key: PERMISSIONS.SCHEME_MANAGE, label: "Esquemas de certificación" },
      { key: PERMISSIONS.PROGRAM_MANAGE, label: "Programas" },
    ],
  },
  {
    module: "question",
    label: "Banco de preguntas",
    permissions: [
      { key: PERMISSIONS.QUESTION_CREATE, label: "Crear preguntas" },
      { key: PERMISSIONS.QUESTION_EDIT, label: "Editar preguntas" },
      { key: PERMISSIONS.QUESTION_REVIEW, label: "Revisar preguntas" },
      { key: PERMISSIONS.QUESTION_APPROVE, label: "Aprobar/rechazar preguntas" },
      { key: PERMISSIONS.QUESTION_VIEW, label: "Ver preguntas" },
    ],
  },
  {
    module: "exam",
    label: "Evaluaciones",
    permissions: [
      { key: PERMISSIONS.EXAM_MANAGE, label: "Crear/publicar evaluaciones" },
      { key: PERMISSIONS.EXAM_VIEW, label: "Ver evaluaciones" },
    ],
  },
  {
    module: "candidate",
    label: "Candidatos e inscripciones",
    permissions: [
      { key: PERMISSIONS.CANDIDATE_MANAGE, label: "Gestionar candidatos" },
      { key: PERMISSIONS.ENROLLMENT_MANAGE, label: "Gestionar inscripciones" },
      { key: PERMISSIONS.DOCUMENT_REVIEW, label: "Revisar documentos" },
      { key: PERMISSIONS.PAYMENT_VIEW, label: "Ver pagos" },
      { key: PERMISSIONS.PAYMENT_MANAGE, label: "Gestionar pagos" },
      { key: PERMISSIONS.SCHEDULE_MANAGE, label: "Gestionar agenda" },
    ],
  },
  {
    module: "grade",
    label: "Calificación y comité",
    permissions: [
      { key: PERMISSIONS.GRADE_AUTO, label: "Calificación automática" },
      { key: PERMISSIONS.GRADE_MANUAL, label: "Calificación manual" },
      { key: PERMISSIONS.GRADE_VIEW, label: "Ver calificaciones" },
      { key: PERMISSIONS.COMMITTEE_REVIEW, label: "Revisar en comité" },
      { key: PERMISSIONS.COMMITTEE_DECIDE, label: "Decidir en comité" },
    ],
  },
  {
    module: "certificate",
    label: "Certificados y vigencias",
    permissions: [
      { key: PERMISSIONS.CERTIFICATE_ISSUE, label: "Emitir certificados" },
      { key: PERMISSIONS.CERTIFICATE_REVOKE, label: "Anular certificados" },
      { key: PERMISSIONS.CERTIFICATE_VIEW, label: "Ver certificados" },
      { key: PERMISSIONS.RENEWAL_MANAGE, label: "Gestionar vencimientos/recertificación" },
    ],
  },
  {
    module: "report",
    label: "Reportes y auditoría",
    permissions: [
      { key: PERMISSIONS.REPORT_VIEW, label: "Ver reportes" },
      { key: PERMISSIONS.AUDIT_VIEW, label: "Ver auditoría" },
      { key: PERMISSIONS.APPEAL_MANAGE, label: "Gestionar apelaciones/quejas" },
    ],
  },
];

/// Todas las claves de permiso válidas para un suscriptor (para validar en servidor).
export const ALL_SUBSCRIBER_PERMISSIONS = new Set(
  PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key)),
);
