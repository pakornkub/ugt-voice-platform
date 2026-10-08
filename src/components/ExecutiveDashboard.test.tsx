import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { LanguageProvider } from '../context/LanguageContext';
import { INITIAL_COMPLAINTS } from '../mockData';

const renderDashboard = () =>
  render(
    <LanguageProvider>
      <ExecutiveDashboard tickets={INITIAL_COMPLAINTS} onSelectTicket={vi.fn()} />
    </LanguageProvider>
  );

describe('ExecutiveDashboard', () => {
  it('shows the real-time insights header instead of the AI strategic briefing', () => {
    renderDashboard();

    expect(screen.getByText('ข้อมูลภาพรวมแบบเรียลไทม์')).toBeInTheDocument();
    expect(screen.getByText('ระยะเวลาเฉลี่ยในการแก้ไข')).toBeInTheDocument();
    expect(screen.queryByText(/AI Strategic Briefing/i)).not.toBeInTheDocument();
  });

  it('opens the all-tickets modal from a KPI card and filters by status', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(document.getElementById('kpi-card-total-tickets')!);
    expect(document.getElementById('btn-close-kpi-modal')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /^แก้ไขแล้ว|^เสร็จสิ้น|Resolved/ })[0]);
    expect(document.getElementById('btn-close-kpi-modal')).toBeInTheDocument();
  });
});
