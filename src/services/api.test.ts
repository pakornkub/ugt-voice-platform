import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComplaintTicket } from '../types';
import { INITIAL_COMPLAINTS } from '../mockData';
import {
  INITIAL_ROLE_PERMISSIONS,
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  getStatusBadgeText,
  getStoredEmailDispatchLogs,
  getStoredGatekeeperConfigs,
  getStoredRolePermissions,
  getStoredTickets,
  getTicketByTrackingCode,
  interpolateEmailTemplate,
  removeRecentSearch,
  sendAnonymousChatMessage,
  sendTestEmailNotification,
  submitTicket,
  updateEmailNotificationSettings,
  updateTicketWorkflow,
} from './api';

// saveStoredTickets mirrors into sql.js, which would fetch its WASM from a CDN
vi.mock('./sqliteDb', () => ({ syncAllTicketsToSqlite: vi.fn().mockResolvedValue(undefined) }));

const TICKETS_KEY = 'enterprise_grievance_tickets_v5';
const RBAC_KEY = 'enterprise_grievance_rbac_permissions_v3';
const GK_KEY = 'enterprise_grievance_gatekeepers_v3';

function newTicketPayload(overrides: Partial<ComplaintTicket> = {}) {
  return {
    type: 'complaint' as const,
    category: 'HR' as const,
    title: 'ทดสอบ',
    description: 'รายละเอียด',
    isDirectToExecutive: false,
    confidentiality: 'standard_named' as const,
    submitterName: 'สมชาย',
    submitterEmail: 'somchai@example.com',
    gatekeeperDepartment: 'HR',
    urgency: 'Medium' as const,
    riskSeverity: 'Moderate' as const,
    attachments: [],
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('storage migrations (upstream storage-key bump)', () => {
  it('moves legacy Environment tickets to Compliance', () => {
    const legacy = { ...INITIAL_COMPLAINTS[0], category: 'Environment' };
    localStorage.setItem(TICKETS_KEY, JSON.stringify([legacy]));

    const [migrated] = getStoredTickets();

    expect(migrated.category).toBe('Compliance');
    expect(migrated.gatekeeperDepartment).toBe('Governance, Risk & Compliance Division');
    expect(JSON.parse(localStorage.getItem(TICKETS_KEY) as string)[0].category).toBe('Compliance');
  });

  it('seeds the 6-category mock tickets when storage is empty', () => {
    const tickets = getStoredTickets();
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets.every((t) => !('slaStatus' in t))).toBe(true);
  });

  it('drops the legacy Environment gatekeeper config and keeps exactly 6 categories', () => {
    const stored = getStoredGatekeeperConfigs();
    localStorage.setItem(GK_KEY, JSON.stringify({ ...stored, Environment: stored.HR }));

    expect(Object.keys(getStoredGatekeeperConfigs()).sort()).toEqual(
      ['Compliance', 'Ethics', 'Fraud', 'HR', 'Harassment', 'Quality'].sort()
    );
  });

  it('deep-merges stored role permissions so new flags get defaults', () => {
    const partial = {
      executive: {
        ...INITIAL_ROLE_PERMISSIONS.executive,
        canViewAnonymousSubmitterEmail: undefined,
      },
    };
    delete (partial.executive as Record<string, unknown>).canViewAnonymousSubmitterEmail;
    localStorage.setItem(RBAC_KEY, JSON.stringify(partial));

    const merged = getStoredRolePermissions();

    expect(merged.executive.canViewAnonymousSubmitterEmail).toBe(true);
    expect(merged.employee).toEqual(INITIAL_ROLE_PERMISSIONS.employee);
  });
});

describe('submitTicket / updateTicketWorkflow', () => {
  it('maps the login email, logs the gatekeeper email and starts with no chat messages', () => {
    const ticket = submitTicket(newTicketPayload());

    expect(ticket.status).toBe('submitted');
    expect(ticket.loginEmail).toBeTruthy();
    expect(ticket.anonymousMessages).toEqual([]);
    const [log] = getStoredEmailDispatchLogs();
    expect(log).toMatchObject({
      trigger: 'ticket_submitted',
      status: 'sent',
      recipientRole: 'gatekeeper',
    });
    expect(log.body).toContain(ticket.trackingCode);
  });

  it('flags anonymous submissions as mapped', () => {
    const ticket = submitTicket(newTicketPayload({ confidentiality: 'anonymous' }));
    expect(ticket.isAnonymousMapped).toBe(true);
  });

  it('logs the email as disabled when the master switch is off', () => {
    updateEmailNotificationSettings({ masterEnabled: false });
    submitTicket(newTicketPayload());
    expect(getStoredEmailDispatchLogs()[0].status).toBe('disabled');
  });

  it('updates urgency / riskSeverity and emails the submitter on resolve', () => {
    const ticket = submitTicket(newTicketPayload());

    const updated = updateTicketWorkflow(ticket.id, {
      status: 'resolved',
      urgency: 'Critical',
      riskSeverity: 'Severe',
      resolutionSummary: 'แก้แล้ว',
      actorName: 'Gatekeeper',
      actorRole: 'Gatekeeper',
    });

    expect(updated).toMatchObject({
      urgency: 'Critical',
      riskSeverity: 'Severe',
      status: 'resolved',
    });
    expect(getStoredEmailDispatchLogs()[0]).toMatchObject({
      trigger: 'ticket_resolved',
      recipientEmail: 'somchai@example.com',
    });
    expect(updateTicketWorkflow('missing', { actorName: 'x', actorRole: 'x' })).toBeNull();
  });
});

describe('sendAnonymousChatMessage', () => {
  it('appends staff and employee messages with read flags, a timeline entry and a notification', () => {
    const ticket = submitTicket(newTicketPayload({ confidentiality: 'anonymous' }));

    sendAnonymousChatMessage(ticket.id, '  ขอรายละเอียดเพิ่ม  ', 'gatekeeper');
    const after = sendAnonymousChatMessage(ticket.id, 'ตอบกลับ', 'employee');

    const [staffMsg, employeeMsg] = after?.anonymousMessages ?? [];
    expect(staffMsg).toMatchObject({
      message: 'ขอรายละเอียดเพิ่ม',
      isStaff: true,
      isReadByStaff: true,
      isReadByEmployee: false,
    });
    expect(employeeMsg).toMatchObject({ isStaff: false, isReadByEmployee: true });
    expect(employeeMsg.senderDisplayName).toContain('Anonymous');
    expect(after?.timeline.at(-1)?.notes).toContain('[Anonymous Q&A]');
    expect(getTicketByTrackingCode(ticket.trackingCode)?.anonymousMessages).toHaveLength(2);
    expect(sendAnonymousChatMessage('missing', 'x', 'employee')).toBeNull();
  });
});

describe('email templates', () => {
  it('interpolates single-brace tokens and treats $ in values literally', () => {
    expect(interpolateEmailTemplate('{a}-{a}-{b}', { a: '$&', b: 'B' })).toBe('$&-$&-B');
  });

  it('sendTestEmailNotification tags the log as a test dispatch', () => {
    const log = sendTestEmailNotification('ticket_resolved', 'me@example.com');
    expect(log).toMatchObject({ trigger: 'test_dispatch', recipientEmail: 'me@example.com' });
    expect(log.subject.startsWith('[TEST SIMULATION]')).toBe(true);
  });
});

describe('recent searches', () => {
  it('records hits and misses, de-duplicates by query and can remove / clear', () => {
    const ticket = INITIAL_COMPLAINTS[0];
    addRecentSearch(ticket.trackingCode, ticket);
    addRecentSearch('tk-9999-0000');
    addRecentSearch(ticket.trackingCode.toLowerCase(), ticket);

    const items = getRecentSearches();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ found: true, trackingCode: ticket.trackingCode });
    expect(items[1]).toMatchObject({ found: false, trackingCode: 'TK-9999-0000' });

    expect(removeRecentSearch(items[0].id)).toHaveLength(1);
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });
});

describe('getStatusBadgeText', () => {
  it('localises by language, defaulting to Thai', () => {
    expect(getStatusBadgeText('in_progress', 'en')).toBe('In Progress');
    expect(getStatusBadgeText('in_progress')).toContain('กำลังแก้ไข');
  });
});

describe('recent searches', () => {
  beforeEach(() => localStorage.clear());

  it('removes only the chosen item even when two are added in the same millisecond', async () => {
    const { addRecentSearch, removeRecentSearch, getRecentSearches } = await import('./api');
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    addRecentSearch('TK-AAA-1111', undefined);
    addRecentSearch('TK-BBB-2222', undefined);
    vi.restoreAllMocks();

    const [first, second] = getRecentSearches();
    expect(first.id).not.toBe(second.id);
    removeRecentSearch(getRecentSearches().find((s) => s.query === 'TK-AAA-1111')!.id);
    expect(getRecentSearches().map((s) => s.query)).toEqual(['TK-BBB-2222']);
  });
});
