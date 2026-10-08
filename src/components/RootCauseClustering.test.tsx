import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RootCauseClustering } from './RootCauseClustering';
import { INITIAL_COMPLAINTS } from '../mockData';

describe('RootCauseClustering', () => {
  it('renders the mock clusters built from the 6-category taxonomy', () => {
    render(<RootCauseClustering tickets={INITIAL_COMPLAINTS} onSelectTicket={vi.fn()} />);

    expect(
      screen.getAllByText(/Quality Assurance & Delivery Inspection Latency/)[0]
    ).toBeInTheDocument();
    expect(screen.queryByText(/IT Infrastructure Aging/)).not.toBeInTheDocument();
  });
});
