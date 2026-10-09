import React from 'react';
import { Lightbulb } from 'lucide-react';
import { useTr } from '../../context/useTr';

interface GuideCardData {
  number: number;
  title: string;
  titleEn: string;
  columns: readonly string[];
  benefit: string;
  benefitEn: string;
  titleClassName: string;
  badgeClassName: string;
}

const GUIDE_CARDS: readonly GuideCardData[] = [
  {
    number: 1,
    title: 'การวิเคราะห์ความถี่ปัญหาตามกฎพาเรโต (Pareto 80/20 Analysis)',
    titleEn: 'Pareto 80/20 Analysis',
    columns: ['Category', 'Location/Unit', 'Urgency'],
    benefit:
      'หาว่า 20% ของหมวดหมู่ปัญหาใดที่สร้างผลกระทบต่อพนักงาน 80% เช่น ปัญหาเครือข่าย IT หรือปัญหาโรงอาหาร เพื่อจัดสรรงบประมาณแก้ไขได้ตรงจุด',
    benefitEn:
      'Find which 20% of problem categories cause 80% of the impact on employees, such as IT network issues or canteen complaints, so the fix budget goes where it matters.',
    titleClassName: 'text-indigo-700',
    badgeClassName: 'bg-indigo-100 text-indigo-700',
  },
  {
    number: 2,
    title: 'การวิเคราะห์เวลาตอบสนอง & จุดคอขวด (Lead Time & Bottlenecks)',
    titleEn: 'Lead Time & Bottlenecks',
    columns: ['Triage Lead Time', 'Resolution Lead Time', 'Responsible Dept'],
    benefit:
      'เปรียบเทียบ Lead Time จริงรายฝ่าย เพื่อดูว่าหน่วยงานใดใช้เวลาคัดกรองหรือแก้ไขนาน และต้องเพิ่มทรัพยากรช่วยเหลือ',
    benefitEn:
      'Compare actual lead times by department to see which ones are slow to triage or resolve, and where extra resources are needed.',
    titleClassName: 'text-sky-700',
    badgeClassName: 'bg-sky-100 text-sky-700',
  },
  {
    number: 3,
    title: 'การวิเคราะห์สาเหตุรากเหง้า & แผนป้องกันซ้ำ (RCA & CAPA Effectiveness)',
    titleEn: 'RCA & CAPA Effectiveness',
    columns: ['Root Cause Category', 'Preventive Action Plan', 'Cluster Group'],
    benefit:
      'แยกประเภทสาเหตุตาม Ishikawa (Process, People, Equipment, Policy, Workplace/Facilities) เพื่อป้องกันการเกิดซ้ำ (Systemic Fix) แทนการแก้แบบชั่วคราว',
    benefitEn:
      'Classify causes by the Ishikawa categories (Process, People, Equipment, Policy, Workplace/Facilities) to prevent recurrence with a systemic fix instead of a temporary patch.',
    titleClassName: 'text-emerald-700',
    badgeClassName: 'bg-emerald-100 text-emerald-700',
  },
  {
    number: 4,
    title: 'การประเมินความพึงพอใจและแนวโน้มความรู้สึก (CSAT & Employee Sentiment)',
    titleEn: 'CSAT & Employee Sentiment',
    columns: ['CSAT Overall Score', 'Speed / Quality / Manner', 'Permanently Resolved'],
    benefit:
      'ติดตามความไว้วางใจของพนักงานที่มีต่อระบบ หากคะแนนความพึงพอใจสูงจะส่งผลให้พนักงานกล้าแจ้งเตือนข้อร้องเรียนหรือความเสี่ยงทุจริตล่วงหน้า',
    benefitEn:
      'Track how much employees trust the system. High satisfaction scores encourage employees to raise complaints or fraud risks early.',
    titleClassName: 'text-rose-700',
    badgeClassName: 'bg-rose-100 text-rose-700',
  },
];

const GuideCard: React.FC<Readonly<{ card: GuideCardData }>> = ({ card }) => {
  const { tr } = useTr();
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className={`flex items-center gap-2 text-xs font-bold ${card.titleClassName}`}>
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${card.badgeClassName}`}
        >
          {card.number}
        </span>
        <span>{tr(card.titleEn, card.title)}</span>
      </div>
      <p className="text-xs leading-relaxed text-slate-600">
        <strong>{tr('Recommended columns:', 'คอลัมน์ที่แนะนำ:')}</strong>{' '}
        {card.columns.map((column, i) => (
          <React.Fragment key={column}>
            {i > 0 && ', '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">{column}</code>
          </React.Fragment>
        ))}
      </p>
      <p className="text-xs leading-relaxed text-slate-500">
        <strong>{tr('Benefit:', 'ประโยชน์:')}</strong> {tr(card.benefitEn, card.benefit)}
      </p>
    </div>
  );
};

export const GuideTab: React.FC = () => {
  const { tr } = useTr();
  return (
    <div className="space-y-5 text-slate-800">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1 text-xs">
          <h4 className="text-sm font-bold text-amber-900">
            {tr(
              'Tip: the data structure prepared for analysis and organizational improvement',
              'คำแนะนำ: โครงสร้างข้อมูลที่ระบบจัดเตรียมไว้เพื่อนำไปวิเคราะห์ปรับปรุงองค์กร'
            )}
          </h4>
          <p className="leading-relaxed text-amber-800">
            {tr(
              'High-quality complaint and suggestion data must answer four key questions for the organization:',
              'ข้อมูลข้อร้องเรียนและข้อเสนอแนะที่มีคุณภาพสูง ต้องสามารถตอบคำถามสำคัญ 4 ประการขององค์กรได้แก่:'
            )}{' '}
            <strong>
              {tr(
                'What problems occur most often? (What), What are the root causes? (Why), Who fixes them and how long does it take? (How long), and are employees satisfied? (Outcome)',
                'ปัญหาอะไรเกิดบ่อยที่สุด? (What), เกิดจากสาเหตุรากเหง้าอะไร? (Why), ใครแก้และใช้เวลานานเท่าใด? (How long), และพนักงานพึงพอใจหรือไม่? (Outcome)'
              )}
            </strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {GUIDE_CARDS.map((card) => (
          <GuideCard key={card.number} card={card} />
        ))}
      </div>
    </div>
  );
};
