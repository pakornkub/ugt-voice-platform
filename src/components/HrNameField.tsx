'use client';

// HrNameField — the "name" input of the roster forms, backed by the HR view (decisions.md
// 2026-10-09 "App role comes from the people rosters"). Looks and types exactly like the
// upstream plain input; while typing it offers matching HR employees underneath. Picking one
// fills the form via onPick (the parent locks the email); typing freely stays allowed for
// people outside the HR view (mail-only, no SSO).
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { EmployeeRecord } from '../types';

const DEBOUNCE_MS = 250;

interface HrNameFieldProps {
  id: string;
  value: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  /** Free typing — the parent should also drop any "picked from HR" lock here. */
  onChange: (value: string) => void;
  onPick: (employee: EmployeeRecord) => void;
  search: (query: string) => Promise<EmployeeRecord[]>;
}

export default function HrNameField({
  id,
  value,
  placeholder,
  className,
  required,
  onChange,
  onPick,
  search,
}: Readonly<HrNameFieldProps>) {
  const { lang } = useLanguage();
  const [results, setResults] = useState<EmployeeRecord[]>([]);
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
      return;
    }
    timer.current = setTimeout(() => {
      search(next)
        .then((found) => {
          if (latest.current === next) setResults(found); // drop out-of-order answers
        })
        .catch(() => setResults([])); // HR view unreachable → plain free-text input
    }, DEBOUNCE_MS);
  };

  const pick = (employee: EmployeeRecord) => {
    latest.current = '';
    setResults([]);
    onPick(employee);
  };

  return (
    <div className="relative">
      <input
        type="text"
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setResults([])}
        className={className}
        required={required}
        autoComplete="off"
      />
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
