"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { ALL_SUBSCRIBER_PERMISSIONS } from "@/lib/permission-catalog";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/schemes";

function permsFromForm(formData: FormData): string[] {
  const perms = formData.getAll("permissions").map((v) => String(v));
  return perms.filter((p) => ALL_SUBSCRIBER_PERMISSIONS.has(p));
}

const createSchema = z.object({
  key: z.string().min(2).max(40).regex(/^[A-Z0-9_]+$/, "Clave: MAYÚSCULAS, números y guion bajo"),
  name: z.string().min(2, "Nombre requerido").max(80),
  description: z.string().max(300).optional().nullable(),
});

/// Crea un rol personalizado (no del sistema) para el suscriptor.
export async function createRole(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.ROLE_MANAGE);
  const parsed = createSchema.safeParse({
    key: (formData.get("key") as string | null)?.toUpperCase().trim(),
    name: formData.get("name"),
    description: (() => {
      const s = formData.get("description");
      const v = typeof s === "string" ? s.trim() : "";
      return v.length ? v : null;
    })(),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const permissions = permsFromForm(formData);
  if (permissions.length === 0) return { ok: false, error: "Seleccione al menos un permiso." };

  const dup = await prisma.role.findFirst({ where: { subscriberId, key: parsed.data.key }, select: { id: true } });
  if (dup) return { ok: false, error: "Ya existe un rol con esa clave." };

  const role = await prisma.role.create({
    data: { subscriberId, key: parsed.data.key, name: parsed.data.name, description: parsed.data.description, isSystem: false, permissions },
  });
  await audit(ctx, { action: "role.create", entity: "Role", entityId: role.id, subscriberId, after: { key: parsed.data.key } });
  revalidatePath("/panel/roles");
  return { ok: true };
}

/// Actualiza los permisos (y nombre/descr.) de un rol personalizado del suscriptor.
export async function updateRole(
  roleId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.ROLE_MANAGE);
  const role = await prisma.role.findFirst({ where: { id: roleId, subscriberId }, select: { id: true, isSystem: true } });
  if (!role) return { ok: false, error: "Rol no encontrado." };
  if (role.isSystem) return { ok: false, error: "Los roles del sistema no se pueden modificar." };

  const name = (formData.get("name") as string | null)?.trim();
  if (!name || name.length < 2) return { ok: false, error: "Nombre requerido." };
  const permissions = permsFromForm(formData);
  if (permissions.length === 0) return { ok: false, error: "Seleccione al menos un permiso." };
  const description = (() => {
    const s = formData.get("description");
    const v = typeof s === "string" ? s.trim() : "";
    return v.length ? v : null;
  })();

  await prisma.role.update({ where: { id: roleId }, data: { name, description, permissions } });
  await audit(ctx, { action: "role.update", entity: "Role", entityId: roleId, subscriberId });
  revalidatePath("/panel/roles");
  return { ok: true };
}

/// Elimina un rol personalizado (si no tiene usuarios asignados).
export async function deleteRole(roleId: string): Promise<void> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.ROLE_MANAGE);
  const role = await prisma.role.findFirst({
    where: { id: roleId, subscriberId },
    select: { id: true, isSystem: true, _count: { select: { users: true } } },
  });
  if (!role || role.isSystem || role._count.users > 0) return;
  await prisma.role.delete({ where: { id: roleId } });
  await audit(ctx, { action: "role.delete", entity: "Role", entityId: roleId, subscriberId });
  revalidatePath("/panel/roles");
}
