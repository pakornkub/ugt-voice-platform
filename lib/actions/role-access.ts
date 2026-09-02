'use server';

// src/lib/actions/role-access.ts — Prisma-backed replacement for
// src/services/api.ts's getStoredRolePermissions / saveStoredRolePermissions
// / updateRolePermissionConfig. Backed by the RoleAccessConfigs table (see
// prisma/schema.prisma for why it isn't named RolePermissions). Not yet
// wired into RoleBasedAccessManagement.tsx.
import { prisma } from '@/lib/prisma';
import { mapRoleAccessConfig } from './mappers';
import type { RolePermissionConfig, UserRole } from '@/types';

export async function getRoleAccessConfigs(): Promise<Record<UserRole, RolePermissionConfig>> {
  const rows = await prisma.roleAccessConfig.findMany({ where: { isDeleted: false } });
  const result = {} as Record<UserRole, RolePermissionConfig>;
  for (const row of rows) {
    result[row.role as UserRole] = mapRoleAccessConfig(row);
  }
  return result;
}

export async function updateRoleAccessConfig(
  role: UserRole,
  updates: Partial<RolePermissionConfig>
): Promise<RolePermissionConfig> {
  const { role: _ignoredRole, allowedTabs, assignedDepartments, ...rest } = updates;
  const updated = await prisma.roleAccessConfig.update({
    where: { role },
    data: {
      ...rest,
      allowedTabsJson: allowedTabs ? JSON.stringify(allowedTabs) : undefined,
      assignedDepartmentsJson: assignedDepartments
        ? JSON.stringify(assignedDepartments)
        : undefined,
    },
  });
  return mapRoleAccessConfig(updated);
}
