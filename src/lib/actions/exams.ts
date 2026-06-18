"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/schemes";

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}
function bool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true" || v === "1";
}
function date(v: FormDataEntryValue | null): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const examSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(3).max(160),
  description: z.string().max(2000).optional().nullable(),
  schemeId: z.string().optional().nullable(),
  type: z.enum(["ADMISSION","CERTIFICATION","RECERTIFICATION","DIAGNOSTIC","KNOWLEDGE","PRACTICAL","DOCUMENTARY","COMPETENCY","MOCK","FINAL"]),
  modality: z.enum(["ONLINE","ONSITE","HYBRID"]),
  durationMin: z.coerce.number().int().min(1).max(1440),
  passingScore: z.coerce.number().min(0).max(100),
  attemptsAllowed: z.coerce.number().int().min(1).max(20),
  /// Tope máximo de preguntas por intento. 0 = sin tope (servir todas las
  /// que las secciones produzcan). Default 50 — la fila viene marcada con
  /// ese valor desde la migración para los exámenes existentes.
  maxQuestions: z.coerce.number().int().min(0).max(500),
  /// Cantidad de cambios de pregunta que puede pedir el candidato durante
  /// la prueba. 0 desactiva la función. Default 5.
  questionSwapsAllowed: z.coerce.number().int().min(0).max(50),
  instructions: z.string().max(4000).optional().nullable(),
});

function parseExamForm(formData: FormData) {
  return examSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: clean(formData.get("description")),
    schemeId: clean(formData.get("schemeId")),
    type: formData.get("type"),
    modality: formData.get("modality"),
    durationMin: formData.get("durationMin"),
    passingScore: formData.get("passingScore"),
    attemptsAllowed: formData.get("attemptsAllowed"),
    maxQuestions: formData.get("maxQuestions"),
    questionSwapsAllowed: formData.get("questionSwapsAllowed"),
    instructions: clean(formData.get("instructions")),
  });
}

function flagsFromForm(formData: FormData) {
  return {
    randomizeQuestions: bool(formData.get("randomizeQuestions")),
    randomizeOptions: bool(formData.get("randomizeOptions")),
    requirePayment: bool(formData.get("requirePayment")),
    requireSchedule: bool(formData.get("requireSchedule")),
    requireCommittee: bool(formData.get("requireCommittee")),
    autoCertificate: bool(formData.get("autoCertificate")),
    showResultImmediately: bool(formData.get("showResultImmediately")),
    showCorrectAnswers: bool(formData.get("showCorrectAnswers")),
    allowReview: bool(formData.get("allowReview")),
    availableFrom: date(formData.get("availableFrom")),
    availableTo: date(formData.get("availableTo")),
  };
}

export async function createExam(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.EXAM_MANAGE);
  const parsed = parseExamForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  if (parsed.data.schemeId) {
    const sch = await prisma.certificationScheme.findFirst({ where: { id: parsed.data.schemeId, subscriberId }, select: { id: true } });
    if (!sch) return { ok: false, error: "Esquema inválido." };
  }
  const dup = await prisma.exam.findFirst({ where: { subscriberId, code: parsed.data.code }, select: { id: true } });
  if (dup) return { ok: false, error: "Ya existe una evaluación con ese código." };

  const created = await prisma.exam.create({
    data: {
      subscriberId,
      ...parsed.data,
      passingScore: new Prisma.Decimal(parsed.data.passingScore),
      ...flagsFromForm(formData),
      status: "DRAFT",
    },
  });
  await audit(ctx, { action: "exam.create", entity: "Exam", entityId: created.id, after: { code: created.code } });
  revalidatePath("/panel/evaluaciones");
  redirect(`/panel/evaluaciones/${created.id}`);
}

export async function updateExam(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.EXAM_MANAGE);
  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing || existing.subscriberId !== subscriberId) return { ok: false, error: "Evaluación no encontrada." };
  const parsed = parseExamForm(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  await prisma.exam.update({
    where: { id },
    data: {
      ...parsed.data,
      schemeId: parsed.data.schemeId || null,
      passingScore: new Prisma.Decimal(parsed.data.passingScore),
      ...flagsFromForm(formData),
    },
  });
  await audit(ctx, { action: "exam.update", entity: "Exam", entityId: id });
  revalidatePath(`/panel/evaluaciones/${id}`);
  return { ok: true, id };
}

async function recomputeTotals(examId: string) {
  const sections = await prisma.examSection.findMany({ where: { examId } });
  const numQuestions = sections.reduce((a, s) => a + s.questionCount, 0);
  const totalPoints = sections.reduce(
    (a, s) => a + s.questionCount * Number(s.pointsPerQuestion ?? 1),
    0,
  );
  await prisma.exam.update({
    where: { id: examId },
    data: { numQuestions, totalPoints: new Prisma.Decimal(totalPoints || 0) },
  });
}

const sectionSchema = z.object({
  title: z.string().min(1).max(120),
  bankId: z.string().min(1, "Seleccione un banco"),
  questionCount: z.coerce.number().int().min(1).max(200),
  difficulty: z.enum(["BASIC","INTERMEDIATE","ADVANCED"]).optional().nullable(),
  pointsPerQuestion: z.coerce.number().min(0).max(100).optional().nullable(),
});

export async function addSection(
  examId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.EXAM_MANAGE);
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam || exam.subscriberId !== subscriberId) return { ok: false, error: "Evaluación no encontrada." };
  const parsed = sectionSchema.safeParse({
    title: formData.get("title"),
    bankId: formData.get("bankId"),
    questionCount: formData.get("questionCount"),
    difficulty: clean(formData.get("difficulty")),
    pointsPerQuestion: clean(formData.get("pointsPerQuestion")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const bank = await prisma.questionBank.findFirst({ where: { id: parsed.data.bankId, subscriberId }, select: { id: true } });
  if (!bank) return { ok: false, error: "Banco inválido." };

  // Validar disponibilidad de preguntas aprobadas.
  const available = await prisma.question.count({
    where: {
      subscriberId, bankId: parsed.data.bankId, status: "APPROVED",
      ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
    },
  });
  if (available < parsed.data.questionCount) {
    return { ok: false, error: `El banco solo tiene ${available} preguntas aprobadas que cumplen el filtro (pidió ${parsed.data.questionCount}).` };
  }

  const count = await prisma.examSection.count({ where: { examId } });
  await prisma.examSection.create({
    data: {
      examId,
      title: parsed.data.title,
      bankId: parsed.data.bankId,
      questionCount: parsed.data.questionCount,
      difficulty: parsed.data.difficulty ?? null,
      pointsPerQuestion: parsed.data.pointsPerQuestion != null ? new Prisma.Decimal(parsed.data.pointsPerQuestion) : null,
      order: count,
    },
  });
  await recomputeTotals(examId);
  await audit(ctx, { action: "exam.section.add", entity: "ExamSection", entityId: examId });
  revalidatePath(`/panel/evaluaciones/${examId}`);
  return { ok: true };
}

export async function removeSection(sectionId: string): Promise<void> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.EXAM_MANAGE);
  const section = await prisma.examSection.findUnique({ where: { id: sectionId }, include: { exam: true } });
  if (!section || section.exam.subscriberId !== subscriberId) return;
  await prisma.examSection.delete({ where: { id: sectionId } });
  await recomputeTotals(section.examId);
  await audit(ctx, { action: "exam.section.remove", entity: "ExamSection", entityId: sectionId });
  revalidatePath(`/panel/evaluaciones/${section.examId}`);
}

export async function setExamStatus(
  id: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
): Promise<void> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.EXAM_MANAGE);
  const exam = await prisma.exam.findUnique({ where: { id }, include: { _count: { select: { sections: true } } } });
  if (!exam || exam.subscriberId !== subscriberId) return;
  if (status === "PUBLISHED") {
    if (exam._count.sections === 0 || exam.numQuestions <= 0) {
      // No publicar evaluaciones sin secciones/preguntas.
      return;
    }
  }
  await prisma.exam.update({ where: { id }, data: { status } });
  await audit(ctx, { action: `exam.${status.toLowerCase()}`, entity: "Exam", entityId: id, after: { status } });
  revalidatePath(`/panel/evaluaciones/${id}`);
  revalidatePath("/panel/evaluaciones");
}

export async function reenabledExam(
  examId: string,
  reenableReason: string,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.EXAM_MANAGE);
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam || exam.subscriberId !== subscriberId) {
    return { ok: false, error: "Examen no encontrado" };
  }

  const reason = reenableReason.trim();
  if (!reason || reason.length < 10) {
    return { ok: false, error: "El motivo debe tener al menos 10 caracteres" };
  }
  if (reason.length > 500) {
    return { ok: false, error: "El motivo no puede exceder 500 caracteres" };
  }

  // Limpiar los flags de deshabilitación y registrar el motivo de habilitación
  await prisma.exam.update({
    where: { id: examId },
    data: {
      disabledAt: null,
      disabledReason: null,
      reenableReason: reason,
    },
  });

  await audit(ctx, {
    action: "exam.reenable",
    entity: "Exam",
    entityId: examId,
    after: { reenableReason: reason },
  });

  revalidatePath(`/panel/evaluaciones/${examId}`);
  return { ok: true };
}
