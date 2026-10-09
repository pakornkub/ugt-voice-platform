import React from 'react';
import { Filter } from 'lucide-react';
import { CATEGORY_DEFINITIONS } from '../../mockData';
import { useTr } from '../../context/useTr';
import type { Language } from '../../context/LanguageContext';
import type { GrievanceCategory } from '../../types';
import type { ExportFilters } from './types';

interface Option {
  value: string;
  label: string;
}

interface BilingualOption {
  value: string;
  th: string;
  en: string;
}

const categoryLabel = (cat: string, lang: Language) => {
  const info = CATEGORY_DEFINITIONS[cat as GrievanceCategory];
  const name = lang === 'en' ? info?.nameEn : info?.nameTh;
  return `${cat} - ${name?.split('(')[0].trim()}`;
};

const buildCategoryOptions = (lang: Language): readonly Option[] => [
  {
    value: 'ALL',
    label: lang === 'en' ? 'All Categories' : 'ทุกหน่วยงาน (All Categories)',
  },
  ...Object.keys(CATEGORY_DEFINITIONS).map((cat) => ({
    value: cat,
    label: categoryLabel(cat, lang),
  })),
];

const STATUS_OPTIONS: readonly BilingualOption[] = [
  { value: 'ALL', th: 'ทุกสถานะ (All Statuses)', en: 'All Statuses' },
  { value: 'submitted', th: 'ยื่นเรื่องใหม่', en: 'Newly submitted' },
  { value: 'gatekeeper_triaged', th: 'รับเรื่องแล้ว (Triaged)', en: 'Triaged' },
  { value: 'in_progress', th: 'กำลังแก้ไข (In Progress)', en: 'In Progress' },
  { value: 'resolved', th: 'แก้ไขเสร็จสิ้น (Resolved)', en: 'Resolved' },
  { value: 'closed', th: 'ปิดเรื่องแล้ว (Closed)', en: 'Closed' },
];

const TIME_RANGE_OPTIONS: readonly BilingualOption[] = [
  { value: 'ALL', th: 'ข้อมูลทั้งหมดในระบบ', en: 'All data in the system' },
  { value: '7d', th: '7 วันล่าสุด', en: 'Last 7 days' },
  { value: '30d', th: '30 วันล่าสุด (เดือนปัจจุบัน)', en: 'Last 30 days (current month)' },
  { value: '90d', th: '90 วันล่าสุด (ไตรมาสล่าสุด)', en: 'Last 90 days (latest quarter)' },
];

const localizeOptions = (options: readonly BilingualOption[], lang: Language): Option[] =>
  options.map((opt) => ({ value: opt.value, label: opt[lang] }));

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
}

const FilterSelect: React.FC<Readonly<FilterSelectProps>> = ({
  id,
  label,
  value,
  options,
  onChange,
}) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-[11px] font-medium text-slate-600">
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

interface FilterPanelProps {
  filters: ExportFilters;
  onChange: (key: keyof ExportFilters, value: string) => void;
}

export const FilterPanel: React.FC<Readonly<FilterPanelProps>> = ({ filters, onChange }) => {
  const { tr, lang } = useTr();
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase">
        <Filter className="h-3.5 w-3.5 text-slate-500" />
        <span>
          {tr(
            '3. Filter the data you want to analyze (Filters)',
            '3. กรองข้อมูลเฉพาะส่วนที่ต้องการวิเคราะห์ (Filters)'
          )}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FilterSelect
          id="export-filter-dept"
          label={tr('Department / Category', 'หน่วยงาน / หมวดหมู่')}
          value={filters.department}
          options={buildCategoryOptions(lang)}
          onChange={(v) => onChange('department', v)}
        />
        <FilterSelect
          id="export-filter-status"
          label={tr('Processing status', 'สถานะการดำเนินงาน')}
          value={filters.status}
          options={localizeOptions(STATUS_OPTIONS, lang)}
          onChange={(v) => onChange('status', v)}
        />
        <FilterSelect
          id="export-filter-timerange"
          label={tr('Submission period', 'ช่วงเวลาที่ยื่นเรื่อง')}
          value={filters.timeRange}
          options={localizeOptions(TIME_RANGE_OPTIONS, lang)}
          onChange={(v) => onChange('timeRange', v)}
        />
      </div>
    </div>
  );
};
