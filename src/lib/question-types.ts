// Metadatos de los 10 tipos de pregunta. Compartido cliente/servidor.

export type QuestionTypeKey =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "OPEN"
  | "CASE_STUDY"
  | "MATCHING"
  | "ORDERING"
  | "FILE_UPLOAD"
  | "MULTIMEDIA"
  | "SCALE";

export interface QuestionTypeMeta {
  key: QuestionTypeKey;
  label: string;
  description: string;
  autoGraded: boolean; // calificación automática posible
  editor:
    | "choice" // opciones con correcta(s)
    | "trueFalse"
    | "text" // abierta / caso
    | "matching"
    | "ordering"
    | "fileOnly"
    | "scale";
  multiCorrect?: boolean;
  hasMedia?: boolean;
  hasContext?: boolean;
}

export const QUESTION_TYPES: Record<QuestionTypeKey, QuestionTypeMeta> = {
  SINGLE_CHOICE: {
    key: "SINGLE_CHOICE",
    label: "Selección múltiple — única respuesta",
    description: "Varias opciones, una sola correcta.",
    autoGraded: true,
    editor: "choice",
  },
  MULTIPLE_CHOICE: {
    key: "MULTIPLE_CHOICE",
    label: "Selección múltiple — varias respuestas",
    description: "Varias opciones, más de una correcta. Admite calificación parcial.",
    autoGraded: true,
    editor: "choice",
    multiCorrect: true,
  },
  TRUE_FALSE: {
    key: "TRUE_FALSE",
    label: "Verdadero / Falso",
    description: "Enunciado con respuesta verdadero o falso.",
    autoGraded: true,
    editor: "trueFalse",
  },
  OPEN: {
    key: "OPEN",
    label: "Pregunta abierta",
    description: "Respuesta escrita, calificación manual con rúbrica.",
    autoGraded: false,
    editor: "text",
  },
  CASE_STUDY: {
    key: "CASE_STUDY",
    label: "Caso práctico",
    description: "Texto largo del caso con respuesta abierta. Calificación manual.",
    autoGraded: false,
    editor: "text",
    hasContext: true,
  },
  MATCHING: {
    key: "MATCHING",
    label: "Emparejamiento",
    description: "Relacionar columna A con columna B. Calificación automática.",
    autoGraded: true,
    editor: "matching",
  },
  ORDERING: {
    key: "ORDERING",
    label: "Ordenamiento",
    description: "Organizar elementos en el orden correcto. Calificación automática.",
    autoGraded: true,
    editor: "ordering",
  },
  FILE_UPLOAD: {
    key: "FILE_UPLOAD",
    label: "Con archivo adjunto",
    description: "El candidato carga evidencia. Revisión manual.",
    autoGraded: false,
    editor: "fileOnly",
  },
  MULTIMEDIA: {
    key: "MULTIMEDIA",
    label: "Multimedia",
    description: "Imagen/audio/video como insumo + opciones de respuesta.",
    autoGraded: true,
    editor: "choice",
    hasMedia: true,
  },
  SCALE: {
    key: "SCALE",
    label: "Escala de valoración",
    description: "Escala (p. ej. 1–5) para diagnósticos o autoevaluación.",
    autoGraded: false,
    editor: "scale",
  },
};

export const QUESTION_TYPE_LIST = Object.values(QUESTION_TYPES);

export const DIFFICULTY_LABELS: Record<string, string> = {
  BASIC: "Básico",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
};

export const QUESTION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  INACTIVE: "Inactiva",
};
