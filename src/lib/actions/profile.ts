"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCandidateAction } from "@/lib/guards";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/schemes";

function clean(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}
function date(v: FormDataEntryValue | null): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const profileSchema = z.object({
  firstName: z.string().min(2, "Ingrese su nombre").max(80),
  lastName: z.string().min(2, "Ingrese sus apellidos").max(80),
  phone: z.string().max(40).optional().nullable(),
  birthDate: z.date().optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
});

/// Actualiza los datos de contacto del candidato (y refleja nombre/teléfono en su usuario).
export async function updateCandidateProfile(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx, candidateId } = await requireCandidateAction();

  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: clean(formData.get("phone")),
    birthDate: date(formData.get("birthDate")),
    country: clean(formData.get("country")),
    city: clean(formData.get("city")),
    address: clean(formData.get("address")),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const d = parsed.data;

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone,
      birthDate: d.birthDate ?? null,
      country: d.country,
      city: d.city,
      address: d.address,
    },
  });
  await prisma.user.update({
    where: { id: ctx.userId },
    data: { firstName: d.firstName, lastName: d.lastName, phone: d.phone },
  });

  await audit(ctx, { action: "profile.update", entity: "Candidate", entityId: candidateId });
  revalidatePath("/portal/perfil");
  revalidatePath("/portal");
  return { ok: true };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Ingrese su contraseña actual"),
    password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });

/// Cambia la contraseña del candidato autenticado (verifica la actual).
export async function changePassword(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { ctx } = await requireCandidateAction();
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { passwordHash: true } });
  if (!user) return { ok: false, error: "Usuario no encontrado." };
  const ok = await verifyPassword(parsed.data.current, user.passwordHash);
  if (!ok) return { ok: false, error: "La contraseña actual es incorrecta." };

  await prisma.user.update({
    where: { id: ctx.userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  await audit(ctx, { action: "password.change", entity: "User", entityId: ctx.userId });
  return { ok: true };
}
