import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExecStatusSelect } from './executiveShared';
import { LanguageProvider } from '../context/LanguageContext';

const renderSelect = (lang: 'th' | 'en', onChange = vi.fn()) => {
  localStorage.setItem('voiceplatform_lang_preference_v2', lang);
  render(
    <LanguageProvider>
      <ExecStatusSelect value="active" onChange={onChange} />
    </LanguageProvider>
  );
  return onChange;
};

afterEach(() => localStorage.clear());

describe('ExecStatusSelect', () => {
  it('is Thai by default', () => {
    renderSelect('th');

    expect(screen.getByLabelText('สถานะการปฏิบัติหน้าที่ (Account Status)')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /เปิดใช้งาน/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /พักสถานะ/ })).toBeInTheDocument();
  });

  it('is English when the language preference is English', async () => {
    const user = userEvent.setup();
    const onChange = renderSelect('en');

    expect(await screen.findByLabelText('Account Status')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Active - ready for duty' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Account Status'), 'inactive');

    expect(
      screen.getByRole('option', { name: 'Inactive - temporarily suspended' })
    ).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith('inactive');
  });
});
