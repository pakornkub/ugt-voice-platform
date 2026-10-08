import React from 'react';
import { Filter } from 'lucide-react';
import { CATEGORY_DEFINITIONS } from '../../mockData';
import type { GrievanceCategory } from '../../types';
import type { ExportFilters } from './types';

interface Option {
  value: string;
  label: string;
}

const CATEGORY_OPTIONS: readonly Option[] = [
  { value: 'ALL', label: 'ทุกหน่วยงาน (All Categories)' },
  ...Object.keys(CATEGORY_DEFINITIONS).map((cat) => ({
    value: cat,
    label: `${cat} - ${CATEGORY_DEFINITIONS[cat as GrievanceCategory]?.nameTh.split('(')[0].trim()}`,
  })),
];

const STATUS_OPTIONS: readonly Option[] = [
  { value: 'ALL', label: 'ทุกสถานะ (All Statuses)' },
  { value: 'submitted', label: 'ยื่นเรื่องใหม่' },
  { value: 'gatekeeper_triaged', label: 'รับเรื่องแล้ว (Triaged)' },
  { value: 'in_progress', label: 'กำลังแก้ไข (In Progress)' },
  { value: 'resolved', label: 'แก้ไขเสร็จสิ้น (Resolved)' },
  { value: 'closed', label: 'ปิดเรื่องแล้ว (Closed)' },
];

const TIME_RANGE_OPTIONS: readonly Option[] = [
  { value: 'ALL', label: 'ข้อมูลทั้งหมดในระบบ' },
  { value: '7d', label: '7 วันล่าสุด' },
  { value: '30d', label: '30 วันล่าสุด (เดือนปัจจุบัน)' },
  { value: '90d', label: '90 วันล่าสุด (ไตรมาสล่าสุด)' },
];

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

export const FilterPanel: React.FC<Readonly<FilterPanelProps>> = ({ filters, onChange }) => (
  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-700 uppercase">
      <Filter className="h-3.5 w-3.5 text-slate-500" />
      <span>3. กรองข้อมูลเฉพาะส่วนที่ต้องการวิเคราะห์ (Filters)</span>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <FilterSelect
        id="export-filter-dept"
        label="หน่วยงาน / หมวดหมู่"
        value={filters.department}
        options={CATEGORY_OPTIONS}
        onChange={(v) => onChange('department', v)}
      />
      <FilterSelect
        id="export-filter-status"
        label="สถานะการดำเนินงาน"
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(v) => onChange('status', v)}
      />
      <FilterSelect
        id="export-filter-timerange"
        label="ช่วงเวลาที่ยื่นเรื่อง"
        value={filters.timeRange}
        options={TIME_RANGE_OPTIONS}
        onChange={(v) => onChange('timeRange', v)}
      />
    </div>
  </div>
);
