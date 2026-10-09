// Test helper: renders a component inside ShellContext with the seed data the (shell) layout would
// load from the DB — components read role permissions / gatekeeper configs from the context.
import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { ShellContext, type ShellContextValue } from '@/app/shell-context';
import { INITIAL_COMPLAINTS, INITIAL_GATEKEEPER_CONFIGS } from '@/mockData';
import { INITIAL_ROLE_PERMISSIONS } from '@/services/api';
import { gatekeeperDepartments } from '@/lib/ticket-scope';
import type { RolePermissionConfig, UserRole } from '@/types';

export function makeShell(overrides: Partial<ShellContextValue> = {}): ShellContextValue {
  return {
    currentRole: 'employee',
    identity: {
      name: 'Test User',
      email: 'test.user@ube.co.th',
      appRole: 'employee',
      roleName: null,
      employee: null,
      permissions: [],
    },
    tickets: INITIAL_COMPLAINTS,
    notifications: [],
    rolePermissions: INITIAL_ROLE_PERMISSIONS,
    gatekeeperConfigs: INITIAL_GATEKEEPER_CONFIGS,
    gatekeeperCategories: gatekeeperDepartments(INITIAL_ROLE_PERMISSIONS.gatekeeper),
    recentSearchesCount: 0,
    isRecentSearchesOpen: false,
    openRecentSearches: vi.fn(),
    closeRecentSearches: vi.fn(),
    isMobileSimulator: false,
    activeTab: 'submit',
    refreshData: vi.fn(),
    navigateTab: vi.fn(),
    handleTicketCreated: vi.fn(),
    handleTicketUpdated: vi.fn(),
    openTrackingByCode: vi.fn(),
    openTracking: vi.fn(),
    openSatisfaction: vi.fn(),
    ...overrides,
  };
}

/** INITIAL_ROLE_PERMISSIONS with one role's flags patched. */
export function withRoleConfig(
  role: UserRole,
  patch: Partial<RolePermissionConfig>
): Record<UserRole, RolePermissionConfig> {
  return {
    ...INITIAL_ROLE_PERMISSIONS,
    [role]: { ...INITIAL_ROLE_PERMISSIONS[role], ...patch },
  };
}

export function renderWithShell(
  ui: React.ReactElement,
  shell: Partial<ShellContextValue> = {},
  options?: Omit<RenderOptions, 'wrapper'>
) {
  let value = makeShell(shell);
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
  const view = render(ui, { wrapper: Wrapper, ...options });
  return {
    ...view,
    /** Re-render with changed context (e.g. an admin narrowed the RBAC matrix). */
    rerenderWithShell: (next: React.ReactElement, changes: Partial<ShellContextValue>) => {
      value = makeShell({ ...shell, ...changes });
      view.rerender(next);
    },
  };
}
