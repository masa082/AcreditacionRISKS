"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { audit } from "@/lib/audit";

const schemeSchema = z.object({
  code: z.string().min(1, "Código requerido").max(40),
  name: z.string().min(3, "Nombre requerido").max(160),
  description: z.string().max(2000).optional().nullable(),
  scope: z.string().max(2000).optional().nullable(),
  normReference: z.string().max(200).optional().nullable(),
  validityMonths: z.coerce.number().int().min(0).max(600).default(36),
});

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

export async function createScheme(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(
    PERMISSIONS.SCHEME_MANAGE,
  );
  const parsed = schemeSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: clean(formData.get("description")),
    scope: clean(formData.get("scope")),
    normReference: clean(formData.get("normReference")),
    validityMonths: formData.get("validityMonths"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const dup = await prisma.certificationScheme.findFirst({
    where: { subscriberId, code: parsed.data.code },
    select: { id: true },
  });
  if (dup) return { ok: false, error: "Ya existe un esquema con ese código." };

  const created = await prisma.certificationScheme.create({
    data: { subscriberId, ...parsed.data },
  });
  await audit(ctx, {
    action: "scheme.create",
    entity: "CertificationScheme",
    entityId: created.id,
    after: created,
  });
  revalidatePath("/panel/esquemas");
  redirect("/panel/esquemas");
}

export async function updateScheme(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(
    PERMISSIONS.SCHEME_MANAGE,
  );
  const existing = await prisma.certificationScheme.findUnique({ where: { id } });
  if (!existing || existing.subscriberId !== subscriberId) {
    return { ok: false, error: "Esquema no encontrado." };
  }
  const parsed = schemeSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: clean(formData.get("description")),
    scope: clean(formData.get("scope")),
    normReference: clean(formData.get("normReference")),
    validityMonths: formData.get("validityMonths"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const updated = await prisma.certificationScheme.update({
    where: { id },
    data: parsed.data,
  });
  await audit(ctx, {
    action: "scheme.update",
    entity: "CertificationScheme",
    entityId: id,
    before: existing,
    after: updated,
  });
  revalidatePath("/panel/esquemas");
  revalidatePath(`/panel/esquemas/${id}`);
  redirect("/panel/esquemas");
}

export async function toggleSchemeActive(id: string): Promise<void> {
  const { ctx, subscriberId } = await requireSubscriberAction(
    PERMISSIONS.SCHEME_MANAGE,
  );
  const existing = await prisma.certificationScheme.findUnique({ where: { id } });
  if (!existing || existing.subscriberId !== subscriberId) return;
  await prisma.certificationScheme.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
  await audit(ctx, {
    action: "scheme.toggleActive",
    entity: "CertificationScheme",
    entityId: id,
    after: { isActive: !existing.isActive },
  });
  revalidatePath("/panel/esquemas");
}
