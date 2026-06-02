"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/schemes";

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

const bankSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(3).max(160),
  description: z.string().max(2000).optional().nullable(),
  schemeId: z.string().optional().nullable(),
  normReference: z.string().max(200).optional().nullable(),
  version: z.string().max(20).default("v1"),
});

export async function createBank(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(
    PERMISSIONS.QUESTION_CREATE,
  );
  const parsed = bankSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: clean(formData.get("description")),
    schemeId: clean(formData.get("schemeId")),
    normReference: clean(formData.get("normReference")),
    version: formData.get("version") || "v1",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  if (parsed.data.schemeId) {
    const sch = await prisma.certificationScheme.findFirst({
      where: { id: parsed.data.schemeId, subscriberId },
      select: { id: true },
    });
    if (!sch) return { ok: false, error: "Esquema inválido." };
  }
  const dup = await prisma.questionBank.findFirst({
    where: { subscriberId, code: parsed.data.code },
    select: { id: true },
  });
  if (dup) return { ok: false, error: "Ya existe un banco con ese código." };

  const created = await prisma.questionBank.create({
    data: { subscriberId, ...parsed.data },
  });
  await audit(ctx, {
    action: "bank.create",
    entity: "QuestionBank",
    entityId: created.id,
    after: created,
  });
  revalidatePath("/panel/preguntas");
  redirect(`/panel/preguntas/${created.id}`);
}

const competencySchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(2).max(160),
  description: z.string().max(1000).optional().nullable(),
});

export async function createCompetency(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(
    PERMISSIONS.QUESTION_CREATE,
  );
  const parsed = competencySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: clean(formData.get("description")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const dup = await prisma.competency.findFirst({
    where: { subscriberId, code: parsed.data.code },
    select: { id: true },
  });
  if (dup) return { ok: false, error: "Código de competencia duplicado." };
  const created = await prisma.competency.create({
    data: { subscriberId, ...parsed.data },
  });
  await audit(ctx, { action: "competency.create", entity: "Competency", entityId: created.id });
  revalidatePath("/panel/preguntas/clasificacion");
  return { ok: true, id: created.id };
}

const topicSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(2).max(160),
  competencyId: z.string().optional().nullable(),
});

export async function createTopic(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(
    PERMISSIONS.QUESTION_CREATE,
  );
  const parsed = topicSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    competencyId: clean(formData.get("competencyId")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  if (parsed.data.competencyId) {
    const comp = await prisma.competency.findFirst({
      where: { id: parsed.data.competencyId, subscriberId },
      select: { id: true },
    });
    if (!comp) return { ok: false, error: "Competencia inválida." };
  }
  const dup = await prisma.topic.findFirst({
    where: { subscriberId, code: parsed.data.code },
    select: { id: true },
  });
  if (dup) return { ok: false, error: "Código de tema duplicado." };
  const created = await prisma.topic.create({
    data: { subscriberId, ...parsed.data },
  });
  await audit(ctx, { action: "topic.create", entity: "Topic", entityId: created.id });
  revalidatePath("/panel/preguntas/clasificacion");
  return { ok: true, id: created.id };
}
