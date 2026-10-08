import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SatisfactionModal } from './SatisfactionModal';
import { LanguageProvider } from '../context/LanguageContext';
import { INITIAL_COMPLAINTS } from '../mockData';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../services/sqliteDb', () => ({
  syncAllTicketsToSqlite: vi.fn().mockResolvedValue(undefined),
}));

const ticket = INITIAL_COMPLAINTS.find((t) => t.status === 'resolved') ?? INITIAL_COMPLAINTS[0];
const byId = (id: string) => document.getElementById(id) as HTMLElement;

function renderModal() {
  const props = { ticket, onClose: vi.fn(), onEvaluationCompleted: vi.fn() };
  render(
    <LanguageProvider>
      <SatisfactionModal {...props} />
    </LanguageProvider>
  );
  return props;
}

describe('SatisfactionModal', () => {
  beforeEach(() => localStorage.clear());

  it('renders nothing without a ticket', () => {
    const { container } = render(
      <LanguageProvider>
        <SatisfactionModal ticket={null} onClose={vi.fn()} onEvaluationCompleted={vi.fn()} />
      </LanguageProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('closes via the cancel and close buttons', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(byId('btn-cancel-csat'));
    await user.click(byId('btn-close-csat-modal'));

    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it('submits the simplified evaluation (stars + resolved yes/no + comment)', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(byId('btn-csat-star-4'));
    await user.click(byId('btn-resolved-no'));
    await user.click(byId('btn-submit-csat'));

    // completion callback fires after the 1.8s success animation
    await waitFor(() => expect(props.onEvaluationCompleted).toHaveBeenCalledTimes(1), {
      timeout: 4000,
    });
    const updated = props.onEvaluationCompleted.mock.calls[0][0];
    expect(updated.evaluation?.overallScore).toBe(4);
    expect(updated.evaluation?.isResolvedPermanently).toBe(false);
  });
});
