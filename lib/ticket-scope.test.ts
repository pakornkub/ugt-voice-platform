import { describe, expect, it } from 'vitest';
import {
  canSubmit,
  canTriage,
  gatekeeperDepartments,
  isNotificationForViewer,
  isOwnTicket,
  PROTECTED_ACTOR_NAME,
  redactNotificationForViewer,
  redactTicketForViewer,
  ticketScopeWhere,
  touchesTriageFields,
  type TicketViewer,
} from './ticket-scope';
import { INITIAL_ROLE_PERMISSIONS } from '@/services/api';
import { INITIAL_COMPLAINTS } from '@/mockData';
import type { ComplaintTicket, RolePermissionConfig, UserRole } from '@/types';

const viewer = (role: UserRole, patch: Partial<RolePermissionConfig> = {}): TicketViewer => {
  const config = { ...INITIAL_ROLE_PERMISSIONS[role], ...patch };
  return {
    userId: 'u1',
    email: 'me@ube.com',
    name: 'Me',
    rbacRoleName: null,
    role,
    config,
    gatekeeperCategories: gatekeeperDepartments(config),
  };
};

const OWN = {
  // Both spellings of the org mailbox (lib/email-identity.ts).
  OR: [
    { loginEmail: { in: ['me@ube.com', 'me@ube.co.th'] } },
    { loginEmail: null, submitterEmail: { in: ['me@ube.com', 'me@ube.co.th'] } },
  ],
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

describe('isOwnTicket', () => {
  it('matches the login email, else the submitter email on legacy rows, case-insensitively', () => {
    const me = { email: 'Me@UBE.com' };
    expect(isOwnTicket(me, { loginEmail: 'me@ube.com' })).toBe(true);
    expect(isOwnTicket(me, { loginEmail: 'ME@ube.co.th' })).toBe(true); // same mailbox, HR spelling
    expect(isOwnTicket(me, { loginEmail: null, submitterEmail: 'me@ube.com' })).toBe(true);
    expect(isOwnTicket(me, { loginEmail: 'other@ube.com', submitterEmail: 'me@ube.com' })).toBe(
      false
    );
    expect(isOwnTicket(me, {})).toBe(false);
  });
});

describe('redactTicketForViewer (server twin of the UI masking)', () => {
  const base: ComplaintTicket = {
    ...INITIAL_COMPLAINTS[0],
    submitterName: 'สมหญิง ใจดี',
    submitterEmployeeId: 'EMP042',
    submitterDepartment: 'Finance',
    submitterEmail: 'somying@ube.com',
    submitterPhone: '0812345678',
    loginEmail: 'somying@ube.com',
    timeline: [
      {
        id: 'l1',
        timestamp: '2026-10-09T00:00:00Z',
        actor: 'สมหญิง ใจดี',
        actorRole: 'Employee',
        action: 'ยื่นเรื่อง',
        status: 'submitted',
      },
      {
        id: 'l2',
        timestamp: '2026-10-09T01:00:00Z',
        actor: 'Gatekeeper Supervisor',
        actorRole: 'Gatekeeper Lead',
        action: 'triage',
        status: 'gatekeeper_triaged',
      },
    ],
  };
  const anonymous = { ...base, confidentiality: 'anonymous' as const };
  const confidential = { ...base, confidentiality: 'confidential_restricted' as const };

  it('leaves the submitter their own ticket and everyone a named ticket', () => {
    const owner = { ...viewer('employee'), email: 'somying@ube.com' };
    expect(redactTicketForViewer(owner, confidential)).toBe(confidential);
    expect(
      redactTicketForViewer(viewer('gatekeeper'), { ...base, confidentiality: 'standard_named' })
    ).toEqual({ ...base, confidentiality: 'standard_named' });
  });

  it('hides an anonymous submitter from a role without either permission', () => {
    const out = redactTicketForViewer(viewer('gatekeeper'), anonymous);
    expect(out).toMatchObject({ submitterName: 'ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)' });
    for (const field of [
      'submitterEmployeeId',
      'submitterDepartment',
      'submitterPhone',
      'submitterEmail',
      'loginEmail',
    ] as const) {
      expect(out[field]).toBeUndefined();
    }
  });

  it('shows only the login email of an anonymous submitter with canViewAnonymousSubmitterEmail', () => {
    const out = redactTicketForViewer(viewer('executive'), anonymous);
    expect(out.loginEmail).toBe('somying@ube.com');
    expect(out.submitterEmployeeId).toBeUndefined();
  });

  it('shows everything to a role with both permissions (admin)', () => {
    expect(redactTicketForViewer(viewer('admin'), anonymous)).toEqual(anonymous);
    expect(redactTicketForViewer(viewer('admin'), confidential)).toBe(confidential);
  });

  it('blanks a confidential submitter and their timeline name without canViewConfidentialIdentities', () => {
    const out = redactTicketForViewer(viewer('executive'), confidential);
    expect(out.submitterName).toBeUndefined();
    expect(out.loginEmail).toBeUndefined();
    expect(out.timeline.map((l) => l.actor)).toEqual([
      PROTECTED_ACTOR_NAME,
      'Gatekeeper Supervisor',
    ]);
  });
});

describe('redactNotificationForViewer', () => {
  it('keeps the recipient email only for its recipient', () => {
    const n = {
      id: 'n1',
      ticketId: 't1',
      trackingCode: 'TK-1',
      title: 't',
      message: 'm',
      timestamp: '2026-10-09T00:00:00Z',
      read: false,
      type: 'status_update' as const,
      recipientEmail: 'Me@ube.com',
    };
    expect(redactNotificationForViewer({ email: 'me@ube.com' }, n)).toBe(n);
    expect(redactNotificationForViewer({ email: 'x@ube.com' }, n).recipientEmail).toBeUndefined();
  });
});

describe('isNotificationForViewer', () => {
  const employee = { email: 'Somchai@ube.com', role: 'employee' as const };
  const gatekeeper = { email: 'gk@ube.com', role: 'gatekeeper' as const };
  const toSubmitter = {
    type: 'chat_message' as const,
    recipientRole: 'employee' as const,
    recipientEmail: 'somchai@ube.com',
  };
  const toStaff = { type: 'chat_message' as const, recipientRole: 'gatekeeper' as const };

  it('sends a staff chat message to the submitter only, never back to the staff', () => {
    expect(isNotificationForViewer(employee, toSubmitter)).toBe(true);
    expect(isNotificationForViewer(gatekeeper, toSubmitter)).toBe(false);
  });

  it('sends a submitter reply to staff only, never back to the submitter', () => {
    expect(isNotificationForViewer(gatekeeper, toStaff)).toBe(true);
    expect(isNotificationForViewer(employee, toStaff)).toBe(false);
  });

  it('leaves every other notification to ticket visibility', () => {
    expect(
      isNotificationForViewer(gatekeeper, { type: 'status_update', recipientRole: 'employee' })
    ).toBe(true);
  });
});
