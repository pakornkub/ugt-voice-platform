import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoginHero } from './LoginHero';
import { LanguageProvider } from '../../context/LanguageContext';

const renderHero = () =>
  render(
    <LanguageProvider>
      <LoginHero />
    </LanguageProvider>
  );

beforeEach(() => localStorage.clear());

describe('LoginHero', () => {
  it('shows the image and the Thai pitch with its three points', () => {
    renderHero();
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'พนักงานกำลังพูดคุยกันภายใต้โล่ปกป้อง');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'ทุกเสียงของพนักงาน ได้รับการรับฟังอย่างปลอดภัย'
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('switches the copy to English', () => {
    localStorage.setItem('voiceplatform_lang_preference_v2', 'en');
    renderHero();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Every employee voice, heard safely'
    );
    expect(screen.getByText(/PDPA-protected/)).toBeInTheDocument();
  });
});
