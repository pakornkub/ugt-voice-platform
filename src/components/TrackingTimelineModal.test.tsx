import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackingTimelineModal } from './TrackingTimelineModal';
import { LanguageProvider } from '../context/LanguageContext';
import { INITIAL_COMPLAINTS } from '../mockData';
import { sendAnonymousChatMessage, updateTicketWorkflow } from '@/lib/actions/tickets';
import { renderWithShell } from '@/test/shell';
import type { ComplaintTicket, UserRole } from '../types';

vi.mock('@/lib/env', () => ({ env: { NEXT_PUBLIC_BASE_PATH: '/ugt-voice-platform' } }));
vi.mock('@/lib/actions/tickets', () => ({
  sendAnonymousChatMessage: vi.fn(),
  updateTicketWorkflow: vi.fn(),
}));

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const directCeoTicket = INITIAL_COMPLAINTS.find((t) => t.isDirectToExecutive) as ComplaintTicket;
const resolvedTicket = INITIAL_COMPLAINTS.find((t) => t.status === 'resolved') as ComplaintTicket;

function renderModal(ticket = directCeoTicket, currentRole: UserRole = 'employee') {
  const props = {
    ticket,
    currentRole,
    onClose: vi.fn(),
    onOpenSatisfactionModal: vi.fn(),
    onTicketUpdated: vi.fn(),
  };
  renderWithShell(
    <LanguageProvider>
      <TrackingTimelineModal {...props} />
    </LanguageProvider>
  );
  return props;
}

describe('TrackingTimelineModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(sendAnonymousChatMessage).mockImplementation(async (id, message, senderRole) => ({
      ...directCeoTicket,
      anonymousMessages: [
        {
          id: 'chat-1',
          ticketId: id,
          senderRole,
          senderDisplayName: 'Anonymous',
          message,
          timestamp: '2026-10-09T00:00:00.000Z',
          isStaff: false,
        },
      ],
    }));
    vi.mocked(updateTicketWorkflow).mockImplementation(async (id, updates) => ({
      ...directCeoTicket,
      timeline: [
        ...directCeoTicket.timeline,
        {
          id: 'tl-note',
          timestamp: '2026-10-09T00:00:00.000Z',
          actor: updates.actorName ?? '',
          actorRole: updates.actorRole ?? 'Employee',
          action: 'note',
          status: directCeoTicket.status,
          notes: updates.actionNote,
        },
      ],
    }));
  });

  it('renders nothing without a ticket', () => {
    const { container } = renderWithShell(
      <LanguageProvider>
        <TrackingTimelineModal
          ticket={null}
          onClose={vi.fn()}
          onOpenSatisfactionModal={vi.fn()}
          onTicketUpdated={vi.fn()}
        />
      </LanguageProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the ticket header with tracking code, urgency badge and the timeline tab by default', () => {
    renderModal();

    expect(screen.getByText(directCeoTicket.trackingCode)).toBeInTheDocument();
    expect(byId('tab-btn-timeline')).not.toBeNull();
    expect(byId('tab-btn-chat')).not.toBeNull();
  });

  it('blocks a gatekeeper without direct-CEO permission with the Access Restricted screen', async () => {
    const user = userEvent.setup();
    const props = renderModal(directCeoTicket, 'gatekeeper');

    expect(screen.getByText('สิทธิ์การเข้าถึงถูกจำกัด (Access Restricted)')).toBeInTheDocument();
    expect(byId('btn-open-investigation-report')).toBeNull();

    await user.click(byId('btn-close-restricted-modal'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('lets an employee send an anonymous Q&A chat message from the chat tab', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(byId('tab-btn-chat'));
    await user.type(byId('input-anonymous-chat'), 'ขอชี้แจงเพิ่มเติม');
    await user.click(byId('btn-send-anonymous-chat'));

    await waitFor(() => expect(props.onTicketUpdated).toHaveBeenCalledTimes(1));
    expect(sendAnonymousChatMessage).toHaveBeenCalledWith(
      directCeoTicket.id,
      'ขอชี้แจงเพิ่มเติม',
      'employee'
    );
    const updated = props.onTicketUpdated.mock.calls[0][0];
    expect(updated.anonymousMessages.at(-1).message).toBe('ขอชี้แจงเพิ่มเติม');
  });

  it('appends an employee follow-up note to the timeline through the Server Action', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความบันทึกลง Timeline...'), 'ขอสอบถาม');
    await user.click(screen.getByRole('button', { name: 'ส่งบันทึก' }));

    await waitFor(() => expect(props.onTicketUpdated).toHaveBeenCalledTimes(1));
    expect(updateTicketWorkflow).toHaveBeenCalledWith(directCeoTicket.id, {
      actorName: directCeoTicket.submitterName,
      actorRole: 'Employee',
      actionNote: 'ขอสอบถาม',
    });
    expect(screen.getByPlaceholderText('พิมพ์ข้อความบันทึกลง Timeline...')).toHaveValue('');
  });

  it('keeps the note when the Server Action fails', async () => {
    const user = userEvent.setup();
    vi.mocked(updateTicketWorkflow).mockRejectedValueOnce(new Error('FORBIDDEN'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const props = renderModal();

    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความบันทึกลง Timeline...'), 'ขอสอบถาม');
    await user.click(screen.getByRole('button', { name: 'ส่งบันทึก' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'ส่งบันทึก' })).toBeEnabled());
    expect(props.onTicketUpdated).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('พิมพ์ข้อความบันทึกลง Timeline...')).toHaveValue('ขอสอบถาม');
  });

  it('opens and closes the printable investigation report from the Report button', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(byId('btn-open-investigation-report'));
    expect(byId('printable-investigation-report')).not.toBeNull();

    await user.click(byId('btn-close-report-modal'));
    expect(byId('printable-investigation-report')).toBeNull();
  });

  it('offers the CSAT trigger for a resolved ticket', async () => {
    const user = userEvent.setup();
    const props = renderModal(resolvedTicket);

    await user.click(byId('btn-open-csat-top'));

    expect(props.onOpenSatisfactionModal).toHaveBeenCalledWith(resolvedTicket);
  });

  describe('submitter card (RBAC confidentiality)', () => {
    const open = { ...directCeoTicket, isDirectToExecutive: false };

    it('shields the login email of an anonymous submitter from roles without permission', () => {
      renderModal({ ...open, confidentiality: 'anonymous' }, 'employee');
      expect(screen.getByText(/ปกปิดตามสิทธิ์/)).toBeInTheDocument();
    });

    it('shows the mapped login email of an anonymous submitter to a permitted role', () => {
      renderModal({ ...open, confidentiality: 'anonymous' }, 'admin');
      expect(screen.getByText(/ได้รับสิทธิ์/)).toBeInTheDocument();
    });

    it('hides a confidential submitter from a gatekeeper without access', () => {
      renderModal({ ...open, confidentiality: 'confidential_restricted' }, 'gatekeeper');
      expect(screen.getByText('Confidential Restricted')).toBeInTheDocument();
      expect(screen.queryByText(open.submitterName as string)).not.toBeInTheDocument();
    });

    it('reveals a confidential submitter to a role with access', () => {
      renderModal({ ...open, confidentiality: 'confidential_restricted' }, 'admin');
      expect(screen.getByText(/สิทธิ์ปลดล็อก/)).toBeInTheDocument();
    });

    it('shows the named submitter for a standard ticket', () => {
      renderModal({ ...open, confidentiality: 'standard_named' }, 'employee');
      expect(screen.getByText('Standard Named')).toBeInTheDocument();
    });
  });

  describe('attachments', () => {
    const attached: ComplaintTicket = {
      ...directCeoTicket,
      attachments: [
        { id: 'att-1', name: 'หลักฐาน.pdf', size: '1.4 MB', type: 'application/pdf' },
        { id: 'att-2', name: 'photo.png', size: '2.0 KB', type: 'image/png' },
      ],
    };

    it('lists the real attachments as links to the guarded download route under the basePath', () => {
      renderModal(attached);

      const first = screen.getByRole('link', { name: /หลักฐาน.pdf/ });
      expect(first).toHaveAttribute('href', '/ugt-voice-platform/api/files/att-1');
      expect(first).toHaveAttribute('download');
      expect(first).toHaveTextContent('(1.4 MB)');
      expect(screen.getByRole('link', { name: /photo.png/ })).toHaveAttribute(
        'href',
        '/ugt-voice-platform/api/files/att-2'
      );
    });

    it('shows no attachment section for a ticket without files', () => {
      renderModal({ ...directCeoTicket, attachments: [] });
      expect(screen.queryByText('เอกสารแนบประกอบ:')).toBeNull();
      expect(screen.queryByRole('link', { name: /.pdf/ })).toBeNull();
    });
  });
});

describe('TrackingTimelineModal — bilingual server text', () => {
  const serverTicket: ComplaintTicket = {
    ...directCeoTicket,
    isDirectToExecutive: false,
    confidentiality: 'standard_named',
    timeline: [
      {
        id: 'tl-auto',
        timestamp: '2026-10-09T00:00:00.000Z',
        actor: 'ระบบจ่ายงานอัตโนมัติ (Auto-Assign)',
        actorRole: 'System',
        action: 'มอบหมายเจ้าหน้าที่ผู้รับผิดชอบอัตโนมัติ: สมหญิง ใจดี',
        status: 'submitted',
        notes: 'ตามรูปแบบการจ่ายงานที่ตั้งค่าไว้ของหมวดหมู่นี้',
      },
      {
        id: 'tl-csat',
        timestamp: '2026-10-09T01:00:00.000Z',
        actor: 'พนักงานผู้แจ้ง',
        actorRole: 'Employee',
        action: 'ประเมินความพึงพอใจ 5 ดาว และปิดเรื่อง (Closed)',
        status: 'closed',
        notes: 'ขอบคุณมากครับ',
      },
    ],
    anonymousMessages: [
      {
        id: 'chat-x',
        ticketId: directCeoTicket.id,
        senderRole: 'employee',
        senderDisplayName: 'ผู้ยื่นเรื่อง (ไม่เปิดเผยตัวตน / Anonymous)',
        message: 'สวัสดีครับ',
        timestamp: '2026-10-09T00:00:00.000Z',
        isStaff: false,
      },
    ],
  };

  const useEnglish = () => localStorage.setItem('voiceplatform_lang_preference_v2', 'en');

  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the stored Thai server text in TH', () => {
    renderModal(serverTicket);

    expect(screen.getByText('ระบบจ่ายงานอัตโนมัติ (Auto-Assign)')).toBeInTheDocument();
    expect(
      screen.getByText('มอบหมายเจ้าหน้าที่ผู้รับผิดชอบอัตโนมัติ: สมหญิง ใจดี')
    ).toBeInTheDocument();
    expect(screen.getByText('ตามรูปแบบการจ่ายงานที่ตั้งค่าไว้ของหมวดหมู่นี้')).toBeInTheDocument();
    expect(screen.getByText('ประเมินความพึงพอใจ 5 ดาว และปิดเรื่อง (Closed)')).toBeInTheDocument();
  });

  it('shows the timeline actor, action and notes in English, keeping names and free text', async () => {
    useEnglish();
    renderModal(serverTicket);

    expect(await screen.findByText('Auto-Assign')).toBeInTheDocument();
    expect(
      screen.getByText('Automatically assigned the responsible officer: สมหญิง ใจดี')
    ).toBeInTheDocument();
    expect(screen.getByText("Per this category's configured assignment mode")).toBeInTheDocument();
    expect(screen.getByText('Reporting employee')).toBeInTheDocument();
    expect(
      screen.getByText('Rated satisfaction 5 stars and closed the ticket')
    ).toBeInTheDocument();
    expect(screen.getByText('ขอบคุณมากครับ')).toBeInTheDocument();
    expect(screen.queryByText('ระบบจ่ายงานอัตโนมัติ (Auto-Assign)')).not.toBeInTheDocument();
  });

  it('shows the chat sender label in English', async () => {
    const user = userEvent.setup();
    useEnglish();
    renderModal(serverTicket);

    await user.click(await screen.findByRole('button', { name: /Anonymous 2-Way Chat/ }));

    expect(screen.getByText('Submitter (Anonymous)')).toBeInTheDocument();
    expect(screen.getByText('สวัสดีครับ')).toBeInTheDocument();
  });

  it('translates the restricted-access screen, its badge and the report title', async () => {
    useEnglish();
    renderModal(directCeoTicket, 'gatekeeper');

    expect(await screen.findByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByText('Whistleblower Escalation Restricted')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/[฀-๿]/);
  });

  it('keeps the TH badge for the restricted-access screen', () => {
    renderModal(directCeoTicket, 'gatekeeper');
    expect(screen.getByText('ช่องทางผู้แจ้งเบาะแสสายตรงถูกจำกัดสิทธิ์')).toBeInTheDocument();
  });

  it('titles the report button in English', async () => {
    useEnglish();
    renderModal(serverTicket);

    await waitFor(() =>
      expect(byId('btn-open-investigation-report')).toHaveAttribute(
        'title',
        'View and print the Official Investigation Report'
      )
    );
  });

  it('shows the protected-submitter label in English', async () => {
    useEnglish();
    renderModal(
      {
        ...serverTicket,
        confidentiality: 'standard_named',
        submitterName: 'ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)',
      },
      'employee'
    );

    expect(await screen.findByText(/Submitter \(anonymous\)/)).toBeInTheDocument();
  });
});
