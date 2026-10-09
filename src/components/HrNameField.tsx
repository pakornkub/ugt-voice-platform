'use client';

// HrNameField — the "name" input of the roster forms, backed by the HR view (decisions.md
// 2026-10-09 "App role comes from the people rosters"). A search box over the HR view: Thai or
// English name, employee code, email / AD login, position or department (lib/directory.ts
// searchDirectory); picking a match fills the form via onPick (the parent locks the email).
// Typing freely stays allowed for people outside the HR view (mail-only, no SSO).
import { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { EmployeeRecord } from '../types';

const DEBOUNCE_MS = 250;

const COPY = {
  placeholder: {
    th: 'พิมพ์ค้นหาจากข้อมูล HR: ชื่อไทย/อังกฤษ รหัสพนักงาน อีเมล ตำแหน่ง หรือหน่วยงาน',
    en: 'Search the HR directory: Thai/English name, employee code, email, position or department',
  },
  hint: {
    th: 'พิมพ์อย่างน้อย 2 ตัวอักษร แล้วเลือกจากรายชื่อพนักงาน',
    en: 'Type at least 2 characters, then pick from the employee list',
  },
  searching: { th: 'กำลังค้นหาในข้อมูล HR...', en: 'Searching the HR directory...' },
  'no-match': {
    th: 'ไม่พบในข้อมูล HR — พิมพ์ชื่อเองได้ (รับอีเมลได้ แต่เข้าสู่ระบบด้วย SSO ไม่ได้)',
    en: 'Not found in the HR directory — you can type the name yourself (mail only, no SSO sign-in)',
  },
  failed: {
    th: 'ค้นหาข้อมูล HR ไม่สำเร็จ — กรุณารีเฟรชหน้าแล้วลองใหม่ (ยังพิมพ์ชื่อเองได้)',
    en: "Couldn't search the HR directory — refresh the page and try again (you can still type the name)",
  },
} as const;

// Why the list is empty — never a silent nothing (owner report 2026-10-09: a page left open across
// a redeploy fails every Server Action call, and the field just looked broken).
type Status = 'idle' | 'searching' | 'no-match' | 'failed';

interface HrNameFieldProps {
  id: string;
  value: string;
  className?: string;
  required?: boolean;
  /** Free typing — the parent should also drop any "picked from HR" lock here. */
  onChange: (value: string) => void;
  onPick: (employee: EmployeeRecord) => void;
  search: (query: string) => Promise<EmployeeRecord[]>;
}

function StatusLine({ status, lang }: Readonly<{ status: Status; lang: 'th' | 'en' }>) {
  if (status === 'searching') {
    return (
      <p role="status" className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        {COPY.searching[lang]}
      </p>
    );
  }
  const tone = status === 'failed' ? 'text-amber-700' : 'text-slate-500';
  const text = status === 'idle' ? COPY.hint[lang] : COPY[status][lang];
  return (
    <p role="status" className={`mt-1 text-[11px] ${tone}`}>
      {text}
    </p>
  );
}

export default function HrNameField({
  id,
  value,
  className,
  required,
  onChange,
  onPick,
  search,
}: Readonly<HrNameFieldProps>) {
  const { lang } = useLanguage();
  const [results, setResults] = useState<EmployeeRecord[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef('');
  // No late lookup (and no state update) after the form closes.
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (next: string) => {
    onChange(next);
    clearTimeout(timer.current);
    latest.current = next;
    if (next.trim().length < 2) {
      setResults([]);
      setStatus('idle');
      return;
    }
    setStatus('searching');
    timer.current = setTimeout(() => {
      search(next)
        .then((found) => {
          if (latest.current !== next) return; // drop out-of-order answers
          setResults(found);
          setStatus(found.length === 0 ? 'no-match' : 'idle');
        })
        .catch(() => {
          // HR view unreachable or a stale page after a redeploy → still a plain free-text input
          if (latest.current !== next) return;
          setResults([]);
          setStatus('failed');
        });
    }, DEBOUNCE_MS);
  };

  const pick = (employee: EmployeeRecord) => {
    latest.current = '';
    setResults([]);
    setStatus('idle');
    onPick(employee);
  };

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="text"
        id={id}
        placeholder={COPY.placeholder[lang]}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setResults([])}
        className={`${className ?? ''} pl-8`}
        required={required}
        autoComplete="off"
      />
      {results.length === 0 && <StatusLine status={status} lang={lang} />}
      {results.length > 0 && (
        <ul
          aria-label={lang === 'en' ? 'HR employee matches' : 'รายชื่อพนักงานจากฐานข้อมูล HR'}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.map((emp) => (
            <li key={emp.employeeId}>
              <button
                type="button"
                onClick={() => pick(emp)}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none"
              >
                <span className="block font-semibold text-slate-800">
                  {emp.nameTh} <span className="font-normal text-slate-500">({emp.nameEn})</span>
                </span>
                <span className="block text-[11px] text-slate-500">
                  {emp.employeeId} · {emp.position} · {emp.department} · {emp.loginEmail}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
