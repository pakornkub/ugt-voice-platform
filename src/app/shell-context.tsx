'use client';

import { createContext, useContext } from 'react';
import {
  AppTabId,
  ComplaintTicket,
  DepartmentGatekeeperConfig,
  GrievanceCategory,
  NotificationItem,
  RolePermissionConfig,
  UserRole,
} from '@/types';

export const TAB_TO_PATH: Record<AppTabId, string> = {
  submit: '/submit',
  my_tickets: '/my-tickets',
  workflow: '/workflow',
  gatekeeper: '/gatekeeper',
  executive: '/executive',
  clustering: '/clustering',
  admin_gatekeeper: '/admin/gatekeepers',
  rbac_management: '/admin/rbac',
  admin_users: '/admin/users',
  admin_audit_logs: '/admin/audit-logs',
};

export const PATH_TO_TAB: Record<string, AppTabId> = Object.fromEntries(
  Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab as AppTabId])
);

/** Identity of the signed-in user, from the Better Auth session (ugt-nextjs-auth-setup, 2026-09-02). */
export interface ShellIdentity {
  name: string;
  email: string;
  /** This app's own role (employee/gatekeeper/executive/admin) — drives allowedTabs, replaces the old free role-switcher. */
  appRole: UserRole;
  /** RBAC role name (e.g. "Administrator"), null if no admin-section role assigned. */
  roleName: string | null;
  /** RBAC permission keys held by this user — governs visibility of the admin_users/admin_roles/admin_audit_logs tabs. */
  permissions: string[];
}

/** Data the (shell) layout loads from the DB for the signed-in user (localStorage → DB rewiring, 2026-10-09). */
export interface ShellData {
  /** Only the tickets this user may see (lib/ticket-scope.ts). */
  tickets: ComplaintTicket[];
  /** Notifications of those tickets, unfiltered by canViewDirectCeoTickets. */
  notifications: NotificationItem[];
  rolePermissions: Record<UserRole, RolePermissionConfig>;
  gatekeeperConfigs: Record<GrievanceCategory, DepartmentGatekeeperConfig>;
}

export interface ShellContextValue {
  currentRole: UserRole;
  identity: ShellIdentity;
  tickets: ComplaintTicket[];
  /** Already filtered by canViewDirectCeoTickets. */
  notifications: NotificationItem[];
  rolePermissions: Record<UserRole, RolePermissionConfig>;
  gatekeeperConfigs: Record<GrievanceCategory, DepartmentGatekeeperConfig>;
  recentSearchesCount: number;
  isRecentSearchesOpen: boolean;
  openRecentSearches: () => void;
  closeRecentSearches: () => void;
  isMobileSimulator: boolean;
  activeTab: string;
  /** Re-runs the server layout (router.refresh) so every page sees the latest DB state. */
  refreshData: () => void;
  navigateTab: (tab: string) => void;
  handleTicketCreated: (ticket: ComplaintTicket) => void;
  handleTicketUpdated: (ticket: ComplaintTicket) => void;
  openTrackingByCode: (code: string) => void;
  openTracking: (ticket: ComplaintTicket) => void;
  openSatisfaction: (ticket: ComplaintTicket) => void;
}

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error('useShell must be used within the app shell layout');
  }
  return ctx;
}
