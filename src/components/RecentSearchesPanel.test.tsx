import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecentSearchesPanel } from './RecentSearchesPanel';
import { LanguageProvider } from '../context/LanguageContext';
import { addRecentSearch, getRecentSearches } from '../services/api';

function renderPanel(isOpen: boolean, overrides: Record<string, unknown> = {}) {
  const props = {
    isOpen,
    onClose: vi.fn(),
    onSelectTicket: vi.fn(),
    onSearchAgain: vi.fn(),
    ...overrides,
  };
  render(
    <LanguageProvider>
      <RecentSearchesPanel {...props} />
    </LanguageProvider>
  );
  return props;
}

describe('RecentSearchesPanel', () => {
  beforeEach(() => localStorage.clear());

  it('renders nothing while closed', () => {
    const { container } = render(
      <LanguageProvider>
        <RecentSearchesPanel
          isOpen={false}
          onClose={vi.fn()}
          onSelectTicket={vi.fn()}
          onSearchAgain={vi.fn()}
        />
      </LanguageProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists stored searches when opened and re-searches an unknown code', async () => {
    const user = userEvent.setup();
    addRecentSearch('TK-NOPE-0001', undefined);
    expect(getRecentSearches()).toHaveLength(1);

    const props = renderPanel(true);

    const row = screen.getByText('TK-NOPE-0001');
    await user.click(row);

    expect(props.onSearchAgain).toHaveBeenCalledWith('TK-NOPE-0001');
    expect(props.onClose).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const props = renderPanel(true);

    await user.keyboard('{Escape}');

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
