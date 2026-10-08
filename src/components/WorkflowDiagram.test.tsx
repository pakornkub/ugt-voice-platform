import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowDiagram } from './WorkflowDiagram';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';

function LangToggle() {
  const { toggleLang } = useLanguage();
  return <button onClick={toggleLang}>toggle-lang</button>;
}

const renderManual = () =>
  render(
    <LanguageProvider>
      <WorkflowDiagram onNavigateTab={vi.fn()} />
    </LanguageProvider>
  );

describe('WorkflowDiagram', () => {
  it('switches between the five manual tabs', async () => {
    const user = userEvent.setup();
    renderManual();

    for (const key of ['workflow', 'role_guides', 'sla_matrix', 'pdpa_security', 'faq']) {
      expect(document.getElementById(`manual-tab-${key}`)).toBeInTheDocument();
    }
    await user.click(document.getElementById('manual-tab-faq')!);
    expect(screen.getByPlaceholderText('ค้นหาคำถาม / คีย์เวิร์ด...')).toBeInTheDocument();
  });

  it('renders every manual section without SLA wording in Thai', async () => {
    const user = userEvent.setup();
    renderManual();

    for (const key of ['workflow', 'role_guides', 'sla_matrix', 'pdpa_security', 'faq']) {
      await user.click(document.getElementById(`manual-tab-${key}`)!);
      expect(document.body.textContent).not.toMatch(/SLA/);
    }
  });

  it('switches the manual labels to English', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <WorkflowDiagram onNavigateTab={vi.fn()} />
        <LangToggle />
      </LanguageProvider>
    );

    await user.click(screen.getByText('toggle-lang'));
    expect(document.getElementById('manual-tab-faq')).toHaveTextContent('5. FAQs');
  });

  it('shows an empty state when the FAQ search matches nothing', async () => {
    const user = userEvent.setup();
    renderManual();

    await user.click(document.getElementById('manual-tab-faq')!);
    await user.type(screen.getByPlaceholderText('ค้นหาคำถาม / คีย์เวิร์ด...'), 'zzzz-no-match');
    expect(screen.getByText(/ไม่พบคำถามที่ตรงกับคำค้นหา/)).toBeInTheDocument();
  });
});
