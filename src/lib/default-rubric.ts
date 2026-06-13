/// Rúbricas por defecto que se aplican cuando una pregunta de
/// calificación manual no tiene rúbrica configurada. Garantiza que el
/// candidato vea siempre cómo será calificado y que el evaluador
/// tenga criterios consistentes.
///
/// La rúbrica se inyecta en el `snapshot` del intento al armarse —
/// así queda congelada para ese intento aunque la pregunta cambie
/// después. Política: el candidato la ve durante la presentación.

export interface RubricCriterion {
  nombre: string;
  puntos: number;
  /// Descripción opcional que explica al candidato qué se espera
  /// para obtener la puntuación máxima en este criterio.
  descripcion?: string;
}

export interface Rubric {
  criterios: RubricCriterion[];
}

/// Rúbrica genérica de Caso Práctico (oficial de cumplimiento SARLAFT/
/// SAGRILAFT). Cubre las dimensiones que pesan más en la evaluación:
/// análisis, controles propuestos, redacción del reporte y forma.
const RUBRIC_CASE_STUDY: Rubric = {
  criterios: [
    {
      nombre: "Identificación de la operación inusual / sospechosa",
      puntos: 20,
      descripcion:
        "Detecta correctamente el riesgo principal del caso, lo nombra con la terminología técnica adecuada (operación inusual, intentada, sospechosa) y lo distingue del resto del escenario.",
    },
    {
      nombre: "Verificaciones y debida diligencia propuestas",
      puntos: 20,
      descripcion:
        "Lista las verificaciones internas y externas que deben hacerse antes de concluir (contraparte, vehículo, ruta, conductor, propietario, listas, fuentes públicas).",
    },
    {
      nombre: "Diseño de controles aplicables",
      puntos: 20,
      descripcion:
        "Propone controles preventivos, detectivos y correctivos pertinentes al caso, viables operativamente y alineados con el riesgo identificado.",
    },
    {
      nombre: "Calidad del Reporte de Operación Sospechosa (ROS)",
      puntos: 25,
      descripcion:
        "El ROS está completo: hechos, contraparte, montos/valores, fuente de la información, anexos. Redacción clara, objetiva y sin juicios subjetivos.",
    },
    {
      nombre: "Forma, ortografía y presentación del PDF",
      puntos: 15,
      descripcion:
        "Estructura ordenada, sin errores ortográficos relevantes, un único archivo PDF legible, dentro del tiempo previsto.",
    },
  ],
};

/// Rúbrica genérica para pregunta abierta (no caso práctico).
const RUBRIC_OPEN_TEXT: Rubric = {
  criterios: [
    { nombre: "Pertinencia y alcance de la respuesta", puntos: 30, descripcion: "Responde lo que se pregunta, sin desviarse." },
    { nombre: "Profundidad técnica y uso de la normativa", puntos: 35, descripcion: "Cita o aplica correctamente la norma o estándar pertinente." },
    { nombre: "Claridad, orden y argumentación", puntos: 20, descripcion: "Estructura lógica, sin contradicciones." },
    { nombre: "Forma y ortografía", puntos: 15, descripcion: "Sin errores que dificulten la comprensión." },
  ],
};

/// Rúbrica genérica para entrega de archivo (evidencia, anexo).
const RUBRIC_FILE_UPLOAD: Rubric = {
  criterios: [
    { nombre: "Cumple con el formato y contenido solicitado", puntos: 35, descripcion: "El archivo entregado responde a lo pedido y está en el formato indicado." },
    { nombre: "Calidad técnica del entregable", puntos: 35, descripcion: "Información completa, precisa, citas/evidencia verificables." },
    { nombre: "Claridad, orden y presentación", puntos: 20, descripcion: "Diseño y estructura facilitan la lectura del evaluador." },
    { nombre: "Forma, ortografía y firma cuando aplique", puntos: 10 },
  ],
};

const RUBRIC_GENERIC: Rubric = {
  criterios: [
    { nombre: "Pertinencia de la respuesta", puntos: 40, descripcion: "Responde lo que se pregunta." },
    { nombre: "Profundidad y argumentación", puntos: 40, descripcion: "Justifica con claridad y precisión técnica." },
    { nombre: "Forma y ortografía", puntos: 20 },
  ],
};

/// Devuelve la rúbrica por defecto según el tipo de pregunta. Solo aplica
/// a tipos que requieren calificación manual.
export function defaultRubricForType(questionType: string): Rubric {
  switch (questionType) {
    case "CASE_STUDY":
      return RUBRIC_CASE_STUDY;
    case "OPEN_TEXT":
      return RUBRIC_OPEN_TEXT;
    case "FILE_UPLOAD":
      return RUBRIC_FILE_UPLOAD;
    default:
      return RUBRIC_GENERIC;
  }
}

/// Normaliza un valor desconocido de `rubric` (viene del JSON de Question
/// o del snapshot del intento) a una Rúbrica utilizable. Si está vacío o
/// no tiene criterios, devuelve la rúbrica por defecto del tipo dado
/// para que el candidato y el evaluador siempre vean algo.
export function resolveRubric(rubricJson: unknown, questionType: string): Rubric {
  if (rubricJson && typeof rubricJson === "object" && "criterios" in rubricJson) {
    const criterios = (rubricJson as { criterios?: unknown }).criterios;
    if (Array.isArray(criterios) && criterios.length > 0) {
      return {
        criterios: criterios
          .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
          .map((c) => ({
            nombre: String(c.nombre ?? "").trim() || "Criterio",
            puntos: Number(c.puntos ?? 0) || 0,
            descripcion: typeof c.descripcion === "string" ? c.descripcion : undefined,
          }))
          .filter((c) => c.nombre),
      };
    }
  }
  return defaultRubricForType(questionType);
}
