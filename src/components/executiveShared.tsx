'use client';

import React from 'react';
import { ExecutiveMember } from '../types';
import { useTr } from '../context/useTr';

export type ExecutiveStatus = ExecutiveMember['status'];

interface ExecStatusSelectProps {
  readonly id?: string;
  readonly value: ExecutiveStatus;
  readonly onChange: (status: ExecutiveStatus) => void;
  /** Gatekeeper-management form is a little denser than the RBAC one. */
  readonly dense?: boolean;
}

/** Account-status picker shared by both executive forms (upstream markup). */
export const ExecStatusSelect: React.FC<ExecStatusSelectProps> = ({
  id,
  value,
  onChange,
  dense = false,
}) => {
  const { tr } = useTr();
  const selectId = id ?? 'exec-status-select';
  return (
    <div>
      <label
        htmlFor={selectId}
        className={`mb-1 block text-[11px] text-slate-700 ${dense ? 'font-semibold' : 'font-bold'}`}
      >
        {tr('Account Status', 'สถานะการปฏิบัติหน้าที่ (Account Status)')}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value as ExecutiveStatus)}
        className={`w-full rounded-lg border bg-white px-3 ${dense ? 'py-1.5' : 'py-2'} text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none ${
          value === 'active'
            ? 'border-emerald-300 text-emerald-700'
            : 'border-slate-300 text-slate-500'
        }`}
      >
        <option value="active">
          {tr('Active - ready for duty', 'เปิดใช้งาน (Active - พร้อมปฏิบัติหน้าที่)')}
        </option>
        <option value="inactive">
          {tr('Inactive - temporarily suspended', 'พักสถานะ (Inactive - ระงับชั่วคราว)')}
        </option>
      </select>
    </div>
  );
};
