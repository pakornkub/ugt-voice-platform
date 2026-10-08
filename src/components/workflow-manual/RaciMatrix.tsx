import { Fragment } from 'react';
import { Users } from 'lucide-react';
import { RACI_DATA } from './manualData';
import type { RaciRow } from './types';
import { CardHeading, ManualTable, type ManualTableColumn } from './ui';

type RaciColumnKey = 'employee' | 'gatekeeper' | 'executive' | 'admin';

interface RaciColumn extends ManualTableColumn {
  key: RaciColumnKey;
  /** A cell is highlighted when its text contains any of these role letters. */
  highlightLetters: readonly string[];
  highlightClass: string;
}

const RACI_COLUMNS: readonly RaciColumn[] = [
  {
    key: 'employee',
    label: 'พนักงาน (Employee)',
    className: 'px-3 py-3 text-center font-bold',
    highlightLetters: ['R'],
    highlightClass: 'bg-emerald-100 text-emerald-800',
  },
  {
    key: 'gatekeeper',
    label: 'Gatekeeper ประจำฝ่าย',
    className: 'px-3 py-3 text-center font-bold',
    highlightLetters: ['R', 'A'],
    highlightClass: 'bg-indigo-100 text-indigo-800',
  },
  {
    key: 'executive',
    label: 'ผู้บริหาร (Executive)',
    className: 'px-3 py-3 text-center font-bold',
    highlightLetters: ['A', 'R'],
    highlightClass: 'bg-purple-100 text-purple-800',
  },
  {
    key: 'admin',
    label: 'ผู้ดูแลระบบ (Admin)',
    className: 'px-3 py-3 text-center font-bold',
    highlightLetters: ['R', 'A'],
    highlightClass: 'bg-slate-200 text-slate-800',
  },
];

const TABLE_COLUMNS: readonly ManualTableColumn[] = [
  { label: 'กระบวนการทำงาน (Workflow Process)', className: 'px-4 py-3 font-bold' },
  ...RACI_COLUMNS,
];

const LEGEND = [
  { letter: 'R', meaning: 'Responsible (ผู้ทำ)' },
  { letter: 'A', meaning: 'Accountable (ผู้รับผิดชอบผล)' },
  { letter: 'I', meaning: 'Informed (ผู้รับทราบ)' },
] as const;

const RaciCell = ({ value, column }: Readonly<{ value: string; column: RaciColumn }>) => {
  const highlighted = column.highlightLetters.some((letter) => value.includes(letter));
  return (
    <td className="px-3 py-3 text-center">
      <span
        className={`inline-block rounded px-2 py-0.5 font-bold ${
          highlighted ? column.highlightClass : 'text-slate-500'
        }`}
      >
        {value}
      </span>
    </td>
  );
};

const RaciRowView = ({ row }: Readonly<{ row: RaciRow }>) => (
  <tr className="transition hover:bg-slate-50/70">
    <td className="px-4 py-3 font-medium text-slate-900">{row.processTh}</td>
    {RACI_COLUMNS.map((column) => (
      <RaciCell key={column.key} value={row[column.key]} column={column} />
    ))}
  </tr>
);

export const RaciMatrix = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
    <CardHeading
      icon={<Users className="h-5 w-5 text-indigo-600" />}
      title="ตารางบทบาทหน้าที่และความรับผิดชอบ (RACI Matrix)"
      subtitle="แสดงความรับผิดชอบของแต่ละกลุ่มผู้ใช้ในแต่ละขั้นตอนอย่างเป็นระบบ"
      titleClass="flex items-center gap-2 text-base font-bold text-slate-900"
    >
      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
        {LEGEND.map((item, i) => (
          <Fragment key={item.letter}>
            {i > 0 && <span>•</span>}
            <span>
              <strong>{item.letter}</strong> = {item.meaning}
            </span>
          </Fragment>
        ))}
      </div>
    </CardHeading>

    <ManualTable columns={TABLE_COLUMNS}>
      {RACI_DATA.map((row) => (
        <RaciRowView key={row.processTh} row={row} />
      ))}
    </ManualTable>
  </div>
);
