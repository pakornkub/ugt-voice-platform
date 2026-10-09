import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DevEnvironmentBar } from './DevEnvironmentBar';
import { LanguageProvider } from '../context/LanguageContext';

const renderBar = () =>
  render(
    <LanguageProvider>
      <DevEnvironmentBar />
    </LanguageProvider>
  );

beforeEach(() => localStorage.clear());

describe('DevEnvironmentBar', () => {
  it('says in Thai that this is the test environment', () => {
    renderBar();
    expect(screen.getByRole('status')).toHaveTextContent('สภาพแวดล้อมทดสอบ (DEV)');
  });

  it('switches to English with the language preference', () => {
    localStorage.setItem('voiceplatform_lang_preference_v2', 'en');
    renderBar();
    expect(screen.getByRole('status')).toHaveTextContent('DEV environment');
  });
});
