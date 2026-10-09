import React from 'react';
import type { UrgencyLevel } from '../../types';
import { URGENCY_OPTIONS, type UrgencyOption } from './constants';
import { useTr } from './useTr';

const UrgencyLevelButton: React.FC<
  Readonly<{
    option: UrgencyOption;
    isSelected: boolean;
    onSelect: (level: UrgencyLevel) => void;
  }>
> = ({ option, isSelected, onSelect }) => {
  const { lang } = useTr();
  return (
    <button
      type="button"
      id={option.id}
      onClick={() => onSelect(option.level)}
      className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition ${
        isSelected
          ? option.selectedClass
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className={`flex items-center gap-1 text-xs font-bold ${option.titleClass}`}>
            {option.title[lang]}
          </span>
          <span className={`rounded px-1 font-mono text-[9px] ${option.badgeClass}`}>
            {option.level}
          </span>
        </div>
        <p className="text-[10.5px] leading-snug text-slate-500">{option.description[lang]}</p>
      </div>
    </button>
  );
};

/** Step 3: urgency level selection (4 standard levels). */
export const UrgencySection: React.FC<
  Readonly<{ urgency: UrgencyLevel; onSelect: (level: UrgencyLevel) => void }>
> = ({ urgency, onSelect }) => {
  const { tr } = useTr();
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
            {tr('3. Select Urgency Level', '3. เลือกระดับความเร่งด่วน (Urgency Level)')}
          </span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            {tr('4 Standard Levels (ISO 10002)', '4 ระดับมาตรฐาน ISO 10002')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {URGENCY_OPTIONS.map((option) => (
          <UrgencyLevelButton
            key={option.level}
            option={option}
            isSelected={urgency === option.level}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};
