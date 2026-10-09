import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { GrievanceCategory } from '../../types';
import type { AICategorySuggestionResult } from '../../services/api';
import { AttachmentPicker, type PendingFile } from '../AttachmentPicker';
import { AiHelperPill, AiNotice, AiRecommendation } from './AiPanels';
import { useTr } from './useTr';

const AI_PILL_MIN_DESCRIPTION_LENGTH = 20;

const AiSuggestButton: React.FC<Readonly<{ isAnalyzing: boolean; onClick: () => void }>> = ({
  isAnalyzing,
  onClick,
}) => {
  const { tr } = useTr();
  return (
    <button
      type="button"
      id="btn-ai-category-suggest"
      onClick={onClick}
      disabled={isAnalyzing}
      className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:from-indigo-700 hover:to-purple-800 hover:shadow active:scale-95 disabled:opacity-50 sm:self-auto"
    >
      {isAnalyzing ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{tr('AI Analyzing Details...', 'AI กำลังวิเคราะห์เนื้อหา...')}</span>
        </>
      ) : (
        <>
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-300" />
          <span>{tr('AI Category Assistant', '✨ ให้ AI ช่วยเลือกหมวดหมู่')}</span>
        </>
      )}
    </button>
  );
};

const DetailsHeader: React.FC<Readonly<{ isAnalyzing: boolean; onSuggest: () => void }>> = ({
  isAnalyzing,
  onSuggest,
}) => {
  const { tr } = useTr();
  return (
    <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-1.5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <span className="block text-xs font-bold tracking-wider text-slate-800 uppercase">
          {tr('5. Grievance Details', '5. รายละเอียดเรื่อง (Details)')}
        </span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {tr('Facts & Evidence', 'ข้อเท็จจริง & พยานหลักฐาน')}
        </span>
      </div>

      {/* AI Category Assistant Action Button */}
      <AiSuggestButton isAnalyzing={isAnalyzing} onClick={onSuggest} />
    </div>
  );
};

interface TitleLocationFieldsProps {
  title: string;
  locationOrUnit: string;
  onTitleChange: (value: string) => void;
  onLocationChange: (value: string) => void;
}

/** Subject and location side by side. */
const TitleLocationFields: React.FC<Readonly<TitleLocationFieldsProps>> = ({
  title,
  locationOrUnit,
  onTitleChange,
  onLocationChange,
}) => {
  const { tr } = useTr();
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      <div className="sm:col-span-2">
        <label
          htmlFor="input-ticket-title"
          className="mb-1 block text-xs font-semibold text-slate-700"
        >
          {tr('Subject / Title', 'หัวข้อเรื่อง')} <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          id="input-ticket-title"
          required
          placeholder={tr(
            'Specify main issue e.g., Request improvement for medical expense claim & employee benefits',
            'ระบุใจความสำคัญ เช่น ขอปรับปรุงขั้นตอนการเบิกจ่ายค่ารักษาพยาบาลและสวัสดิการพนักงาน'
          )}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="input-ticket-location"
          className="mb-1 block text-xs font-semibold text-slate-700"
        >
          {tr('Location / Unit', 'สถานที่ / หน่วยงาน')}
        </label>
        <input
          type="text"
          id="input-ticket-location"
          placeholder={tr(
            'e.g., Admin Building or Bangkok Office',
            'เช่น อาคาร Admin หรือ สำนักงานกรุงเทพ'
          )}
          value={locationOrUnit}
          onChange={(e) => onLocationChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
        />
      </div>
    </div>
  );
};

const DescriptionField: React.FC<
  Readonly<{ description: string; onChange: (value: string) => void }>
> = ({ description, onChange }) => {
  const { tr } = useTr();
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label
          htmlFor="input-ticket-description"
          className="block text-xs font-semibold text-slate-700"
        >
          {tr('Details and Facts', 'รายละเอียดและข้อเท็จจริง')}{' '}
          <span className="text-rose-500">*</span>
        </label>
        {description.length > 0 && (
          <span className="text-[10.5px] text-slate-400">
            {description.length} {tr('characters', 'ตัวอักษร')}
          </span>
        )}
      </div>
      <textarea
        id="input-ticket-description"
        required
        rows={3}
        placeholder={tr(
          'Describe the incident, date/time, impact, or proposed corrective actions clearly...',
          'อธิบายเหตุการณ์ วันเวลา ผลกระทบ หรือข้อเสนอแนะที่ต้องการให้องค์กรปรับปรุงแก้ไขอย่างชัดเจน...'
        )}
        value={description}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
      />
    </div>
  );
};

interface AiAssistantSlice {
  isAnalyzing: boolean;
  result: AICategorySuggestionResult | null;
  notice: string | null;
  suggest: (customTitle?: string, customDesc?: string) => Promise<void>;
  dismissResult: () => void;
  dismissNotice: () => void;
}

interface AiAssistantPanelsProps {
  ai: AiAssistantSlice;
  description: string;
  category: GrievanceCategory;
  onApplyCategory: (category: GrievanceCategory) => void;
  onUseSample: (title: string, description: string) => void;
}

/** The helper pill, the recommendation box and the notice — each only when it applies. */
const AiAssistantPanels: React.FC<Readonly<AiAssistantPanelsProps>> = ({
  ai,
  description,
  category,
  onApplyCategory,
  onUseSample,
}) => {
  const showPill =
    !ai.result && !ai.isAnalyzing && description.length >= AI_PILL_MIN_DESCRIPTION_LENGTH;
  return (
    <>
      {/* Quick Helper Pill when user has entered description and hasn't used AI yet */}
      {showPill && <AiHelperPill onAnalyze={() => ai.suggest()} />}

      {/* AI Category Assistant Recommendation Box */}
      {ai.result && (
        <AiRecommendation
          result={ai.result}
          category={category}
          onApply={onApplyCategory}
          onDismiss={ai.dismissResult}
        />
      )}

      {/* AI Helper Notice if empty */}
      {ai.notice && (
        <AiNotice notice={ai.notice} onDismiss={ai.dismissNotice} onUseSample={onUseSample} />
      )}
    </>
  );
};

interface DetailsSectionProps {
  title: string;
  description: string;
  locationOrUnit: string;
  category: GrievanceCategory;
  ai: AiAssistantSlice;
  pendingFiles: PendingFile[];
  isSubmitting: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onApplyCategory: (category: GrievanceCategory) => void;
  onUseSample: (title: string, description: string) => void;
  onAddAttachments: (added: PendingFile[]) => void;
  onRemoveAttachment: (id: string) => void;
}

/** Step 5: grievance content, the AI category assistant and the attachment picker. */
export const DetailsSection: React.FC<Readonly<DetailsSectionProps>> = ({
  title,
  description,
  locationOrUnit,
  category,
  ai,
  pendingFiles,
  isSubmitting,
  onTitleChange,
  onDescriptionChange,
  onLocationChange,
  onApplyCategory,
  onUseSample,
  onAddAttachments,
  onRemoveAttachment,
}) => (
  <div className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
    <DetailsHeader isAnalyzing={ai.isAnalyzing} onSuggest={() => ai.suggest()} />
    <TitleLocationFields
      title={title}
      locationOrUnit={locationOrUnit}
      onTitleChange={onTitleChange}
      onLocationChange={onLocationChange}
    />
    <DescriptionField description={description} onChange={onDescriptionChange} />
    <AiAssistantPanels
      ai={ai}
      description={description}
      category={category}
      onApplyCategory={onApplyCategory}
      onUseSample={onUseSample}
    />
    <AttachmentPicker
      files={pendingFiles}
      disabled={isSubmitting}
      onAdd={onAddAttachments}
      onRemove={onRemoveAttachment}
    />
  </div>
);
