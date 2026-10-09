import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MissingAccountScreen } from './MissingAccountScreen';
import { LanguageProvider } from '../context/LanguageContext';

vi.mock('@/lib/actions/auth', () => ({ ssoLogoutAction: vi.fn() }));

const renderScreen = () =>
  render(
    <LanguageProvider>
      <MissingAccountScreen email="ghost@ube.co.th" />
    </LanguageProvider>
  );

beforeEach(() => localStorage.clear());

describe('MissingAccountScreen', () => {
  it('shows the Thai copy by default, with the account email', () => {
    renderScreen();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'ไม่พบบัญชีผู้ใช้งานในระบบ'
    );
    expect(screen.getByText('ghost@ube.co.th')).toBeInTheDocument();
    expect(
      screen.getByText(/ไม่พบข้อมูลบัญชีนี้ในระบบ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่/)
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'ออกจากระบบ' })).toBeInTheDocument();
  });

  it('shows the English copy when the preference is English', () => {
    localStorage.setItem('voiceplatform_lang_preference_v2', 'en');
    renderScreen();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('User account not found');
    expect(screen.getByText('ghost@ube.co.th')).toBeInTheDocument();
    expect(screen.getByText(/was not found in the system\. Please sign out/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
