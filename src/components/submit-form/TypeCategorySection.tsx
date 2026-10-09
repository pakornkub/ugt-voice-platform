import React from 'react';
import { ChevronDown, Lightbulb, ShieldAlert, Sparkles } from 'lucide-react';
import type { GrievanceCategory, SubmissionType } from '../../types';
import { CATEGORY_DEFINITIONS } from '../../mockData';
import type { Bilingual } from './constants';
import { CategoryIcon } from './CategoryIcon';
import { useTr } from './useTr';

const TYPE_OPTIONS: {
  value: SubmissionType;
  id: string;
  Icon: React.ElementType;
  selectedClass: string;
  selectedIconClass: string;
  title: Bilingual;
  subtitle: string;
}[] = [
  {
    value: 'complaint',
    id: 'type-complaint',
    Icon: ShieldAlert,
    selectedClass: 'border-rose-300 bg-rose-50 text-rose-950 shadow-xs ring-2 ring-rose-500/20',
    selectedIconClass: 'bg-rose-500 text-white',
    title: { en: 'Grievance', th: 'ข้อร้องเรียน' },
    subtitle: 'Grievance & Issue',
  },
  {
    value: 'suggestion',
    id: 'type-suggestion',
    Icon: Lightbulb,
    selectedClass:
      'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20',
    selectedIconClass: 'bg-emerald-600 text-white',
    title: { en: 'Suggestion', th: 'ข้อเสนอแนะ' },
    subtitle: 'Suggestion & Idea',
  },
];

const TypeButton: React.FC<
  Readonly<{
    option: (typeof TYPE_OPTIONS)[number];
    isSelected: boolean;
    onSelect: (value: SubmissionType) => void;
  }>
> = ({ option, isSelected, onSelect }) => {
  const { lang } = useTr();
  const { Icon } = option;
  return (
    <button
      type="button"
      id={option.id}
      onClick={() => onSelect(option.value)}
      className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
        isSelected
          ? option.selectedClass
          : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
      }`}
    >
      <div
        className={`shrink-0 rounded-lg p-1.5 ${isSelected ? option.selectedIconClass : 'bg-slate-200 text-slate-600'}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-bold">{option.title[lang]}</div>
        <div className="truncate text-[10px] text-slate-500">{option.subtitle}</div>
      </div>
    </button>
  );
};

/** Step 1: grievance or suggestion. */
const SubmissionTypeCard: React.FC<
  Readonly<{ submissionType: SubmissionType; onChange: (value: SubmissionType) => void }>
> = ({ submissionType, onChange }) => {
  const { tr } = useTr();
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
            {tr('1. Submission Type', '1. ประเภทข้อมูล (Type)')}
          </span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {submissionType === 'complaint'
              ? tr('Grievance', 'ข้อร้องเรียน')
              : tr('Suggestion', 'ข้อเสนอแนะ')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((option) => (
            <TypeButton
              key={option.value}
              option={option}
              isSelected={submissionType === option.value}
              onSelect={onChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const CATEGORY_KEYS = Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[];

/** Step 2: category dropdown plus the scope blurb of the selected category. */
const CategoryCard: React.FC<
  Readonly<{
    category: GrievanceCategory;
    aiApplied: boolean;
    onChange: (value: GrievanceCategory) => void;
  }>
> = ({ category, aiApplied, onChange }) => {
  const { lang, tr } = useTr();
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="select-grievance-category"
              className="block text-xs font-bold tracking-wider text-slate-700 uppercase"
            >
              {tr('2. Select Category', '2. เลือกหมวดหมู่ (Select Category)')}
            </label>
            {aiApplied && (
              <span className="flex animate-pulse items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                {tr('AI Applied', 'AI เลือกให้แล้ว')}
              </span>
            )}
          </div>
          <span className="shrink-0 rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-indigo-700">
            {tr('6 Standard Categories', '6 หมวดหมู่มาตรฐาน')}
          </span>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-indigo-600">
            <CategoryIcon category={category} />
          </div>
          <select
            id="select-grievance-category"
            value={category}
            onChange={(e) => onChange(e.target.value as GrievanceCategory)}
            className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-8 pl-9 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-100/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {CATEGORY_KEYS.map((catKey) => (
              <option key={catKey} value={catKey}>
                {lang === 'en'
                  ? CATEGORY_DEFINITIONS[catKey].nameEn
                  : CATEGORY_DEFINITIONS[catKey].nameTh}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-500">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Selected Category Details & Scope Info */}
      <div className="mt-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs">
        <p className="text-[11.5px] leading-relaxed text-slate-600">
          <strong className="font-medium text-slate-800">
            {tr('Scope / Examples: ', 'ขอบเขตและตัวอย่าง: ')}
          </strong>
          {CATEGORY_DEFINITIONS[category]?.descriptionTh}
        </p>
      </div>
    </div>
  );
};

interface TypeCategorySectionProps {
  submissionType: SubmissionType;
  category: GrievanceCategory;
  aiApplied: boolean;
  onSubmissionTypeChange: (value: SubmissionType) => void;
  onCategoryChange: (value: GrievanceCategory) => void;
}

/** Step 1 & 2: submission type and category selector (compact 2-column grid). */
export const TypeCategorySection: React.FC<Readonly<TypeCategorySectionProps>> = ({
  submissionType,
  category,
  aiApplied,
  onSubmissionTypeChange,
  onCategoryChange,
}) => (
  <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
    <SubmissionTypeCard submissionType={submissionType} onChange={onSubmissionTypeChange} />
    <CategoryCard category={category} aiApplied={aiApplied} onChange={onCategoryChange} />
  </div>
);
