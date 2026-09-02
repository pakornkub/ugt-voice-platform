'use server';

// src/lib/actions/executives.ts — Prisma-backed replacement for
// src/services/api.ts's getStoredExecutives / addExecutiveMember /
// updateExecutiveMember / deleteExecutiveMember. Not yet wired into any
// component. Delete is a soft delete (IsDeleted=1) per org convention.
import { prisma } from '@/lib/prisma';
import { mapExecutive } from './mappers';
import type { ExecutiveMember } from '@/types';

export async function getExecutives(): Promise<ExecutiveMember[]> {
  const rows = await prisma.executiveMember.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapExecutive);
}

export async function addExecutiveMember(
  newExec: Omit<ExecutiveMember, 'id' | 'updatedAt'>
): Promise<ExecutiveMember[]> {
  await prisma.executiveMember.create({
    data: {
      name: newExec.name,
      position: newExec.position,
      department: newExec.department,
      email: newExec.email,
      phone: newExec.phone,
      roleType: newExec.roleType,
      isPrimaryWhistleblowerReceiver: newExec.isPrimaryWhistleblowerReceiver,
      canViewConfidentialIdentities: newExec.canViewConfidentialIdentities,
      receiveAlertNotifications: newExec.receiveAlertNotifications,
      assignedCommitteesJson: JSON.stringify(newExec.assignedCommittees ?? []),
      status: newExec.status,
    },
  });
  return getExecutives();
}

export async function updateExecutiveMember(
  id: string,
  updates: Partial<ExecutiveMember>
): Promise<ExecutiveMember[]> {
  const { id: _ignoredId, updatedAt: _ignoredUpdatedAt, assignedCommittees, ...rest } = updates;
  await prisma.executiveMember.update({
    where: { id },
    data: {
      ...rest,
      assignedCommitteesJson: assignedCommittees ? JSON.stringify(assignedCommittees) : undefined,
    },
  });
  return getExecutives();
}

export async function deleteExecutiveMember(id: string): Promise<ExecutiveMember[]> {
  await prisma.executiveMember.update({
    where: { id },
    data: { isDeleted: true, isActive: false },
  });
  return getExecutives();
}
