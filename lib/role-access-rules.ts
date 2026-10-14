// lib/role-access-rules.ts — the rules of the RBAC matrix, written once as pure functions. The RBAC
// screen derives its saved value with them, `updateRoleAccessConfig` / `saveRoleAccessConfigs`
// apply the SAME functions before writing, and every reader of a role's category scope goes through
// `effectiveDepartments` instead of reinterpreting an empty list on its own.
import type { AppTabId, GrievanceCategory, RolePermissionConfig, UserRole } from '@/types';

export const GRIEVANCE_CATEGORIES = [
  'HR',
  'Compliance',
  'Ethics',
  'Fraud',
  'Harassment',
  'Quality',
] as const satisfies readonly GrievanceCategory[];

/** What an empty category scope means: the HR category (the Gatekeeper inbox's old fallback). */
export const FALLBACK_CATEGORY: GrievanceCategory = 'HR';

/**
 * Reading a stored scope: empty or missing → `['HR']`. A read never rewrites the stored row, so a
 * legacy `[]` keeps meaning HR.
 */
export function effectiveDepartments(
  assigned: GrievanceCategory[] | undefined
): GrievanceCategory[] {
  return assigned?.length ? assigned : [FALLBACK_CATEGORY];
}

type ScopeFields = Pick<RolePermissionConfig, 'assignedDepartments' | 'canViewAllDepartments'>;

/**
 * The gatekeeper role's category scope as it is stored: an empty pick falls back to HR and
 * `canViewAllDepartments` follows from the pick covering every category.
 */
export function normalizeGatekeeperScope(picked: readonly GrievanceCategory[]): {
  assignedDepartments: GrievanceCategory[];
  canViewAllDepartments: boolean;
} {
  const unique = [...new Set(picked)];
  const assignedDepartments = unique.length > 0 ? unique : [FALLBACK_CATEGORY];
  return {
    assignedDepartments,
    canViewAllDepartments: assignedDepartments.length === GRIEVANCE_CATEGORIES.length,
  };
}

/** One checkbox of the category scope flipped, then normalised. */
export function toggleGatekeeperCategory(
  current: readonly GrievanceCategory[] | undefined,
  category: GrievanceCategory
) {
  const base = current ?? [];
  return normalizeGatekeeperScope(
    base.includes(category) ? base.filter((c) => c !== category) : [...base, category]
  );
}

/** "Select all" / reset: every category. */
export const allCategoriesScope = () => normalizeGatekeeperScope(GRIEVANCE_CATEGORIES);

/**
 * Write-path normalisation: a gatekeeper config that carries a changed category scope is stored
 * with the scope normalised (see `normalizeGatekeeperScope`). Other roles keep an empty scope (they
 * see every category through their own flags), and an untouched scope stays exactly as stored.
 */
export function normalizeRoleScope<T extends Partial<ScopeFields>>(
  role: UserRole,
  data: T,
  stored?: readonly GrievanceCategory[]
): T {
  const next = data.assignedDepartments;
  if (role !== 'gatekeeper' || !next) return data;
  if (stored && stored.length === next.length && stored.every((c, i) => c === next[i])) return data;
  return { ...data, ...normalizeGatekeeperScope(next) };
}

/** Admin can never lose the RBAC screen — otherwise nobody could ever give it back. */
export function keepsAdminInControl(
  role: UserRole,
  data: { allowedTabs?: readonly AppTabId[]; canManageRolePermissions?: boolean }
): boolean {
  if (role !== 'admin') return true;
  if (data.allowedTabs && !data.allowedTabs.includes('rbac_management')) return false;
  return data.canManageRolePermissions !== false;
}
