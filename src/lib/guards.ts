import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, can, type AuthContext } from "./session";

export interface SubscriberCtx {
  ctx: AuthContext;
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
