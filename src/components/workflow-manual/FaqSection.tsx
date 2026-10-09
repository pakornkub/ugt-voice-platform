import { ChevronRight, HelpCircle, Search } from 'lucide-react';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { localize, pick } from './helpers';
import { FAQ_ITEMS } from './manualData';
import type { FaqItem } from './types';
import { PanelHeader } from './ui';

const filterFaqs = (
  items: readonly FaqItem[],
  query: string,
  lang: Language
): readonly FaqItem[] => {
  if (query.trim() === '') return items;
  const needle = query.toLowerCase();
  return items.filter(
    (f) =>
      localize(lang, f.q).toLowerCase().includes(needle) ||
      localize(lang, f.a).toLowerCase().includes(needle)
  );
};

interface FaqRowProps {
  faq: FaqItem;
  isExpanded: boolean;
  onToggle: () => void;
}

const FaqRow = ({ faq, isExpanded, onToggle }: Readonly<FaqRowProps>) => {
  const { lang } = useLanguage();
  return (
    <div
      className={`rounded-xl border transition ${
        isExpanded
          ? 'border-indigo-300 bg-indigo-50/30'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-4 text-left text-xs font-bold text-slate-900"
      >
        <span>{localize(lang, faq.q)}</span>
        <ChevronRight
          className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`}
        />
      </button>
      {isExpanded && (
        <div className="border-t border-indigo-100 px-4 pt-3 pb-4 text-xs leading-relaxed text-slate-600">
          {localize(lang, faq.a)}
        </div>
      )}
    </div>
  );
};

interface FaqSectionProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  expandedIndex: number | null;
  onExpandedIndexChange: (index: number | null) => void;
}

export const FaqSection = ({
  searchQuery,
  onSearchQueryChange,
  expandedIndex,
  onExpandedIndexChange,
}: Readonly<FaqSectionProps>) => {
  const { lang } = useLanguage();
  const filteredFaqs = filterFaqs(FAQ_ITEMS, searchQuery, lang);

  return (
    <div className="space-y-6">
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
        <PanelHeader
          className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center"
          iconBoxClass="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-600"
          icon={<HelpCircle className="h-6 w-6" />}
          title={pick(
            lang,
            'Frequently Asked Questions (FAQ)',
            'คำถามที่พบบ่อย (Frequently Asked Questions - FAQ)'
          )}
          subtitle={pick(
            lang,
            'Common questions and tips for using the complaints and suggestions system',
            'รวบรวมข้อสงสัยและคำแนะนำในการใช้งานระบบรับเรื่องร้องเรียนและข้อเสนอแนะ'
          )}
        >
          {/* Search Box in FAQ */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder={pick(
                lang,
                'Search questions / keywords...',
                'ค้นหาคำถาม / คีย์เวิร์ด...'
              )}
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pr-3 pl-9 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </PanelHeader>

        <div className="space-y-3">
          {filteredFaqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <FaqRow
                key={faq.q.th}
                faq={faq}
                isExpanded={isExpanded}
                onToggle={() => onExpandedIndexChange(isExpanded ? null : index)}
              />
            );
          })}

          {filteredFaqs.length === 0 && (
            <div className="py-10 text-center text-slate-400">
              <HelpCircle className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-xs">
                {pick(lang, 'No questions match the search', 'ไม่พบคำถามที่ตรงกับคำค้นหา')} &quot;
                {searchQuery}&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
