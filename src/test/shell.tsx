// Test helper: renders a component inside ShellContext with the seed data the (shell) layout would
// load from the DB — components read role permissions / gatekeeper configs from the context.
import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { ShellContext, type ShellContextValue } from '@/app/shell-context';
import { INITIAL_COMPLAINTS, INITIAL_GATEKEEPER_CONFIGS } from '@/mockData';
import { INITIAL_ROLE_PERMISSIONS } from '@/services/rosterDefaults';
import { gatekeeperDepartments, ticketViewFor } from '@/lib/ticket-scope';
import type { ComplaintTicket, RolePermissionConfig, UserRole } from '@/types';

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

/**
 * Tickets as the server sends them to a role: each carries its `view` facts (what the (shell)
 * layout attaches through presentTicketForViewer). Components render these, so a test that used
 * to patch the RBAC matrix to force masking patches it here instead.
 */
export function ticketsAsSentTo<T extends ComplaintTicket>(
  role: UserRole,
  tickets: readonly T[],
  shell: Partial<Pick<ShellContextValue, 'rolePermissions' | 'gatekeeperCategories'>> = {}
): T[] {
  const rolePermissions = shell.rolePermissions ?? INITIAL_ROLE_PERMISSIONS;
  const viewer = {
    role,
    config: rolePermissions[role],
    gatekeeperCategories:
      shell.gatekeeperCategories ?? gatekeeperDepartments(rolePermissions.gatekeeper),
  };
  return tickets.map((ticket) => ({ ...ticket, view: ticketViewFor(viewer, ticket) }));
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
