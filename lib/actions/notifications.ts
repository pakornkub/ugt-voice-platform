'use server';

// lib/actions/notifications.ts — the in-app notification drawer, persisted in SQL Server (slice 1
// of the localStorage → DB rewiring, 2026-10-09). A caller only sees / marks the notifications of
// tickets they may see (lib/ticket-access.ts).
// ponytail: IsRead is one flag per notification (upstream's shared list) — a ticket's employee and
// its gatekeepers share it; add a per-user read table if that starts to matter.
import { prisma } from '@/lib/prisma';
import {
  listVisibleNotifications,
  requireTicketViewer,
  visibleTicketIds,
} from '@/lib/ticket-access';
import type { NotificationItem } from '@/types';

async function visibleNotifications(): Promise<NotificationItem[]> {
  const viewer = await requireTicketViewer();
  return listVisibleNotifications(viewer, await visibleTicketIds(viewer));
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return visibleNotifications();
}

export async function markNotificationAsRead(id: string): Promise<NotificationItem[]> {
  const visible = await visibleNotifications();
  if (!visible.some((n) => n.id === id)) throw new Error('FORBIDDEN');
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return visible.map((n) => (n.id === id ? { ...n, read: true } : n));
}

// SQL Server caps a statement at 2100 parameters — update in chunks.
const CHUNK = 1000;

export async function markAllNotificationsAsRead(): Promise<NotificationItem[]> {
  const visible = await visibleNotifications();
  const unread = visible.filter((n) => !n.read).map((n) => n.id);
  for (let i = 0; i < unread.length; i += CHUNK) {
    await prisma.notification.updateMany({
      where: { id: { in: unread.slice(i, i + CHUNK) } },
      data: { isRead: true },
    });
  }
  return visible.map((n) => ({ ...n, read: true }));
}
