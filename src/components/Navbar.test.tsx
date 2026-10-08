import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from './Navbar';
import { LanguageProvider } from '../context/LanguageContext';

// The Server Action pulls in Better Auth / Prisma, irrelevant to Navbar rendering.
vi.mock('@/lib/actions/auth', () => ({ ssoLogoutAction: vi.fn() }));

// Navbar reads role-tab permissions via services/api.ts's localStorage-backed
// getStoredRolePermissions(), so this also proves jsdom + the safeStorage /
// localStorage layer work under vitest without needing a browser.
function renderNavbar(props: Partial<React.ComponentProps<typeof Navbar>> = {}) {
  return render(
    <LanguageProvider>
      <Navbar currentRole="employee" activeTab="submit" {...props} />
    </LanguageProvider>
  );
}

describe('Navbar', () => {
  beforeEach(() => localStorage.clear());

  it('renders the brand and the employee-role navigation tabs (TH default)', () => {
    renderNavbar();

    expect(screen.getByText('UGT VoiceCare')).toBeInTheDocument();
    expect(screen.getByText('ยื่นข้อร้องเรียน / ข้อเสนอแนะ')).toBeInTheDocument();
    expect(screen.getByText('คู่มือ & ผังขั้นตอน (SOP)')).toBeInTheDocument();
  });

  it('calls the tab-change handler when a nav tab is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();

    renderNavbar({ onTabChange });
    await user.click(screen.getByText('ติดตามสถานะ (Timeline)'));

    expect(onTabChange).toHaveBeenCalledWith('my_tickets');
  });

  it('switches the UI language with the TH/EN switcher', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'EN' }));

    expect(screen.getByText('Submit Grievance / Suggestion')).toBeInTheDocument();
    expect(screen.queryByText('ยื่นข้อร้องเรียน / ข้อเสนอแนะ')).not.toBeInTheDocument();
  });

  it('shows the recent-searches count (9+ capped) and opens the panel', async () => {
    const user = userEvent.setup();
    const onOpenRecentSearches = vi.fn();
    renderNavbar({ recentSearchesCount: 12, onOpenRecentSearches });

    expect(screen.getAllByText('9+').length).toBeGreaterThan(0);
    await user.click(document.getElementById('btn-navbar-recent-searches') as HTMLElement);

    expect(onOpenRecentSearches).toHaveBeenCalledTimes(1);
  });

  it('submits a tracking code search and clears the input with the X button', async () => {
    const user = userEvent.setup();
    const onSearchTrackingCode = vi.fn();
    renderNavbar({ onSearchTrackingCode });

    const input = document.getElementById('global-tracking-search') as HTMLInputElement;
    await user.type(input, 'TK-1');
    await user.click(screen.getByTitle('Clear search'));
    expect(input.value).toBe('');

    await user.type(input, 'TK-2026-0001{Enter}');
    expect(onSearchTrackingCode).toHaveBeenCalledWith('TK-2026-0001');
  });

  it('gates the Dashboard / Export quick buttons by role permissions', () => {
    renderNavbar({ currentRole: 'employee' });
    expect(document.getElementById('btn-quick-dashboard')).toBeNull();
    expect(document.getElementById('btn-quick-export')).toBeNull();
  });

  it('shows the Export button for admin and keeps the SSO identity menu (no role switcher)', async () => {
    const user = userEvent.setup();
    renderNavbar({
      currentRole: 'admin',
      identity: {
        name: 'Admin Tester',
        email: 'admin@example.com',
        appRole: 'admin',
        roleName: 'Administrator',
        permissions: ['users:read'],
      },
    });

    expect(document.getElementById('btn-quick-export')).not.toBeNull();
    expect(document.getElementById('nav-tab-admin-users')).not.toBeNull();
    expect(document.getElementById('btn-role-dropdown')).toBeNull();

    await user.click(screen.getByText('Admin Tester'));
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(document.getElementById('btn-sign-out')).not.toBeNull();
  });
});
