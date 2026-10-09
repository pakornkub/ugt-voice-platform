// lib/ticket-access.ts — server-only reads behind the ticket rules in lib/ticket-scope.ts: who the
// caller is (session → user.appRole → RoleAccessConfigs) and the tickets / notifications they may
// see. Used by the (shell) layout (initial page data) and by lib/actions/tickets.ts|notifications.ts
// (mutations). Not a 'use server' module on purpose — nothing here is a client-callable endpoint.
import 'server-only';
import { headers } from 'next/headers';
import type { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  gatekeeperDepartments,
  redactNotificationForViewer,
  redactTicketForViewer,
  ticketScopeWhere,
  type TicketViewer,
} from '@/lib/ticket-scope';
import { mapNotification, mapRoleAccessConfig, mapTicket } from '@/lib/actions/mappers';
import type { ComplaintTicket, NotificationItem, UserRole } from '@/types';

const APP_ROLES: readonly string[] = ['employee', 'gatekeeper', 'executive', 'admin'];

export function isAppRole(role: string | null | undefined): role is UserRole {
  return !!role && APP_ROLES.includes(role);
}

export const TICKET_INCLUDE = {
  timeline: { orderBy: { createdAt: 'asc' as const } },
  evaluation: true,
  attachments: { where: { isDeleted: false }, orderBy: { createdAt: 'asc' as const } },
  anonymousMessages: { where: { isDeleted: false }, orderBy: { createdAt: 'asc' as const } },
} as const;

/**
 * THE place that decides a signed-in user's app role and ticket scope — the (shell) layout, every
 * ticket/notification read and every ticket Server Action go through it. Null = no app role yet.
 *
 * Today: role = `user.appRole` (set on /admin/users), gatekeeper categories = the RBAC page's
 * role-level `assignedDepartments`.
 * TODO(slice 2, decisions.md 2026-10-09 "App role comes from the people rosters"): replace this
 * body only — match the session email (HR view CurrentEmail, fallback ADLoginName) against the
 * rosters: active HrAdminMembers → admin > active ExecutiveMembers → executive > GatekeeperOfficers
 * (any category) → gatekeeper > everyone else → employee; gatekeeperCategories = categories where
 * the person is an officer ∩ gatekeeperDepartments(config). Callers need no change.
 */
export async function resolveViewer(session: {
  user: { id: string; email: string };
}): Promise<TicketViewer | null> {
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, appRole: true, userRole: { select: { name: true } } },
  });
  if (!user || !isAppRole(user.appRole)) return null;
  const row = await prisma.roleAccessConfig.findFirst({
    where: { role: user.appRole, isDeleted: false },
  });
  const config = row ? mapRoleAccessConfig(row) : undefined;
  return {
    userId: session.user.id,
    email: user.email,
    name: user.name,
    rbacRoleName: user.userRole?.name ?? null,
    role: user.appRole,
    config,
    gatekeeperCategories: gatekeeperDepartments(config),
  };
}

/** The current request's viewer (session from the request headers), or null. */
export async function getTicketViewer(): Promise<TicketViewer | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? resolveViewer(session) : null;
}

export async function requireTicketViewer(): Promise<TicketViewer> {
  const viewer = await getTicketViewer();
  if (!viewer) throw new Error('UNAUTHORIZED');
  return viewer;
}

// Every ticket leaving the server is redacted for its viewer (redactTicketForViewer) — the RSC
// payload / action result must not carry identities the UI would mask.
// ponytail: loads every visible ticket with its relations — fine at this app's volume; add paging
// (and a lighter list shape) once ticket counts reach the thousands.
export async function listVisibleTickets(viewer: TicketViewer): Promise<ComplaintTicket[]> {
  const rows = await prisma.ticket.findMany({
    where: ticketScopeWhere(viewer),
    include: TICKET_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((row) => redactTicketForViewer(viewer, mapTicket(row)));
}

/** One ticket the viewer may see, or null — never reveals that an out-of-scope ticket exists. */
export function findVisibleTicket(viewer: TicketViewer, where: Prisma.ticketWhereInput) {
  return prisma.ticket.findFirst({ where: { AND: [ticketScopeWhere(viewer), where] } });
}

export async function findVisibleTicketWithRelations(
  viewer: TicketViewer,
  where: Prisma.ticketWhereInput
): Promise<ComplaintTicket | null> {
  const row = await prisma.ticket.findFirst({
    where: { AND: [ticketScopeWhere(viewer), where] },
    include: TICKET_INCLUDE,
  });
  return row ? redactTicketForViewer(viewer, mapTicket(row)) : null;
}

/**
 * Notifications follow ticket visibility (upstream shows one shared list; per user that becomes
 * "the notifications of tickets I may see"). Notifications.TicketId has no FK, so the join is done
 * here against the visible ticket ids.
 * ponytail: reads every notification row then filters in memory — add a TicketId FK + relation
 * filter if the table grows large.
 */
export async function listVisibleNotifications(
  viewer: TicketViewer,
  visibleTicketIds: readonly string[]
): Promise<NotificationItem[]> {
  const visible = new Set(visibleTicketIds);
  const rows = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' } });
  return rows
    .filter((n) => n.ticketId && visible.has(n.ticketId))
    .map((n) => redactNotificationForViewer(viewer, mapNotification(n)));
}

export async function visibleTicketIds(viewer: TicketViewer): Promise<string[]> {
  const rows = await prisma.ticket.findMany({
    where: ticketScopeWhere(viewer),
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
