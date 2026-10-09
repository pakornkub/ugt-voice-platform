import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Crown } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { localize, pick } from './helpers';
import { SLA_MATRIX_DATA } from './manualData';
import type { Bilingual, SlaMatrixRow } from './types';
import { CardHeading, ManualTable } from './ui';

interface LevelCard {
  icon: ReactNode;
  title: Bilingual;
  body: Bilingual;
  containerClass: string;
  titleClass: string;
  bodyClass: string;
}

const LEVEL_CARDS: readonly LevelCard[] = [
  {
    icon: <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />,
    title: { th: 'เคสระดับปกติ (Normal)', en: 'Normal cases' },
    body: {
      th: 'ข้อร้องเรียนทั่วไปหรือข้อเสนอแนะ ดำเนินการตามลำดับคิวและตรวจสอบข้อเท็จจริง',
      en: 'General complaints or suggestions, handled in queue order with the facts verified.',
    },
    containerClass: 'border-slate-200 bg-slate-50/80',
    titleClass: 'text-slate-900',
    bodyClass: 'text-slate-600',
  },
  {
    icon: <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />,
    title: { th: 'เคสระดับเร่งด่วน (Urgent)', en: 'Urgent cases' },
    body: {
      th: 'ปัญหาที่ส่งผลกระทบต่อการทำงานหรือความปลอดภัย ประสานงานเจ้าหน้าที่เร่งตรวจสอบทันที',
      en: 'Problems affecting work or safety; officers are coordinated to investigate immediately.',
    },
    containerClass: 'border-amber-200 bg-amber-50/60',
    titleClass: 'text-amber-950',
    bodyClass: 'text-amber-900/80',
  },
  {
    icon: <Crown className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />,
    title: { th: 'เคสสำคัญยิ่งยวด (Critical / Bypass)', en: 'Critical / Bypass cases' },
    body: {
      th: 'ส่งตรงถึงผู้บริหารระดับสูง (CEO / EVP Bypass) และคณะกรรมการตรวจสอบเฉพาะกิจ',
      en: 'Sent directly to senior executives (CEO / EVP Bypass) and an ad hoc investigation committee.',
    },
    containerClass: 'border-purple-200 bg-purple-50/60',
    titleClass: 'text-purple-950',
    bodyClass: 'text-purple-900/80',
  },
];

const COLUMNS: readonly { label: Bilingual; className: string }[] = [
  { label: { th: 'หมวดหมู่คำร้อง', en: 'Request category' }, className: 'px-4 py-3 font-bold' },
  {
    label: { th: 'หน่วยงานรับผิดชอบหลัก', en: 'Primary responsible unit' },
    className: 'px-3 py-3 font-bold',
  },
  {
    label: { th: 'ระดับความเร่งด่วนแนะนำ', en: 'Recommended urgency' },
    className: 'px-3 py-3 text-center font-bold',
  },
  {
    label: { th: 'ขอบเขตลักษณะปัญหา', en: 'Scope of issues' },
    className: 'px-3 py-3 font-bold',
  },
];

const LevelCardView = ({ card }: Readonly<{ card: LevelCard }>) => {
  const { lang } = useLanguage();
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${card.containerClass}`}>
      {card.icon}
      <div>
        <h4 className={`mb-0.5 text-xs font-bold ${card.titleClass}`}>
          {localize(lang, card.title)}
        </h4>
        <p className={`text-[11px] leading-relaxed ${card.bodyClass}`}>
          {localize(lang, card.body)}
        </p>
      </div>
    </div>
  );
};

const CategoryRow = ({ row }: Readonly<{ row: SlaMatrixRow }>) => {
  const { lang } = useLanguage();
  return (
    <tr className="transition hover:bg-slate-50/70">
      <td className="px-4 py-3.5 font-bold text-slate-900">
        <span
          className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${row.badgeColor}`}
        >
          {localize(lang, row.name)}
        </span>
      </td>
      <td className="px-3 py-3 font-medium text-slate-700">{row.responsible}</td>
      <td className="px-3 py-3 text-center">
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
          {row.severity}
        </span>
      </td>
      <td className="px-3 py-3 text-slate-600">{localize(lang, row.description)}</td>
    </tr>
  );
};

export const SlaMatrixSection = () => {
  const { lang } = useLanguage();
  const columns = COLUMNS.map((column) => ({
    label: localize(lang, column.label),
    className: column.className,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
        <CardHeading
          icon={<Clock className="h-5 w-5 text-indigo-600" />}
          title={pick(
            lang,
            'Category Assignment & Responsibility Matrix (6 Categories)',
            'ตารางมาตรฐานและการจัดสรรผู้รับผิดชอบ 6 หมวดหมู่ (Category Matrix)'
          )}
          subtitle={pick(
            lang,
            'Standard assignment rules, the primary responsible unit and the scope of issues under company policy',
            'มาตรฐานการจัดสรรงาน หน่วยงานรับผิดชอบหลัก และขอบเขตลักษณะปัญหาตามนโยบายองค์กร'
          )}
          titleClass="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg"
        >
          <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Enterprise Standards
          </span>
        </CardHeading>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {LEVEL_CARDS.map((card) => (
            <LevelCardView key={card.title.th} card={card} />
          ))}
        </div>

        <ManualTable columns={columns}>
          {SLA_MATRIX_DATA.map((row) => (
            <CategoryRow key={row.category} row={row} />
          ))}
        </ManualTable>
      </div>
    </div>
  );
};
