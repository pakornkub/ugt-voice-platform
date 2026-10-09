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
  await markReadUpsert(id, viewer.userId);
  return items.map((n) => (n.id === id ? { ...n, read: true } : n));
}

// Rows per transaction — keeps one round trip from growing without bound.
const CHUNK = 200;

/** Idempotent per (notification, user); revives a row that was ever soft-deleted. */
function markReadUpsert(notificationId: string, userId: string) {
  return prisma.notificationRead.upsert({
    where: { notificationId_userId: { notificationId, userId } },
    create: { notificationId, userId, createdBy: userId },
    update: { isDeleted: false, isActive: true, updatedBy: userId },
  });
}

export async function markAllNotificationsAsRead(): Promise<NotificationItem[]> {
  const { viewer, items } = await visibleNotifications();
  const unread = items.filter((n) => !n.read).map((n) => n.id);
  // One upsert per row in a transaction: a row another tab just created is a no-op instead of
  // rolling back the whole batch (SQL Server has no skipDuplicates); real failures surface.
  for (let i = 0; i < unread.length; i += CHUNK) {
    await prisma.$transaction(
      unread
        .slice(i, i + CHUNK)
        .map((notificationId) => markReadUpsert(notificationId, viewer.userId))
    );
  }
  return items.map((n) => ({ ...n, read: true }));
}
