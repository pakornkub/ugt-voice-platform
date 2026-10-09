import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { LanguageProvider } from '../context/LanguageContext';

const signInSocial = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth-client', () => ({ authClient: { signIn: { social: signInSocial } } }));

const renderForm = (props: React.ComponentProps<typeof LoginForm> = {}) =>
  render(
    <LanguageProvider>
      <LoginForm {...props} />
    </LanguageProvider>
  );

beforeEach(() => {
  localStorage.clear();
  signInSocial.mockReset().mockResolvedValue({ error: null });
});

describe('LoginForm (Thai)', () => {
  it('shows the Thai copy by default', () => {
    renderForm();
    expect(
      screen.getByText('ระบบบันทึกข้อร้องเรียน ข้อเสนอแนะ และติดตามผลเรียลไทม์')
    ).toBeVisible();
    expect(screen.getByText('เข้าสู่ระบบด้วยบัญชีองค์กร (Single Sign-On)')).toBeVisible();
    expect(screen.getByRole('button', { name: 'เข้าสู่ระบบด้วยบัญชีองค์กร (SSO)' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'TH' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the Thai banners', () => {
    const { unmount } = renderForm({ sessionExpired: true });
    expect(screen.getByText('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง')).toBeInTheDocument();
    unmount();
    const second = renderForm({ ssoError: 'account_not_linked' });
    expect(
      screen.getByText('บัญชีนี้ยังไม่ได้เชื่อมโยงกับ SSO กรุณาติดต่อผู้ดูแลระบบ')
    ).toBeInTheDocument();
    second.unmount();
    renderForm({ ssoError: 'weird' });
    expect(screen.getByText('เข้าสู่ระบบไม่สำเร็จ (weird)')).toBeInTheDocument();
  });

  it('shows the busy label while connecting', async () => {
    const user = userEvent.setup();
    signInSocial.mockReturnValue(new Promise(() => undefined));
    renderForm({ from: '/my-tickets' });
    await user.click(screen.getByRole('button', { name: /SSO/ }));
    expect(await screen.findByText('กำลังเชื่อมต่อ Keycloak...')).toBeInTheDocument();
    expect(signInSocial).toHaveBeenCalledWith({ provider: 'keycloak', callbackURL: '/my-tickets' });
  });
});

describe('LoginForm (English)', () => {
  beforeEach(() => localStorage.setItem('voiceplatform_lang_preference_v2', 'en'));

  it('shows the English copy when the preference is English', () => {
    renderForm();
    expect(screen.getByText('Grievance, suggestion and real-time tracking system')).toBeVisible();
    expect(screen.getByText('Sign in with your company account (Single Sign-On)')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Sign in with company account (SSO)' })
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the English banners', () => {
    const { unmount } = renderForm({ sessionExpired: true });
    expect(screen.getByText('Your session has expired. Please sign in again.')).toBeInTheDocument();
    unmount();
    const second = renderForm({ ssoError: 'unable_to_create_user' });
    expect(
      screen.getByText(/Could not create a user account from the SSO data/)
    ).toBeInTheDocument();
    second.unmount();
    renderForm({ ssoError: 'weird' });
    expect(screen.getByText('Sign-in failed (weird)')).toBeInTheDocument();
  });

  it('shows the busy label while connecting', async () => {
    const user = userEvent.setup();
    signInSocial.mockReturnValue(new Promise(() => undefined));
    renderForm();
    await user.click(screen.getByRole('button', { name: /SSO/ }));
    expect(await screen.findByText('Connecting to Keycloak...')).toBeInTheDocument();
  });
});

describe('LoginForm language switch', () => {
  it('lets a first-time visitor switch to English and back before signing in', async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByText('เข้าสู่ระบบด้วยบัญชีองค์กร (Single Sign-On)')).toBeVisible();

    await user.click(document.getElementById('btn-login-lang-en') as HTMLElement);
    expect(screen.getByText('Sign in with your company account (Single Sign-On)')).toBeVisible();
    expect(document.getElementById('btn-login-lang-en')).toHaveAttribute('aria-pressed', 'true');
    expect(document.getElementById('btn-login-lang-th')).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('voiceplatform_lang_preference_v2')).toBe('en');

    await user.click(document.getElementById('btn-login-lang-th') as HTMLElement);
    await waitFor(() =>
      expect(screen.getByText('เข้าสู่ระบบด้วยบัญชีองค์กร (Single Sign-On)')).toBeVisible()
    );
    expect(localStorage.getItem('voiceplatform_lang_preference_v2')).toBe('th');
  });

  it('keeps a banner in step with the language', async () => {
    const user = userEvent.setup();
    renderForm({ sessionExpired: true });
    expect(screen.getByText('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง')).toBeInTheDocument();
    await user.click(document.getElementById('btn-login-lang-en') as HTMLElement);
    expect(screen.getByText('Your session has expired. Please sign in again.')).toBeInTheDocument();
  });
});
