import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminSetupForm } from './AdminSetupForm';
import { LanguageProvider } from '../context/LanguageContext';
import { initializeAdminAction } from '@/lib/actions/admin-setup';

vi.mock('@/lib/actions/admin-setup', () => ({ initializeAdminAction: vi.fn() }));

const renderForm = () =>
  render(
    <LanguageProvider>
      <AdminSetupForm />
    </LanguageProvider>
  );

beforeEach(() => {
  localStorage.clear();
  vi.mocked(initializeAdminAction).mockReset().mockResolvedValue(undefined);
});

describe('AdminSetupForm (Thai)', () => {
  it('shows the Thai copy by default', () => {
    renderForm();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ตั้งค่าผู้ดูแลระบบคนแรก');
    expect(screen.getByText(/ยังไม่มีผู้ดูแลระบบ \(Administrator\) ในระบบนี้/)).toBeInTheDocument();
    expect(screen.getByText(/กดปุ่มด้านล่างเพื่อกำหนดให้บัญชีของคุณ/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ตั้งค่าเป็นผู้ดูแลระบบ' })).toBeEnabled();
  });

  it.each([
    ['UNAUTHORIZED', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'],
    ['ALREADY_INITIALIZED', 'ระบบมีผู้ดูแลระบบแล้ว'],
    ['SOMETHING', 'ตั้งค่าไม่สำเร็จ (SOMETHING)'],
  ])('shows the Thai message for %s', async (code, message) => {
    const user = userEvent.setup();
    vi.mocked(initializeAdminAction).mockResolvedValue({ code } as never);
    renderForm();
    await user.click(screen.getByRole('button', { name: 'ตั้งค่าเป็นผู้ดูแลระบบ' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });
});

describe('AdminSetupForm (English)', () => {
  beforeEach(() => localStorage.setItem('voiceplatform_lang_preference_v2', 'en'));

  it('shows the English copy when the preference is English', () => {
    renderForm();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Set up the first administrator'
    );
    expect(screen.getByText(/There is no administrator in this system yet\./)).toBeInTheDocument();
    expect(screen.getByText(/Press the button below to make your account/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set up as administrator' })).toBeEnabled();
  });

  it.each([
    ['UNAUTHORIZED', 'Your session has expired. Please sign in again.'],
    ['ALREADY_INITIALIZED', 'This system already has an administrator.'],
    ['SOMETHING', 'Setup failed (SOMETHING)'],
  ])('shows the English message for %s', async (code, message) => {
    const user = userEvent.setup();
    vi.mocked(initializeAdminAction).mockResolvedValue({ code } as never);
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Set up as administrator' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('shows the busy label while setting up', async () => {
    const user = userEvent.setup();
    vi.mocked(initializeAdminAction).mockReturnValue(new Promise(() => undefined));
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Set up as administrator' }));
    expect(await screen.findByText('Setting up...')).toBeInTheDocument();
  });
});

describe('AdminSetupForm language switch', () => {
  it('lets a first-time visitor switch the language, and a shown error follows it', async () => {
    const user = userEvent.setup();
    vi.mocked(initializeAdminAction).mockResolvedValue({ code: 'ALREADY_INITIALIZED' } as never);
    renderForm();
    await user.click(screen.getByRole('button', { name: 'ตั้งค่าเป็นผู้ดูแลระบบ' }));
    expect(await screen.findByText('ระบบมีผู้ดูแลระบบแล้ว')).toBeInTheDocument();

    await user.click(document.getElementById('btn-setup-lang-en') as HTMLElement);
    expect(screen.getByText('This system already has an administrator.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Set up the first administrator'
    );
    expect(localStorage.getItem('voiceplatform_lang_preference_v2')).toBe('en');
  });
});
