import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GatekeeperInbox } from './GatekeeperInbox';
import { INITIAL_COMPLAINTS } from '../mockData';
import {
  getStoredGatekeeperConfigs,
  getStoredRolePermissions,
  saveStoredRolePermissions,
} from '../services/api';
import type { ComplaintTicket, GrievanceCategory } from '../types';

// updateTicketWorkflow mirrors tickets into sql.js, which loads WASM from a CDN.
vi.mock('../services/sqliteDb', () => ({
  syncAllTicketsToSqlite: vi.fn().mockResolvedValue(undefined),
}));

const directCeoTicket = INITIAL_COMPLAINTS.find((t) => t.isDirectToExecutive)!;
const normalTicket = INITIAL_COMPLAINTS.find(
  (t) => !t.isDirectToExecutive && t.status === 'submitted'
)!;

const visibleCount = () => {
  const header = screen.getByText(/รายการเคสในความรับผิดชอบ/);
  return Number(/\((\d+) รายการ\)/.exec(header.textContent ?? '')?.[1]);
};

const rowFor = (ticket: ComplaintTicket) =>
  screen.getByRole('button', { name: new RegExp(ticket.trackingCode) });

const setGatekeeperDepartments = (departments: GrievanceCategory[]) => {
  const permissions = getStoredRolePermissions();
  saveStoredRolePermissions({
    ...permissions,
    gatekeeper: { ...permissions.gatekeeper, assignedDepartments: departments },
  });
};

const renderInbox = (
  props: Partial<React.ComponentProps<typeof GatekeeperInbox>> = {},
  tickets: ComplaintTicket[] = INITIAL_COMPLAINTS
) => {
  const handlers = { onSelectTicket: vi.fn(), onTicketUpdated: vi.fn() };
  const view = render(<GatekeeperInbox tickets={tickets} {...handlers} {...props} />);
  return { ...handlers, ...view };
};

describe('GatekeeperInbox', () => {
  // jsdom renders the full inbox; allow for slow CI workers.
  vi.setConfig({ testTimeout: 30000 });

  beforeEach(() => localStorage.clear());

  describe('direct-to-CEO isolation', () => {
    it('hides direct-to-CEO tickets from a gatekeeper and shows the isolated badge', () => {
      renderInbox({ currentRole: 'gatekeeper' });

      expect(screen.queryByText(directCeoTicket.trackingCode)).not.toBeInTheDocument();
      expect(screen.getByText(normalTicket.trackingCode)).toBeInTheDocument();
      expect(screen.getByText('Whistleblower Isolated')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ส่งตรง CEO/ })).not.toBeInTheDocument();
    });

    it('lets an executive see and filter to direct-to-CEO tickets', async () => {
      const user = userEvent.setup({ delay: null });
      renderInbox({ currentRole: 'executive' });
      const all = visibleCount();

      expect(screen.getByText(directCeoTicket.trackingCode)).toBeInTheDocument();
      expect(screen.queryByText('Whistleblower Isolated')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /^ส่งตรง CEO/ }));
      const directOnly = INITIAL_COMPLAINTS.filter((t) => t.isDirectToExecutive).length;
      expect(visibleCount()).toBe(directOnly);
      expect(visibleCount()).toBeLessThan(all);
      expect(screen.queryByText(normalTicket.trackingCode)).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /^ส่งตรง CEO/ }));
      expect(visibleCount()).toBe(all);
    });
  });

  describe('department scope', () => {
    it('falls back to the default department when the selected one leaves the assigned scope', async () => {
      const user = userEvent.setup({ delay: null });
      setGatekeeperDepartments(['HR', 'Quality']);
      const { rerender, onSelectTicket, onTicketUpdated } = renderInbox();

      await user.click(screen.getByRole('button', { name: /^Quality - / }));
      const qualityCount = INITIAL_COMPLAINTS.filter(
        (t) => t.category === 'Quality' && !t.isDirectToExecutive
      ).length;
      expect(visibleCount()).toBe(qualityCount);

      // Admin narrows the gatekeeper's scope to HR only while Quality is selected.
      setGatekeeperDepartments(['HR']);
      rerender(
        <GatekeeperInbox
          tickets={INITIAL_COMPLAINTS}
          onSelectTicket={onSelectTicket}
          onTicketUpdated={onTicketUpdated}
        />
      );

      const hrCount = INITIAL_COMPLAINTS.filter(
        (t) => t.category === 'HR' && !t.isDirectToExecutive
      ).length;
      expect(visibleCount()).toBe(hrCount);
      expect(screen.queryByText('TK-2026-0877')).not.toBeInTheDocument(); // a Quality ticket
      expect(screen.getByText(normalTicket.trackingCode)).toBeInTheDocument(); // an HR ticket
    });

    it('limits a gatekeeper to the assigned departments only', () => {
      setGatekeeperDepartments(['Quality']);
      renderInbox();

      expect(visibleCount()).toBe(
        INITIAL_COMPLAINTS.filter((t) => t.category === 'Quality' && !t.isDirectToExecutive).length
      );
      expect(screen.queryByRole('button', { name: /^HR - / })).not.toBeInTheDocument();
    });
  });

  describe('filters', () => {
    it('toggles a status counter on and off', async () => {
      const user = userEvent.setup({ delay: null });
      renderInbox();
      const all = visibleCount();
      const received = INITIAL_COMPLAINTS.filter(
        (t) =>
          !t.isDirectToExecutive && (t.status === 'submitted' || t.status === 'gatekeeper_triaged')
      ).length;

      await user.click(screen.getByRole('button', { name: /^รับเรื่อง\s*\d+\s*เคส$/ }));
      expect(visibleCount()).toBe(received);

      await user.click(screen.getByRole('button', { name: /^รับเรื่อง\s*\d+\s*เคส$/ }));
      expect(visibleCount()).toBe(all);
    });

    it('filters by status chip and by search text', async () => {
      const user = userEvent.setup({ delay: null });
      renderInbox();

      await user.click(screen.getByRole('button', { name: /^ปิดเรื่อง\s*\d+$/ }));
      const closed = INITIAL_COMPLAINTS.filter(
        (t) => !t.isDirectToExecutive && t.status === 'closed'
      );
      expect(visibleCount()).toBe(closed.length);

      await user.click(screen.getByRole('button', { name: /^ทั้งหมด\s*\d+$/ }));
      await user.type(screen.getByRole('textbox', { name: /ค้นหา Tracking Code/ }), 'TK-2026-0883');
      expect(visibleCount()).toBe(1);
      expect(screen.getByText('TK-2026-0883')).toBeInTheDocument();

      await user.clear(screen.getByRole('textbox', { name: /ค้นหา Tracking Code/ }));
      await user.type(
        screen.getByRole('textbox', { name: /ค้นหา Tracking Code/ }),
        'no-such-ticket'
      );
      expect(screen.getByText('ไม่พบข้อร้องเรียนตามเงื่อนไขที่เลือก')).toBeInTheDocument();
    });

    it('shows the anonymous-chat badge on tickets that have anonymous messages', () => {
      const withChat: ComplaintTicket = {
        ...normalTicket,
        id: 'tk-chat',
        trackingCode: 'TK-CHAT-1',
        anonymousMessages: [
          {
            id: 'm1',
            ticketId: 'tk-chat',
            senderRole: 'employee',
            senderDisplayName: 'Anonymous',
            message: 'hello',
            timestamp: '2026-09-01T00:00:00.000Z',
            isStaff: false,
          },
        ],
      };
      renderInbox({}, [withChat]);

      expect(within(rowFor(withChat)).getByText(/แชทนิรนาม \(1\)/)).toBeInTheDocument();
    });
  });

  describe('ticket rows', () => {
    it('opens a ticket from the row by click and keyboard but not from its triage button', async () => {
      const user = userEvent.setup({ delay: null });
      const { onSelectTicket } = renderInbox();
      const row = rowFor(normalTicket);

      await user.click(row);
      expect(onSelectTicket).toHaveBeenCalledTimes(1);

      row.focus();
      await user.keyboard('{Enter}');
      expect(onSelectTicket).toHaveBeenCalledTimes(2);

      const triageButton = within(row).getByRole('button', { name: /จัดการ/ });
      triageButton.focus();
      await user.keyboard('{Enter}');
      expect(onSelectTicket).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/Gatekeeper Action/)).toBeInTheDocument();
    });
  });

  describe('triage modal', () => {
    const openTriage = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(within(rowFor(normalTicket)).getByRole('button', { name: /จัดการ/ }));
      return screen.getByRole('button', { name: /บันทึกการอัปเดต/ });
    };

    it('pre-fills the form from the ticket and next workflow status', async () => {
      const user = userEvent.setup({ delay: null });
      renderInbox();
      await openTriage(user);

      expect(screen.getByLabelText(/Urgency/)).toHaveValue(normalTicket.urgency);
      expect(screen.getByLabelText(/Risk Severity/)).toHaveValue(normalTicket.riskSeverity);
      expect(
        screen.getByRole('button', { name: /กำลังแก้ไข/, pressed: false })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /รับเรื่อง \(Triaged\)/, pressed: true })
      ).toBeInTheDocument();
    });

    it('saves the reviewed urgency and risk severity and closes', async () => {
      const user = userEvent.setup({ delay: null });
      const { onTicketUpdated } = renderInbox();
      await openTriage(user);

      await user.selectOptions(screen.getByLabelText(/Urgency/), 'Critical');
      await user.selectOptions(screen.getByLabelText(/Risk Severity/), 'Severe');
      await user.click(screen.getByRole('button', { name: /บันทึกการอัปเดต/ }));

      expect(onTicketUpdated).toHaveBeenCalledTimes(1);
      expect(onTicketUpdated.mock.calls[0][0]).toMatchObject({
        id: normalTicket.id,
        urgency: 'Critical',
        riskSeverity: 'Severe',
        status: 'gatekeeper_triaged',
      });
      expect(screen.queryByText(/Gatekeeper Action/)).not.toBeInTheDocument();
    });

    it('requires a resolution statement when marking the case resolved', async () => {
      const user = userEvent.setup({ delay: null });
      const { onTicketUpdated } = renderInbox();
      await openTriage(user);

      expect(screen.queryByLabelText(/Resolution Statement/)).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /แก้ไขเสร็จ \(Resolved\)/ }));
      await user.type(screen.getByLabelText(/Resolution Statement/), 'ซ่อมแซมเสร็จสิ้น');
      await user.type(screen.getByLabelText(/Action Note/), 'ตรวจสอบหน้างานแล้ว');
      await user.selectOptions(screen.getByLabelText(/Root Cause Category/), 'People');
      await user.clear(screen.getByLabelText(/Preventive Action Plan/));
      await user.type(screen.getByLabelText(/Preventive Action Plan/), 'อบรมเพิ่มเติม');
      await user.click(screen.getByRole('button', { name: /บันทึกการอัปเดต/ }));

      expect(onTicketUpdated.mock.calls[0][0]).toMatchObject({
        status: 'resolved',
        resolutionSummary: 'ซ่อมแซมเสร็จสิ้น',
        rootCauseCategory: 'People',
        preventiveActionPlan: 'อบรมเพิ่มเติม',
      });
    });

    it('fills the assignee from a configured department officer', async () => {
      const user = userEvent.setup({ delay: null });
      renderInbox();
      await openTriage(user);

      const officers = getStoredGatekeeperConfigs()[normalTicket.category].officers;
      const picked = officers[officers.length - 1];
      await user.click(screen.getByRole('button', { name: new RegExp(picked.name) }));

      expect(screen.getByLabelText(/Assigned Officer/)).toHaveValue(picked.name);
      expect(screen.getByLabelText(/อีเมลติดต่อเจ้าหน้าที่/)).toHaveValue(picked.email);
    });

    it('cancels without saving', async () => {
      const user = userEvent.setup({ delay: null });
      const { onTicketUpdated } = renderInbox();
      await openTriage(user);

      await user.click(screen.getByRole('button', { name: 'ยกเลิก' }));

      expect(onTicketUpdated).not.toHaveBeenCalled();
      expect(screen.queryByText(/Gatekeeper Action/)).not.toBeInTheDocument();
    });
  });
});
