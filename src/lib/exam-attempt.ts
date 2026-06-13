import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// ============================================================================
//  Dominio de presentación y calificación de intentos de examen.
//  - Construye el intento congelando un snapshot de las preguntas servidas
//    (aleatorización + integridad), sin exponer la respuesta correcta al cliente.
//  - Califica automáticamente los tipos objetivos.
// ============================================================================

export interface SnapshotOption {
  key: string;
  text: string;
}

export interface QuestionSnapshot {
  type: string;
  statement: string;
  contextText?: string | null;
  mediaUrl?: string | null;
  options: SnapshotOption[];
  multiple: boolean;
  needsManual: boolean;
  /// Solo servidor: claves correctas. Se elimina antes de enviar al cliente.
  correctKeys: string[];
  /// Solo evaluador: rúbrica para preguntas de calificación manual.
  rubric?: unknown;
}

/// Versión del snapshot segura para el candidato (sin la respuesta correcta ni la rúbrica).
export function publicSnapshot(s: QuestionSnapshot) {
  return {
    type: s.type,
    statement: s.statement,
    contextText: s.contextText ?? null,
    mediaUrl: s.mediaUrl ?? null,
    options: s.options,
    multiple: s.multiple,
    manual: s.needsManual,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type QuestionWithOptions = Prisma.QuestionGetPayload<{ include: { options: true } }>;

/// Construye el snapshot congelado de una pregunta para el intento.
export function buildSnapshot(q: QuestionWithOptions, randomizeOptions: boolean): QuestionSnapshot {
  const base = {
    type: q.type as string,
    statement: q.statement,
    contextText: q.contextText,
    mediaUrl: q.mediaUrl,
  };

  if (q.type === "TRUE_FALSE") {
    const correct = q.correctAnswer === true ? "true" : "false";
    return {
      ...base,
      options: [
        { key: "true", text: "Verdadero" },
        { key: "false", text: "Falso" },
      ],
      multiple: false,
      needsManual: false,
      correctKeys: [correct],
    };
  }

  if (q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE" || q.type === "MULTIMEDIA") {
    const ordered = [...q.options].sort((a, b) => a.order - b.order);
    const opts = (randomizeOptions ? shuffle(ordered) : ordered).map((o) => ({
      key: o.id,
      text: o.text,
    }));
    const correctKeys = ordered.filter((o) => o.isCorrect).map((o) => o.id);
    return {
      ...base,
      options: opts,
      multiple: q.type === "MULTIPLE_CHOICE",
      needsManual: false,
      correctKeys,
    };
  }

  // OPEN, CASE_STUDY, FILE_UPLOAD, MATCHING, ORDERING, SCALE -> revisión manual.
  return {
    ...base,
    options: [],
    multiple: false,
    needsManual: true,
    correctKeys: [],
    rubric: q.rubric ?? null,
  };
}

export interface BuiltQuestion {
  questionId: string;
  order: number;
  points: Prisma.Decimal;
  snapshot: QuestionSnapshot;
  sectionTitle: string | null;
}

/// Selecciona y arma las preguntas del intento a partir de las secciones
/// del examen. Tres garantías importantes para el negocio:
///
/// 1. **Aleatoriedad**: usa Fisher–Yates dentro de cada banco de preguntas
///    y, opcionalmente, sobre el conjunto final completo
///    (`exam.randomizeQuestions`).
/// 2. **Sin repeticiones**: una misma pregunta nunca aparece dos veces en
///    el mismo intento. Aunque dos secciones apunten al mismo banco, el
///    dedupe por `questionId` evita el cruce.
/// 3. **Tope máximo por intento**: `exam.maxQuestions` (default 50) actúa
///    como techo. Si la suma de secciones excede ese tope, se hace un
///    sampling aleatorio uniforme respetando la diversidad entre secciones.
///    Si es menor, se sirven todas. `0` = sin tope.
export interface BuildAttemptOpts {
  /**
   * IDs de preguntas que NO deben aparecer en este intento. Útil para
   * reintentos: el candidato no debe ver de nuevo las mismas preguntas
   * que ya respondió en intentos anteriores del mismo examen.
   */
  excludeQuestionIds?: string[];
  /**
   * Si > 0, eleva la dificultad de las preguntas que se seleccionan.
   *   - 1: descarta BASIC; mezcla INTERMEDIATE + ADVANCED.
   *   - 2: descarta BASIC + INTERMEDIATE; solo ADVANCED.
   * Si no hay suficientes preguntas en el nivel objetivo, hace fallback
   * "graceful" al nivel inferior antes de dejar el examen incompleto.
   */
  difficultyBoost?: number;
}

export async function buildAttemptQuestions(
  examId: string,
  opts: BuildAttemptOpts = {},
): Promise<BuiltQuestion[]> {
  const exam = await prisma.exam.findUniqueOrThrow({
    where: { id: examId },
    include: { sections: { orderBy: { order: "asc" } } },
  });

  // Acumulador con dedupe por questionId (una pregunta solo entra una
  // vez por intento) + exclusión externa (preguntas de intentos previos
  // del mismo candidato).
  const seen = new Set<string>(opts.excludeQuestionIds ?? []);
  const built: BuiltQuestion[] = [];
  const boost = Math.max(0, opts.difficultyBoost ?? 0);

  for (const section of exam.sections) {
    if (!section.bankId || section.questionCount <= 0) continue;

    // Niveles de dificultad candidatos en orden de prioridad. Si la
    // sección fija una dificultad explícita, esa manda — el boost no
    // sobrescribe la configuración. Sin dificultad fija, el boost
    // determina el orden y los fallbacks.
    const sectionDifficulty = section.difficulty ?? null;
    let levels: ("BASIC" | "INTERMEDIATE" | "ADVANCED")[];
    if (sectionDifficulty) {
      levels = [sectionDifficulty];
    } else if (boost >= 2) {
      levels = ["ADVANCED", "INTERMEDIATE"];
    } else if (boost === 1) {
      levels = ["INTERMEDIATE", "ADVANCED", "BASIC"];
    } else {
      levels = ["BASIC", "INTERMEDIATE", "ADVANCED"];
    }

    // Pickamos preguntas en cascada por nivel hasta llenar la sección
    // o agotar los pools disponibles.
    const pts = section.pointsPerQuestion;
    let remaining = section.questionCount;
    for (const lvl of levels) {
      if (remaining <= 0) break;
      const pool = await prisma.question.findMany({
        where: {
          subscriberId: exam.subscriberId,
          bankId: section.bankId,
          status: "APPROVED",
          difficulty: lvl,
          ...(section.topicFilter ? { topicId: section.topicFilter } : {}),
          ...(seen.size > 0 ? { id: { notIn: Array.from(seen) } } : {}),
        },
        include: { options: true },
      });
      const take = shuffle(pool).slice(0, remaining);
      for (const q of take) {
        if (seen.has(q.id)) continue;
        seen.add(q.id);
        built.push({
          questionId: q.id,
          order: 0,
          points: pts ?? q.points,
          snapshot: buildSnapshot(q, exam.randomizeOptions),
          sectionTitle: section.title,
        });
      }
      remaining -= take.length;
    }
  }

  // Tope: si maxQuestions > 0 y el acumulado lo excede, hacemos sampling
  // aleatorio uniforme. La distribución entre secciones se preserva
  // estadísticamente (cada pregunta tiene la misma probabilidad de salir).
  const cap = exam.maxQuestions ?? 0;
  let capped = built;
  if (cap > 0 && built.length > cap) {
    capped = shuffle(built).slice(0, cap);
  }

  const finalOrder = exam.randomizeQuestions ? shuffle(capped) : capped;
  finalOrder.forEach((b, i) => (b.order = i));
  return finalOrder;
}

/// Califica una respuesta objetiva. Devuelve null si requiere revisión manual.
export function gradeAnswer(
  snapshot: QuestionSnapshot,
  response: unknown,
  points: number,
  partialScoring = false,
): number | null {
  if (snapshot.needsManual) return null;
  const r = (response ?? {}) as { key?: string; keys?: string[] };

  if (!snapshot.multiple) {
    const sel = r.key ?? (Array.isArray(r.keys) ? r.keys[0] : undefined);
    if (sel == null) return 0;
    return snapshot.correctKeys.includes(sel) ? points : 0;
  }

  // Múltiple respuesta.
  const sel = new Set(r.keys ?? (r.key ? [r.key] : []));
  const correct = new Set(snapshot.correctKeys);
  if (!partialScoring) {
    const exact = sel.size === correct.size && [...sel].every((k) => correct.has(k));
    return exact ? points : 0;
  }
  // Parcial: +1 por acierto, -1 por incorrecto, normalizado, sin negativos.
  let raw = 0;
  for (const k of sel) raw += correct.has(k) ? 1 : -1;
  const proportion = Math.max(0, raw) / correct.size;
  return Math.round(proportion * points * 100) / 100;
}
