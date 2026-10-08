import type { ReactNode } from 'react';
import { BookOpen, Clock, HelpCircle, ShieldCheck, Zap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { pick } from './helpers';
import type { ManualSection } from './types';

interface TabDefinition {
  key: ManualSection;
  labelEn: string;
  labelTh: string;
  icon: ReactNode;
}

const TAB_DEFINITIONS: readonly TabDefinition[] = [
  {
    key: 'workflow',
    labelEn: '1. 5-Stage Workflow',
    labelTh: '1. ผังกระบวนการทำงาน 5 ขั้นตอน (Workflow)',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    key: 'role_guides',
    labelEn: '2. Role Guides',
    labelTh: '2. คู่มือการใช้งานแยกตามบทบาท (Role Guides)',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    key: 'sla_matrix',
    labelEn: '3. 6 Categories & SLA Matrix',
    labelTh: '3. มาตรฐานและขอบเขต 6 หมวดหมู่',
    icon: <Clock className="h-4 w-4" />,
  },
  {
    key: 'pdpa_security',
    labelEn: '4. PDPA & Security',
    labelTh: '4. ความปลอดภัย & คุ้มครองข้อมูล (PDPA)',
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    key: 'faq',
    labelEn: '5. FAQs',
    labelTh: '5. คำถามที่พบบ่อย (FAQ)',
    icon: <HelpCircle className="h-4 w-4" />,
  },
];

interface ManualTabsProps {
  active: ManualSection;
  onChange: (section: ManualSection) => void;
}

export const ManualTabs = ({ active, onChange }: Readonly<ManualTabsProps>) => {
  const { lang } = useLanguage();
  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
      {TAB_DEFINITIONS.map((tab) => (
        <button
          key={tab.key}
          id={`manual-tab-${tab.key}`}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
            active === tab.key
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          {tab.icon}
          <span>{pick(lang, tab.labelEn, tab.labelTh)}</span>
        </button>
      ))}
    </div>
  );
};
