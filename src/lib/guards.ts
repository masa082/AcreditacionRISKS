import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getCurrentUser, can, type AuthContext } from "./session";

export interface SubscriberCtx {
  ctx: AuthContext;
  subscriberId: string;
}

export interface CandidateCtx {
  ctx: AuthContext;
  candidateId: string;
  subscriberId: string;
}

/// Guard para PÁGINAS del panel del suscriptor. Redirige si no aplica.
export async function requireSubscriberPage(): Promise<SubscriberCtx> {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");
  if (ctx.type !== "SUBSCRIBER" || !ctx.subscriberId) {
    redirect(ctx.type === "PLATFORM" ? "/admin" : "/portal");
  }
  return { ctx, subscriberId: ctx.subscriberId };
}

/// Guard para SERVER ACTIONS del suscriptor. Lanza error si no aplica.
export async function requireSubscriberAction(
  permission?: string,
): Promise<SubscriberCtx> {
  const ctx = await getCurrentUser();
  if (!ctx) throw new Error("UNAUTHENTICATED");
  if (ctx.type !== "SUBSCRIBER" || !ctx.subscriberId) {
    throw new Error("FORBIDDEN");
  }
  if (permission && !can(ctx, permission)) {
    throw new Error("FORBIDDEN: " + permission);
  }
  return { ctx, subscriberId: ctx.subscriberId };
}

/// Guard para PÁGINAS de la plataforma (SUPERADMIN). Redirige si no aplica.
export async function requirePlatformPage(): Promise<AuthContext> {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");
  if (ctx.type !== "PLATFORM") {
    redirect(ctx.type === "SUBSCRIBER" ? "/panel" : "/portal");
  }
  return ctx;
}

/// Guard para SERVER ACTIONS de la plataforma. Lanza error si no aplica.
export async function requirePlatformAction(permission?: string): Promise<AuthContext> {
  const ctx = await getCurrentUser();
  if (!ctx) throw new Error("UNAUTHENTICATED");
  if (ctx.type !== "PLATFORM") throw new Error("FORBIDDEN");
  if (permission && !can(ctx, permission)) throw new Error("FORBIDDEN: " + permission);
  return ctx;
}

/// Guard para PÁGINAS del portal del candidato. Redirige si no aplica.
export async function requireCandidatePage(): Promise<CandidateCtx> {
  const ctx = await getCurrentUser();
  if (!ctx) redirect("/login");
  if (ctx.type !== "CANDIDATE") {
    redirect(ctx.type === "PLATFORM" ? "/admin" : "/panel");
  }
  const candidate = await prisma.candidate.findFirst({
    where: { userId: ctx.userId },
    select: { id: true, subscriberId: true },
  });
  if (!candidate) redirect("/login");
  return { ctx, candidateId: candidate.id, subscriberId: candidate.subscriberId };
}

/// Guard para SERVER ACTIONS del candidato. Lanza error si no aplica.
export async function requireCandidateAction(): Promise<CandidateCtx> {
  const ctx = await getCurrentUser();
  if (!ctx) throw new Error("UNAUTHENTICATED");
  if (ctx.type !== "CANDIDATE") throw new Error("FORBIDDEN");
  const candidate = await prisma.candidate.findFirst({
    where: { userId: ctx.userId },
    select: { id: true, subscriberId: true },
  });
  if (!candidate) throw new Error("FORBIDDEN");
  return { ctx, candidateId: candidate.id, subscriberId: candidate.subscriberId };
}
