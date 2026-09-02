import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from './Navbar';

// Smoke test proving the test pipeline can render a real 'use client'
// component from the pre-migration SPA (unchanged logic, see
// docs/project-context/architecture.md). Navbar reads role-tab permissions
// via services/api.ts's localStorage-backed getStoredRolePermissions(), so
// this also proves jsdom + the safeStorage/localStorage layer work under
// vitest without needing a browser.
describe('Navbar', () => {
  it('renders the brand and the employee-role navigation tabs', () => {
    render(<Navbar currentRole="employee" activeTab="submit" />);

    expect(screen.getByText('UGT VoiceCare')).toBeInTheDocument();
    expect(screen.getByText('ยื่นข้อร้องเรียน / ข้อเสนอแนะ')).toBeInTheDocument();
  });

  it('calls the tab-change handler when a nav tab is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();

    render(<Navbar currentRole="employee" activeTab="submit" onTabChange={onTabChange} />);

    await user.click(screen.getByText('ติดตามสถานะ (Timeline)'));

    expect(onTabChange).toHaveBeenCalledWith('my_tickets');
  });
});
