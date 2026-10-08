import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyTicketsList } from './MyTicketsList';
import { LanguageProvider } from '../context/LanguageContext';
import { INITIAL_COMPLAINTS } from '../mockData';

function renderList(tickets = INITIAL_COMPLAINTS) {
  const props = {
    tickets,
    onOpenTracking: vi.fn(),
    onOpenSatisfaction: vi.fn(),
    onNavigateToSubmit: vi.fn(),
  };
  render(
    <LanguageProvider>
      <MyTicketsList {...props} />
    </LanguageProvider>
  );
  return props;
}

describe('MyTicketsList', () => {
  beforeEach(() => localStorage.clear());

  it('lists every ticket with its tracking code', () => {
    renderList();
    for (const t of INITIAL_COMPLAINTS) {
      expect(screen.getAllByText(t.trackingCode).length).toBeGreaterThan(0);
    }
  });

  it('filters by free-text search and shows the empty state when nothing matches', async () => {
    const user = userEvent.setup();
    renderList();

    await user.type(
      screen.getByPlaceholderText(/ค้นหาด้วย Tracking Code/),
      'ไม่มีทางตรงกับอะไรเลย'
    );

    expect(screen.getByText('ไม่พบรายการคำร้องที่ค้นหา')).toBeInTheDocument();
  });

  it('shows the CSAT action only for resolved tickets and opens it', async () => {
    const user = userEvent.setup();
    const props = renderList();
    const resolved = INITIAL_COMPLAINTS.filter((t) => t.status === 'resolved');

    expect(screen.getAllByText('ประเมินความพึงพอใจ (CSAT)')).toHaveLength(resolved.length);
    await user.click(document.getElementById(`btn-csat-${resolved[0].id}`) as HTMLElement);

    expect(props.onOpenSatisfaction).toHaveBeenCalledWith(resolved[0]);
  });

  it('navigates to the submit form from the New Submission button', async () => {
    const user = userEvent.setup();
    const props = renderList([]);

    await user.click(screen.getByText('ยื่นเรื่องใหม่'));

    expect(props.onNavigateToSubmit).toHaveBeenCalled();
  });

  it('renders English copy when the language preference is en', async () => {
    localStorage.setItem('voicecare_lang_preference_v2', 'en');
    renderList([]);

    expect(await screen.findByText('My Grievance & Suggestion History')).toBeInTheDocument();
  });
});
