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
function buildSnapshot(q: QuestionWithOptions, randomizeOptions: boolean): QuestionSnapshot {
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

/// Selecciona y arma las preguntas del intento a partir de las secciones del examen.
export async function buildAttemptQuestions(examId: string): Promise<BuiltQuestion[]> {
  const exam = await prisma.exam.findUniqueOrThrow({
    where: { id: examId },
    include: { sections: { orderBy: { order: "asc" } } },
  });

  const built: BuiltQuestion[] = [];
  for (const section of exam.sections) {
    if (!section.bankId || section.questionCount <= 0) continue;
    const pool = await prisma.question.findMany({
      where: {
        subscriberId: exam.subscriberId,
        bankId: section.bankId,
        status: "APPROVED",
        ...(section.topicFilter ? { topicId: section.topicFilter } : {}),
        ...(section.difficulty ? { difficulty: section.difficulty } : {}),
      },
      include: { options: true },
    });
    const picked = shuffle(pool).slice(0, section.questionCount);
    const pts = section.pointsPerQuestion;
    for (const q of picked) {
      built.push({
        questionId: q.id,
        order: 0,
        points: pts ?? q.points,
        snapshot: buildSnapshot(q, exam.randomizeOptions),
        sectionTitle: section.title,
      });
    }
  }

  const finalOrder = exam.randomizeQuestions ? shuffle(built) : built;
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
