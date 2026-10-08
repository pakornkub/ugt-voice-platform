import React from 'react';
import { Database as DatabaseIcon, FileCode, FileSpreadsheet } from 'lucide-react';
import { SelectedMark } from './SelectedMark';
import type { ExportFileFormat } from './types';

interface FormatOption {
  id: ExportFileFormat;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  selectedLabel: string;
}

const FORMAT_OPTIONS: readonly FormatOption[] = [
  {
    id: 'sqlite',
    icon: <DatabaseIcon className="h-5 w-5 text-emerald-600" />,
    title: 'SQLite Database (.sqlite)',
    description: (
      <>
        ไฟล์ฐานข้อมูล Binary สมบูรณ์ เปิดด้วย{' '}
        <strong>DB Browser for SQLite, DBeaver, TablePlus</strong> หรือ Python sqlite3 ได้ 100%
      </>
    ),
    selectedLabel: 'เลือกอยู่ (แนะนำ)',
  },
  {
    id: 'csv',
    icon: <FileSpreadsheet className="h-5 w-5 text-emerald-600" />,
    title: 'Excel CSV (UTF-8 BOM)',
    description: 'ตาราง 38 มิติข้อมูล เปิดใน Microsoft Excel, Google Sheets ภาษาไทยสระไม่เพี้ยน',
    selectedLabel: 'เลือกอยู่',
  },
  {
    id: 'json',
    icon: <FileCode className="h-5 w-5 text-indigo-600" />,
    title: 'JSON Document',
    description: 'โครงสร้าง JSON พร้อม Metadata เหมาะสำหรับต่อ API Pipeline หรือ Python Pandas',
    selectedLabel: 'เลือกอยู่',
  },
];

const CARD_BASE = 'flex flex-col justify-between rounded-xl border p-3.5 text-left transition';
const CARD_SELECTED =
  'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20';
const CARD_IDLE = 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';

interface FormatSelectorProps {
  selected: ExportFileFormat;
  onSelect: (format: ExportFileFormat) => void;
}

export const FormatSelector: React.FC<Readonly<FormatSelectorProps>> = ({ selected, onSelect }) => (
  <div role="group" aria-labelledby="export-format-heading">
    <p
      id="export-format-heading"
      className="mb-2 block text-xs font-bold tracking-wider text-slate-700 uppercase"
    >
      1. เลือกรูปแบบไฟล์ที่ต้องการดาวน์โหลด (File Format)
    </p>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {FORMAT_OPTIONS.map((option) => {
        const isSelected = selected === option.id;
        return (
          <button
            key={option.id}
            type="button"
            id={`format-select-${option.id}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(option.id)}
            className={`${CARD_BASE} ${isSelected ? CARD_SELECTED : CARD_IDLE}`}
          >
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                {option.icon}
                <span className="text-xs font-bold">{option.title}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">{option.description}</p>
            </div>
            {isSelected && (
              <SelectedMark iconClassName="h-3.5 w-3.5" label={option.selectedLabel} />
            )}
          </button>
        );
      })}
    </div>
  </div>
);
