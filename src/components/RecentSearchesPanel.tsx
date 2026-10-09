'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, X, Trash2, Copy, Check, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { RecentSearchItem, ComplaintTicket, TicketStatus } from '../types';
import { getRecentSearches, removeRecentSearch, clearRecentSearches } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface RecentSearchesPanelProps {
  isOpen: boolean;
  /** Tickets the signed-in user may see (ShellContext) — recent-search lookups and samples. */
  tickets: ComplaintTicket[];
  onClose: () => void;
  onSelectTicket: (ticket: ComplaintTicket) => void;
  onSearchAgain: (code: string) => void;
}

const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  submitted: 'border-sky-200 bg-sky-50 text-sky-700',
  gatekeeper_triaged: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-800',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  closed: 'border-slate-200 bg-slate-100 text-slate-700',
};

const StatusBadge: React.FC<Readonly<{ status?: TicketStatus }>> = ({ status }) => {
  const { getStatusName } = useLanguage();
  if (!status || !STATUS_BADGE_CLASS[status]) return null;
  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE_CLASS[status]}`}
    >
      {getStatusName(status)}
    </span>
  );
};

const formatRelativeTime = (isoString: string, lang: 'th' | 'en') => {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return lang === 'en' ? 'Just now' : 'เมื่อสักครู่';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return lang === 'en' ? `${diffMin}m ago` : `${diffMin} นาทีที่แล้ว`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return lang === 'en' ? `${diffHour}h ago` : `${diffHour} ชั่วโมงที่แล้ว`;
    return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const SearchHistoryRow: React.FC<
  Readonly<{
    item: RecentSearchItem;
    isCopied: boolean;
    onOpen: (item: RecentSearchItem) => void;
    onCopy: (code: string | undefined, e: React.MouseEvent) => void;
    onRemove: (id: string, e: React.MouseEvent) => void;
  }>
> = ({ item, isCopied, onOpen, onCopy, onRemove }) => {
  const { lang, getCategoryName } = useLanguage();
  const tr = (en: string, th: string) => (lang === 'en' ? en : th);

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-xs">
      {/* Whole-card click target (stretched button keeps the row keyboard accessible
          without nesting the copy/remove buttons inside another button) */}
      <button
        type="button"
        aria-label={item.trackingCode || item.query}
        onClick={() => onOpen(item)}
        className="absolute inset-0 cursor-pointer rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-indigo-900">
            {item.trackingCode || item.query}
          </span>

          {item.found ? (
            <>
              <StatusBadge status={item.status} />
              {item.category && (
                <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                  {getCategoryName(item.category)}
                </span>
              )}
            </>
          ) : (
            <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
              {tr('Not found', 'ไม่พบในระบบ')}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="relative z-10 flex items-center gap-1 opacity-80 group-hover:opacity-100">
          {item.trackingCode && (
            <button
              type="button"
              onClick={(e) => onCopy(item.trackingCode, e)}
              className="rounded p-1 text-slate-400 transition hover:bg-white hover:text-indigo-600"
              title={tr('Copy tracking code', 'คัดลอกรหัสติดตาม')}
              aria-label={tr('Copy tracking code', 'คัดลอกรหัสติดตาม')}
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => onRemove(item.id, e)}
            className="rounded p-1 text-slate-400 transition hover:bg-white hover:text-rose-600"
            title={tr('Delete this item', 'ลบรายการนี้')}
            aria-label={tr('Delete this item', 'ลบรายการนี้')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title and details if found */}
      {item.title ? (
        <p className="mt-1.5 line-clamp-2 text-xs font-medium text-slate-800">{item.title}</p>
      ) : (
        <p className="mt-1 text-xs text-slate-400 italic">
          {tr('Query', 'คำค้นหา')}: &quot;{item.query}&quot;
        </p>
      )}

      {/* Footer info */}
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1 font-mono">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(item.timestamp, lang)}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 transition group-hover:translate-x-0.5">
          {tr('View Timeline', 'เปิดดูไทม์ไลน์')}
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
};

const EmptyHistory: React.FC<
  Readonly<{
    hasFilter: boolean;
    sampleTickets: ComplaintTicket[];
    onPickSample: (ticket: ComplaintTicket) => void;
  }>
> = ({ hasFilter, sampleTickets, onPickSample }) => {
  const { lang } = useLanguage();
  const tr = (en: string, th: string) => (lang === 'en' ? en : th);

  const title = hasFilter
    ? tr('No matching search history', 'ไม่พบรายการที่ตรงกับคำค้นหา')
    : tr('No tracking search history yet', 'ยังไม่มีประวัติการค้นหาคำร้อง');
  const hint = hasFilter
    ? tr(
        'Try different keywords or clear the filter.',
        'ลองเปลี่ยนคำค้นหา หรือกดกากบาทเพื่อล้างตัวกรอง'
      )
    : tr(
        'When you search tracking codes (e.g. TK-2026-0001) in the Navbar, they will appear here for fast retrieval.',
        'เมื่อคุณพิมพ์ค้นหารหัสติดตาม (เช่น TK-2026-0001) ที่แถบค้นหา Navbar ระบบจะบันทึกรายการไว้ที่นี่เพื่อให้กลับมาดูซ้ำได้สะดวกรวดเร็ว'
      );

  return (
    <div className="px-4 py-12 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <History className="h-7 w-7" />
      </div>
      <h4 className="mb-1 text-sm font-bold text-slate-800">{title}</h4>
      <p className="mx-auto mb-6 max-w-xs text-xs leading-relaxed text-slate-500">{hint}</p>

      {/* Quick Suggestion Chips */}
      {!hasFilter && sampleTickets.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
          <span className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>
              {tr(
                'Click to inspect sample tickets in system:',
                'คลิกทดสอบค้นหารหัสตัวอย่างในระบบ:'
              )}
            </span>
          </span>
          <div className="space-y-2">
            {sampleTickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPickSample(t)}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left transition hover:border-indigo-200 hover:bg-indigo-50/70"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700">
                      {t.trackingCode}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="mt-0.5 max-w-xs truncate text-[11px] text-slate-600">{t.title}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-indigo-600" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Mounted only while open so the list is read from localStorage once per open
// (useState initializer) instead of an effect that sets state on every open.
const RecentSearchesPanelContent: React.FC<Readonly<Omit<RecentSearchesPanelProps, 'isOpen'>>> = ({
  tickets,
  onClose,
  onSelectTicket,
  onSearchAgain,
}) => {
  const { lang, t } = useLanguage();
  const tr = (en: string, th: string) => (lang === 'en' ? en : th);
  const [searches, setSearches] = useState<RecentSearchItem[]>(() => getRecentSearches());
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleClearAll = () => {
    const confirmMsg = tr(
      'Are you sure you want to clear all tracking search history?',
      'คุณต้องการล้างประวัติการค้นหารหัสติดตามทั้งหมดใช่หรือไม่?'
    );
    if (globalThis.confirm(confirmMsg)) {
      clearRecentSearches();
      setSearches([]);
    }
  };

  const handleRemoveOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeRecentSearch(id);
    setSearches(updated);
  };

  const handleCopy = (code: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleItemClick = (item: RecentSearchItem) => {
    const targetCode = item.trackingCode || item.query;
    const code = targetCode.trim().toLowerCase();
    const ticket = tickets.find((t) => t.trackingCode.toLowerCase() === code);
    if (ticket) {
      onSelectTicket(ticket);
    } else {
      onSearchAgain(targetCode);
    }
    onClose();
  };

  const handlePickSample = (ticket: ComplaintTicket) => {
    onSelectTicket(ticket);
    onClose();
  };

  // Sample tickets for quick testing if history is empty
  const activeTickets = tickets.slice(0, 4);

  const filteredSearches = searches.filter((item) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.query.toLowerCase().includes(q) ||
      item.trackingCode?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="recent-searches-panel-overlay">
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={tr('Close', 'ปิด')}
        className="fixed inset-0 cursor-default bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="flex w-screen max-w-md transform flex-col border-l border-slate-200 bg-white shadow-2xl transition duration-300 ease-in-out sm:max-w-lg">
          {/* PANEL HEADER */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/20 p-2.5 text-indigo-400">
                <History className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold tracking-tight text-white">
                    {tr('Recent Tracking Searches', 'ประวัติการค้นหาคำร้อง')}
                  </h3>
                  {searches.length > 0 && (
                    <span className="rounded-full border border-indigo-400/30 bg-indigo-500/30 px-2 py-0.5 text-[11px] font-bold text-indigo-300">
                      {searches.length} {tr('items', 'รายการ')}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {tr('Quickly revisit searched tickets', 'เข้าถึงคำร้องที่เคยค้นหาผ่าน Navbar')}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-close-recent-searches"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title={tr('Close (Esc)', 'ปิดหน้าต่าง (Esc)')}
              aria-label={tr('Close (Esc)', 'ปิดหน้าต่าง (Esc)')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* SEARCH & ACTION TOOLBAR */}
          <div className="space-y-3 border-b border-slate-200 bg-slate-50 p-4">
            <div className="relative">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                id="filter-recent-searches"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={tr('Filter search history...', 'กรองประวัติการค้นหา...')}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-8 pl-9 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  aria-label={tr('Clear filter', 'ล้างตัวกรอง')}
                  className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="text-[11px]">
                {tr(
                  'Click any item to view ticket timeline',
                  'คลิกที่รายการเพื่อเปิดติดตามสถานะคำร้องทันที'
                )}
              </span>
              {searches.length > 0 && (
                <button
                  type="button"
                  id="btn-clear-all-recent-searches"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{tr('Clear all history', 'ล้างประวัติทั้งหมด')}</span>
                </button>
              )}
            </div>
          </div>

          {/* LIST CONTAINER */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {filteredSearches.length === 0 ? (
              <EmptyHistory
                hasFilter={!!filterQuery}
                sampleTickets={activeTickets}
                onPickSample={handlePickSample}
              />
            ) : (
              <div className="space-y-2.5">
                {filteredSearches.map((item) => (
                  <SearchHistoryRow
                    key={item.id}
                    item={item}
                    isCopied={copiedCode === item.trackingCode}
                    onOpen={handleItemClick}
                    onCopy={handleCopy}
                    onRemove={handleRemoveOne}
                  />
                ))}
              </div>
            )}
          </div>

          {/* PANEL FOOTER GUIDANCE */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            <span className="text-[11px]">
              {tr(
                'Auto-saved to device (Local Storage)',
                'บันทึกประวัติอัตโนมัติบนอุปกรณ์นี้ (Local Storage)'
              )}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RecentSearchesPanel: React.FC<Readonly<RecentSearchesPanelProps>> = ({
  isOpen,
  ...rest
}) => (isOpen ? <RecentSearchesPanelContent {...rest} /> : null);
