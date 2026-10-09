import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogsTable } from './AuditLogsTable';
import { LanguageProvider } from '../context/LanguageContext';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/audit-logs',
}));

const ROWS = [
  {
    id: 1,
    createdAt: '2026-10-09T03:04:05.000Z',
    userName: 'Somchai (somchai@ube.co.th)',
    action: 'LOGIN',
    detail: '{"ip":"10.0.0.1"}',
  },
  {
    id: 2,
    createdAt: '2026-10-09T04:00:00.000Z',
    userName: 'Malee',
    action: 'LOGOUT',
    detail: null,
  },
];
const NO_FILTERS = { q: '', from: '', to: '', action: '' };

const renderTable = (props: Partial<React.ComponentProps<typeof AuditLogsTable>> = {}) =>
  render(
    <LanguageProvider>
      <AuditLogsTable
        rows={ROWS}
        page={2}
        pageSize={20}
        totalItems={1234}
        actionOptions={['LOGIN', 'LOGOUT']}
        filters={NO_FILTERS}
        {...props}
      />
    </LanguageProvider>
  );

beforeEach(() => {
  localStorage.clear();
  router.replace.mockClear();
});

describe('AuditLogsTable (Thai)', () => {
  it('shows the heading, filters, columns, total and page counter', () => {
    renderTable();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'บันทึกการใช้งาน (Audit Logs)'
    );
    expect(screen.getByText(/บันทึกการเข้าสู่ระบบ\/ออกจากระบบ/)).toBeInTheDocument();
    expect(screen.getByLabelText('ค้นหาชื่อ/อีเมลผู้ใช้')).toHaveAttribute(
      'placeholder',
      'พิมพ์แล้วกด Enter...'
    );
    expect(screen.getByLabelText('จากวันที่')).toBeInTheDocument();
    expect(screen.getByLabelText('ถึงวันที่')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ทั้งหมด' })).toBeInTheDocument();
    for (const name of ['เวลา', 'ผู้ใช้', 'Action', 'รายละเอียด']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText(/รายการ/)).toHaveTextContent('ทั้งหมด 1,234 รายการ');
    expect(screen.getByText('หน้า 2 / 62')).toBeInTheDocument();
  });

  it('formats times with the Thai locale (Buddhist-era year)', () => {
    renderTable();
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/69/);
  });

  it('opens the detail dialog with a Thai title and clears active filters', async () => {
    const user = userEvent.setup();
    renderTable({ filters: { ...NO_FILTERS, q: 'som' } });
    await user.click(screen.getByRole('button', { name: '{"ip":"10.0.0.1"}' }));
    expect(screen.getByRole('heading', { name: 'รายละเอียด' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }));
    expect(router.replace).toHaveBeenCalledWith('/admin/audit-logs?', { scroll: false });
  });

  it('shows the empty state', () => {
    renderTable({ rows: [], totalItems: 0, page: 1 });
    expect(screen.getByText('ไม่พบบันทึกการใช้งานตามเงื่อนไขที่เลือก')).toBeInTheDocument();
  });
});

describe('AuditLogsTable (English)', () => {
  beforeEach(() => localStorage.setItem('voiceplatform_lang_preference_v2', 'en'));

  it('translates the heading, filters, columns, total and page counter', () => {
    renderTable();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Audit Logs');
    expect(screen.getByText(/Records every sign-in and sign-out/)).toBeInTheDocument();
    expect(screen.getByLabelText('Search user name / email')).toHaveAttribute(
      'placeholder',
      'Type, then press Enter...'
    );
    expect(screen.getByLabelText('From date')).toBeInTheDocument();
    expect(screen.getByLabelText('To date')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument();
    for (const name of ['Time', 'User', 'Action', 'Details']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/records/)).toHaveTextContent('Total 1,234 records');
    expect(screen.getByText('Page 2 / 62')).toBeInTheDocument();
  });

  it('formats times day-first in the English locale', () => {
    renderTable();
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/^09\/10\/2026/);
  });

  it('opens the detail dialog with an English title and clears filters', async () => {
    const user = userEvent.setup();
    renderTable({ filters: { ...NO_FILTERS, action: 'LOGIN' } });
    await user.click(screen.getByRole('button', { name: '{"ip":"10.0.0.1"}' }));
    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.replace).toHaveBeenCalledWith('/admin/audit-logs?', { scroll: false });
  });

  it('shows the empty state and a singular record count', () => {
    const { unmount } = renderTable({ rows: [], totalItems: 0, page: 1 });
    expect(screen.getByText('No activity records match the selected filters')).toBeInTheDocument();
    unmount();
    renderTable({ rows: ROWS, totalItems: 1, page: 1 });
    expect(screen.getByText(/record/)).toHaveTextContent('Total 1 record');
  });
});
