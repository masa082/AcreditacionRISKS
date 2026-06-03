"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/schemes";

const schema = z
  .object({
    current: z.string().min(1, "Ingrese su contraseña actual"),
    password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });

/// Cambia la contraseña del usuario autenticado (suscriptor/plataforma/candidato).
export async function changeOwnPassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireUser();
  const parsed = schema.safeParse({
    current: formData.get("current"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { passwordHash: true } });
  if (!user) return { ok: false, error: "Usuario no encontrado." };
  if (!(await verifyPassword(parsed.data.current, user.passwordHash))) {
    return { ok: false, error: "La contraseña actual es incorrecta." };
  }
  await prisma.user.update({ where: { id: ctx.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await audit(ctx, { action: "account.password.change", entity: "User", entityId: ctx.userId });
  return { ok: true };
}
