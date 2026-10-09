// lib/roster-role.ts — the app role comes from the people rosters (decisions.md 2026-10-09
// "App role comes from the people rosters"): HrAdminMembers → admin, ExecutiveMembers →
// executive, GatekeeperOfficers (any category) → gatekeeper, anyone else → employee; highest wins.
// Resolved on every page load so a roster edit takes effect on the person's next navigation.
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { findEmployeeByLogin } from '@/lib/directory';
import type { GrievanceCategory, UserRole } from '@/types';

export interface RosterRole {
  role: UserRole;
  /** Categories where the person is an active gatekeeper officer (any role may also be one). */
  officerCategories: GrievanceCategory[];
}

export interface RosterMatches {
  isHrAdmin: boolean;
  isExecutive: boolean;
  officerCategories: GrievanceCategory[];
}

export function pickRole({ isHrAdmin, isExecutive, officerCategories }: RosterMatches): UserRole {
  if (isHrAdmin) return 'admin';
  if (isExecutive) return 'executive';
  if (officerCategories.length > 0) return 'gatekeeper';
  return 'employee';
}

/** Session email plus the person's HR-view CurrentEmail (they differ when SSO logs in by AD name). */
async function candidateEmails(sessionEmail: string): Promise<string[]> {
  const email = sessionEmail.trim().toLowerCase();
  if (!email) return [];
  // The HR view is a linked server — if it is down, roles still resolve on the session email.
  const employee = await findEmployeeByLogin(email).catch(() => null);
  return [...new Set([email, employee?.loginEmail].filter((e): e is string => !!e))];
}

// ponytail: email `in` relies on SQL Server's default case-insensitive collation; roster emails
// are stored lowercase by the roster actions anyway. cache() = one lookup per request (the HR view
// is a linked server) — no cross-request cache, so roster edits apply on the next navigation.
export const resolveRosterRole = cache(async (sessionEmail: string): Promise<RosterRole> => {
  const emails = await candidateEmails(sessionEmail);
  if (emails.length === 0) return { role: 'employee', officerCategories: [] };
  const live = { email: { in: emails }, isActive: true, isDeleted: false };
  const [hrAdmin, executive, officers] = await Promise.all([
    prisma.hrAdminMember.findFirst({ where: { ...live, status: 'active' }, select: { id: true } }),
    prisma.executiveMember.findFirst({
      where: { ...live, status: 'active' },
      select: { id: true },
    }),
    prisma.gatekeeperOfficer.findMany({ where: live, select: { category: true } }),
  ]);
  const officerCategories = [...new Set(officers.map((o) => o.category as GrievanceCategory))];
  return {
    role: pickRole({ isHrAdmin: !!hrAdmin, isExecutive: !!executive, officerCategories }),
    officerCategories,
  };
});

/** Gatekeeper scope = officer categories ∩ the RBAC page's role-level checkboxes (the ceiling). */
export function gatekeeperScope(
  officerCategories: GrievanceCategory[],
  assignedDepartments: GrievanceCategory[] | undefined
): GrievanceCategory[] {
  const ceiling = new Set(assignedDepartments ?? []);
  return officerCategories.filter((c) => ceiling.has(c));
}

export type RosterSource = 'hr_admins' | 'executives' | 'gatekeepers';
export interface RosterMembership extends RosterRole {
  /** Which roster gave the role; null = employee (in no roster). */
  source: RosterSource | null;
}

const SOURCE_BY_ROLE: Record<UserRole, RosterSource | null> = {
  admin: 'hr_admins',
  executive: 'executives',
  gatekeeper: 'gatekeepers',
  employee: null,
};

/**
 * Roster role for many users at once (the read-only /admin/users list). Matches stored login
 * emails only — no per-user HR-view lookup.
 * ponytail: one `in` per roster; chunk the email list if users ever exceed ~2000 (SQL Server's
 * parameter cap).
 */
export async function rosterRolesByEmail(
  emails: readonly string[]
): Promise<Map<string, RosterMembership>> {
  const wanted = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const live = { email: { in: wanted }, isActive: true, isDeleted: false };
  const [hrAdmins, executives, officers] = await Promise.all([
    prisma.hrAdminMember.findMany({
      where: { ...live, status: 'active' },
      select: { email: true },
    }),
    prisma.executiveMember.findMany({
      where: { ...live, status: 'active' },
      select: { email: true },
    }),
    prisma.gatekeeperOfficer.findMany({ where: live, select: { email: true, category: true } }),
  ]);
  const lower = (rows: { email: string }[]) => new Set(rows.map((r) => r.email.toLowerCase()));
  const adminSet = lower(hrAdmins);
  const execSet = lower(executives);
  const result = new Map<string, RosterMembership>();
  for (const email of wanted) {
    const officerCategories = [
      ...new Set(
        officers
          .filter((o) => o.email.toLowerCase() === email)
          .map((o) => o.category as GrievanceCategory)
      ),
    ];
    const role = pickRole({
      isHrAdmin: adminSet.has(email),
      isExecutive: execSet.has(email),
      officerCategories,
    });
    result.set(email, { role, officerCategories, source: SOURCE_BY_ROLE[role] });
  }
  return result;
}
