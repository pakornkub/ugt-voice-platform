'use client';

import { createContext, useContext } from 'react';
import { AppTabId, ComplaintTicket, NotificationItem, UserRole } from '@/types';

export const TAB_TO_PATH: Record<AppTabId, string> = {
  submit: '/submit',
  my_tickets: '/my-tickets',
  workflow: '/workflow',
  gatekeeper: '/gatekeeper',
  executive: '/executive',
  clustering: '/clustering',
  admin_gatekeeper: '/admin/gatekeepers',
  rbac_management: '/admin/rbac',
};

export const PATH_TO_TAB: Record<string, AppTabId> = Object.fromEntries(
  Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab as AppTabId])
);

export interface ShellContextValue {
  currentRole: UserRole;
  tickets: ComplaintTicket[];
  notifications: NotificationItem[];
  isMobileSimulator: boolean;
  activeTab: string;
  refreshData: () => void;
  navigateTab: (tab: string) => void;
  setCurrentRole: (role: UserRole) => void;
  handleRoleChange: (role: UserRole) => void;
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
