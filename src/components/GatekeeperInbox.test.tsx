import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GatekeeperInbox } from './GatekeeperInbox';
import { INITIAL_COMPLAINTS } from '../mockData';

// updateTicketWorkflow mirrors tickets into sql.js, which loads WASM from a CDN.
vi.mock('../services/sqliteDb', () => ({
  syncAllTicketsToSqlite: vi.fn().mockResolvedValue(undefined),
}));

const directCeoTicket = INITIAL_COMPLAINTS.find((t) => t.isDirectToExecutive)!;
const normalTicket = INITIAL_COMPLAINTS.find(
  (t) => !t.isDirectToExecutive && t.status === 'submitted'
)!;

describe('GatekeeperInbox', () => {
  beforeEach(() => localStorage.clear());

  it('hides direct-to-CEO tickets from a gatekeeper without the permission', () => {
    render(
      <GatekeeperInbox
        tickets={INITIAL_COMPLAINTS}
        currentRole="gatekeeper"
        onSelectTicket={vi.fn()}
        onTicketUpdated={vi.fn()}
      />
    );

    expect(screen.queryByText(directCeoTicket.trackingCode)).not.toBeInTheDocument();
    expect(screen.getByText(normalTicket.trackingCode)).toBeInTheDocument();
    expect(document.getElementById('badge-ceo-whistleblower-isolated')).toBeInTheDocument();
    expect(document.getElementById('counter-card-ceo-direct')).not.toBeInTheDocument();
  });

  it('shows direct-to-CEO tickets to an executive', () => {
    render(
      <GatekeeperInbox
        tickets={INITIAL_COMPLAINTS}
        currentRole="executive"
        onSelectTicket={vi.fn()}
        onTicketUpdated={vi.fn()}
      />
    );

    expect(screen.getByText(directCeoTicket.trackingCode)).toBeInTheDocument();
    expect(document.getElementById('counter-card-ceo-direct')).toBeInTheDocument();
  });

  it('saves urgency and risk severity chosen in the triage modal', async () => {
    const user = userEvent.setup();
    const onTicketUpdated = vi.fn();
    render(
      <GatekeeperInbox
        tickets={INITIAL_COMPLAINTS}
        currentRole="gatekeeper"
        onSelectTicket={vi.fn()}
        onTicketUpdated={onTicketUpdated}
      />
    );

    await user.click(document.getElementById(`btn-triage-${normalTicket.id}`)!);
    expect(screen.getByText(/ทบทวนระดับความเร่งด่วนและความเสี่ยง/)).toBeInTheDocument();

    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const hasOption = (value: string) => (el: HTMLSelectElement) =>
      Array.from(el.options).some((o) => o.value === value);
    const urgencySelect = selects.find(hasOption('Critical'))!;
    const riskSelect = selects.find(hasOption('Severe'))!;
    await user.selectOptions(urgencySelect, 'Critical');
    await user.selectOptions(riskSelect, 'Severe');
    await user.click(screen.getByText(/บันทึกการอัปเดต/));

    expect(onTicketUpdated).toHaveBeenCalledTimes(1);
    const saved = onTicketUpdated.mock.calls[0][0];
    expect(saved.urgency).toBe('Critical');
    expect(saved.riskSeverity).toBe('Severe');
    expect(
      within(document.body).queryByText(/ทบทวนระดับความเร่งด่วนและความเสี่ยง/)
    ).not.toBeInTheDocument();
  });
});
