import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportAnalyticsModal } from './ExportAnalyticsModal';
import { INITIAL_COMPLAINTS } from '../mockData';
import {
  downloadSqliteDatabaseFile,
  executeSqlAnalyticsQuery,
  importSqliteDatabaseFile,
  syncAllTicketsToSqlite,
} from '../services/sqliteDb';

// sql.js loads its WASM from a CDN — not reachable (or wanted) in unit tests.
vi.mock('../services/sqliteDb', () => ({
  downloadSqliteDatabaseFile: vi.fn(),
  executeSqlAnalyticsQuery: vi.fn(),
  importSqliteDatabaseFile: vi.fn(),
  syncAllTicketsToSqlite: vi.fn(),
}));

const TOTAL = INITIAL_COMPLAINTS.length;
const EMPTY_RESULT = { columns: [], rows: [], executionTimeMs: 0 };

function renderModal(props: Partial<React.ComponentProps<typeof ExportAnalyticsModal>> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <ExportAnalyticsModal isOpen onClose={onClose} tickets={INITIAL_COMPLAINTS} {...props} />
  );
  return { onClose, ...utils };
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const openSqlStudio = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(button(/SQLite Query Studio/));
const textareaValue = () => (screen.getByLabelText('SQL Editor') as HTMLTextAreaElement).value;

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.mocked(downloadSqliteDatabaseFile).mockReset().mockResolvedValue(undefined);
  vi.mocked(executeSqlAnalyticsQuery).mockReset().mockResolvedValue(EMPTY_RESULT);
  vi.mocked(importSqliteDatabaseFile).mockReset().mockResolvedValue(0);
  vi.mocked(syncAllTicketsToSqlite).mockReset().mockResolvedValue(undefined);
});

describe('open / close', () => {
  it('renders nothing while closed and does not sync the database', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
    expect(syncAllTicketsToSqlite).not.toHaveBeenCalled();
  });

  it('shows the hub with the export tab active and syncs the tickets once', () => {
    renderModal();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('SQLite & BI Data Hub');
    expect(screen.getByText('1. เลือกรูปแบบไฟล์ที่ต้องการดาวน์โหลด (File Format)')).toBeVisible();
    expect(syncAllTicketsToSqlite).toHaveBeenCalledTimes(1);
    expect(syncAllTicketsToSqlite).toHaveBeenCalledWith(INITIAL_COMPLAINTS);
  });

  it('does not sync when there are no tickets', () => {
    renderModal({ tickets: [] });
    expect(syncAllTicketsToSqlite).not.toHaveBeenCalled();
    expect(screen.getByText('0 รายการ')).toBeInTheDocument();
    expect(button(/^ดาวน์โหลดไฟล์ SQLite/)).toBeDisabled();
  });

  it('survives a failing initial sync', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(syncAllTicketsToSqlite).mockRejectedValueOnce(new Error('wasm blocked'));
    renderModal();
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(warn.mock.calls[0][0]).toBe('Initial SQLite sync error:');
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    warn.mockRestore();
  });

  it('calls onClose from both the header X and the footer close button', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    expect(onClose).not.toHaveBeenCalled();
    await user.click(button('ปิด'));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(button('ปิดหน้าต่าง'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('tabs', () => {
  it('switches export -> SQL studio -> guide -> export, hiding the previous tab each time', async () => {
    const user = userEvent.setup();
    renderModal();

    const exportMarker = () => screen.queryByText(/ฐานข้อมูล SQLite ภายในเบราว์เซอร์/);
    const sqlMarker = () => screen.queryByText('SQLite Interactive Query Console');
    const guideMarker = () => screen.queryByText(/คำแนะนำ: โครงสร้างข้อมูลที่ระบบจัดเตรียมไว้/);

    expect(exportMarker()).toBeInTheDocument();
    expect(sqlMarker()).not.toBeInTheDocument();
    expect(guideMarker()).not.toBeInTheDocument();

    await openSqlStudio(user);
    expect(sqlMarker()).toBeInTheDocument();
    expect(exportMarker()).not.toBeInTheDocument();
    expect(guideMarker()).not.toBeInTheDocument();

    await user.click(button(/คู่มือมิติข้อมูลสำหรับปรับปรุงองค์กร/));
    expect(guideMarker()).toBeInTheDocument();
    expect(sqlMarker()).not.toBeInTheDocument();
    expect(exportMarker()).not.toBeInTheDocument();

    await user.click(button(/ดาวน์โหลดข้อมูล \(\.sqlite/));
    expect(exportMarker()).toBeInTheDocument();
    expect(guideMarker()).not.toBeInTheDocument();
  });

  it('runs the default query only the first time the SQL studio is opened', async () => {
    const user = userEvent.setup();
    renderModal();
    expect(executeSqlAnalyticsQuery).not.toHaveBeenCalled();

    await openSqlStudio(user);
    await screen.findByText(/ไม่มีข้อมูล หรือยังไม่ได้รันคำสั่ง SQL/);
    expect(executeSqlAnalyticsQuery).toHaveBeenCalledTimes(1);
    expect(vi.mocked(executeSqlAnalyticsQuery).mock.calls[0][0]).toContain('GROUP BY category');

    await user.click(button(/คู่มือมิติข้อมูล/));
    await openSqlStudio(user);
    expect(executeSqlAnalyticsQuery).toHaveBeenCalledTimes(1);
  });

  it('lists the four guide topics', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(button(/คู่มือมิติข้อมูล/));
    expect(screen.getByText(/Pareto 80\/20 Analysis/)).toBeInTheDocument();
    expect(screen.getByText(/Lead Time & Bottlenecks/)).toBeInTheDocument();
    expect(screen.getByText(/RCA & CAPA Effectiveness/)).toBeInTheDocument();
    expect(screen.getByText(/CSAT & Employee Sentiment/)).toBeInTheDocument();
    expect(screen.getAllByText('คอลัมน์ที่แนะนำ:')).toHaveLength(4);
    expect(screen.getByText('Triage Lead Time')).toBeInTheDocument();
  });

  it('has no SLA metrics in any tab', async () => {
    const user = userEvent.setup();
    renderModal();
    expect(screen.queryByText(/SLA/)).not.toBeInTheDocument();
    await openSqlStudio(user);
    expect(screen.getByText('SQL Editor')).toBeInTheDocument();
    expect(screen.queryByText(/SLA/)).not.toBeInTheDocument();
    expect(textareaValue()).not.toMatch(/SLA/);
    await user.click(button(/คู่มือมิติข้อมูล/));
    expect(screen.queryByText(/SLA/)).not.toBeInTheDocument();
  });
});

describe('format and dataset selection', () => {
  it('selects one file format at a time and updates the hint and download label', async () => {
    const user = userEvent.setup();
    renderModal();
    const sqlite = button(/^SQLite Database \(\.sqlite\)/);
    const csv = button(/^Excel CSV \(UTF-8 BOM\)/);
    const json = button(/^JSON Document/);

    expect(sqlite).toHaveAttribute('aria-pressed', 'true');
    expect(csv).toHaveAttribute('aria-pressed', 'false');
    expect(json).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('เลือกอยู่ (แนะนำ)')).toBeInTheDocument();
    expect(screen.getByText(/ก้อนสมบูรณ์ พร้อม Table & Schema/)).toBeInTheDocument();

    await user.click(csv);
    expect(csv).toHaveAttribute('aria-pressed', 'true');
    expect(sqlite).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('เลือกอยู่ (แนะนำ)')).not.toBeInTheDocument();
    expect(screen.getByText(/UTF-8 with BOM รองรับภาษาไทย/)).toBeInTheDocument();
    expect(button(`ดาวน์โหลดไฟล์ (${TOTAL} รายการ)`)).toBeInTheDocument();

    await user.click(json);
    expect(json).toHaveAttribute('aria-pressed', 'true');
    expect(csv).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/JSON Structured Document/)).toBeInTheDocument();
  });

  it('selects one dataset profile at a time', async () => {
    const user = userEvent.setup();
    renderModal();
    const comprehensive = button(/ชุดข้อมูลวิเคราะห์ครบวงจร/);
    const ops = button(/Operations & Response Time/);
    const csat = button(/Employee Voice & CSAT Quality/);

    expect(comprehensive).toHaveAttribute('aria-pressed', 'true');
    expect(ops).toHaveAttribute('aria-pressed', 'false');

    await user.click(ops);
    expect(ops).toHaveAttribute('aria-pressed', 'true');
    expect(comprehensive).toHaveAttribute('aria-pressed', 'false');

    await user.click(csat);
    expect(csat).toHaveAttribute('aria-pressed', 'true');
    expect(ops).toHaveAttribute('aria-pressed', 'false');
    expect(button(/RCA & CAPA Action Plans/)).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('filters and metrics preview', () => {
  it('shows stats for every ticket by default', () => {
    renderModal();
    expect(screen.getByText(`${TOTAL} รายการ`)).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('7 เคส')).toBeInTheDocument();
    expect(screen.getByText('4.5 / 5.0')).toBeInTheDocument();
    expect(screen.getByText('53 ชม.')).toBeInTheDocument();
  });

  it('narrows the preview by status', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByLabelText('สถานะการดำเนินงาน'), 'closed');
    expect(screen.getByLabelText('สถานะการดำเนินงาน')).toHaveValue('closed');
    expect(screen.getByText('2 รายการ')).toBeInTheDocument();
    expect(screen.queryByText(`${TOTAL} รายการ`)).not.toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('narrows the preview by department', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.selectOptions(screen.getByLabelText('หน่วยงาน / หมวดหมู่'), 'HR');
    expect(screen.getByText('3 รายการ')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('หน่วยงาน / หมวดหมู่'), 'ALL');
    expect(screen.getByText(`${TOTAL} รายการ`)).toBeInTheDocument();
  });

  it('narrows the preview by time range, measured from the 2026-09-01 reference date', async () => {
    const user = userEvent.setup();
    renderModal();
    const range = screen.getByLabelText('ช่วงเวลาที่ยื่นเรื่อง');
    await user.selectOptions(range, '7d');
    expect(screen.getByText('13 รายการ')).toBeInTheDocument();
    await user.selectOptions(range, '30d');
    expect(screen.getByText(`${TOTAL} รายการ`)).toBeInTheDocument();
  });

  it('disables the download and shows N/A when nothing matches', async () => {
    const user = userEvent.setup();
    renderModal();
    expect(button(/^ดาวน์โหลดไฟล์ SQLite/)).toBeEnabled();
    await user.selectOptions(screen.getByLabelText('หน่วยงาน / หมวดหมู่'), 'Fraud');
    await user.selectOptions(screen.getByLabelText('สถานะการดำเนินงาน'), 'closed');
    expect(screen.getByText('0 รายการ')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(button(/^ดาวน์โหลดไฟล์ SQLite/)).toBeDisabled();
  });
});

describe('downloading', () => {
  const blobs: { text: string; type: string }[] = [];
  const downloads: string[] = [];
  const RealBlob = Blob;
  const realCreate = URL.createObjectURL;
  const realRevoke = URL.revokeObjectURL;
  const revoke = vi.fn();

  beforeEach(() => {
    blobs.length = 0;
    downloads.length = 0;
    revoke.mockClear();
    vi.stubGlobal(
      'Blob',
      class extends RealBlob {
        constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options);
          blobs.push({ text: (parts ?? []).join(''), type: options?.type ?? '' });
        }
      }
    );
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = revoke;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloads.push(this.download);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    URL.createObjectURL = realCreate;
    URL.revokeObjectURL = realRevoke;
    vi.useRealTimers();
  });

  it('downloads the SQLite database file and shows the success banner', async () => {
    const user = userEvent.setup();
    renderModal();
    expect(screen.queryByText('ดาวน์โหลดสำเร็จ!')).not.toBeInTheDocument();

    await user.click(button(/^ดาวน์โหลดไฟล์ SQLite/));

    expect(downloadSqliteDatabaseFile).toHaveBeenCalledTimes(1);
    expect(vi.mocked(downloadSqliteDatabaseFile).mock.calls[0][0]).toMatch(
      /^enterprise_grievance_v3_\d{4}-\d{2}-\d{2}\.sqlite$/
    );
    expect(await screen.findByText('ดาวน์โหลดสำเร็จ!')).toBeInTheDocument();
    expect(blobs).toHaveLength(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hides the success banner again after four seconds', async () => {
    vi.useFakeTimers();
    renderModal();
    await act(async () => {
      fireEvent.click(button(/^ดาวน์โหลดไฟล์ SQLite/));
    });
    expect(screen.getByText('ดาวน์โหลดสำเร็จ!')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('ดาวน์โหลดสำเร็จ!')).not.toBeInTheDocument();
  });

  it('exports a UTF-8 BOM CSV with one data row per ticket and no SLA columns', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(button(/^Excel CSV/));
    await user.click(button(`ดาวน์โหลดไฟล์ (${TOTAL} รายการ)`));

    expect(blobs).toHaveLength(1);
    const [{ text, type }] = blobs;
    expect(type).toBe('text/csv;charset=utf-8;');
    expect(text.startsWith('﻿"รหัสคำร้อง (Tracking Code)","วันที่และเวลายื่นเรื่อง')).toBe(true);
    const header = text.slice(1, text.indexOf('\n'));
    expect(header.split('","')).toHaveLength(35);
    expect(header).not.toMatch(/SLA/i);
    expect(text).not.toMatch(/SLA/);
    expect(text.match(/\n"TK-2026-/g)).toHaveLength(TOTAL);
    expect(text).toContain('"TK-2026-0879","2026-08-22T10:00:00.000Z"');

    expect(downloads).toHaveLength(1);
    expect(downloads[0]).toMatch(/^grievance_bi_analytics_comprehensive_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(revoke).toHaveBeenCalledWith('blob:mock');
    expect(await screen.findByText('ดาวน์โหลดสำเร็จ!')).toBeInTheDocument();
  });

  it('exports only the filtered tickets and names the file after the dataset profile', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(button(/^Excel CSV/));
    await user.click(button(/Employee Voice & CSAT Quality/));
    await user.selectOptions(screen.getByLabelText('สถานะการดำเนินงาน'), 'closed');
    await user.click(button('ดาวน์โหลดไฟล์ (2 รายการ)'));

    expect(blobs[0].text.match(/\n"TK-2026-/g)).toHaveLength(2);
    expect(blobs[0].text).toContain('"TK-2026-0879"');
    expect(blobs[0].text).not.toContain('"TK-2026-0878"');
    expect(downloads[0]).toMatch(/^grievance_bi_analytics_csat_quality_.*\.csv$/);
  });

  it('exports a JSON document with metadata, filters and records', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(button(/^JSON Document/));
    await user.click(button(/Operations & Response Time/));
    await user.selectOptions(screen.getByLabelText('หน่วยงาน / หมวดหมู่'), 'HR');
    await user.click(button('ดาวน์โหลดไฟล์ (3 รายการ)'));

    expect(blobs).toHaveLength(1);
    expect(blobs[0].type).toBe('application/json');
    const payload = JSON.parse(blobs[0].text);
    expect(payload.metadata).toMatchObject({
      system: 'Enterprise Grievance & Whistleblower System',
      version: '3.0.0',
      datasetType: 'operational_ops',
      totalRecords: 3,
      filters: { department: 'HR', status: 'ALL', timeRange: 'ALL' },
      summaryMetrics: { total: 3 },
    });
    expect(new Date(payload.metadata.exportedAt).toString()).not.toBe('Invalid Date');
    expect(payload.data).toHaveLength(3);
    expect(payload.data.every((r: { categoryKey: string }) => r.categoryKey === 'HR')).toBe(true);
    expect(Object.keys(payload.data[0]).slice(0, 3)).toEqual(['trackingCode', 'createdAt', 'type']);
    expect(Object.keys(payload.data[0])).toHaveLength(35);
    expect(downloads[0]).toMatch(/^grievance_data_operational_ops_\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('shows an inline dismissible alert instead of window.alert when the export fails', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(downloadSqliteDatabaseFile).mockRejectedValueOnce(new Error('disk full'));
    renderModal();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(button(/^ดาวน์โหลดไฟล์ SQLite/));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('เกิดข้อผิดพลาดในการส่งออกไฟล์ กรุณาลองใหม่อีกครั้ง');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('Export failed:', expect.any(Error));
    expect(screen.queryByText('ดาวน์โหลดสำเร็จ!')).not.toBeInTheDocument();
    expect(button(/^ดาวน์โหลดไฟล์ SQLite/)).toBeEnabled();

    await user.click(within(banner).getByRole('button', { name: 'ปิดข้อความแจ้งเตือน' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears a previous failure when a new export starts and shows progress meanwhile', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const pending = deferred();
    vi.mocked(downloadSqliteDatabaseFile)
      .mockRejectedValueOnce(new Error('first fails'))
      .mockReturnValueOnce(pending.promise);
    renderModal();

    await user.click(button(/^ดาวน์โหลดไฟล์ SQLite/));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.click(button(/^ดาวน์โหลดไฟล์ SQLite/));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(button('กำลังประมวลผล...')).toBeDisabled();

    await act(async () => pending.resolve());
    expect(await screen.findByText('ดาวน์โหลดสำเร็จ!')).toBeInTheDocument();
    expect(button(/^ดาวน์โหลดไฟล์ SQLite/)).toBeEnabled();
  });
});

describe('SQL studio', () => {
  it('runs the default query on open and renders columns, rows and NULL cells', async () => {
    const user = userEvent.setup();
    vi.mocked(executeSqlAnalyticsQuery).mockResolvedValueOnce({
      columns: ['หมวดหมู่', 'จำนวน'],
      rows: [
        ['HR', 3],
        ['Fraud', null],
      ],
      executionTimeMs: 1.5,
    });
    renderModal();
    await openSqlStudio(user);

    expect(await screen.findByRole('columnheader', { name: 'หมวดหมู่' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'จำนวน' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('cell', { name: 'HR' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'NULL' })).toBeInTheDocument();
    expect(screen.getByText('2 แถว')).toBeInTheDocument();
    expect(screen.getByText('เวลาประมวลผล: 1.5 ms')).toBeInTheDocument();
    expect(screen.queryByText(/ไม่มีข้อมูล หรือยังไม่ได้รันคำสั่ง SQL/)).not.toBeInTheDocument();
  });

  it('shows the empty state for a result without rows', async () => {
    const user = userEvent.setup();
    renderModal();
    await openSqlStudio(user);
    expect(await screen.findByText('0 แถว')).toBeInTheDocument();
    expect(screen.getByText('ไม่มีข้อมูล หรือยังไม่ได้รันคำสั่ง SQL')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('runs the edited query from the editor with the Execute button', async () => {
    const user = userEvent.setup();
    renderModal();
    await openSqlStudio(user);
    await screen.findByText('0 แถว');
    expect(textareaValue()).toContain('GROUP BY category');

    vi.mocked(executeSqlAnalyticsQuery).mockResolvedValueOnce({
      columns: ['n'],
      rows: [[42]],
      executionTimeMs: 0.2,
    });
    fireEvent.change(screen.getByLabelText('SQL Editor'), { target: { value: 'SELECT 42 AS n;' } });
    expect(textareaValue()).toBe('SELECT 42 AS n;');
    await user.click(button('รัน SQL (Execute)'));

    expect(executeSqlAnalyticsQuery).toHaveBeenLastCalledWith('SELECT 42 AS n;');
    expect(await screen.findByRole('cell', { name: '42' })).toBeInTheDocument();
    expect(screen.getByText('1 แถว')).toBeInTheDocument();
  });

  it('shows the busy label while a query is running', async () => {
    const user = userEvent.setup();
    const pending = deferred<typeof EMPTY_RESULT>();
    vi.mocked(executeSqlAnalyticsQuery).mockReturnValueOnce(pending.promise);
    renderModal();
    await openSqlStudio(user);

    expect(button('กำลังรัน Query...')).toBeDisabled();
    await act(async () => pending.resolve(EMPTY_RESULT));
    expect(button('รัน SQL (Execute)')).toBeEnabled();
  });

  it('renders the message when the query rejects', async () => {
    const user = userEvent.setup();
    vi.mocked(executeSqlAnalyticsQuery).mockRejectedValueOnce(new Error('near "FROM": syntax'));
    renderModal();
    await openSqlStudio(user);

    expect(await screen.findByText('SQL Error:')).toBeInTheDocument();
    expect(screen.getByText(/near "FROM": syntax/)).toBeInTheDocument();
    expect(screen.queryByText(/แถว$/)).not.toBeInTheDocument();
  });

  it('falls back to a generic message for non-Error rejections', async () => {
    const user = userEvent.setup();
    vi.mocked(executeSqlAnalyticsQuery).mockRejectedValueOnce('boom');
    renderModal();
    await openSqlStudio(user);
    expect(await screen.findByText(/SQL Execution Error/)).toBeInTheDocument();
  });

  it('renders an error returned by the query service', async () => {
    const user = userEvent.setup();
    vi.mocked(executeSqlAnalyticsQuery).mockResolvedValueOnce({
      ...EMPTY_RESULT,
      error: 'no such table: nope',
    });
    renderModal();
    await openSqlStudio(user);
    expect(await screen.findByText(/no such table: nope/)).toBeInTheDocument();
  });

  it('loads a preset into the editor and runs it', async () => {
    const user = userEvent.setup();
    renderModal();
    await openSqlStudio(user);
    await screen.findByText('0 แถว');
    expect(textareaValue()).not.toContain("WHERE status = 'in_progress'");

    await user.click(button(/2\. ตรวจสอบเคสที่กำลังดำเนินการ/));

    expect(textareaValue()).toContain(
      "WHERE status = 'in_progress' OR status = 'gatekeeper_triaged'"
    );
    expect(executeSqlAnalyticsQuery).toHaveBeenLastCalledWith(textareaValue());
    expect(executeSqlAnalyticsQuery).toHaveBeenCalledTimes(2);
  });

  it('offers all five presets', async () => {
    const user = userEvent.setup();
    renderModal();
    await openSqlStudio(user);
    for (const prefix of ['1.', '2.', '3.', '4.', '5.']) {
      expect(button(new RegExp(`^${prefix.replace('.', '\\.')} `))).toBeInTheDocument();
    }
  });

  it('saves the database through the Save .sqlite button', async () => {
    const user = userEvent.setup();
    renderModal();
    await openSqlStudio(user);
    await user.click(button('บันทึก .sqlite'));
    expect(downloadSqliteDatabaseFile).toHaveBeenCalledTimes(1);
    expect(downloadSqliteDatabaseFile).toHaveBeenCalledWith();
  });
});

describe('SQLite import', () => {
  const sqliteFile = () => new File(['data'], 'backup.sqlite', { type: 'application/x-sqlite3' });

  it('imports a file, reports the row count and re-runs the query', async () => {
    const user = userEvent.setup();
    vi.mocked(importSqliteDatabaseFile).mockResolvedValueOnce(7);
    renderModal();
    await openSqlStudio(user);
    await screen.findByText('0 แถว');
    expect(screen.queryByText(/นำเข้าสำเร็จ/)).not.toBeInTheDocument();
    expect(executeSqlAnalyticsQuery).toHaveBeenCalledTimes(1);

    const file = sqliteFile();
    await user.upload(screen.getByLabelText('นำเข้า .sqlite'), file);

    expect(importSqliteDatabaseFile).toHaveBeenCalledWith(file);
    expect(await screen.findByText('นำเข้าสำเร็จ! พบ 7 รายการในฐานข้อมูล')).toBeInTheDocument();
    await vi.waitFor(() => expect(executeSqlAnalyticsQuery).toHaveBeenCalledTimes(2));
  });

  it('reports the error when the import fails', async () => {
    const user = userEvent.setup();
    vi.mocked(importSqliteDatabaseFile).mockRejectedValueOnce(new Error('not a database'));
    renderModal();
    await openSqlStudio(user);
    await user.upload(screen.getByLabelText('นำเข้า .sqlite'), sqliteFile());

    expect(await screen.findByText('เกิดข้อผิดพลาด: not a database')).toBeInTheDocument();
    expect(screen.queryByText(/นำเข้าสำเร็จ/)).not.toBeInTheDocument();
  });

  it('stringifies non-Error failures', async () => {
    const user = userEvent.setup();
    vi.mocked(importSqliteDatabaseFile).mockRejectedValueOnce('plain text');
    renderModal();
    await openSqlStudio(user);
    await user.upload(screen.getByLabelText('นำเข้า .sqlite'), sqliteFile());
    expect(await screen.findByText('เกิดข้อผิดพลาด: plain text')).toBeInTheDocument();
  });

  it('ignores a change event without a file', async () => {
    const user = userEvent.setup();
    renderModal();
    await openSqlStudio(user);
    fireEvent.change(screen.getByLabelText('นำเข้า .sqlite'), { target: { files: [] } });
    expect(importSqliteDatabaseFile).not.toHaveBeenCalled();
    expect(screen.queryByText(/นำเข้า(สำเร็จ|ฐานข้อมูล)/)).not.toBeInTheDocument();
  });
});
