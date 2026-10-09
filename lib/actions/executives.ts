'use server';

// lib/actions/executives.ts — the executive roster (ExecutiveMembers). Membership makes a person
// an `executive` (lib/roster-role.ts), so every write is guarded. Delete is a soft delete.
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import { requireTab, ROSTER_TABS, writeAudit } from '@/lib/tab-guard';
import { INITIAL_EXECUTIVES } from '@/services/rosterDefaults';
import { mapExecutive } from './mappers';
import type { ExecutiveMember } from '@/types';

const LIVE = { isDeleted: false } as const;

const ExecutiveFields = z.object({
  name: z.string().trim().min(1).max(200),
  position: z.string().trim().max(400),
  department: z.string().trim().max(300),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
  phone: z.string().trim().max(50).optional(),
  roleType: z.enum(['CEO', 'EVP', 'GRC_Chair', 'Audit_Committee', 'Board_Member']),
  isPrimaryWhistleblowerReceiver: z.boolean(),
  canViewConfidentialIdentities: z.boolean(),
  receiveAlertNotifications: z.boolean(),
  assignedCommittees: z.array(z.string().trim().max(200)).max(50),
  status: z.enum(['active', 'inactive']),
});

function toRow<T extends { assignedCommittees?: string[] }>({ assignedCommittees, ...rest }: T) {
  return {
    ...rest,
    assignedCommitteesJson: assignedCommittees ? JSON.stringify(assignedCommittees) : undefined,
  };
}

async function listExecutives(): Promise<ExecutiveMember[]> {
  const rows = await prisma.executiveMember.findMany({
    where: LIVE,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapExecutive);
}

export async function getExecutives(): Promise<ExecutiveMember[]> {
  await requireTab(ROSTER_TABS);
  return listExecutives();
}

export async function addExecutiveMember(
  newExec: Omit<ExecutiveMember, 'id' | 'updatedAt'>
): Promise<ExecutiveMember[]> {
  const viewer = await requireTab(ROSTER_TABS);
  const data = ExecutiveFields.parse(newExec);
  const created = await prisma.executiveMember.create({
    data: { ...toRow(data), createdBy: viewer.userId, updatedBy: viewer.userId },
  });
  writeAudit(viewer, AUDIT_ACTIONS.ROSTERS_UPDATE, {
    roster: 'executives',
    op: 'add',
    id: created.id,
    email: data.email,
  });
  return listExecutives();
}

export async function updateExecutiveMember(
  id: string,
  updates: Partial<ExecutiveMember>
): Promise<ExecutiveMember[]> {
  const viewer = await requireTab(ROSTER_TABS);
  const data = ExecutiveFields.partial().parse(updates);
  const { count } = await prisma.executiveMember.updateMany({
    where: { id, ...LIVE },
    data: { ...toRow(data), updatedBy: viewer.userId },
  });
  if (count === 0) throw new Error('NOT_FOUND');
  writeAudit(viewer, AUDIT_ACTIONS.ROSTERS_UPDATE, {
    roster: 'executives',
    op: 'update',
    id,
    fields: Object.keys(data),
  });
  return listExecutives();
}

export async function deleteExecutiveMember(id: string): Promise<ExecutiveMember[]> {
  const viewer = await requireTab(ROSTER_TABS);
  await prisma.executiveMember.updateMany({
    where: { id, ...LIVE },
    data: { isDeleted: true, isActive: false, updatedBy: viewer.userId },
  });
  writeAudit(viewer, AUDIT_ACTIONS.ROSTERS_UPDATE, { roster: 'executives', op: 'delete', id });
  return listExecutives();
}

/** Upstream's "reset to defaults": the demo executive roster replaces the current one. */
export async function resetExecutivesToDefault(): Promise<ExecutiveMember[]> {
  const viewer = await requireTab(ROSTER_TABS);
  await prisma.$transaction([
    prisma.executiveMember.updateMany({
      where: LIVE,
      data: { isDeleted: true, isActive: false, updatedBy: viewer.userId },
    }),
    prisma.executiveMember.createMany({
      data: INITIAL_EXECUTIVES.map((e) => ({
        ...toRow(ExecutiveFields.parse(e)), // parse drops id / updatedAt
        createdBy: viewer.userId,
        updatedBy: viewer.userId,
      })),
    }),
  ]);
  writeAudit(viewer, AUDIT_ACTIONS.CONFIG_RESET, { config: 'executives' });
  return listExecutives();
}
