import React from 'react';
import { Crown, Database, EyeOff, ShieldCheck, UserCheck } from 'lucide-react';
import type { EmployeeRecord } from '../../types';
import type { Bilingual, IdentityChoice } from './constants';
import type { SubmitterField } from './useSubmitForm';
import { useTr } from './useTr';

const IDENTITY_OPTIONS: {
  value: IdentityChoice;
  id: string;
  Icon: React.ElementType;
  selectedClass: string;
  selectedIconClass: string;
  tagClass: string;
  title: Bilingual;
  tag: string;
  description: Bilingual;
}[] = [
  {
    value: 'identified',
    id: 'btn-choice-identified',
    Icon: UserCheck,
    selectedClass: 'border-blue-400 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20',
    selectedIconClass: 'bg-blue-600 text-white',
    tagClass: 'py-0.2 rounded bg-blue-100/70 px-1.5 text-[10px] font-medium text-blue-700',
    title: { en: 'Identified Employee', th: 'ระบุตัวตนพนักงาน' },
    tag: 'Standard',
    description: {
      en: 'Submit under official employee name and department for direct follow-up',
      th: 'เปิดเผยชื่อ-นามสกุล และสังกัดอย่างเป็นทางการ เพื่อความสะดวกในการติดต่อกลับและประสานงานโดยตรง',
    },
  },
  {
    value: 'anonymous',
    id: 'btn-choice-anonymous',
    Icon: EyeOff,
    selectedClass: 'border-emerald-400 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20',
    selectedIconClass: 'bg-emerald-600 text-white',
    tagClass: 'py-0.2 rounded bg-emerald-100/70 px-1.5 text-[10px] font-medium text-emerald-700',
    title: { en: 'Anonymous Submitter', th: 'ไม่ระบุตัวตน (Anonymous)' },
    tag: 'Whistleblower',
    description: {
      en: 'Conceal name and employee ID of the submitter',
      th: 'ปกปิดชื่อและรหัสพนักงานของผู้ยื่นเรื่อง',
    },
  },
];

const IdentityHeader: React.FC<Readonly<{ identityChoice: IdentityChoice }>> = ({
  identityChoice,
}) => {
  const { tr } = useTr();
  const isIdentified = identityChoice === 'identified';
  return (
    <div className="flex flex-col justify-between gap-1.5 border-b border-slate-100 pb-1 sm:flex-row sm:items-center">
      <div>
        <span className="block text-xs font-bold tracking-wider text-slate-800 uppercase">
          {tr(
            '4. Submitter Details (Identified or Anonymous)',
            '4. ข้อมูลผู้ยื่นเรื่อง (ระบุตัวตนพนักงาน หรือ ไม่ระบุตัวตน)'
          )}
        </span>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {tr(
            'Choose whether to submit with your identified employee profile or anonymously',
            'เลือกว่าต้องการระบุตัวตนพนักงาน หรือ ยื่นแบบไม่ระบุตัวตน'
          )}
        </p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1 self-start rounded-full border px-2.5 py-1 text-[10px] font-bold sm:self-auto ${
          isIdentified
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}
      >
        {isIdentified ? (
          <>
            <UserCheck className="h-3 w-3 text-blue-600" />
            <span>{tr('Identified Employee', 'ระบุตัวตนพนักงาน')}</span>
          </>
        ) : (
          <>
            <EyeOff className="h-3 w-3 text-emerald-600" />
            <span>{tr('Anonymous Mode', 'ไม่ระบุตัวตน (Anonymous)')}</span>
          </>
        )}
      </span>
    </div>
  );
};

const IdentityChoiceButton: React.FC<
  Readonly<{
    option: (typeof IDENTITY_OPTIONS)[number];
    isSelected: boolean;
    onSelect: (choice: IdentityChoice) => void;
  }>
> = ({ option, isSelected, onSelect }) => {
  const { lang } = useTr();
  const { Icon } = option;
  return (
    <button
      type="button"
      id={option.id}
      onClick={() => onSelect(option.value)}
      className={`relative cursor-pointer rounded-xl border p-3 text-left transition ${
        isSelected ? option.selectedClass : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isSelected ? option.selectedIconClass : 'bg-slate-200 text-slate-600'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">{option.title[lang]}</span>
            <span className={option.tagClass}>{option.tag}</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
            {option.description[lang]}
          </p>
        </div>
      </div>
    </button>
  );
};

/** Identified vs anonymous toggle buttons. */
const IdentityChoiceButtons: React.FC<
  Readonly<{ identityChoice: IdentityChoice; onSelect: (choice: IdentityChoice) => void }>
> = ({ identityChoice, onSelect }) => (
  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
    {IDENTITY_OPTIONS.map((option) => (
      <IdentityChoiceButton
        key={option.value}
        option={option}
        isSelected={identityChoice === option.value}
        onSelect={onSelect}
      />
    ))}
  </div>
);

const INPUT_BASE_CLASS = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5';
const INPUT_FOCUS_CLASS = 'text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none';

const SubmitterInput: React.FC<
  Readonly<{
    id: string;
    type: 'text' | 'email';
    label: string;
    value: string;
    placeholder: string;
    mono?: boolean;
    onChange: (value: string) => void;
  }>
> = ({ id, type, label, value, placeholder, mono = false, onChange }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-[11px] font-medium text-slate-700">
      {label} <span className="text-rose-500">*</span>
    </label>
    <input
      type={type}
      id={id}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={
        mono
          ? `${INPUT_BASE_CLASS} font-mono ${INPUT_FOCUS_CLASS}`
          : `${INPUT_BASE_CLASS} ${INPUT_FOCUS_CLASS}`
      }
    />
  </div>
);

interface IdentifiedFieldsProps {
  currentEmployee: EmployeeRecord;
  selectedEmployee: EmployeeRecord;
  details: Record<SubmitterField, string>;
  onSelectEmployee: (emp: EmployeeRecord) => void;
  onDetailChange: (field: SubmitterField, value: string) => void;
}

/** Identified mode: pick the directory profile and review the submitter details. */
const IdentifiedFields: React.FC<Readonly<IdentifiedFieldsProps>> = ({
  currentEmployee,
  selectedEmployee,
  details,
  onSelectEmployee,
  onDetailChange,
}) => {
  const { tr } = useTr();
  return (
    <div className="space-y-3 pt-1">
      {/* Quick Select Employee from Corporate Directory */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-600">
          <Database className="h-3.5 w-3.5 text-blue-600" />
          {tr('Select Profile from Directory:', 'เลือกข้อมูลจากฐานข้อมูลพนักงาน:')}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {[currentEmployee].map((emp) => (
            <button
              key={emp.employeeId}
              type="button"
              onClick={() => onSelectEmployee(emp)}
              className={`rounded border px-2 py-0.5 text-[11px] font-medium transition ${
                selectedEmployee.employeeId === emp.employeeId
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {emp.nameTh.split(' ')[0]} ({emp.department.split(' ')[0]})
            </button>
          ))}
        </div>
      </div>

      {/* Submitter Info Inputs */}
      <div className="grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-4">
        <SubmitterInput
          id="input-submitter-name"
          type="text"
          label={tr('Submitter Full Name:', 'ชื่อ-นามสกุล ผู้ยื่นเรื่อง:')}
          value={details.name}
          placeholder={tr('Full name', 'ระบุชื่อ-นามสกุล')}
          onChange={(value) => onDetailChange('name', value)}
        />
        <SubmitterInput
          id="input-submitter-id"
          type="text"
          label={tr('Employee ID:', 'รหัสพนักงาน:')}
          value={details.employeeId}
          placeholder="EMP-XXXX"
          mono
          onChange={(value) => onDetailChange('employeeId', value)}
        />
        <SubmitterInput
          id="input-submitter-dept"
          type="text"
          label={tr('Division / Dept:', 'ฝ่าย / แผนก:')}
          value={details.department}
          placeholder={tr('Department', 'ฝ่าย/แผนก')}
          onChange={(value) => onDetailChange('department', value)}
        />
        <SubmitterInput
          id="input-submitter-email"
          type="email"
          label={tr('Contact Email:', 'อีเมลติดต่อ:')}
          value={details.email}
          placeholder="name@company.internal"
          mono
          onChange={(value) => onDetailChange('email', value)}
        />
      </div>
    </div>
  );
};

/** CEO / EVP direct-routing checkbox. */
const DirectToExecutiveBox: React.FC<
  Readonly<{ checked: boolean; onChange: (checked: boolean) => void }>
> = ({ checked, onChange }) => {
  const { tr } = useTr();
  return (
    <div
      className={`rounded-xl border p-3 transition ${
        checked
          ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 ring-2 ring-purple-500/20'
          : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100/60'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          id="checkbox-direct-ceo"
          aria-describedby="checkbox-direct-ceo-hint"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-purple-600 focus:ring-purple-500"
        />
        <div className="min-w-0 flex-1">
          <label
            htmlFor="checkbox-direct-ceo"
            className="flex cursor-pointer flex-wrap items-center gap-1.5"
          >
            <Crown className="h-3.5 w-3.5 shrink-0 text-purple-600" />
            <span className="text-xs font-bold text-purple-950">
              {tr('Direct to Executive (CEO / EVP)', 'ส่งให้ผู้บริหารโดยตรง CEO / EVP')}
            </span>
            <span className="py-0.2 rounded bg-purple-100 px-1.5 text-[9px] font-bold text-purple-800">
              PRIORITY
            </span>
          </label>
          <p
            id="checkbox-direct-ceo-hint"
            className="mt-0.5 text-[11px] leading-snug text-purple-900/80"
          >
            {tr(
              'Send instant priority notification straight to senior management desk, bypassing initial triage',
              'ส่งการแจ้งเตือนด่วนไปยังโต๊ะทำงานของผู้บริหารระดับสูงโดยตรง ข้ามขั้นตอนปกติ'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

const IdentityNotice: React.FC = () => {
  const { tr } = useTr();
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
      <div className="min-w-0">
        <div className="mb-0.5 text-[11px] font-bold text-blue-950">
          {tr(
            'Security & Personal Data Protection (PDPA)',
            'ความปลอดภัย & คุ้มครองข้อมูลส่วนบุคคล (PDPA)'
          )}
        </div>
        <p className="text-[10.5px] leading-snug text-blue-800">
          {tr(
            'Dispatched exclusively to the assigned Gatekeeper for impartial investigation and remediation.',
            'ส่งต่อเฉพาะ Gatekeeper ที่รับผิดชอบโดยตรง เพื่อตรวจสอบและแก้ไขปัญหาอย่างเป็นธรรม'
          )}
        </p>
      </div>
    </div>
  );
};

interface IdentitySectionProps {
  currentEmployee: EmployeeRecord;
  identityChoice: IdentityChoice;
  selectedEmployee: EmployeeRecord;
  details: Record<SubmitterField, string>;
  isDirectToExecutive: boolean;
  onIdentityChoiceChange: (choice: IdentityChoice) => void;
  onSelectEmployee: (emp: EmployeeRecord) => void;
  onDetailChange: (field: SubmitterField, value: string) => void;
  onDirectToExecutiveChange: (checked: boolean) => void;
}

/** Step 4: submitter details (identified or anonymous) plus the CEO / EVP routing box. */
export const IdentitySection: React.FC<Readonly<IdentitySectionProps>> = ({
  currentEmployee,
  identityChoice,
  selectedEmployee,
  details,
  isDirectToExecutive,
  onIdentityChoiceChange,
  onSelectEmployee,
  onDetailChange,
  onDirectToExecutiveChange,
}) => (
  <div className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
    <IdentityHeader identityChoice={identityChoice} />
    <IdentityChoiceButtons identityChoice={identityChoice} onSelect={onIdentityChoiceChange} />

    {/* Conditional View: Identified Mode Form */}
    {identityChoice === 'identified' && (
      <IdentifiedFields
        currentEmployee={currentEmployee}
        selectedEmployee={selectedEmployee}
        details={details}
        onSelectEmployee={onSelectEmployee}
        onDetailChange={onDetailChange}
      />
    )}

    {/* CEO / EVP Direct Box & Notice in 2 columns */}
    <div className="grid grid-cols-1 gap-2.5 pt-1 md:grid-cols-2">
      <DirectToExecutiveBox checked={isDirectToExecutive} onChange={onDirectToExecutiveChange} />
      <IdentityNotice />
    </div>
  </div>
);
