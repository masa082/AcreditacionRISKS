// Constantes y metadatos del módulo de apelaciones/quejas/solicitudes.
// Vive fuera de "use server" para poder exportar valores no-función.

export const APPEAL_TYPES = ["APPEAL", "COMPLAINT", "REQUEST", "CORRECTION"] as const;
export type AppealType = (typeof APPEAL_TYPES)[number];

export const APPEAL_TYPE_LABELS: Record<string, string> = {
  APPEAL: "Apelación",
  COMPLAINT: "Queja",
  REQUEST: "Solicitud",
  CORRECTION: "Corrección",
};
