import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog, ConfirmOptions, useConfirmDialog } from './ConfirmDialog';
import { LanguageProvider } from '../context/LanguageContext';

// userEvent-heavy tests: stay green on loaded CI agents / dev machines.
vi.setConfig({ testTimeout: 20000 });

const baseOptions: ConfirmOptions = {
  title: 'ลบรายการ',
  message: 'ต้องการลบรายการนี้ใช่หรือไม่?',
  onConfirm: vi.fn(),
};

const renderDialog = (options: Partial<ConfirmOptions> = {}, onClose = vi.fn()) => {
  render(
    <LanguageProvider>
      <ConfirmDialog dialog={{ ...baseOptions, ...options }} onClose={onClose} />
    </LanguageProvider>
  );
  return onClose;
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('ConfirmDialog', () => {
  it('renders nothing when there is no dialog', () => {
    render(
      <LanguageProvider>
        <ConfirmDialog dialog={null} onClose={vi.fn()} />
      </LanguageProvider>
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('describes the dialog with its message and focuses the safe (cancel) button', () => {
    renderDialog();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleDescription('ต้องการลบรายการนี้ใช่หรือไม่?');
    expect(within(dialog).getByRole('button', { name: 'ยกเลิก' })).toHaveFocus();
  });

  it('closes from the X button, the cancel button and Escape', async () => {
    const user = userEvent.setup();
    const onClose = renderDialog();

    await user.click(screen.getByRole('button', { name: 'ปิด' }));
    await user.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('shows the trash icon only for destructive confirmations', () => {
    const { unmount } = render(
      <LanguageProvider>
        <ConfirmDialog
          dialog={{ ...baseOptions, isDestructive: true, confirmLabel: 'ลบ' }}
          onClose={vi.fn()}
        />
      </LanguageProvider>
    );
    expect(screen.getByRole('button', { name: 'ลบ' }).querySelector('svg')).not.toBeNull();
    unmount();

    renderDialog({ confirmLabel: 'ตกลง' });
    expect(screen.getByRole('button', { name: 'ตกลง' }).querySelector('svg')).toBeNull();
  });

  it('uses English default labels when the language is en', () => {
    localStorage.setItem('voicecare_lang_preference_v2', 'en');
    renderDialog();
    return screen
      .findByRole('button', { name: 'Confirm' })
      .then(() => expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument());
  });
});

describe('useConfirmDialog', () => {
  const Harness = ({ onConfirm }: Readonly<{ onConfirm: () => void }>) => {
    const { askConfirm, confirmDialog } = useConfirmDialog();
    return (
      <>
        <button
          type="button"
          onClick={() => askConfirm({ title: 'ยืนยัน', message: 'แน่ใจไหม', onConfirm })}
        >
          open
        </button>
        {confirmDialog}
      </>
    );
  };

  it('runs onConfirm, closes the dialog and returns focus to the opener', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <LanguageProvider>
        <Harness onConfirm={onConfirm} />
      </LanguageProvider>
    );

    const opener = screen.getByRole('button', { name: 'open' });
    await user.click(opener);
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ยืนยัน' })
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('does not run onConfirm when dismissed with Escape', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <LanguageProvider>
        <Harness onConfirm={onConfirm} />
      </LanguageProvider>
    );

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.keyboard('{Escape}');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
