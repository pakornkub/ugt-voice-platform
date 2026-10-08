'use server';

// src/lib/actions/gatekeeper.ts — Prisma-backed replacement for
// src/services/api.ts's getStoredGatekeeperConfigs / updateDepartmentGatekeeperConfig
// and the officer CRUD that RoleBasedAccessManagement / admin_gatekeeper screens need.
// Not yet wired into any component.
import { prisma } from '@/lib/prisma';
import { mapDepartmentConfig, mapOfficer } from './mappers';
import type { DepartmentGatekeeperConfig, GatekeeperOfficer, GrievanceCategory } from '@/types';

const CONFIG_INCLUDE = { officers: { where: { isDeleted: false } } } as const;

export async function getDepartmentGatekeeperConfigs(): Promise<
  Record<GrievanceCategory, DepartmentGatekeeperConfig>
> {
  const rows = await prisma.departmentGatekeeperConfig.findMany({
    where: { isDeleted: false },
    include: CONFIG_INCLUDE,
  });
  const result = {} as Record<GrievanceCategory, DepartmentGatekeeperConfig>;
  for (const row of rows) {
    result[row.category as GrievanceCategory] = mapDepartmentConfig(row);
  }
  return result;
}

export async function updateDepartmentGatekeeperConfig(
  category: GrievanceCategory,
  updates: Partial<
    Pick<
      DepartmentGatekeeperConfig,
      | 'departmentName'
      | 'departmentCode'
      | 'autoAssignMode'
      | 'escalationEmail'
      | 'notificationWebhookUrl'
    >
  >
): Promise<DepartmentGatekeeperConfig> {
  const updated = await prisma.departmentGatekeeperConfig.update({
    where: { category },
    data: updates,
    include: CONFIG_INCLUDE,
  });
  return mapDepartmentConfig(updated);
}

export async function addGatekeeperOfficer(
  category: GrievanceCategory,
  officer: Omit<GatekeeperOfficer, 'id'>
): Promise<GatekeeperOfficer> {
  const created = await prisma.gatekeeperOfficer.create({
    data: {
      category,
      name: officer.name,
      email: officer.email,
      roleTitle: officer.roleTitle,
      phone: officer.phone,
      isLead: officer.isLead,
      avatarUrl: officer.avatarUrl,
    },
  });
  return mapOfficer(created);
}

export async function updateGatekeeperOfficer(
  id: string,
  updates: Partial<Omit<GatekeeperOfficer, 'id'>>
): Promise<GatekeeperOfficer> {
  const updated = await prisma.gatekeeperOfficer.update({ where: { id }, data: updates });
  return mapOfficer(updated);
}

export async function deleteGatekeeperOfficer(id: string): Promise<void> {
  await prisma.gatekeeperOfficer.update({
    where: { id },
    data: { isDeleted: true, isActive: false },
  });
}
