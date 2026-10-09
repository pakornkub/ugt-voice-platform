import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiNotice, AiRecommendation } from './AiPanels';
import { LanguageProvider } from '../../context/LanguageContext';
import { CATEGORY_DEFINITIONS } from '../../mockData';
import type { AICategorySuggestionResult } from '../../services/api';

const THAI = /[฀-๿]/;

const result: AICategorySuggestionResult = {
  suggestedCategory: 'Fraud',
  confidence: 90,
  reasoning: 'reason',
  secondaryCategory: 'Ethics',
  suggestedUrgency: 'High',
  keywords: ['kw'],
};

const renderIn = (lang: 'th' | 'en', ui: React.ReactElement) => {
  localStorage.setItem('voiceplatform_lang_preference_v2', lang);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

afterEach(() => localStorage.clear());

describe('AiRecommendation alternative category chip', () => {
  it('shows the Thai name in Thai and the English name in English', async () => {
    const th = renderIn(
      'th',
      <AiRecommendation result={result} category="HR" onApply={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(
      await screen.findByRole('button', { name: CATEGORY_DEFINITIONS.Ethics.nameTh })
    ).toBeInTheDocument();
    th.unmount();

    renderIn(
      'en',
      <AiRecommendation result={result} category="HR" onApply={vi.fn()} onDismiss={vi.fn()} />
    );
    const chip = await screen.findByRole('button', { name: CATEGORY_DEFINITIONS.Ethics.nameEn });
    expect(chip).toBeInTheDocument();
    expect(screen.getByText('Alternative category:')).toBeInTheDocument();
  });

  it('applies the alternative category on click', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderIn(
      'en',
      <AiRecommendation result={result} category="HR" onApply={onApply} onDismiss={vi.fn()} />
    );

    await user.click(
      await screen.findByRole('button', { name: CATEGORY_DEFINITIONS.Ethics.nameEn })
    );

    expect(onApply).toHaveBeenCalledWith('Ethics');
  });
});

describe('AiNotice sample presets', () => {
  it('lists Thai presets in Thai and passes their Thai text on', async () => {
    const user = userEvent.setup();
    const onUseSample = vi.fn();
    renderIn('th', <AiNotice notice="n" onDismiss={vi.fn()} onUseSample={onUseSample} />);

    await user.click(await screen.findByRole('button', { name: /ตัวอย่าง: เบิกจ่ายสวัสดิการ/ }));

    expect(onUseSample).toHaveBeenCalledWith(
      'ขอปรับปรุงขั้นตอนการเบิกจ่ายค่ารักษาพยาบาลและสิทธิประโยชน์พนักงาน',
      'ต้องการให้มีระบบเบิกจ่ายค่ารักษาพยาบาลออนไลน์และอัปเดตสิทธิประโยชน์ทันเวลา เจ้าหน้าที่เบิกจ่ายล่าช้า'
    );
  });

  it('lists English presets in English and passes their English text on', async () => {
    const user = userEvent.setup();
    const onUseSample = vi.fn();
    renderIn('en', <AiNotice notice="n" onDismiss={vi.fn()} onUseSample={onUseSample} />);

    const presets = await screen.findAllByRole('button', { name: /Example:/ });
    expect(presets).toHaveLength(3);
    for (const preset of presets) expect(preset.textContent).not.toMatch(THAI);

    await user.click(screen.getByRole('button', { name: /Example: Fraud investigation/ }));

    const [title, description] = onUseSample.mock.calls[0];
    expect(title).toBe('Suspected fraudulent behavior and forged procurement documents');
    expect(`${title}${description}`).not.toMatch(THAI);
  });
});
