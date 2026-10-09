'use client';

import { FlaskConical } from 'lucide-react';
import { useTr } from '@/context/useTr';

/** Shown on every page of the dev deployment only (rendered by src/app/layout.tsx). */
export function DevEnvironmentBar() {
  const { tr } = useTr();
  return (
    <div
      id="dev-environment-bar"
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950"
    >
      <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {tr(
          'DEV environment — test data only; every email goes back to the person who triggered it',
          'สภาพแวดล้อมทดสอบ (DEV) — ข้อมูลในระบบนี้ไม่ใช่ข้อมูลจริง และอีเมลทุกฉบับจะส่งกลับหาผู้ทดสอบ'
        )}
      </span>
    </div>
  );
}
