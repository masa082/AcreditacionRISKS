"use client";

import { useCallback, useState, useTransition } from "react";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/lib/actions/notifications";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

export function NotificationBell({
  initialItems,
  initialUnread,
}: {
  initialItems: NotificationItem[];
  initialUnread: number;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [, start] = useTransition();

  const refresh = useCallback(() => {
    start(async () => {
      const data = await getMyNotifications();
      setItems(data.items);
      setUnread(data.unread);
    });
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) refresh();
  }

  function onItemClick(n: NotificationItem) {
    if (n.read) return;
    setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    start(async () => {
      await markNotificationRead(n.id);
    });
  }

  function onMarkAll() {
    setItems((arr) => arr.map((x) => ({ ...x, read: true })));
    setUnread(0);
    start(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-sm font-semibold text-slate-800">Notificaciones</span>
              {unread > 0 ? (
                <button type="button" onClick={onMarkAll} className="text-xs font-medium text-brand-700 hover:underline">
                  Marcar todas
                </button>
              ) : null}
            </div>
            <div className="max-h-96 overflow-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">No tiene notificaciones.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => onItemClick(n)}
                        className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${n.read ? "" : "bg-brand-50/40"}`}
                      >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-brand-600"}`} />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-800">{n.title}</span>
                          {n.body ? <span className="mt-0.5 block text-xs text-slate-500">{n.body}</span> : null}
                          <span className="mt-1 block text-[11px] text-slate-400">{relativeTime(n.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
