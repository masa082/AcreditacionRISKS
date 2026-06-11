"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, newToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";

export interface ForgotState {
  ok: boolean;
  error?: string;
  message?: string;
  // NOTA: NO devolver el resetToken al cliente. Hacerlo permite que
  // cualquiera con acceso al correo de un usuario active el reset desde
  // el navegador sin pasar por el inbox real — bypass de propiedad del
  // email. El token viaja SOLO por email a la dirección registrada.
}

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

const forgotSchema = z.object({
  email: z.string().email("Correo inválido"),
  org: z.string().optional(),
});

/// Solicita el restablecimiento de contraseña. No revela si la cuenta existe;
/// en dev devuelve el enlace para continuar (sin servidor de correo).
export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = forgotSchema.safeParse({
    email: formData.get("email"),
    org: formData.get("org") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const email = parsed.data.email.toLowerCase();

  let subscriberId: string | null | undefined = undefined;
  if (parsed.data.org) {
    // Aceptamos tanto slug como ID — el form ahora envía el ID directamente
    // desde el selector de suscriptores activos (más robusto que un texto libre).
    const sub = await prisma.subscriber.findFirst({
      where: { OR: [{ slug: parsed.data.org }, { id: parsed.data.org }] },
      select: { id: true },
    });
    if (!sub) {
      // No revelamos si la org existe o no — respuesta genérica.
      return { ok: true, message: GENERIC_OK };
    }
    subscriberId = sub.id;
  }

  // Acepta tanto el correo principal como cualquier correo alterno verificado.
  const users = await prisma.user.findMany({
    where: {
      OR: [{ email }, { additionalEmails: { has: email } }],
      ...(subscriberId !== undefined ? { subscriberId } : {}),
    },
    select: { id: true, subscriberId: true, status: true, email: true },
  });

  if (users.length > 1) {
    return { ok: false, error: "Hay varias cuentas con ese correo. Indique su organización." };
  }
  if (users.length === 0) {
    // No revelar inexistencia.
    return { ok: true, message: GENERIC_OK };
  }

  const user = users[0];
  if (user.status === "SUSPENDED") {
    return { ok: true, message: GENERIC_OK };
  }

  const resetToken = newToken(24);
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpires: new Date(Date.now() + RESET_TTL_MS) },
  });
  await audit(null, {
    action: "password.reset.request",
    entity: "User",
    entityId: user.id,
    subscriberId: user.subscriberId,
  });
  // El token SIEMPRE viaja solo por email — nunca en la respuesta del action.
  await sendPasswordResetEmail(user.subscriberId, email, `${appBaseUrl()}/restablecer/${resetToken}`);
  return { ok: true, message: GENERIC_OK };
}

const GENERIC_OK =
  "Si existe una cuenta con ese correo, enviamos las instrucciones a su bandeja de entrada. Revise también la carpeta de spam.";

export interface ResetState {
  ok: boolean;
  error?: string;
}

const resetSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

/// Restablece la contraseña a partir de un token válido y vigente.
/// Revoca todas las sesiones activas del usuario por seguridad.
export async function resetPassword(
  token: string,
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  if (!token || token.length < 8) return { ok: false, error: "Enlace inválido." };
  const user = await prisma.user.findFirst({
    where: { resetToken: token },
    select: { id: true, subscriberId: true, resetTokenExpires: true },
  });
  if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
    return { ok: false, error: "El enlace de restablecimiento no es válido o expiró. Solicítelo de nuevo." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpires: null },
    }),
    prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  await audit(null, {
    action: "password.reset.complete",
    entity: "User",
    entityId: user.id,
    subscriberId: user.subscriberId,
  });
  redirect("/login?reset=1");
}
