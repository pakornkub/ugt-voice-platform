import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RootCauseClustering } from './RootCauseClustering';
import { INITIAL_COMPLAINTS } from '../mockData';

const renderClustering = (tickets = INITIAL_COMPLAINTS) => {
  const onSelectTicket = vi.fn();
  render(<RootCauseClustering tickets={tickets} onSelectTicket={onSelectTicket} />);
  return { onSelectTicket };
};

describe('RootCauseClustering', () => {
  it('lists the four mock clusters of the 6-category taxonomy and no legacy IT cluster', () => {
    renderClustering();

    expect(screen.getAllByRole('button', { name: /หมวด:/ })).toHaveLength(4);
    expect(screen.getAllByText(/Quality Assurance & Delivery Inspection Latency/)[0]).toBeVisible();
    expect(screen.queryByText(/IT Infrastructure Aging/)).not.toBeInTheDocument();
  });

  it('switches the 5-whys analysis when another cluster is selected', async () => {
    const user = userEvent.setup({ delay: null });
    renderClustering();
    expect(screen.getByText('Cluster #1')).toBeInTheDocument();
    expect(screen.getByText(/Quality Division/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Procurement Cross-Shareholding/ }));

    expect(screen.getByText('Cluster #4')).toBeInTheDocument();
    expect(screen.getByText(/Fraud Division/)).toBeInTheDocument();
    expect(screen.getAllByText('ROOT')).toHaveLength(1);
    expect(screen.getByText('Why 3')).toBeInTheDocument();
    expect(screen.queryByText('Why 4')).not.toBeInTheDocument();
  });

  it('opens a sample ticket of the active cluster by click and keyboard', async () => {
    const user = userEvent.setup({ delay: null });
    const { onSelectTicket } = renderClustering();
    const qualityTicket = INITIAL_COMPLAINTS.find((t) => t.category === 'Quality')!;
    const row = screen.getByRole('button', { name: new RegExp(qualityTicket.trackingCode) });

    await user.click(row);
    expect(onSelectTicket).toHaveBeenCalledWith(qualityTicket);

    row.focus();
    await user.keyboard('{Enter}');
    expect(onSelectTicket).toHaveBeenCalledTimes(2);
    expect(within(row).getByText(qualityTicket.title)).toBeInTheDocument();
  });

  it('shows no sample tickets for a cluster without matching cases', async () => {
    const user = userEvent.setup({ delay: null });
    renderClustering([]);

    await user.click(screen.getByRole('button', { name: /Facility Environmental Controls/ }));

    expect(screen.queryByRole('button', { name: /TK-2026/ })).not.toBeInTheDocument();
  });
});
