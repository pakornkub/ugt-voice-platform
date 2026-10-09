import React from 'react';
import type { Bilingual, PresetType } from './constants';
import { useTr } from './useTr';

const PRESET_CHIPS: {
  preset: PresetType;
  id: string;
  className: string;
  label: Bilingual;
}[] = [
  {
    preset: 'quality_issue',
    id: 'preset-quality-issue',
    className:
      'flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-sky-800 transition hover:bg-sky-100',
    label: { en: '🔍 QC Standard (Quality)', th: '🔍 มาตรฐานชิ้นงาน QC (Quality)' },
  },
  {
    preset: 'compliance_alert',
    id: 'preset-compliance-alert',
    className:
      'flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-indigo-800 transition hover:bg-indigo-100',
    label: { en: '📋 PDPA Breach (Compliance)', th: '📋 ฝ่าฝืน PDPA (Compliance)' },
  },
  {
    preset: 'welfare_idea',
    id: 'preset-welfare-idea',
    className:
      'flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-emerald-800 transition hover:bg-emerald-100',
    label: { en: '💡 Welfare Idea (HR)', th: '💡 เสนอสวัสดิการ (HR)' },
  },
  {
    preset: 'fraud_alert',
    id: 'preset-fraud-alert',
    className:
      'flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-red-800 transition hover:bg-red-100',
    label: { en: '🚨 Fraud Alert (Fraud)', th: '🚨 แจ้งทุจริต (Fraud)' },
  },
];

/** Page title, the quick sample chips and the intro line. */
export const SubmitHeader: React.FC<Readonly<{ onPreset: (preset: PresetType) => void }>> = ({
  onPreset,
}) => {
  const { lang, tr } = useTr();
  return (
    <div className="mb-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          {tr('Submit Grievance / Suggestion', 'ยื่นข้อร้องเรียน / ข้อเสนอแนะพนักงาน')}
        </h1>

        {/* Quick preset chips */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] font-medium whitespace-nowrap text-slate-500">
            {tr('Quick Samples:', 'ตัวอย่างด่วน:')}
          </span>
          {PRESET_CHIPS.map((chip) => (
            <button
              key={chip.preset}
              type="button"
              id={chip.id}
              onClick={() => onPreset(chip.preset)}
              className={chip.className}
            >
              <span>{chip.label[lang]}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-600 sm:text-sm">
        {tr(
          'Centralized whistleblowing & grievance management portal for fair, transparent employee voices with confidential protection and real-time tracking.',
          'ช่องทางกลางสำหรับรับฟังเสียงพนักงานอย่างเป็นธรรม โปร่งใส พร้อมระบบรักษาความลับและติดตามสถานะแบบเรียลไทม์'
        )}
      </p>
    </div>
  );
};
