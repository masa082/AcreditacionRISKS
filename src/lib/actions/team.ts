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

const editTeamSchema = z.object({
  firstName: z.string().min(2, "Nombre requerido").max(80),
  lastName: z.string().min(2, "Apellido requerido").max(80),
  email: z.string().email("Correo inválido").max(190),
  phone: z.string().max(40).optional().nullable(),
  locale: z.string().max(10).optional().nullable(),
});

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

/// Permite al admin del SUSCRIPTOR editar los datos personales de un miembro
/// del equipo (nombre, apellidos, correo, teléfono, locale). Sincroniza el
/// correo con Candidate cuando el usuario tiene candidate vinculado.
export async function updateTeamUser(
  userId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, subscriberId } = await requireSubscriberAction(PERMISSIONS.USER_MANAGE);
  const parsed = editTeamSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: clean(formData.get("phone")),
    locale: clean(formData.get("locale")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const email = d.email.toLowerCase();

  // El usuario debe pertenecer al tenant. No exigimos type=SUBSCRIBER porque
  // queremos poder editar también miembros con type=CANDIDATE registrados
  // en este suscriptor (caso poco frecuente, defensa adicional).
  const user = await prisma.user.findFirst({
    where: { id: userId, subscriberId },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      locale: true, additionalEmails: true,
    },
  });
  if (!user) return { ok: false, error: "Usuario no encontrado." };

  // Si cambia el correo, debemos validar que no colisione con otro usuario
  // (principal o alterno) del mismo suscriptor.
  if (email !== user.email) {
    const collision = await prisma.user.findFirst({
      where: {
        subscriberId,
        NOT: { id: userId },
        OR: [{ email }, { additionalEmails: { has: email } }],
      },
      select: { id: true },
    });
    if (collision) {
      return { ok: false, error: "Ese correo ya está en uso por otra cuenta de la organización." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      email,
      phone: d.phone,
      locale: d.locale ?? undefined,
    },
  });
  // Sincronizar Candidate si existe (mantiene login del candidato consistente).
  await prisma.candidate.updateMany({
    where: { userId, subscriberId },
    data: { firstName: d.firstName, lastName: d.lastName, email, phone: d.phone },
  });

  await audit(ctx, {
    action: "user.update",
    entity: "User",
    entityId: userId,
    subscriberId,
    before: {
      firstName: user.firstName, lastName: user.lastName,
      email: user.email, phone: user.phone, locale: user.locale,
    },
    after: { firstName: d.firstName, lastName: d.lastName, email, phone: d.phone, locale: d.locale },
  });
  revalidatePath("/panel/usuarios");
  return { ok: true, message: "Datos actualizados." };
}
