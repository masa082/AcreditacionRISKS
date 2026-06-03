import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NotificationBell } from "@/components/notification-bell";

/// Carga las notificaciones del usuario autenticado y renderiza la campana.
export async function NotificationBellServer() {
  const ctx = await getCurrentUser();
  if (!ctx) return null;

  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: ctx.userId }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.notification.count({ where: { userId: ctx.userId, readAt: null } }),
  ]);

  return (
    <NotificationBell
      initialUnread={unread}
      initialItems={rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.readAt != null,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
