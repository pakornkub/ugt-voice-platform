import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../context/LanguageContext';
import { INITIAL_COMPLAINTS } from '../mockData';

const portal = vi.hoisted(() => ({
  openPublicTicket: vi.fn(),
  getPublicTicket: vi.fn(),
  leavePublicTicket: vi.fn(),
}));
const tickets = vi.hoisted(() => ({ submitTicket: vi.fn(), submitPublicTicket: vi.fn() }));
const push = vi.hoisted(() => vi.fn());
vi.mock('@/lib/actions/public-tickets', () => portal);
vi.mock('@/lib/actions/tickets', () => ({
  ...tickets,
  updateTicketWorkflow: vi.fn(),
  sendAnonymousChatMessage: vi.fn(),
  submitEvaluation: vi.fn(),
}));
vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_BASE_PATH: '' } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  unstable_isUnrecognizedActionError: () => false,
}));

const { PortalHeader, PortalReport, PortalTrack } = await import('./PublicPortal');

const inPortal = (node: React.ReactNode) => render(<LanguageProvider>{node}</LanguageProvider>);
const TICKET = { ...INITIAL_COMPLAINTS[0], trackingCode: 'TK-2026-0012' };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  portal.leavePublicTicket.mockResolvedValue(undefined);
});

describe('PortalHeader', () => {
  it('links the two portal pages and the staff sign-in', () => {
    inPortal(<PortalHeader active="track" />);
    expect(screen.getByRole('link', { name: 'ยื่นเรื่อง' })).toHaveAttribute('href', '/report');
    expect(screen.getByRole('link', { name: 'ติดตามเรื่อง' })).toHaveAttribute('href', '/track');
    expect(screen.getByRole('link', { name: /เข้าสู่ระบบเจ้าหน้าที่/ })).toHaveAttribute(
      'href',
      '/login'
    );
  });
});

describe('PortalReport', () => {
  it('asks for every identity field by hand — no directory pick, no AI, no sample chips', () => {
    inPortal(<PortalReport />);
    expect(screen.getByLabelText(/ชื่อ-นามสกุล/)).toHaveValue('');
    expect(screen.getByLabelText(/รหัสพนักงาน/)).toHaveValue('');
    expect(screen.getByLabelText(/เบอร์โทร/)).not.toBeRequired();
    expect(screen.queryByText(/เลือกข้อมูลจากฐานข้อมูลพนักงาน/)).toBeNull();
    expect(screen.queryByRole('button', { name: /AI/ })).toBeNull();
    expect(screen.queryByText('ตัวอย่างด่วน:')).toBeNull();
  });

  it('explains what anonymous means on the portal', async () => {
    inPortal(<PortalReport />);
    await userEvent.click(screen.getByRole('button', { name: /ไม่ระบุตัวตน \(Anonymous\)/ }));
    expect(screen.getByText(/ไม่เก็บข้อมูลที่ระบุตัวคุณได้เลย/)).toBeVisible();
  });
});

describe('PortalTrack', () => {
  const fill = async (code: string, secret: string) => {
    if (code) await userEvent.type(screen.getByPlaceholderText('TK-2026-0012'), code);
    if (secret) await userEvent.type(screen.getByPlaceholderText('K7QM-4XPA'), secret);
    await userEvent.click(screen.getByRole('button', { name: 'ดูสถานะ' }));
  };

  it('needs both the code and the secret before asking the server', async () => {
    inPortal(<PortalTrack initialTicket={null} />);
    await fill('TK-2026-0012', '');
    expect(screen.getByRole('alert')).toHaveTextContent('กรอกเลขที่เรื่องและรหัสลับก่อน');
    expect(portal.openPublicTicket).not.toHaveBeenCalled();
  });

  it('says only "incorrect" for a wrong code or secret, and "wait" when rate limited', async () => {
    portal.openPublicTicket.mockResolvedValueOnce({ ok: false, error: 'NOT_FOUND' });
    inPortal(<PortalTrack initialTicket={null} />);
    await fill('TK-2026-0012', 'AAAA-BBBB');
    expect(await screen.findByRole('alert')).toHaveTextContent('เลขที่เรื่องหรือรหัสลับไม่ถูกต้อง');

    portal.openPublicTicket.mockResolvedValueOnce({ ok: false, error: 'RATE_LIMITED' });
    await userEvent.click(screen.getByRole('button', { name: 'ดูสถานะ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('กรุณารอ 15 นาที');
  });

  it('opens the ticket with the right pair and forgets it on close', async () => {
    portal.openPublicTicket.mockResolvedValueOnce({ ok: true, ticket: TICKET });
    inPortal(<PortalTrack initialTicket={null} />);
    await fill('TK-2026-0012', 'K7QM-4XPA');

    expect(portal.openPublicTicket).toHaveBeenCalledWith('TK-2026-0012', 'K7QM-4XPA');
    expect(await screen.findAllByText('TK-2026-0012')).not.toHaveLength(0);
    expect(screen.getByPlaceholderText('K7QM-4XPA')).toHaveValue(''); // secret not kept on screen

    const close = document.getElementById('btn-close-tracking-modal');
    if (!close) throw new Error('tracking modal not shown');
    await userEvent.click(close);
    await waitFor(() => expect(portal.leavePublicTicket).toHaveBeenCalled());
  });

  it('lists codes filed from this browser (never the secret) and fills them in', async () => {
    localStorage.setItem('voiceplatform_portal_codes', JSON.stringify(['TK-2026-0007']));
    inPortal(<PortalTrack initialTicket={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'TK-2026-0007' }));
    expect(screen.getByPlaceholderText('TK-2026-0012')).toHaveValue('TK-2026-0007');
  });
});
