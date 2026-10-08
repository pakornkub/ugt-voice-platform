'use client';

import React, { useState } from 'react';
import { Search, Clock, Star, Crown, ArrowRight, Plus } from 'lucide-react';
import { ComplaintTicket } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import {
  getStatusBadgeText,
  getStatusColor,
  getUrgencyBadgeText,
  getUrgencyColor,
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface MyTicketsListProps {
  tickets: ComplaintTicket[];
  onOpenTracking: (trackingCode: string) => void;
  onOpenSatisfaction: (ticket: ComplaintTicket) => void;
  onNavigateToSubmit: () => void;
}

export const MyTicketsList: React.FC<Readonly<MyTicketsListProps>> = ({
  tickets = [],
  onOpenTracking,
  onOpenSatisfaction,
  onNavigateToSubmit,
}) => {
  const { lang } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED' | 'CLOSED'>('ALL');

  const safeTickets = tickets || [];

  const filteredTickets = safeTickets.filter((t) => {
    if (statusFilter === 'ACTIVE' && (t.status === 'resolved' || t.status === 'closed'))
      return false;
    if (statusFilter === 'RESOLVED' && t.status !== 'resolved') return false;
    if (statusFilter === 'CLOSED' && t.status !== 'closed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.trackingCode.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.gatekeeperDepartment.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {lang === 'en'
              ? 'My Grievance & Suggestion History'
              : 'รายการคำร้องของฉัน (My Grievance & Suggestion History)'}
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            {lang === 'en'
              ? 'Track progress, review official responses, and evaluate resolution satisfaction.'
              : 'ติดตามสถานะการดำเนินการ ตรวจสอบประวัติการตอบกลับ และประเมินความพึงพอใจ'}
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToSubmit}
          className="flex items-center gap-1.5 self-start rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>{lang === 'en' ? 'New Submission' : 'ยื่นเรื่องใหม่'}</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              lang === 'en'
                ? 'Search by Tracking Code, title, dept...'
                : 'ค้นหาด้วย Tracking Code หรือชื่อเรื่อง...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-9 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="no-scrollbar flex w-full items-center gap-1.5 overflow-x-auto sm:w-auto">
          {[
            { key: 'ALL', labelTh: 'ทั้งหมด', labelEn: 'All' },
            { key: 'ACTIVE', labelTh: 'อยู่ระหว่างดำเนินการ', labelEn: 'In Progress' },
            {
              key: 'RESOLVED',
              labelTh: '⭐ รอการประเมิน (Resolved)',
              labelEn: '⭐ Awaiting CSAT (Resolved)',
            },
            { key: 'CLOSED', labelTh: 'ปิดเคสแล้ว', labelEn: 'Closed' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key as 'ALL' | 'ACTIVE' | 'RESOLVED' | 'CLOSED')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                statusFilter === tab.key
                  ? 'bg-indigo-600 font-bold text-white shadow-xs'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {lang === 'en' ? tab.labelEn : tab.labelTh}
            </button>
          ))}
        </div>
      </div>

      {/* Cards list */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
            {lang === 'en'
              ? 'No grievance or suggestion records found matching your query.'
              : 'ไม่พบรายการคำร้องที่ค้นหา'}
          </div>
        ) : (
          filteredTickets.map((t) => {
            const catInfo = CATEGORY_DEFINITIONS[t.category];
            const isResolved = t.status === 'resolved';

            return (
              <div
                key={t.id}
                id={`my-ticket-${t.id}`}
                className={`flex flex-col justify-between gap-4 rounded-2xl border bg-white p-4 shadow-xs transition sm:flex-row sm:items-center sm:p-5 ${
                  isResolved
                    ? 'border-amber-300 bg-amber-50/10 ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">
                      {t.trackingCode}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusColor(t.status)}`}
                    >
                      {getStatusBadgeText(t.status, lang)}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[11px] font-medium ${catInfo?.badgeColor}`}
                    >
                      {lang === 'en' ? catInfo?.nameEn : catInfo?.nameTh}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${getUrgencyColor(t.urgency)}`}
                    >
                      {getUrgencyBadgeText(t.urgency, lang)}
                    </span>
                    {t.isDirectToExecutive && (
                      <span className="inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                        <Crown className="h-3 w-3 text-purple-600" />
                        {lang === 'en' ? 'Executive Direct' : 'สายตรงผู้บริหาร'}
                      </span>
                    )}
                    {t.type === 'suggestion' ? (
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        {lang === 'en' ? '💡 Suggestion' : '💡 ข้อเสนอแนะ'}
                      </span>
                    ) : (
                      <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        {lang === 'en' ? '⚠️ Grievance' : '⚠️ ข้อร้องเรียน'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 sm:text-base">{t.title}</h3>
                  <p className="line-clamp-2 text-xs text-slate-600">{t.description}</p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-500">
                    <span>
                      {lang === 'en' ? 'Category: ' : 'หมวดหมู่: '}
                      <strong className="text-slate-800">
                        {catInfo?.nameTh || t.gatekeeperDepartment}
                      </strong>
                    </span>
                    <span>
                      {lang === 'en' ? 'Officer: ' : 'ผู้รับผิดชอบ: '}
                      <strong className="text-slate-800">
                        {t.assignedOfficerName ||
                          (lang === 'en' ? 'Awaiting assignment' : 'อยู่ระหว่างมอบหมาย')}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {lang === 'en' ? 'Submitted: ' : 'ยื่นเมื่อ: '}
                      {new Date(t.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'th-TH')}
                    </span>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex shrink-0 flex-row items-center gap-2 border-t border-slate-100 pt-2 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                  {isResolved && (
                    <button
                      type="button"
                      id={`btn-csat-${t.id}`}
                      onClick={() => onOpenSatisfaction(t)}
                      className="flex w-full animate-pulse items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-amber-600 sm:w-auto"
                    >
                      <Star className="h-3.5 w-3.5 fill-white" />
                      <span>
                        {lang === 'en'
                          ? 'Evaluate Satisfaction (CSAT)'
                          : 'ประเมินความพึงพอใจ (CSAT)'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    id={`btn-view-timeline-${t.id}`}
                    onClick={() => onOpenTracking(t.trackingCode)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 sm:w-auto"
                  >
                    <span>{lang === 'en' ? 'Track Progress' : 'ติดตามความคืบหน้า'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
