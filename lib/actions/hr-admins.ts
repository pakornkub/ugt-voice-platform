'use server';

// src/lib/actions/hr-admins.ts — Prisma-backed replacement for
// src/services/api.ts's getStoredHrAdmins / addHrAdminMember /
// updateHrAdminMember / deleteHrAdminMember. Not yet wired into any
// component. Delete is a soft delete (IsDeleted=1) per org convention.
import { prisma } from '@/lib/prisma';
import { mapHrAdmin } from './mappers';
import type { HrAdminMember } from '@/types';

export async function getHrAdmins(): Promise<HrAdminMember[]> {
  const rows = await prisma.hrAdminMember.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapHrAdmin);
}

export async function addHrAdminMember(newAdmin: Omit<HrAdminMember, 'id' | 'updatedAt'>): Promise<HrAdminMember[]> {
  await prisma.hrAdminMember.create({
    data: {
      name: newAdmin.name,
      position: newAdmin.position,
      department: newAdmin.department,
      email: newAdmin.email,
      phone: newAdmin.phone,
      roleLevel: newAdmin.roleLevel,
      canManageRbac: newAdmin.canManageRbac,
      canManageGatekeepers: newAdmin.canManageGatekeepers,
      canManageExecutives: newAdmin.canManageExecutives,
      receiveSystemAlerts: newAdmin.receiveSystemAlerts,
      status: newAdmin.status,
    },
  });
  return getHrAdmins();
}

export async function updateHrAdminMember(id: string, updates: Partial<HrAdminMember>): Promise<HrAdminMember[]> {
  const { id: _ignoredId, updatedAt: _ignoredUpdatedAt, ...rest } = updates;
  await prisma.hrAdminMember.update({ where: { id }, data: rest });
  return getHrAdmins();
}

export async function deleteHrAdminMember(id: string): Promise<HrAdminMember[]> {
  await prisma.hrAdminMember.update({ where: { id }, data: { isDeleted: true, isActive: false } });
  return getHrAdmins();
}
