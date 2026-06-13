"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, type QuestionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { can } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { QUESTION_TYPES } from "@/lib/question-types";

const optionSchema = z.object({
  text: z.string().max(2000).default(""),
  isCorrect: z.boolean().default(false),
  order: z.number().int().default(0),
  matchLeft: z.string().max(500).optional().nullable(),
  matchRight: z.string().max(500).optional().nullable(),
});

const questionInputSchema = z.object({
  bankId: z.string().min(1),
  code: z.string().min(1, "Código requerido").max(40),
  type: z.enum([
    "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "OPEN", "CASE_STUDY",
    "MATCHING", "ORDERING", "FILE_UPLOAD", "MULTIMEDIA", "SCALE",
  ]),
  statement: z.string().min(3, "Enunciado requerido").max(4000),
  contextText: z.string().max(8000).optional().nullable(),
  mediaUrl: z.string().max(1000).optional().nullable(),
  points: z.number().min(0).max(1000).default(1),
  partialScoring: z.boolean().default(false),
  difficulty: z.enum(["BASIC", "INTERMEDIATE", "ADVANCED"]).default("INTERMEDIATE"),
  competencyId: z.string().optional().nullable(),
  topicId: z.string().optional().nullable(),
  normReference: z.string().max(200).optional().nullable(),
  tags: z.array(z.string().max(40)).default([]),
  suggestedTimeSec: z.number().int().min(0).max(36000).optional().nullable(),
  isCritical: z.boolean().default(false),
  feedback: z.string().max(4000).optional().nullable(),
  options: z.array(optionSchema).default([]),
  trueFalseAnswer: z.boolean().optional().nullable(),
  scaleConfig: z
    .object({
      min: z.number().int(),
      max: z.number().int(),
      minLabel: z.string().max(80).optional().nullable(),
      maxLabel: z.string().max(80).optional().nullable(),
    })
    .optional()
    .nullable(),
  rubric: z
    .object({
      criterios: z.array(
        z.object({ nombre: z.string().max(200), puntos: z.number().min(0) }),
      ),
    })
    .optional()
    .nullable(),
});

export type QuestionInput = z.input<typeof questionInputSchema>;

export interface QResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/// Valida coherencia de la respuesta correcta según el tipo de pregunta.
function validateByType(d: z.infer<typeof questionInputSchema>): string | null {
  const meta = QUESTION_TYPES[d.type];
  switch (meta.editor) {
    case "choice": {
      const opts = d.options.filter((o) => o.text.trim().length);
      if (opts.length < 2) return "Agregue al menos dos opciones con texto.";
      const correct = opts.filter((o) => o.isCorrect).length;
      if (d.type === "MULTIPLE_CHOICE") {
        if (correct < 1) return "Marque al menos una opción correcta.";
      } else if (correct !== 1) {
        return "Marque exactamente una opción correcta.";
      }
      return null;
    }
    case "trueFalse":
      if (typeof d.trueFalseAnswer !== "boolean")
        return "Indique si el enunciado es verdadero o falso.";
      return null;
    case "matching": {
      const pairs = d.options.filter(
        (o) => o.matchLeft?.trim() && o.matchRight?.trim(),
      );
      if (pairs.length < 2) return "Agregue al menos dos parejas (A y B).";
      return null;
    }
    case "ordering": {
      const items = d.options.filter((o) => o.text.trim().length);
      if (items.length < 2) return "Agregue al menos dos elementos a ordenar.";
      return null;
    }
    case "scale":
      if (!d.scaleConfig || d.scaleConfig.max <= d.scaleConfig.min)
        return "Configure una escala válida (máximo mayor que mínimo).";
      return null;
    default:
      return null; // text / fileOnly: sin respuesta automática
  }
}

/// Construye el payload de opciones + respuesta correcta para Prisma.
function buildContent(d: z.infer<typeof questionInputSchema>) {
  const meta = QUESTION_TYPES[d.type];
  let optionsCreate: Prisma.QuestionOptionCreateWithoutQuestionInput[] = [];
  let correctAnswer: Prisma.InputJsonValue | undefined;

  if (meta.editor === "choice") {
    optionsCreate = d.options
      .filter((o) => o.text.trim().length)
      .map((o, i) => ({ text: o.text, isCorrect: !!o.isCorrect, order: i }));
  } else if (meta.editor === "matching") {
    optionsCreate = d.options
      .filter((o) => o.matchLeft?.trim() && o.matchRight?.trim())
      .map((o, i) => ({
        text: o.matchLeft ?? "",
        matchLeft: o.matchLeft,
        matchRight: o.matchRight,
        order: i,
      }));
  } else if (meta.editor === "ordering") {
    optionsCreate = d.options
      .filter((o) => o.text.trim().length)
      .map((o, i) => ({ text: o.text, order: i }));
  } else if (meta.editor === "trueFalse") {
    correctAnswer = d.trueFalseAnswer as boolean;
  }

  return {
    optionsCreate,
    correctAnswer,
    rubric: d.rubric ? (d.rubric as Prisma.InputJsonValue) : undefined,
    scaleConfig: d.scaleConfig ? (d.scaleConfig as Prisma.InputJsonValue) : undefined,
  };
}

export async function createQuestion(input: QuestionInput): Promise<QResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(
    PERMISSIONS.QUESTION_CREATE,
  );
  const parsed = questionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  const bank = await prisma.questionBank.findFirst({
    where: { id: d.bankId, subscriberId },
    select: { id: true },
  });
  if (!bank) return { ok: false, error: "Banco inválido." };

  const typeError = validateByType(d);
  if (typeError) return { ok: false, error: typeError };

  const dup = await prisma.question.findFirst({
    where: { subscriberId, code: d.code },
    select: { id: true },
  });
  if (dup) return { ok: false, error: "Ya existe una pregunta con ese código." };

  const content = buildContent(d);
  const created = await prisma.question.create({
    data: {
      subscriberId,
      bankId: d.bankId,
      code: d.code,
      type: d.type,
      statement: d.statement,
      contextText: d.contextText ?? null,
      mediaUrl: d.mediaUrl ?? null,
      points: new Prisma.Decimal(d.points),
      partialScoring: d.partialScoring,
      difficulty: d.difficulty,
      competencyId: d.competencyId || null,
      topicId: d.topicId || null,
      normReference: d.normReference ?? null,
      tags: d.tags,
      suggestedTimeSec: d.suggestedTimeSec ?? null,
      isCritical: d.isCritical,
      feedback: d.feedback ?? null,
      status: "DRAFT",
      authorId: ctx.userId,
      version: 1,
      correctAnswer: content.correctAnswer,
      rubric: content.rubric,
      scaleConfig: content.scaleConfig,
      options: { create: content.optionsCreate },
      revisions: {
        create: {
          version: 1,
          action: "created",
          changedById: ctx.userId,
          snapshot: { code: d.code, type: d.type, statement: d.statement } as Prisma.InputJsonValue,
        },
      },
    },
  });
  await audit(ctx, {
    action: "question.create",
    entity: "Question",
    entityId: created.id,
    after: { code: created.code, type: created.type },
  });
  revalidatePath(`/panel/preguntas/${d.bankId}`);
  return { ok: true, id: created.id };
}

export async function updateQuestion(
  id: string,
  input: QuestionInput,
): Promise<QResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(
    PERMISSIONS.QUESTION_EDIT,
  );
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing || existing.subscriberId !== subscriberId) {
    return { ok: false, error: "Pregunta no encontrada." };
  }
  const parsed = questionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const typeError = validateByType(d);
  if (typeError) return { ok: false, error: typeError };

  if (d.code !== existing.code) {
    const dup = await prisma.question.findFirst({
      where: { subscriberId, code: d.code, id: { not: id } },
      select: { id: true },
    });
    if (dup) return { ok: false, error: "Código de pregunta duplicado." };
  }

  const content = buildContent(d);
  const newVersion = existing.version + 1;
  // Editar una pregunta aprobada la devuelve a borrador (trazabilidad editorial).
  const newStatus: QuestionStatus =
    existing.status === "APPROVED" ? "DRAFT" : existing.status;

  await prisma.$transaction([
    prisma.questionOption.deleteMany({ where: { questionId: id } }),
    prisma.question.update({
      where: { id },
      data: {
        code: d.code,
        type: d.type,
        statement: d.statement,
        contextText: d.contextText ?? null,
        mediaUrl: d.mediaUrl ?? null,
        points: new Prisma.Decimal(d.points),
        partialScoring: d.partialScoring,
        difficulty: d.difficulty,
        competencyId: d.competencyId || null,
        topicId: d.topicId || null,
        normReference: d.normReference ?? null,
        tags: d.tags,
        suggestedTimeSec: d.suggestedTimeSec ?? null,
        isCritical: d.isCritical,
        feedback: d.feedback ?? null,
        version: newVersion,
        status: newStatus,
        correctAnswer: content.correctAnswer ?? Prisma.DbNull,
        rubric: content.rubric ?? Prisma.DbNull,
        scaleConfig: content.scaleConfig ?? Prisma.DbNull,
        options: { create: content.optionsCreate },
        revisions: {
          create: {
            version: newVersion,
            action: "updated",
            changedById: ctx.userId,
            snapshot: { code: d.code, statement: d.statement } as Prisma.InputJsonValue,
          },
        },
      },
    }),
  ]);
  await audit(ctx, {
    action: "question.update",
    entity: "Question",
    entityId: id,
    before: { version: existing.version, status: existing.status },
    after: { version: newVersion, status: newStatus },
  });
  revalidatePath(`/panel/preguntas/${existing.bankId}`);
  revalidatePath(`/panel/preguntas/${existing.bankId}/pregunta/${id}`);
  return { ok: true, id };
}

type Transition = "submit" | "approve" | "reject" | "inactivate" | "reactivate";

/**
 * Reglas de transición del workflow de preguntas.
 *
 * `approve`: por estándar IN_REVIEW → APPROVED. Adicionalmente
 * acepta DRAFT y REJECTED para que el admin del suscriptor pueda
 * aprobar directamente desde la lista del banco sin tener que
 * primero "Enviar a revisión" y luego "Aprobar". Este atajo solo lo
 * pueden usar usuarios con QUESTION_APPROVE — quien aprueba se hace
 * responsable como reviewer.
 *
 * `reject`: igual, IN_REVIEW + DRAFT, por simetría con approve.
 */
const TRANSITION: Record<
  Transition,
  { from: QuestionStatus[]; to: QuestionStatus; perm: string; action: string }
> = {
  submit: { from: ["DRAFT", "REJECTED"], to: "IN_REVIEW", perm: PERMISSIONS.QUESTION_EDIT, action: "submitted" },
  approve: { from: ["DRAFT", "IN_REVIEW", "REJECTED"], to: "APPROVED", perm: PERMISSIONS.QUESTION_APPROVE, action: "approved" },
  reject: { from: ["DRAFT", "IN_REVIEW"], to: "REJECTED", perm: PERMISSIONS.QUESTION_REVIEW, action: "rejected" },
  inactivate: { from: ["APPROVED"], to: "INACTIVE", perm: PERMISSIONS.QUESTION_APPROVE, action: "inactivated" },
  reactivate: { from: ["INACTIVE"], to: "APPROVED", perm: PERMISSIONS.QUESTION_APPROVE, action: "reactivated" },
};

export async function setQuestionStatus(
  id: string,
  transition: Transition,
): Promise<{ ok: boolean; error?: string }> {
  const { ctx, subscriberId } = await requireSubscriberAction();
  const rule = TRANSITION[transition];
  if (!rule) return { ok: false, error: "Transición desconocida." };
  if (!can(ctx, rule.perm)) return { ok: false, error: "Sin permisos para esta acción." };

  const q = await prisma.question.findUnique({ where: { id } });
  if (!q || q.subscriberId !== subscriberId) return { ok: false, error: "Pregunta no encontrada." };
  if (!rule.from.includes(q.status)) {
    return { ok: false, error: `No se puede ${rule.action} desde el estado actual (${q.status}).` };
  }

  await prisma.question.update({
    where: { id },
    data: {
      status: rule.to,
      reviewerId:
        transition === "approve" || transition === "reject" ? ctx.userId : q.reviewerId,
      approvedAt: transition === "approve" ? new Date() : q.approvedAt,
      revisions: {
        create: {
          version: q.version,
          action: rule.action,
          changedById: ctx.userId,
          snapshot: { from: q.status, to: rule.to } as Prisma.InputJsonValue,
        },
      },
    },
  });
  await audit(ctx, {
    action: `question.${rule.action}`,
    entity: "Question",
    entityId: id,
    before: { status: q.status },
    after: { status: rule.to },
  });
  revalidatePath(`/panel/preguntas/${q.bankId}`);
  revalidatePath(`/panel/preguntas/${q.bankId}/pregunta/${id}`);
  return { ok: true };
}

/// Wrapper que descarta el retorno de `setQuestionStatus` para que pueda
/// usarse como `form action` (que exige `Promise<void>`).
export async function setQuestionStatusForm(id: string, transition: Transition): Promise<void> {
  await setQuestionStatus(id, transition);
}

/// Duplica una pregunta dentro del mismo banco. La copia queda en estado
/// DRAFT con código auto-generado y, si tiene opciones, también se clonan.
export async function duplicateQuestion(id: string): Promise<void> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.QUESTION_CREATE);
  const q = await prisma.question.findUnique({
    where: { id },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!q || q.subscriberId !== subscriberId) return;

  // Próximo código (incremental dentro del banco).
  const last = await prisma.question.findFirst({
    where: { bankId: q.bankId },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
  const seq = parseInt((last?.code ?? "").replace(/[^\d]/g, "") || "0", 10) + 1;
  const prefix = (last?.code ?? q.code).replace(/\d+$/, "").trim() || "P";
  const code = `${prefix}${seq}`;

  const copy = await prisma.question.create({
    data: {
      subscriberId: q.subscriberId,
      bankId: q.bankId,
      code,
      type: q.type,
      statement: `${q.statement} (copia)`,
      mediaUrl: q.mediaUrl,
      contextText: q.contextText,
      points: q.points,
      partialScoring: q.partialScoring,
      difficulty: q.difficulty,
      competencyId: q.competencyId,
      topicId: q.topicId,
      normReference: q.normReference,
      tags: q.tags,
      suggestedTimeSec: q.suggestedTimeSec,
      isCritical: q.isCritical,
      status: "DRAFT",
      authorId: ctx.userId,
      version: 1,
      rubric: q.rubric ?? undefined,
      scaleConfig: q.scaleConfig ?? undefined,
      correctAnswer: q.correctAnswer ?? undefined,
      options: q.options.length
        ? {
            create: q.options.map((o) => ({
              text: o.text,
              isCorrect: o.isCorrect,
              feedback: o.feedback,
              order: o.order,
              matchLeft: o.matchLeft,
              matchRight: o.matchRight,
              mediaUrl: o.mediaUrl,
            })),
          }
        : undefined,
    },
  });

  await audit(ctx, {
    action: "question.duplicate",
    entity: "Question",
    entityId: copy.id,
    after: { from: q.id, code: copy.code },
  });
  revalidatePath(`/panel/preguntas/${q.bankId}`);
  redirect(`/panel/preguntas/${q.bankId}/pregunta/${copy.id}`);
}

export async function deleteQuestion(id: string): Promise<void> {
  const { ctx, subscriberId } = await requireSubscriberAction(
    PERMISSIONS.QUESTION_EDIT,
  );
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q || q.subscriberId !== subscriberId) return;
  // Solo borradores/rechazadas pueden eliminarse; el resto se inactiva.
  if (q.status === "DRAFT" || q.status === "REJECTED") {
    await prisma.question.delete({ where: { id } });
    await audit(ctx, { action: "question.delete", entity: "Question", entityId: id, before: { code: q.code } });
  }
  revalidatePath(`/panel/preguntas/${q.bankId}`);
  redirect(`/panel/preguntas/${q.bankId}`);
}
