import { describe, expect, it } from 'vitest';
import {
  allCategoriesScope,
  effectiveDepartments,
  GRIEVANCE_CATEGORIES,
  keepsAdminInControl,
  normalizeGatekeeperScope,
  normalizeRoleScope,
  toggleGatekeeperCategory,
} from './role-access-rules';
import type { AppTabId, GrievanceCategory, RolePermissionConfig } from '@/types';

const ALL: GrievanceCategory[] = [...GRIEVANCE_CATEGORIES];

describe('effectiveDepartments (the one reading of a stored scope)', () => {
  it.each([
    ['a legacy empty list reads as HR', [], ['HR']],
    ['a missing scope reads as HR', undefined, ['HR']],
    ['a stored scope is used as is', ['Quality', 'Fraud'], ['Quality', 'Fraud']],
  ] as const)('%s', (_name, stored, expected) => {
    expect(effectiveDepartments(stored as GrievanceCategory[] | undefined)).toEqual(expected);
  });
});

describe('normalizeGatekeeperScope', () => {
  it.each([
    ['empty falls back to HR', [], ['HR'], false],
    ['one category', ['Quality'], ['Quality'], false],
    ['five of six', ALL.slice(1), ALL.slice(1), false],
    ['every category', ALL, ALL, true],
    ['duplicates are counted once', ['HR', 'HR'], ['HR'], false],
  ] as const)('%s', (_name, picked, departments, viewAll) => {
    expect(normalizeGatekeeperScope(picked as GrievanceCategory[])).toEqual({
      assignedDepartments: departments,
      canViewAllDepartments: viewAll,
    });
  });

  it('"select all" covers every category in the matrix order', () => {
    expect(allCategoriesScope()).toEqual({ assignedDepartments: ALL, canViewAllDepartments: true });
  });
});

describe('toggleGatekeeperCategory', () => {
  it.each([
    ['adds a missing category', ['HR'], 'Ethics', ['HR', 'Ethics'], false],
    ['removes a picked one', ['HR', 'Ethics'], 'Ethics', ['HR'], false],
    ['unticking the last one falls back to HR', ['Quality'], 'Quality', ['HR'], false],
    ['unticking HR alone leaves HR', ['HR'], 'HR', ['HR'], false],
    ['ticking the sixth derives view-all', ALL.slice(0, 5), 'Quality', ALL, true],
    ['unticking from all clears view-all', ALL, 'Fraud', ALL.filter((c) => c !== 'Fraud'), false],
    ['a missing scope starts empty', undefined, 'Fraud', ['Fraud'], false],
  ] as const)('%s', (_name, current, category, departments, viewAll) => {
    expect(toggleGatekeeperCategory(current as GrievanceCategory[] | undefined, category)).toEqual({
      assignedDepartments: departments,
      canViewAllDepartments: viewAll,
    });
  });
});

describe('normalizeRoleScope (write path)', () => {
  it('normalises a changed gatekeeper scope', () => {
    expect(normalizeRoleScope('gatekeeper', { assignedDepartments: [] })).toEqual({
      assignedDepartments: ['HR'],
      canViewAllDepartments: false,
    });
    expect(normalizeRoleScope('gatekeeper', { assignedDepartments: ALL }, ['HR'])).toEqual({
      assignedDepartments: ALL,
      canViewAllDepartments: true,
    });
  });

  it('leaves an untouched gatekeeper scope as stored, even a legacy empty list', () => {
    const data = { assignedDepartments: [] as GrievanceCategory[], canViewAllDepartments: false };
    expect(normalizeRoleScope('gatekeeper', data, [])).toBe(data);
  });

  it('leaves other roles and partial updates alone', () => {
    const empty = { assignedDepartments: [] as GrievanceCategory[], canViewAllDepartments: true };
    expect(normalizeRoleScope('executive', empty)).toBe(empty);
    expect(normalizeRoleScope('admin', empty)).toBe(empty);
    const partial: Partial<RolePermissionConfig> = { canViewDirectCeoTickets: true };
    expect(normalizeRoleScope('gatekeeper', partial)).toBe(partial);
  });
});

describe('keepsAdminInControl', () => {
  const withRbac: AppTabId[] = ['submit', 'rbac_management'];
  it.each([
    ['admin keeps the RBAC tab', 'admin', { allowedTabs: withRbac }, true],
    ['admin loses the RBAC tab', 'admin', { allowedTabs: ['submit'] as AppTabId[] }, false],
    ['admin loses canManageRolePermissions', 'admin', { canManageRolePermissions: false }, false],
    ['admin keeps canManageRolePermissions', 'admin', { canManageRolePermissions: true }, true],
    ['admin, unrelated change', 'admin', { canViewDirectCeoTickets: true }, true],
    ['other role, no RBAC tab', 'employee', { allowedTabs: ['submit'] as AppTabId[] }, true],
    ['other role, flag off', 'gatekeeper', { canManageRolePermissions: false }, true],
  ] as const)('%s', (_name, role, data, expected) => {
    expect(keepsAdminInControl(role, data as Partial<RolePermissionConfig>)).toBe(expected);
  });
});
