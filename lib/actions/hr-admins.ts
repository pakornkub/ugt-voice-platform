'use server';

// lib/actions/hr-admins.ts — the HR-admin roster (HrAdminMembers). Membership makes a person an
// `admin` (lib/roster-role.ts), so every write is guarded and two lock-out rules hold on the
// server: you cannot remove/deactivate yourself, and the last active HR admin cannot go.
// Delete is a soft delete (IsDeleted=1) per org convention.
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import { requireTab, ROSTER_TABS, writeAudit } from '@/lib/tab-guard';
import { candidateEmails } from '@/lib/roster-role';
import type { TicketViewer } from '@/lib/ticket-scope';
import { INITIAL_HR_ADMINS } from '@/services/rosterDefaults';
import { mapHrAdmin } from './mappers';
import type { HrAdminMember } from '@/types';

const LIVE = { isDeleted: false } as const;

const HrAdminFields = z.object({
  name: z.string().trim().min(1).max(200),
  position: z.string().trim().max(400),
  department: z.string().trim().max(300),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
  phone: z.string().trim().max(50).optional(),
  roleLevel: z.enum(['super_admin', 'hr_manager', 'compliance_auditor']),
  canManageRbac: z.boolean(),
  canManageGatekeepers: z.boolean(),
  canManageExecutives: z.boolean(),
  receiveSystemAlerts: z.boolean(),
  status: z.enum(['active', 'inactive']),
});

async function listHrAdmins(): Promise<HrAdminMember[]> {
  const rows = await prisma.hrAdminMember.findMany({ where: LIVE, orderBy: { createdAt: 'desc' } });
  return rows.map(mapHrAdmin);
}

export async function getHrAdmins(): Promise<HrAdminMember[]> {
  await requireTab(ROSTER_TABS);
  return listHrAdmins();
}

/** Refuses a change that would leave the caller out, or no active HR admin at all. */
async function assertKeepsAdmins(viewer: TicketViewer, id: string): Promise<void> {
  const target = await prisma.hrAdminMember.findFirst({ where: { id, ...LIVE } });
  if (!target) throw new Error('NOT_FOUND');
  // Every email that resolves to the caller (session + HR-view CurrentEmail), as roster-role does.
  const mine = await candidateEmails(viewer.email);
  if (mine.includes(target.email.toLowerCase())) {
    throw new Error('CANNOT_REMOVE_SELF');
  }
  const othersActive = await prisma.hrAdminMember.count({
    where: { ...LIVE, isActive: true, status: 'active', id: { not: id } },
  });
  if (othersActive === 0) throw new Error('LAST_ADMIN');
}

export async function addHrAdminMember(
  newAdmin: Omit<HrAdminMember, 'id' | 'updatedAt'>
): Promise<HrAdminMember[]> {
  const viewer = await requireTab(ROSTER_TABS);
  const data = HrAdminFields.parse(newAdmin);
  const created = await prisma.hrAdminMember.create({
    data: { ...data, createdBy: viewer.userId, updatedBy: viewer.userId },
  });
  writeAudit(viewer, AUDIT_ACTIONS.ROSTERS_UPDATE, {
    roster: 'hr_admins',
    op: 'add',
    id: created.id,
    email: data.email,
  });
  return listHrAdmins();
}

export async function updateHrAdminMember(
  id: string,
  updates: Partial<HrAdminMember>
): Promise<HrAdminMember[]> {
  const viewer = await requireTab(ROSTER_TABS);
  const data = HrAdminFields.partial().parse(updates);
  const current = await prisma.hrAdminMember.findFirst({ where: { id, ...LIVE } });
  if (!current) throw new Error('NOT_FOUND');
  const losesAdmin =
    (data.status === 'inactive' && current.status === 'active') ||
    (data.email !== undefined && data.email !== current.email.toLowerCase());
  if (losesAdmin) await assertKeepsAdmins(viewer, id);
  await prisma.hrAdminMember.update({ where: { id }, data: { ...data, updatedBy: viewer.userId } });
  writeAudit(viewer, AUDIT_ACTIONS.ROSTERS_UPDATE, {
    roster: 'hr_admins',
    op: 'update',
    id,
    fields: Object.keys(data),
  });
  return listHrAdmins();
}

export async function deleteHrAdminMember(id: string): Promise<HrAdminMember[]> {
  const viewer = await requireTab(ROSTER_TABS);
  await assertKeepsAdmins(viewer, id);
  await prisma.hrAdminMember.update({
    where: { id },
    data: { isDeleted: true, isActive: false, updatedBy: viewer.userId },
  });
  writeAudit(viewer, AUDIT_ACTIONS.ROSTERS_UPDATE, { roster: 'hr_admins', op: 'delete', id });
  return listHrAdmins();
}

/**
 * Upstream's "reset to defaults" — the demo roster replaces the current one, except the caller's
 * own row, which is kept so the reset can never lock the system out (the demo people have
 * placeholder emails nobody logs in with).
 */
export async function resetHrAdminsToDefault(): Promise<HrAdminMember[]> {
  const viewer = await requireTab(ROSTER_TABS);
  const mine = new Set(await candidateEmails(viewer.email));
  const isMine = (email: string) => mine.has(email.toLowerCase());
  await prisma.$transaction(async (tx) => {
    const rows = await tx.hrAdminMember.findMany({
      where: LIVE,
      select: { id: true, email: true },
    });
    const others = rows.filter((r) => !isMine(r.email)).map((r) => r.id);
    await tx.hrAdminMember.updateMany({
      where: { id: { in: others } },
      data: { isDeleted: true, isActive: false, updatedBy: viewer.userId },
    });
    await tx.hrAdminMember.createMany({
      data: INITIAL_HR_ADMINS.filter((a) => !isMine(a.email)).map((a) => ({
        ...HrAdminFields.parse(a), // parse drops id / updatedAt, lowercases the email
        createdBy: viewer.userId,
        updatedBy: viewer.userId,
      })),
    });
    // The demo admins are placeholders nobody logs in with: unless the caller is still an active
    // HR admin afterwards, nobody could administer the system — roll the reset back.
    const callerStays = await tx.hrAdminMember.count({
      where: { ...LIVE, isActive: true, status: 'active', email: { in: [...mine] } },
    });
    if (callerStays === 0) throw new Error('LAST_ADMIN');
  });
  writeAudit(viewer, AUDIT_ACTIONS.CONFIG_RESET, { config: 'hr_admins' });
  return listHrAdmins();
}
