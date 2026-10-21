'use server';

// lib/actions/public-tickets.ts — /track on the no-login portal (owner 2026-10-21): open ONE ticket
// with its tracking code + secret, reload it, leave it. The per-ticket actions after that (note,
// chat, CSAT, files) are the ordinary ones in lib/actions/tickets.ts — they accept the portal
// cookie through requireTicketActor (lib/ticket-access.ts).
import { prisma } from '@/lib/prisma';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import {
  accessKeyMatches,
  clientIp,
  forgetPublicTicket,
  LOOKUP_LIMIT,
  rememberPublicTicket,
  takeRateLimit,
} from '@/lib/public-access';
import { getPublicTicketViewer, TICKET_INCLUDE } from '@/lib/ticket-access';
import { presentTicketForViewer, PUBLIC_PORTAL_USER_ID, publicViewerFor } from '@/lib/ticket-scope';
import { mapTicket } from './mappers';
import type { ComplaintTicket } from '@/types';

export type OpenPublicTicketResult =
  { ok: true; ticket: ComplaintTicket } | { ok: false; error: 'NOT_FOUND' | 'RATE_LIMITED' };

async function loadPublicTicket(ticketId: string): Promise<ComplaintTicket | null> {
  const row = await prisma.ticket.findFirst({
    where: { id: ticketId, isDeleted: false, submitChannel: 'public' },
    include: TICKET_INCLUDE,
  });
  return row ? presentTicketForViewer(publicViewerFor(ticketId), mapTicket(row)) : null;
}

/**
 * Code + secret → the ticket, and this browser may keep it open (cookie). A wrong code and a wrong
 * secret answer the same NOT_FOUND, so a guess never learns that a tracking code exists.
 */
export async function openPublicTicket(
  trackingCode: string,
  accessKey: string
): Promise<OpenPublicTicketResult> {
  const ip = await clientIp();
  if (!takeRateLimit(`lookup:${ip}`, LOOKUP_LIMIT.limit, LOOKUP_LIMIT.windowMs)) {
    return { ok: false, error: 'RATE_LIMITED' };
  }
  const row = await prisma.ticket.findFirst({
    where: {
      trackingCode: trackingCode.trim().toUpperCase(),
      isDeleted: false,
      submitChannel: 'public',
    },
    select: { id: true, trackingCode: true, accessKeyHash: true },
  });
  if (!row || !accessKeyMatches(accessKey, row.accessKeyHash)) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  await rememberPublicTicket(row.id, accessKey);
  await prisma.activityLog
    .create({
      data: {
        userId: PUBLIC_PORTAL_USER_ID,
        action: AUDIT_ACTIONS.TICKETS_PUBLIC_OPEN,
        detail: JSON.stringify({ ticketId: row.id, trackingCode: row.trackingCode }),
      },
    })
    .catch(() => {});
  const ticket = await loadPublicTicket(row.id);
  return ticket ? { ok: true, ticket } : { ok: false, error: 'NOT_FOUND' };
}

/** The ticket this browser already opened (page load, refresh after an action), or null. */
export async function getPublicTicket(): Promise<ComplaintTicket | null> {
  const viewer = await getPublicTicketViewer();
  return viewer?.publicTicketId ? loadPublicTicket(viewer.publicTicketId) : null;
}

export async function leavePublicTicket(): Promise<void> {
  await forgetPublicTicket();
}
