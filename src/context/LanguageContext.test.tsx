import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider, useLanguage } from './LanguageContext';

function Probe() {
  const { lang, setLang } = useLanguage();
  return (
    <button type="button" onClick={() => setLang(lang === 'th' ? 'en' : 'th')}>
      {lang}
    </button>
  );
}

describe('LanguageProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'th';
  });

  it('keeps <html lang> on th by default', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(document.documentElement.lang).toBe('th');
  });

  it('restores the stored language into <html lang>', async () => {
    localStorage.setItem('voiceplatform_lang_preference_v2', 'en');
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    expect(await screen.findByRole('button', { name: 'en' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('updates <html lang> when the language is switched', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );
    await user.click(screen.getByRole('button', { name: 'th' }));
    expect(document.documentElement.lang).toBe('en');
    await user.click(screen.getByRole('button', { name: 'en' }));
    expect(document.documentElement.lang).toBe('th');
  });
});
