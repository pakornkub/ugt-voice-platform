// lib/roster-rules.ts — the rules of the people rosters (gatekeeper officers, HR admins), written
// once as pure functions (no React, no Prisma, no session). The Gatekeeper-management screen calls
// them to block a click before it is sent (production Next.js masks Server Action error messages,
// so the screen cannot rely on the server's code reaching its toast), and the Server Actions in
// lib/actions/gatekeeper.ts and hr-admins.ts call the SAME functions and throw the returned code.
// Every rejection is a code the screen already maps to a toast (AdminGatekeeperManagement).
import { normalizeEmail } from '@/lib/email-identity';
import type { GrievanceCategory } from '@/types';

// --- Gatekeeper officers ----------------------------------------------------------------------

export type OfficerRejection = 'LAST_OFFICER' | 'CANNOT_REMOVE_LEAD';

export interface OfficerRef {
  id: string;
  isLead?: boolean;
}

/**
 * Whether saving `next` over the stored `current` roster of one category is allowed: the category
 * keeps at least 1 officer, and a Lead is never dropped (hand the lead over first).
 */
export function checkOfficerRoster(
  current: readonly OfficerRef[],
  next: readonly Pick<OfficerRef, 'id'>[]
): OfficerRejection | null {
  if (next.length === 0) return 'LAST_OFFICER';
  const kept = new Set(next.map((o) => o.id));
  return current.some((o) => o.isLead && !kept.has(o.id)) ? 'CANNOT_REMOVE_LEAD' : null;
}

export type OfficerRemoval<T> =
  { ok: true; officers: T[] } | { ok: false; code: OfficerRejection | 'NOT_FOUND' };

/** The roster after removing `officerId`, or why it may not be removed. */
export function removeOfficer<T extends OfficerRef>(
  officers: readonly T[],
  officerId: string
): OfficerRemoval<T> {
  if (!officers.some((o) => o.id === officerId)) return { ok: false, code: 'NOT_FOUND' };
  const next = officers.filter((o) => o.id !== officerId);
  const code = checkOfficerRoster(officers, next);
  return code ? { ok: false, code } : { ok: true, officers: next };
}

/** Exactly one lead: the requested lead, else the flagged one, else the first officer. */
export function withSingleLead<T extends { id: string; isLead: boolean }>(
  officers: readonly T[],
  leadId?: string
): T[] {
  const lead =
    officers.find((o) => o.id === leadId) ?? officers.find((o) => o.isLead) ?? officers[0];
  return officers.map((o) => ({ ...o, isLead: o === lead }));
}

/** Officer ids are minted by the screen: `usr-<category>-<epoch ms>`. */
export function newOfficerId(category: GrievanceCategory, now: number = Date.now()): string {
  return `usr-${category.toLowerCase()}-${now}`;
}

export interface NewOfficerFields {
  name: string;
  email: string;
  roleTitle: string;
  phone: string;
}

export const DEFAULT_OFFICER_ROLE_TITLE = 'Gatekeeper Specialist';

/** A new officer from the add form: trimmed fields, default role title, never the lead. */
export function buildNewOfficer(
  category: GrievanceCategory,
  fields: NewOfficerFields,
  now: number = Date.now()
) {
  return {
    id: newOfficerId(category, now),
    name: fields.name.trim(),
    email: fields.email.trim(),
    roleTitle: fields.roleTitle.trim() || DEFAULT_OFFICER_ROLE_TITLE,
    phone: fields.phone.trim() || undefined, // typed by hand — the HR view has no phone
    isLead: false,
  };
}

// --- HR admins --------------------------------------------------------------------------------

export type HrAdminRejection = 'CANNOT_REMOVE_SELF' | 'LAST_ADMIN';

export interface HrAdminRef {
  id: string;
  status: string;
  /** Absent on the client's view of the roster (it only lists live rows). */
  isActive?: boolean;
}

/** Other admins who would still be able to administer the system. */
export function countOtherActiveAdmins(admins: readonly HrAdminRef[], targetId: string): number {
  return admins.filter((a) => a.id !== targetId && a.status === 'active' && a.isActive !== false)
    .length;
}

/**
 * Whether the target admin may be deleted, deactivated or re-emailed: never the caller's own row
 * (`myEmails` = every address that resolves to the caller), never the last active admin.
 */
export function checkHrAdminRemoval(input: {
  targetEmail: string;
  myEmails: readonly string[];
  otherActiveAdmins: number;
}): HrAdminRejection | null {
  const target = normalizeEmail(input.targetEmail);
  if (input.myEmails.some((mine) => normalizeEmail(mine) === target)) return 'CANNOT_REMOVE_SELF';
  return input.otherActiveAdmins > 0 ? null : 'LAST_ADMIN';
}

/** An edit takes admin rights away from the row when it deactivates it or points it at another email. */
export function hrAdminChangeLosesAdmin(
  current: { email: string; status: string },
  updates: { email?: string; status?: string }
): boolean {
  const deactivates = updates.status === 'inactive' && current.status === 'active';
  const reEmails =
    updates.email !== undefined && normalizeEmail(updates.email) !== normalizeEmail(current.email);
  return deactivates || reEmails;
}
