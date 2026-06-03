"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string; // ISO
}

/// Devuelve las notificaciones recientes del usuario autenticado + no leídas.
export async function getMyNotifications(): Promise<{ items: NotificationItem[]; unread: number }> {
  const ctx = await requireUser();
  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.notification.count({ where: { userId: ctx.userId, readAt: null } }),
  ]);
  return {
    items: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.readAt != null,
      createdAt: n.createdAt.toISOString(),
    })),
    unread,
  };
}

/// Marca una notificación como leída (solo del propio usuario).
export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  const ctx = await requireUser();
  await prisma.notification.updateMany({
    where: { id, userId: ctx.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

/// Marca todas las notificaciones del usuario como leídas.
export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const ctx = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: ctx.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}
