import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportAnalyticsModal } from './ExportAnalyticsModal';
import { INITIAL_COMPLAINTS } from '../mockData';

// sql.js loads its WASM from a CDN — not reachable (or wanted) in unit tests.
vi.mock('../services/sqliteDb', () => ({
  downloadSqliteDatabaseFile: vi.fn(),
  executeSqlAnalyticsQuery: vi
    .fn()
    .mockResolvedValue({ columns: [], rows: [], executionTimeMs: 0 }),
  importSqliteDatabaseFile: vi.fn(),
  syncAllTicketsToSqlite: vi.fn().mockResolvedValue(undefined),
}));

describe('ExportAnalyticsModal', () => {
  it('renders nothing while closed', () => {
    const { container } = render(
      <ExportAnalyticsModal isOpen={false} onClose={vi.fn()} tickets={INITIAL_COMPLAINTS} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('has no SLA metrics in the export options or the SQL studio presets', async () => {
    const user = userEvent.setup();
    render(<ExportAnalyticsModal isOpen onClose={vi.fn()} tickets={INITIAL_COMPLAINTS} />);

    expect(screen.queryByText(/SLA/)).not.toBeInTheDocument();
    await user.click(screen.getByText(/SQLite Query Studio/));
    expect(screen.getByText('SQL Editor')).toBeInTheDocument();
    expect(screen.queryByText(/SLA/)).not.toBeInTheDocument();
  });

  it('lets the user pick a file format and a dataset profile', async () => {
    const user = userEvent.setup();
    render(<ExportAnalyticsModal isOpen onClose={vi.fn()} tickets={INITIAL_COMPLAINTS} />);

    await user.click(screen.getAllByText(/Excel CSV/)[0]);
    await user.click(screen.getAllByText(/JSON Document/)[0]);
    await user.click(screen.getAllByText(/Operations & Response Time/)[0]);
    expect(screen.getAllByText(/JSON Document/).length).toBeGreaterThan(0);
  });
});
