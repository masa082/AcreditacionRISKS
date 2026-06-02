import "server-only";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import {
  SESSION_COOKIE,
  signSession,
  verifySession,
  sessionExpiry,
  newToken,
} from "./auth";
import { hasPermission } from "./permissions";

export interface AuthContext {
  userId: string;
  type: "PLATFORM" | "SUBSCRIBER" | "CANDIDATE";
  subscriberId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  roleKey: string | null;
  roleName: string | null;
  permissions: string[];
}

/// Crea una sesión persistente y fija la cookie httpOnly. Devuelve el token.
export async function createUserSession(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuario no encontrado");

  const jti = newToken(16);
  const expiresAt = sessionExpiry();
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = hdrs.get("user-agent") ?? null;

  await prisma.session.create({
    data: { userId, jti, expiresAt, ip, userAgent },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date(), lastLoginIp: ip },
  });

  const token = await signSession({
    sub: user.id,
    jti,
    type: user.type,
    sid: user.subscriberId,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/// Devuelve el contexto autenticado o null. Valida revocación/expiración.
export async function getCurrentUser(): Promise<AuthContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { jti: payload.jti },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { role: true },
  });
  if (!user || user.status === "SUSPENDED") return null;

  return {
    userId: user.id,
    type: user.type,
    subscriberId: user.subscriberId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleKey: user.role?.key ?? null,
    roleName: user.role?.name ?? null,
    permissions: user.role?.permissions ?? [],
  };
}

/// Cierra la sesión actual (revoca + limpia cookie).
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const payload = await verifySession(token);
    if (payload) {
      await prisma.session
        .updateMany({
          where: { jti: payload.jti, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => {});
    }
  }
  store.delete(SESSION_COOKIE);
}

export async function requireUser(): Promise<AuthContext> {
  const ctx = await getCurrentUser();
  if (!ctx) throw new Error("UNAUTHENTICATED");
  return ctx;
}

export function can(ctx: AuthContext, permission: string): boolean {
  return hasPermission(ctx.permissions, permission);
}

export async function requirePermission(
  permission: string,
): Promise<AuthContext> {
  const ctx = await requireUser();
  if (!can(ctx, permission)) throw new Error("FORBIDDEN");
  return ctx;
}
