'use server';

// lib/actions/role-access.ts — the upstream RBAC matrix (RoleAccessConfigs): which tabs a role
// opens, its department ceiling and special flags. It is the single permission system
// (decisions.md 2026-10-09), so writes need the RBAC tab, and the lock-out rules the upstream
// screen applies client-side hold on the server too: admin always keeps the RBAC tab and
// canManageRolePermissions.
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import { RBAC_TABS, requireTab, writeAudit } from '@/lib/tab-guard';
import { requireTicketViewer } from '@/lib/ticket-access';
import { APP_TABS, INITIAL_ROLE_PERMISSIONS } from '@/services/rosterDefaults';
import { mapRoleAccessConfig } from './mappers';
import type { AppTabId, RolePermissionConfig, UserRole } from '@/types';

const Role = z.enum(['employee', 'gatekeeper', 'executive', 'admin']);
const TAB_IDS = APP_TABS.map((t) => t.id) as [AppTabId, ...AppTabId[]];
const Category = z.enum(['HR', 'Compliance', 'Ethics', 'Fraud', 'Harassment', 'Quality']);

const ConfigFields = z.object({
  roleTitleTh: z.string().trim().min(1).max(200),
  roleTitleEn: z.string().trim().min(1).max(200),
  descriptionTh: z.string().trim().max(4000),
  badgeColor: z.string().trim().max(200),
  allowedTabs: z.array(z.enum(TAB_IDS)).max(TAB_IDS.length),
  canViewAllDepartments: z.boolean(),
  assignedDepartments: z.array(Category).max(6),
  canViewDirectCeoTickets: z.boolean(),
  canViewConfidentialIdentities: z.boolean(),
  canViewAnonymousSubmitterEmail: z.boolean(),
  canEditRootCauseAndCapa: z.boolean(),
  canManageGatekeeperOfficers: z.boolean(),
  canManageRolePermissions: z.boolean(),
});
type ConfigData = Partial<z.infer<typeof ConfigFields>>;

function toRow({ allowedTabs, assignedDepartments, ...rest }: ConfigData) {
  return {
    ...rest,
    allowedTabsJson: allowedTabs ? JSON.stringify([...new Set(allowedTabs)]) : undefined,
    assignedDepartmentsJson: assignedDepartments
      ? JSON.stringify([...new Set(assignedDepartments)])
      : undefined,
  };
}

/** Admin can never lose the RBAC screen — otherwise nobody could ever give it back. */
function keepsAdminInControl(role: UserRole, data: ConfigData): boolean {
  if (role !== 'admin') return true;
  if (data.allowedTabs && !data.allowedTabs.includes('rbac_management')) return false;
  return data.canManageRolePermissions !== false;
}

async function listConfigs(): Promise<Record<UserRole, RolePermissionConfig>> {
  const rows = await prisma.roleAccessConfig.findMany({ where: { isDeleted: false } });
  const result = {} as Record<UserRole, RolePermissionConfig>;
  for (const row of rows) result[row.role as UserRole] = mapRoleAccessConfig(row);
  return result;
}

/** Read by every signed-in role (tab visibility in the shell). */
export async function getRoleAccessConfigs(): Promise<Record<UserRole, RolePermissionConfig>> {
  await requireTicketViewer();
  return listConfigs();
}

export async function updateRoleAccessConfig(
  role: UserRole,
  updates: Partial<RolePermissionConfig>
): Promise<RolePermissionConfig> {
  const viewer = await requireTab(RBAC_TABS);
  const target = Role.parse(role);
  const data = ConfigFields.partial().parse(updates);
  if (!keepsAdminInControl(target, data)) throw new Error('ADMIN_LOCKOUT');
  const updated = await prisma.roleAccessConfig.update({
    where: { role: target },
    data: { ...toRow(data), updatedBy: viewer.userId },
  });
  writeAudit(viewer, AUDIT_ACTIONS.RBAC_UPDATE, { role: target, fields: Object.keys(data) });
  return mapRoleAccessConfig(updated);
}

/** The upstream screen saves the whole matrix at once; only roles that changed are written. */
export async function saveRoleAccessConfigs(
  configs: Record<UserRole, RolePermissionConfig>
): Promise<Record<UserRole, RolePermissionConfig>> {
  const viewer = await requireTab(RBAC_TABS);
  const current = await listConfigs();
  const changed = Role.options.filter(
    (r) => configs[r] && JSON.stringify(configs[r]) !== JSON.stringify(current[r])
  );
  const parsed = changed.map((r) => ({ role: r, data: ConfigFields.partial().parse(configs[r]) }));
  if (parsed.some(({ role, data }) => !keepsAdminInControl(role, data))) {
    throw new Error('ADMIN_LOCKOUT');
  }
  await prisma.$transaction(
    parsed.map(({ role, data }) =>
      prisma.roleAccessConfig.update({
        where: { role },
        data: { ...toRow(data), updatedBy: viewer.userId },
      })
    )
  );
  if (parsed.length > 0) {
    writeAudit(viewer, AUDIT_ACTIONS.RBAC_UPDATE, { roles: parsed.map((p) => p.role) });
  }
  return listConfigs();
}

export async function resetRolePermissionsToDefault(): Promise<
  Record<UserRole, RolePermissionConfig>
> {
  const viewer = await requireTab(RBAC_TABS);
  await prisma.$transaction(
    Role.options.map((role) => {
      const defaults = ConfigFields.parse(INITIAL_ROLE_PERMISSIONS[role]); // drops role
      return prisma.roleAccessConfig.update({
        where: { role },
        data: { ...toRow(defaults), updatedBy: viewer.userId },
      });
    })
  );
  writeAudit(viewer, AUDIT_ACTIONS.CONFIG_RESET, { config: 'rbac' });
  return listConfigs();
}
