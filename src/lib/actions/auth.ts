"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { createUserSession, destroyCurrentSession } from "@/lib/session";

const HOME_BY_TYPE: Record<string, string> = {
  PLATFORM: "/admin",
  SUBSCRIBER: "/panel",
  CANDIDATE: "/portal",
};

const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Ingrese su contraseña"),
  org: z.string().optional(),
});

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    org: formData.get("org") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { email, password, org } = parsed.data;

  // Resolver suscriptor opcional por slug.
  let subscriberId: string | null | undefined = undefined;
  if (org) {
    const sub = await prisma.subscriber.findUnique({ where: { slug: org } });
    if (!sub) return { error: "Organización no encontrada" };
    subscriberId = sub.id;
  }

  const users = await prisma.user.findMany({
    where: {
      email: email.toLowerCase(),
      ...(subscriberId !== undefined ? { subscriberId } : {}),
    },
  });

  if (users.length === 0) {
    return { error: "Credenciales incorrectas" };
  }
  if (users.length > 1) {
    return {
      error:
        "Hay varias cuentas con ese correo. Indique el identificador de su organización.",
    };
  }

  const user = users[0];
  if (user.status === "SUSPENDED") {
    return { error: "Su cuenta está suspendida. Contacte al administrador." };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "Credenciales incorrectas" };
  }
  if (user.status === "PENDING_VERIFICATION") {
    return { error: "Debe validar su correo electrónico antes de ingresar." };
  }
  // Bloquea el acceso si el organismo (tenant) está inactivo. No aplica a plataforma.
  if (user.subscriberId) {
    const sub = await prisma.subscriber.findUnique({
      where: { id: user.subscriberId },
      select: { status: true },
    });
    if (sub && (sub.status === "SUSPENDED" || sub.status === "CANCELLED")) {
      return { error: "El acceso de su organización está inactivo. Contacte al administrador de la plataforma." };
    }
  }

  await createUserSession(user.id);
  redirect(HOME_BY_TYPE[user.type] ?? "/portal");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}
