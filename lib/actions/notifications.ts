'use server';

// src/lib/actions/notifications.ts — Prisma-backed replacement for
// src/services/api.ts's getStoredNotifications / markNotificationAsRead /
// markAllNotificationsAsRead. Not yet wired into any component.
import { prisma } from '@/lib/prisma';
import { mapNotification } from './mappers';
import type { NotificationItem } from '@/types';

export async function getNotifications(): Promise<NotificationItem[]> {
  const rows = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(mapNotification);
}

export async function markNotificationAsRead(id: string): Promise<NotificationItem[]> {
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return getNotifications();
}

export async function markAllNotificationsAsRead(): Promise<NotificationItem[]> {
  await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  return getNotifications();
}
