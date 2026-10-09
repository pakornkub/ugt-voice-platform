'use server';

// lib/actions/notifications.ts — the in-app notification drawer, persisted in SQL Server (slice 1
// of the localStorage → DB rewiring, 2026-10-09). A caller only sees / marks the notifications of
// tickets they may see (lib/ticket-access.ts).
// Read state is per person (NotificationReads, 2026-10-09) — marking one read never clears someone
// else's badge.
import { prisma } from '@/lib/prisma';
import {
  listVisibleNotifications,
  requireTicketViewer,
  visibleTicketIds,
} from '@/lib/ticket-access';
import type { TicketViewer } from '@/lib/ticket-scope';
import type { NotificationItem } from '@/types';

async function visibleNotifications(): Promise<{
  viewer: TicketViewer;
  items: NotificationItem[];
}> {
  const viewer = await requireTicketViewer();
  return { viewer, items: await listVisibleNotifications(viewer, await visibleTicketIds(viewer)) };
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return (await visibleNotifications()).items;
}

export async function markNotificationAsRead(id: string): Promise<NotificationItem[]> {
  const { viewer, items } = await visibleNotifications();
  if (!items.some((n) => n.id === id)) throw new Error('FORBIDDEN');
  await prisma.notificationRead.upsert({
    where: { notificationId_userId: { notificationId: id, userId: viewer.userId } },
    create: { notificationId: id, userId: viewer.userId, createdBy: viewer.userId },
    update: {},
  });
  return items.map((n) => (n.id === id ? { ...n, read: true } : n));
}

// SQL Server caps a statement at 2100 parameters — Prisma sends ~7 columns per row, so 200 rows.
const CHUNK = 200;

export async function markAllNotificationsAsRead(): Promise<NotificationItem[]> {
  const { viewer, items } = await visibleNotifications();
  const unread = items.filter((n) => !n.read).map((n) => n.id);
  for (let i = 0; i < unread.length; i += CHUNK) {
    // ponytail: a concurrent mark-read can make one chunk hit the unique key — the rows exist then,
    // so the error is ignored; per-row upserts if that ever hides real failures.
    await prisma.notificationRead
      .createMany({
        data: unread.slice(i, i + CHUNK).map((notificationId) => ({
          notificationId,
          userId: viewer.userId,
          createdBy: viewer.userId,
        })),
      })
      .catch(() => {});
  }
  return items.map((n) => ({ ...n, read: true }));
}
