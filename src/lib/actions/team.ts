"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSubscriberAction } from "@/lib/guards";
import { PERMISSIONS } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/schemes";

const createSchema = z.object({
  firstName: z.string().min(2, "Nombre requerido").max(80),
  lastName: z.string().min(2, "Apellido requerido").max(80),
  email: z.string().email("Correo inválido"),
  roleId: z.string().min(1, "Seleccione un rol"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});

/// Crea un usuario interno (miembro del equipo) del suscriptor.
export async function createTeamUser(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.USER_MANAGE);
  const parsed = createSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const email = d.email.toLowerCase();

  const role = await prisma.role.findFirst({ where: { id: d.roleId, subscriberId }, select: { id: true } });
  if (!role) return { ok: false, error: "Rol inválido." };
  const dup = await prisma.user.findFirst({ where: { email, subscriberId }, select: { id: true } });
  if (dup) return { ok: false, error: "Ya existe un usuario con ese correo en la organización." };

  const user = await prisma.user.create({
    data: {
      subscriberId,
      type: "SUBSCRIBER",
      email,
      passwordHash: await hashPassword(d.password),
      firstName: d.firstName,
      lastName: d.lastName,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      roleId: d.roleId,
    },
  });
  await audit(ctx, { action: "user.create", entity: "User", entityId: user.id, subscriberId, after: { email } });
  revalidatePath("/panel/usuarios");
  return { ok: true };
}

async function loadOwnedUser(subscriberId: string, userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, subscriberId, type: "SUBSCRIBER" }, select: { id: true } });
  return user;
}

/// Activa o suspende a un usuario del equipo (no puede modificarse a sí mismo).
export async function setUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED"): Promise<void> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.USER_MANAGE);
  if (userId === ctx.userId) return;
  if (!(await loadOwnedUser(subscriberId, userId))) return;
  await prisma.user.update({ where: { id: userId }, data: { status } });
  if (status === "SUSPENDED") {
    // Revocar sesiones activas al suspender.
    await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  await audit(ctx, { action: "user.status", entity: "User", entityId: userId, subscriberId, after: { status } });
  revalidatePath("/panel/usuarios");
}

/// Cambia el rol de un usuario del equipo.
export async function setUserRole(userId: string, roleId: string): Promise<void> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.USER_MANAGE);
  if (!(await loadOwnedUser(subscriberId, userId))) return;
  const role = await prisma.role.findFirst({ where: { id: roleId, subscriberId }, select: { id: true } });
  if (!role) return;
  await prisma.user.update({ where: { id: userId }, data: { roleId } });
  await audit(ctx, { action: "user.role", entity: "User", entityId: userId, subscriberId, after: { roleId } });
  revalidatePath("/panel/usuarios");
}

const pwSchema = z.object({ password: z.string().min(8, "Mínimo 8 caracteres").max(72) });

/// Restablece la contraseña de un usuario del equipo (acción administrativa).
export async function setUserPassword(
  userId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.USER_MANAGE);
  const parsed = pwSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  if (!(await loadOwnedUser(subscriberId, userId))) return { ok: false, error: "Usuario no encontrado." };

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit(ctx, { action: "user.password.reset", entity: "User", entityId: userId, subscriberId });
  revalidatePath("/panel/usuarios");
  return { ok: true };
}
