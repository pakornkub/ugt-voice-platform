import { describe, expect, it } from 'vitest';
import {
  canSubmit,
  canTriage,
  gatekeeperDepartments,
  ticketScopeWhere,
  touchesTriageFields,
  type TicketViewer,
} from './ticket-scope';
import { INITIAL_ROLE_PERMISSIONS } from '@/services/api';
import type { RolePermissionConfig, UserRole } from '@/types';

const viewer = (role: UserRole, patch: Partial<RolePermissionConfig> = {}): TicketViewer => ({
  userId: 'u1',
  email: 'me@ube.co.th',
  role,
  config: { ...INITIAL_ROLE_PERMISSIONS[role], ...patch },
});

const OWN = {
  OR: [{ loginEmail: 'me@ube.co.th' }, { loginEmail: null, submitterEmail: 'me@ube.co.th' }],
};

describe('ticketScopeWhere', () => {
  it('limits an employee to the tickets they submitted', () => {
    expect(ticketScopeWhere(viewer('employee'))).toEqual({ isDeleted: false, ...OWN });
  });

  it('limits a gatekeeper to the assigned departments and hides direct-to-CEO tickets', () => {
    expect(ticketScopeWhere(viewer('gatekeeper', { assignedDepartments: ['Quality'] }))).toEqual({
      isDeleted: false,
      OR: [OWN, { AND: [{ isDirectToExecutive: false }, { category: { in: ['Quality'] } }] }],
    });
  });

  it('shows direct-to-CEO tickets to a gatekeeper granted canViewDirectCeoTickets', () => {
    const where = ticketScopeWhere(
      viewer('gatekeeper', { assignedDepartments: ['HR'], canViewDirectCeoTickets: true })
    );
    expect(where.OR?.[1]).toEqual({ AND: [{ category: { in: ['HR'] } }] });
  });

  it('gives executives and admins every department, direct-to-CEO per the RBAC flag', () => {
    expect(ticketScopeWhere(viewer('admin'))).toEqual({ isDeleted: false });
    expect(
      ticketScopeWhere(viewer('executive', { canViewDirectCeoTickets: false })).OR?.[1]
    ).toEqual({ AND: [{ isDirectToExecutive: false }] });
  });

  it('falls back to own tickets when the role has no RoleAccessConfigs row', () => {
    expect(ticketScopeWhere({ ...viewer('admin'), config: undefined })).toEqual({
      isDeleted: false,
      ...OWN,
    });
  });
});

describe('gatekeeperDepartments', () => {
  it('defaults an empty assignment to HR, like GatekeeperInbox', () => {
    expect(gatekeeperDepartments(viewer('gatekeeper', { assignedDepartments: [] }).config)).toEqual(
      ['HR']
    );
    expect(gatekeeperDepartments(undefined)).toEqual(['HR']);
  });
});

describe('action permissions', () => {
  it('lets whoever holds the submit tab file a ticket', () => {
    expect(canSubmit(viewer('employee'))).toBe(true);
    expect(canSubmit(viewer('gatekeeper'))).toBe(false);
    expect(canSubmit({ ...viewer('admin'), config: undefined })).toBe(false);
  });

  it('lets whoever holds the gatekeeper tab triage', () => {
    expect(canTriage(viewer('gatekeeper'))).toBe(true);
    expect(canTriage(viewer('admin'))).toBe(true);
    expect(canTriage(viewer('employee'))).toBe(false);
    expect(canTriage(viewer('executive'))).toBe(false);
  });

  it('tells a plain note from a triage change', () => {
    expect(touchesTriageFields({ actorName: 'x', actionNote: 'note' })).toBe(false);
    expect(touchesTriageFields({ actionNote: 'note', status: 'resolved' })).toBe(true);
    expect(touchesTriageFields({ urgency: 'High' })).toBe(true);
  });
});
