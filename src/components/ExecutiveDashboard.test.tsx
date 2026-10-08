import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExecutiveDashboard, getTicketRootCauseCategory } from './ExecutiveDashboard';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { INITIAL_COMPLAINTS } from '../mockData';
import { getStoredRolePermissions, saveStoredRolePermissions } from '../services/api';
import type { ComplaintTicket } from '../types';

const isResolved = (t: ComplaintTicket) => t.status === 'resolved' || t.status === 'closed';
const isPending = (t: ComplaintTicket) =>
  t.status === 'submitted' || t.status === 'gatekeeper_triaged';

function LangToggle() {
  const { toggleLang } = useLanguage();
  return <button onClick={toggleLang}>toggle-lang</button>;
}

const renderDashboard = (tickets: ComplaintTicket[] = INITIAL_COMPLAINTS) => {
  const onSelectTicket = vi.fn();
  const view = render(
    <LanguageProvider>
      <ExecutiveDashboard tickets={tickets} onSelectTicket={onSelectTicket} />
      <LangToggle />
    </LanguageProvider>
  );
  return { onSelectTicket, ...view };
};

/** The modal's root element (it has no dialog role in the ported markup). */
const getModal = () =>
  screen.getByRole('button', { name: 'ปิดหน้าต่าง' }).closest('div.fixed') as HTMLElement;

const shownCount = (modal: HTMLElement) =>
  Number(/แสดงทั้งหมด (\d+) จาก (\d+) รายการ/.exec(modal.textContent ?? '')?.[1]);

describe('ExecutiveDashboard', () => {
  // Role/name queries over the full dashboard are slow in jsdom; allow for loaded CI workers.
  vi.setConfig({ testTimeout: 30000 });

  beforeEach(() => localStorage.clear());

  describe('overview', () => {
    it('shows real-time insights and the average resolution time KPI', () => {
      renderDashboard();

      expect(screen.getByText('ข้อมูลภาพรวมแบบเรียลไทม์')).toBeInTheDocument();
      expect(screen.getByText('ระยะเวลาเฉลี่ยในการแก้ไข')).toBeInTheDocument();
      expect(screen.queryByText(/AI Strategic Briefing/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/SLA/)).not.toBeInTheDocument();
    });

    it('lists the top-3 identified submitters ranked #1 to #3', () => {
      renderDashboard();

      expect(screen.getByText('Top 3 พนักงาน')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^#1/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^#3/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^#4/ })).not.toBeInTheDocument();
    });

    it('switches the labels to English', async () => {
      const user = userEvent.setup({ delay: null });
      renderDashboard();
      expect(screen.queryByText('Real-Time Insights')).not.toBeInTheDocument();

      await user.click(screen.getByText('toggle-lang'));

      expect(screen.getByText('Real-Time Insights')).toBeInTheDocument();
      expect(screen.getByText('Avg. Resolution Time')).toBeInTheDocument();
      expect(screen.getByText('Top 3 Submitters')).toBeInTheDocument();
    });

    it('shows empty states when there are no tickets', () => {
      renderDashboard([]);

      expect(screen.getByText('ไม่มีข้อร้องเรียนส่งตรงถึงผู้บริหารในขณะนี้')).toBeInTheDocument();
      expect(screen.getByText('ยังไม่มีข้อมูลผู้ยื่นเรื่องที่ระบุตัวตน')).toBeInTheDocument();
      expect(screen.getByText('ยังไม่มีเคสที่ประเมิน CSAT ในช่วงเวลานี้')).toBeInTheDocument();
    });

    it('opens a direct-to-CEO ticket from the priority queue', async () => {
      const user = userEvent.setup({ delay: null });
      const { onSelectTicket } = renderDashboard();
      const direct = INITIAL_COMPLAINTS.find((t) => t.isDirectToExecutive)!;

      await user.click(screen.getByRole('button', { name: new RegExp(direct.trackingCode) }));

      expect(onSelectTicket).toHaveBeenCalledWith(direct);
    });
  });

  describe('KPI modals', () => {
    it.each([
      ['จำนวนเรื่องทั้งหมด', () => INITIAL_COMPLAINTS.length],
      ['ส่งตรง CEO/EVP', () => INITIAL_COMPLAINTS.filter((t) => t.isDirectToExecutive).length],
      ['อัตราการแก้ไขสำเร็จ', () => INITIAL_COMPLAINTS.filter(isResolved).length],
    ])('opens the %s list with the matching tickets', async (kpiLabel, expected) => {
      const user = userEvent.setup({ delay: null });
      renderDashboard();
      expect(screen.queryByRole('button', { name: 'ปิดหน้าต่าง' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: new RegExp(`^${kpiLabel}`) }));

      expect(shownCount(getModal())).toBe(expected());
    });

    it('opens a KPI card with the keyboard and closes the modal again', async () => {
      const user = userEvent.setup({ delay: null });
      renderDashboard();

      screen.getByRole('button', { name: /^จำนวนเรื่องทั้งหมด/ }).focus();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('button', { name: 'ปิดหน้าต่าง' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'ปิด' }));
      expect(screen.queryByRole('button', { name: 'ปิดหน้าต่าง' })).not.toBeInTheDocument();
    });

    it('filters the modal by status, then resets the filters', async () => {
      const user = userEvent.setup({ delay: null });
      renderDashboard();
      await user.click(screen.getByRole('button', { name: /^จำนวนเรื่องทั้งหมด/ }));
      const modal = within(getModal());
      const total = INITIAL_COMPLAINTS.length;
      expect(modal.queryByRole('button', { name: 'ล้างตัวกรอง' })).not.toBeInTheDocument();

      await user.click(modal.getByRole('button', { name: 'รอดำเนินการ' }));
      expect(shownCount(getModal())).toBe(INITIAL_COMPLAINTS.filter(isPending).length);

      await user.click(modal.getByRole('button', { name: 'กำลังดำเนินการ' }));
      expect(shownCount(getModal())).toBe(
        INITIAL_COMPLAINTS.filter((t) => t.status === 'in_progress').length
      );

      await user.click(modal.getByRole('button', { name: 'แก้ไขแล้ว / ปิดเคส' }));
      expect(shownCount(getModal())).toBe(INITIAL_COMPLAINTS.filter(isResolved).length);

      await user.click(modal.getByRole('button', { name: 'เคสด่วน (Critical/High)' }));
      expect(shownCount(getModal())).toBe(
        INITIAL_COMPLAINTS.filter((t) => t.urgency === 'Critical' || t.urgency === 'High').length
      );

      await user.click(modal.getByRole('button', { name: 'ล้างตัวกรอง' }));
      expect(shownCount(getModal())).toBe(total);
    });

    it('searches tracking codes and root-cause summaries inside the modal', async () => {
      const user = userEvent.setup({ delay: null });
      renderDashboard();
      await user.click(screen.getByRole('button', { name: /^จำนวนเรื่องทั้งหมด/ }));
      const search = within(getModal()).getByRole('textbox');
      const withSummary = INITIAL_COMPLAINTS.find((t) => t.rootCauseSummary)!;

      await user.click(search);
      await user.paste('TK-2026-0883');
      expect(shownCount(getModal())).toBe(1);

      await user.clear(search);
      await user.click(search);
      await user.paste(withSummary.rootCauseSummary!.slice(0, 20));
      expect(shownCount(getModal())).toBeGreaterThanOrEqual(1);
      expect(shownCount(getModal())).toBeLessThan(INITIAL_COMPLAINTS.length);

      await user.clear(search);
      await user.click(search);
      await user.paste('no-such-ticket');
      expect(
        within(getModal()).getByText('ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา')
      ).toBeInTheDocument();
    });

    it('opens a ticket from the modal and closes the modal', async () => {
      const user = userEvent.setup({ delay: null });
      const { onSelectTicket } = renderDashboard();
      await user.click(screen.getByRole('button', { name: /^จำนวนเรื่องทั้งหมด/ }));

      await user.click(within(getModal()).getByRole('button', { name: /TK-2026-0883/ }));

      expect(onSelectTicket).toHaveBeenCalledWith(
        INITIAL_COMPLAINTS.find((t) => t.trackingCode === 'TK-2026-0883')
      );
      expect(screen.queryByRole('button', { name: 'ปิดหน้าต่าง' })).not.toBeInTheDocument();
    });
  });

  describe('drill-down modals', () => {
    it('opens the category modal with that category only', async () => {
      const user = userEvent.setup({ delay: null });
      renderDashboard();

      await user.click(screen.getByRole('button', { name: /^HR - HR/ }));

      const modal = getModal();
      expect(within(modal).getByRole('heading', { level: 3 })).toHaveTextContent(
        /^หมวดหมู่เรื่อง: HR - /
      );
      expect(shownCount(modal)).toBe(INITIAL_COMPLAINTS.filter((t) => t.category === 'HR').length);
    });

    it('opens the root-cause modal with that dimension only', async () => {
      const user = userEvent.setup({ delay: null });
      renderDashboard();

      await user.click(screen.getByRole('button', { name: /^กระบวนการทำงาน \(Process\)/ }));

      const modal = getModal();
      expect(within(modal).getByRole('heading', { level: 3 })).toHaveTextContent(
        /^การกระจายตัวของสาเหตุหลัก: กระบวนการทำงาน/
      );
      expect(shownCount(modal)).toBe(
        INITIAL_COMPLAINTS.filter((t) => getTicketRootCauseCategory(t) === 'Process').length
      );
    });

    it('opens the employee history modal from a top submitter', async () => {
      const user = userEvent.setup({ delay: null });
      renderDashboard();

      await user.click(screen.getByRole('button', { name: /^#1/ }));

      const modal = getModal();
      expect(within(modal).getByRole('heading', { level: 3 })).toHaveTextContent(
        /^ประวัติข้อร้องเรียนและข้อเสนอแนะ: คุณ/
      );
      expect(shownCount(modal)).toBeGreaterThan(0);
    });
  });

  describe('submitter identity', () => {
    const anonymous: ComplaintTicket = {
      ...INITIAL_COMPLAINTS[0],
      id: 'tk-anon',
      trackingCode: 'TK-ANON-1',
      confidentiality: 'anonymous',
      loginEmail: 'anon.user@company.internal',
    };

    const openAnonymousRow = async () => {
      const user = userEvent.setup({ delay: null });
      renderDashboard([anonymous]);
      await user.click(screen.getByRole('button', { name: /^จำนวนเรื่องทั้งหมด/ }));
      return within(getModal()).getByRole('button', { name: /TK-ANON-1/ });
    };

    it('shows the login email of an anonymous submitter when the executive may view it', async () => {
      const row = await openAnonymousRow();

      expect(row).toHaveTextContent('ผู้ยื่น: ไม่ระบุตัวตน');
      expect(row).toHaveTextContent('anon.user@company.internal');
    });

    it('hides the login email when the permission is off', async () => {
      const permissions = getStoredRolePermissions();
      saveStoredRolePermissions({
        ...permissions,
        executive: { ...permissions.executive, canViewAnonymousSubmitterEmail: false },
      });

      const row = await openAnonymousRow();

      expect(row).toHaveTextContent('ผู้ยื่น: ไม่ระบุตัวตน (Anonymous)');
      expect(row).not.toHaveTextContent('anon.user@company.internal');
    });

    it('masks restricted identities when the executive may not view them', async () => {
      const permissions = getStoredRolePermissions();
      saveStoredRolePermissions({
        ...permissions,
        executive: { ...permissions.executive, canViewConfidentialIdentities: false },
      });
      const user = userEvent.setup({ delay: null });
      renderDashboard([{ ...INITIAL_COMPLAINTS[0], confidentiality: 'confidential_restricted' }]);

      await user.click(screen.getByRole('button', { name: /^จำนวนเรื่องทั้งหมด/ }));

      expect(getModal()).toHaveTextContent('ผู้ยื่น: [ปกปิดตัวตนตามนโยบายความลับ]');
    });
  });
});
