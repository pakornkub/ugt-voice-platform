import React from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, X } from 'lucide-react';
import type { GrievanceCategory } from '../../types';
import { CATEGORY_DEFINITIONS } from '../../mockData';
import type { AICategorySuggestionResult } from '../../services/api';
import { CategoryIcon } from './CategoryIcon';
import { useTr } from './useTr';

/** Quick helper pill shown once the description is long enough and AI has not been used yet. */
export const AiHelperPill: React.FC<Readonly<{ onAnalyze: () => void }>> = ({ onAnalyze }) => {
  const { tr } = useTr();
  return (
    <div className="flex items-center justify-between rounded-xl border border-indigo-200/90 bg-indigo-50/80 p-2.5 text-xs text-indigo-900 shadow-2xs">
      <div className="flex min-w-0 items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 animate-pulse text-indigo-600" />
        <span className="truncate text-[11px] font-medium">
          {tr(
            'Have details written? Let AI evaluate the best category for this grievance.',
            'พิมพ์ข้อเท็จจริงแล้ว: ต้องการให้ AI ช่วยอ่านข้อความและเลือกหมวดหมู่ที่ตรงที่สุดให้หรือไม่?'
          )}
        </span>
      </div>
      <button
        type="button"
        id="btn-trigger-ai-pill"
        onClick={onAnalyze}
        className="ml-2 flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
      >
        <Sparkles className="h-3 w-3 text-amber-200" />
        <span>{tr('Analyze Now', 'ให้ AI ช่วยเลือก')}</span>
      </button>
    </div>
  );
};

const RecommendationHeader: React.FC<Readonly<{ confidence: number; onDismiss: () => void }>> = ({
  confidence,
  onDismiss,
}) => {
  const { tr } = useTr();
  return (
    <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-indigo-600 p-1.5 text-white shadow-xs">
          <Sparkles className="h-4 w-4 text-amber-200" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-indigo-950">
            <span>{tr('AI Recommended Category', 'AI วิเคราะห์ & แนะนำหมวดหมู่ที่เหมาะสม')}</span>
            <span className="rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
              {tr(`Confidence ${confidence}%`, `ความมั่นใจ ${confidence}%`)}
            </span>
          </div>
          <p className="text-[11px] text-indigo-800/80">
            {tr(
              'Evaluated from your Subject & Details',
              'ประเมินจากเนื้อหาและบริบทข้อเท็จจริงในข้อ 5'
            )}
          </p>
        </div>
      </div>

      <button
        type="button"
        aria-label={tr('Dismiss', 'ปิดกล่องแนะนำ')}
        onClick={onDismiss}
        className="cursor-pointer rounded-md p-1 text-slate-400 transition hover:bg-white/80 hover:text-slate-600"
        title={tr('Dismiss', 'ปิดกล่องแนะนำ')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

interface ApplyCategoryButtonProps {
  suggested: GrievanceCategory;
  suggestedUrgency?: AICategorySuggestionResult['suggestedUrgency'];
  currentCategory: GrievanceCategory;
  onApply: (category: GrievanceCategory) => void;
}

/** The "apply this category" button and the urgency hint under it. */
const ApplyCategoryButton: React.FC<Readonly<ApplyCategoryButtonProps>> = ({
  suggested,
  suggestedUrgency,
  currentCategory,
  onApply,
}) => {
  const { tr } = useTr();
  const isApplied = currentCategory === suggested;
  const label = isApplied
    ? tr('✓ Applied (Step 2 Selected)', '✓ เลือกหมวดหมู่นี้ในข้อ 2 แล้ว')
    : tr(
        'Apply This Category (Step 2)',
        `นำหมวดหมู่นี้ไปใช้ (เลือกเป็น ${CATEGORY_DEFINITIONS[suggested]?.nameTh})`
      );
  return (
    <div className="flex shrink-0 flex-col gap-1 sm:items-end">
      <button
        type="button"
        id="btn-apply-ai-category"
        onClick={() => onApply(suggested)}
        className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs transition ${
          isApplied
            ? 'bg-emerald-600 text-white shadow-emerald-200'
            : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 active:scale-95'
        }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>{label}</span>
      </button>
      {suggestedUrgency && (
        <span className="text-[10px] text-slate-500">
          {tr(`Urgency suggestion: ${suggestedUrgency}`, `ระดับเร่งด่วนแนะนำ: ${suggestedUrgency}`)}
        </span>
      )}
    </div>
  );
};

const KeywordChips: React.FC<Readonly<{ keywords: string[] }>> = ({ keywords }) => {
  const { tr } = useTr();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10.5px] font-medium text-slate-500">
        {tr('Key terms detected:', 'คำสำคัญที่พบ:')}
      </span>
      {keywords.map((kw) => (
        <span
          key={kw}
          className="rounded-md border border-slate-200/50 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
        >
          #{kw}
        </span>
      ))}
    </div>
  );
};

const AlternativeCategory: React.FC<
  Readonly<{ category: GrievanceCategory; onApply: (category: GrievanceCategory) => void }>
> = ({ category, onApply }) => {
  const { tr } = useTr();
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
      <span>{tr('Alternative category:', 'หรือเลือกหมวดหมู่ใกล้เคียง:')}</span>
      <button
        type="button"
        onClick={() => onApply(category)}
        className="cursor-pointer rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
      >
        {CATEGORY_DEFINITIONS[category]?.nameTh}
      </button>
    </div>
  );
};

interface AiRecommendationProps {
  result: AICategorySuggestionResult;
  category: GrievanceCategory;
  onApply: (category: GrievanceCategory) => void;
  onDismiss: () => void;
}

/** AI Category Assistant recommendation box. */
export const AiRecommendation: React.FC<Readonly<AiRecommendationProps>> = ({
  result,
  category,
  onApply,
  onDismiss,
}) => {
  const { lang } = useTr();
  const suggestedInfo = CATEGORY_DEFINITIONS[result.suggestedCategory];
  const secondary = result.secondaryCategory;
  return (
    <div className="space-y-2.5 rounded-xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-white p-3.5 shadow-xs transition-all">
      <RecommendationHeader confidence={result.confidence} onDismiss={onDismiss} />

      {/* Recommended Category Card & Action */}
      <div className="space-y-2.5 rounded-xl border border-indigo-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700">
              <CategoryIcon category={result.suggestedCategory} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">
                  {lang === 'en' ? suggestedInfo?.nameEn : suggestedInfo?.nameTh}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-snug text-slate-700">{result.reasoning}</p>
            </div>
          </div>

          <ApplyCategoryButton
            suggested={result.suggestedCategory}
            suggestedUrgency={result.suggestedUrgency}
            currentCategory={category}
            onApply={onApply}
          />
        </div>

        {/* Keywords Detected Chips & Secondary Category */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
          {!!result.keywords?.length && <KeywordChips keywords={result.keywords} />}
          {secondary && secondary !== result.suggestedCategory && (
            <AlternativeCategory category={secondary} onApply={onApply} />
          )}
        </div>
      </div>
    </div>
  );
};

const NOTICE_SAMPLES: { label: string; title: string; description: string }[] = [
  {
    label: '💡 ตัวอย่าง: เบิกจ่ายสวัสดิการ (HR)',
    title: 'ขอปรับปรุงขั้นตอนการเบิกจ่ายค่ารักษาพยาบาลและสิทธิประโยชน์พนักงาน',
    description:
      'ต้องการให้มีระบบเบิกจ่ายค่ารักษาพยาบาลออนไลน์และอัปเดตสิทธิประโยชน์ทันเวลา เจ้าหน้าที่เบิกจ่ายล่าช้า',
  },
  {
    label: '💡 ตัวอย่าง: อุปกรณ์ชำรุดและความปลอดภัย (Quality)',
    title: 'เครื่องจักรสายการผลิตที่ 2 ชำรุดและอุปกรณ์ป้องกันความปลอดภัยเสียหาย',
    description:
      'เซนเซอร์ตัดการทำงานชำรุดเสียหาย เสี่ยงต่ออุบัติเหตุพนักงานฝ่ายปฏิบัติการ ขอให้ซ่อมแซมด่วน',
  },
  {
    label: '💡 ตัวอย่าง: ตรวจสอบการทุจริต (Fraud)',
    title: 'พบพฤติกรรมส่อไปในทางทุจริตและการปลอมแปลงเอกสารจัดซื้อ',
    description:
      'มีการแก้ตัวเลขใบเสนอราคาและมีการจ่ายเงินทอนให้ผู้ตรวจรับงานในโครงการจัดซื้อคอมพิวเตอร์',
  },
];

interface AiNoticeProps {
  notice: string;
  onDismiss: () => void;
  onUseSample: (title: string, description: string) => void;
}

/** AI helper notice (empty input / server fallback) with the quick sample texts. */
export const AiNotice: React.FC<Readonly<AiNoticeProps>> = ({ notice, onDismiss, onUseSample }) => {
  const { tr } = useTr();
  return (
    <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-amber-950">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span>{notice}</span>
        </div>
        <button
          type="button"
          aria-label={tr('Dismiss', 'ปิด')}
          onClick={onDismiss}
          className="cursor-pointer text-amber-600 hover:text-amber-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-amber-800">
        {tr(
          'Tip: You can type a brief issue or click one of the quick test presets below:',
          'เคล็ดลับ: คุณสามารถพิมพ์ข้อความหรือคลิกทดลองใส่ข้อความตัวอย่างด้านล่างนี้ได้เลย:'
        )}
      </p>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {NOTICE_SAMPLES.map((sample) => (
          <button
            key={sample.label}
            type="button"
            onClick={() => onUseSample(sample.title, sample.description)}
            className="cursor-pointer rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[10.5px] font-medium text-amber-900 shadow-2xs transition hover:bg-amber-100"
          >
            {sample.label}
          </button>
        ))}
      </div>
    </div>
  );
};
