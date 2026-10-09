import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import HrNameField from './HrNameField';
import { LanguageProvider } from '../context/LanguageContext';
import type { EmployeeRecord } from '../types';

const emp: EmployeeRecord = {
  employeeId: '01234',
  nameTh: 'ปกรณ์ ว.',
  nameEn: 'Pakorn W.',
  loginEmail: 'pakornwo@ube.co.th',
  department: 'ไอที',
  position: 'Developer',
  phone: '',
  status: 'active',
};

function Harness({
  search,
  onPick,
}: {
  search: () => Promise<EmployeeRecord[]>;
  onPick: () => void;
}) {
  const [value, setValue] = useState('');
  return <HrNameField id="n" value={value} onChange={setValue} onPick={onPick} search={search} />;
}

describe('HrNameField', () => {
  it('offers HR matches while typing and fills the form on pick', async () => {
    const search = vi.fn().mockResolvedValue([emp]);
    const onPick = vi.fn();
    render(
      <LanguageProvider>
        <Harness search={search} onPick={onPick} />
      </LanguageProvider>
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ปก' } });
    fireEvent.click(await screen.findByRole('button', { name: /ปกรณ์ ว\./ }, { timeout: 5000 }));
    expect(search).toHaveBeenCalledWith('ปก');
    expect(onPick).toHaveBeenCalledWith(emp);
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('stays a plain input for short queries and when the HR view fails', async () => {
    const search = vi.fn().mockRejectedValue(new Error('down'));
    render(
      <LanguageProvider>
        <Harness search={search} onPick={vi.fn()} />
      </LanguageProvider>
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'x' } });
    expect(search).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'outsider' } });
    await waitFor(() => expect(search).toHaveBeenCalledWith('outsider'));
    expect(screen.queryByRole('list')).toBeNull();
    expect(input).toHaveValue('outsider');
  });
});
