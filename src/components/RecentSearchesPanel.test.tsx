import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecentSearchesPanel } from './RecentSearchesPanel';
import { LanguageProvider } from '../context/LanguageContext';
import { INITIAL_COMPLAINTS } from '../mockData';
import { addRecentSearch, getRecentSearches } from '../services/api';

function renderPanel(isOpen: boolean) {
  const props = {
    isOpen,
    tickets: INITIAL_COMPLAINTS,
    onClose: vi.fn(),
    onSelectTicket: vi.fn(),
    onSearchAgain: vi.fn(),
  };
  const view = render(
    <LanguageProvider>
      <RecentSearchesPanel {...props} />
    </LanguageProvider>
  );
  return { ...props, ...view };
}

describe('RecentSearchesPanel', () => {
  beforeEach(() => localStorage.clear());

  it('renders nothing while closed', () => {
    const { container } = renderPanel(false);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists stored searches when opened and re-searches an unknown code', async () => {
    const user = userEvent.setup();
    addRecentSearch('TK-NOPE-0001', undefined);
    expect(getRecentSearches()).toHaveLength(1);

    const props = renderPanel(true);

    await user.click(screen.getByRole('button', { name: 'TK-NOPE-0001' }));

    expect(props.onSearchAgain).toHaveBeenCalledWith('TK-NOPE-0001');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('opens the ticket directly when the searched code exists', async () => {
    const user = userEvent.setup();
    const known = INITIAL_COMPLAINTS[0];
    addRecentSearch(known.trackingCode, known);

    const props = renderPanel(true);
    await user.click(screen.getByRole('button', { name: known.trackingCode }));

    expect(props.onSelectTicket).toHaveBeenCalledWith(expect.objectContaining({ id: known.id }));
    expect(props.onSearchAgain).not.toHaveBeenCalled();
  });

  it('removes a single history item and filters the list', async () => {
    const user = userEvent.setup();
    addRecentSearch('TK-AAA-1111', undefined);
    addRecentSearch('TK-BBB-2222', undefined);
    renderPanel(true);

    await user.type(screen.getByPlaceholderText('กรองประวัติการค้นหา...'), 'AAA');
    expect(screen.queryByRole('button', { name: 'TK-BBB-2222' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ลบรายการนี้' }));
    expect(getRecentSearches().map((s) => s.query)).toEqual(['TK-BBB-2222']);
  });

  it('shows the empty state with sample tickets and picks one', async () => {
    const user = userEvent.setup();
    const props = renderPanel(true);

    expect(screen.getByText('ยังไม่มีประวัติการค้นหาคำร้อง')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: new RegExp(INITIAL_COMPLAINTS[0].trackingCode) })
    );

    expect(props.onSelectTicket).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and via the backdrop', async () => {
    const user = userEvent.setup();
    const props = renderPanel(true);

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'ปิด' }));

    expect(props.onClose).toHaveBeenCalledTimes(2);
  });
});
