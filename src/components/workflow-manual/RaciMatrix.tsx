import { Fragment } from 'react';
import { Users } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { localize, pick } from './helpers';
import { RACI_DATA } from './manualData';
import type { Bilingual, RaciRow } from './types';
import { CardHeading, ManualTable } from './ui';

type RaciColumnKey = 'employee' | 'gatekeeper' | 'executive' | 'admin';

interface RaciColumn {
  key: RaciColumnKey;
  label: Bilingual;
  className: string;
  /** A cell is highlighted when its text contains any of these role letters. */
  highlightLetters: readonly string[];
  highlightClass: string;
}

const RACI_COLUMNS: readonly RaciColumn[] = [
  {
    key: 'employee',
    label: { th: 'พนักงาน (Employee)', en: 'Employee' },
    className: 'px-3 py-3 text-center font-bold',
    highlightLetters: ['R'],
    highlightClass: 'bg-emerald-100 text-emerald-800',
  },
  {
    key: 'gatekeeper',
    label: { th: 'Gatekeeper ประจำฝ่าย', en: 'Department Gatekeeper' },
    className: 'px-3 py-3 text-center font-bold',
    highlightLetters: ['R', 'A'],
    highlightClass: 'bg-indigo-100 text-indigo-800',
  },
  {
    key: 'executive',
    label: { th: 'ผู้บริหาร (Executive)', en: 'Executive' },
    className: 'px-3 py-3 text-center font-bold',
    highlightLetters: ['A', 'R'],
    highlightClass: 'bg-purple-100 text-purple-800',
  },
  {
    key: 'admin',
    label: { th: 'ผู้ดูแลระบบ (Admin)', en: 'Admin' },
    className: 'px-3 py-3 text-center font-bold',
    highlightLetters: ['R', 'A'],
    highlightClass: 'bg-slate-200 text-slate-800',
  },
];

const PROCESS_COLUMN = {
  label: { th: 'กระบวนการทำงาน (Workflow Process)', en: 'Workflow Process' },
  className: 'px-4 py-3 font-bold',
};

const LEGEND: readonly { letter: string; meaning: Bilingual }[] = [
  { letter: 'R', meaning: { th: 'Responsible (ผู้ทำ)', en: 'Responsible' } },
  { letter: 'A', meaning: { th: 'Accountable (ผู้รับผิดชอบผล)', en: 'Accountable' } },
  { letter: 'I', meaning: { th: 'Informed (ผู้รับทราบ)', en: 'Informed' } },
];

const RaciCell = ({ value, column }: Readonly<{ value: Bilingual; column: RaciColumn }>) => {
  const { lang } = useLanguage();
  // the role letters are matched on the Thai source so the highlight never depends on wording
  const highlighted = column.highlightLetters.some((letter) => value.th.includes(letter));
  return (
    <td className="px-3 py-3 text-center">
      <span
        className={`inline-block rounded px-2 py-0.5 font-bold ${
          highlighted ? column.highlightClass : 'text-slate-500'
        }`}
      >
        {localize(lang, value)}
      </span>
    </td>
  );
};

const RaciRowView = ({ row }: Readonly<{ row: RaciRow }>) => {
  const { lang } = useLanguage();
  return (
    <tr className="transition hover:bg-slate-50/70">
      <td className="px-4 py-3 font-medium text-slate-900">{localize(lang, row.process)}</td>
      {RACI_COLUMNS.map((column) => (
        <RaciCell key={column.key} value={row[column.key]} column={column} />
      ))}
    </tr>
  );
};

export const RaciMatrix = () => {
  const { lang } = useLanguage();
  const columns = [PROCESS_COLUMN, ...RACI_COLUMNS].map((column) => ({
    label: localize(lang, column.label),
    className: column.className,
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
      <CardHeading
        icon={<Users className="h-5 w-5 text-indigo-600" />}
        title={pick(
          lang,
          'Roles & Responsibilities Matrix (RACI)',
          'ตารางบทบาทหน้าที่และความรับผิดชอบ (RACI Matrix)'
        )}
        subtitle={pick(
          lang,
          'How responsibility is shared between each user group at every stage',
          'แสดงความรับผิดชอบของแต่ละกลุ่มผู้ใช้ในแต่ละขั้นตอนอย่างเป็นระบบ'
        )}
        titleClass="flex items-center gap-2 text-base font-bold text-slate-900"
      >
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
          {LEGEND.map((item, i) => (
            <Fragment key={item.letter}>
              {i > 0 && <span>•</span>}
              <span>
                <strong>{item.letter}</strong> = {localize(lang, item.meaning)}
              </span>
            </Fragment>
          ))}
        </div>
      </CardHeading>

      <ManualTable columns={columns}>
        {RACI_DATA.map((row) => (
          <RaciRowView key={row.process.th} row={row} />
        ))}
      </ManualTable>
    </div>
  );
};
