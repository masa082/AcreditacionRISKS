// Etiquetas de tipos/modalidades de evaluación (compartido cliente/servidor).

export const EXAM_TYPE_LABELS: Record<string, string> = {
  ADMISSION: "Admisión",
  CERTIFICATION: "Certificación",
  RECERTIFICATION: "Recertificación",
  DIAGNOSTIC: "Diagnóstica",
  KNOWLEDGE: "Conocimiento",
  PRACTICAL: "Práctica",
  DOCUMENTARY: "Documental",
  COMPETENCY: "Competencias",
  MOCK: "Simulacro",
  FINAL: "Examen final",
};

export const EXAM_MODALITY_LABELS: Record<string, string> = {
  ONLINE: "Online",
  ONSITE: "Presencial",
  HYBRID: "Híbrida",
};

export const EXAM_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
};
