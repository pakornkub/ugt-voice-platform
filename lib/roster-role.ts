// lib/roster-role.ts — the app role comes from the people rosters (decisions.md 2026-10-09
// "App role comes from the people rosters"): HrAdminMembers → admin, ExecutiveMembers →
// executive, GatekeeperOfficers (any category) → gatekeeper, anyone else → employee; highest wins.
// Resolved on every page load so a roster edit takes effect on the person's next navigation.
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
// are stored lowercase by the roster actions anyway.
export async function resolveRosterRole(sessionEmail: string): Promise<RosterRole> {
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
}

/** Gatekeeper scope = officer categories ∩ the RBAC page's role-level checkboxes (the ceiling). */
export function gatekeeperScope(
  officerCategories: GrievanceCategory[],
  assignedDepartments: GrievanceCategory[] | undefined
): GrievanceCategory[] {
  const ceiling = new Set(assignedDepartments ?? []);
  return officerCategories.filter((c) => ceiling.has(c));
}
