import React from 'react';
import { BarChart3, Clock, HeartHandshake, ShieldCheck } from 'lucide-react';
import { SelectedMark } from './SelectedMark';
import type { ExportDatasetType } from './types';

interface DatasetOption {
  id: ExportDatasetType;
  name: string;
  sub: string;
  desc: string;
  icon: React.ReactNode;
}

const DATASET_OPTIONS: readonly DatasetOption[] = [
  {
    id: 'comprehensive',
    name: 'ชุดข้อมูลวิเคราะห์ครบวงจร',
    sub: 'BI Comprehensive (35 มิติข้อมูล)',
    desc: 'รวมข้อมูลเรื่องร้องเรียน, ระยะเวลาดำเนินการ, RCA สาเหตุต้นตอ, แผน CAPA และคะแนน CSAT ครบทุกคอลัมน์',
    icon: <BarChart3 className="h-4 w-4 text-emerald-600" />,
  },
  {
    id: 'operational_ops',
    name: 'ประสิทธิภาพการปฏิบัติงาน & ความรวดเร็ว',
    sub: 'Operations & Response Time',
    desc: 'เน้นวิเคราะห์เวลาตอบรับ (Triage Time), เวลาแก้ไข (Lead Time) และจุดติดขัดรายหน่วยงาน',
    icon: <Clock className="h-4 w-4 text-blue-600" />,
  },
  {
    id: 'root_cause_capa',
    name: 'สาเหตุต้นตอ & แผนป้องกันซ้ำ',
    sub: 'RCA & CAPA Action Plans',
    desc: 'วิเคราะห์การจัดกลุ่มความถี่ (Ishikawa / 5-Why) และติดตามผลมาตรการปรับปรุงกระบวนการ',
    icon: <ShieldCheck className="h-4 w-4 text-indigo-600" />,
  },
  {
    id: 'csat_quality',
    name: 'ความพึงพอใจพนักงาน & CSAT',
    sub: 'Employee Voice & CSAT Quality',
    desc: 'วิเคราะห์คะแนนความพึงพอใจ 4 ด้าน และความคิดเห็นเสนอแนะจากพนักงานหลังปิดเรื่อง',
    icon: <HeartHandshake className="h-4 w-4 text-rose-600" />,
  },
];

const CARD_BASE = 'flex flex-col justify-between rounded-xl border p-3 text-left transition';
const CARD_SELECTED = 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20';
const CARD_IDLE = 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50';

interface DatasetSelectorProps {
  selected: ExportDatasetType;
  onSelect: (dataset: ExportDatasetType) => void;
}

export const DatasetSelector: React.FC<Readonly<DatasetSelectorProps>> = ({
  selected,
  onSelect,
}) => (
  <div role="group" aria-labelledby="export-dataset-heading">
    <p
      id="export-dataset-heading"
      className="mb-2 block text-xs font-bold tracking-wider text-slate-700 uppercase"
    >
      2. เลือกโปรไฟล์ข้อมูลสำหรับการวิเคราะห์ (Dataset Profile)
    </p>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {DATASET_OPTIONS.map((ds) => {
        const isSelected = selected === ds.id;
        return (
          <button
            key={ds.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(ds.id)}
            className={`${CARD_BASE} ${isSelected ? CARD_SELECTED : CARD_IDLE}`}
          >
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                {ds.icon}
                <span className="text-xs font-bold text-slate-900">{ds.name}</span>
              </div>
              <div className="mb-1 text-[10px] font-semibold text-slate-500">{ds.sub}</div>
              <p className="line-clamp-3 text-[11px] leading-relaxed text-slate-600">{ds.desc}</p>
            </div>
            {isSelected && <SelectedMark iconClassName="h-3 w-3" label="เลือกอยู่" />}
          </button>
        );
      })}
    </div>
  </div>
);
