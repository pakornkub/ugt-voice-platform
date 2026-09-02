'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  Star, 
  Crown, 
  ArrowRight, 
  Filter, 
  ShieldAlert, 
  Lightbulb, 
  EyeOff, 
  User,
  Plus
} from 'lucide-react';
import { ComplaintTicket, TicketStatus } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { getStatusBadgeText, getStatusColor } from '../services/api';

interface MyTicketsListProps {
  tickets: ComplaintTicket[];
  onOpenTracking: (trackingCode: string) => void;
  onOpenSatisfaction: (ticket: ComplaintTicket) => void;
  onNavigateToSubmit: () => void;
}

export const MyTicketsList: React.FC<MyTicketsListProps> = ({
  tickets = [],
  onOpenTracking,
  onOpenSatisfaction,
  onNavigateToSubmit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED' | 'CLOSED'>('ALL');

  const safeTickets = tickets || [];

  const filteredTickets = safeTickets.filter((t) => {
    if (statusFilter === 'ACTIVE' && (t.status === 'resolved' || t.status === 'closed')) return false;
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
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            รายการคำร้องของฉัน (My Grievance & Suggestion History)
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            ติดตามสถานะการดำเนินการ ตรวจสอบประวัติการตอบกลับ และประเมินความพึงพอใจ
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToSubmit}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>ยื่นเรื่องใหม่</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาด้วย Tracking Code หรือชื่อเรื่อง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {[
            { key: 'ALL', label: 'ทั้งหมด' },
            { key: 'ACTIVE', label: 'อยู่ระหว่างดำเนินการ' },
            { key: 'RESOLVED', label: '⭐ รอการประเมิน (Resolved)' },
            { key: 'CLOSED', label: 'ปิดเคสแล้ว' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                statusFilter === tab.key
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards list */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            ไม่พบรายการคำร้องที่ค้นหา
          </div>
        ) : (
          filteredTickets.map((t) => {
            const catInfo = CATEGORY_DEFINITIONS[t.category];
            const isResolved = t.status === 'resolved';

            return (
              <div
                key={t.id}
                id={`my-ticket-${t.id}`}
                className={`bg-white rounded-2xl border transition p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isResolved
                    ? 'border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/10'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {t.trackingCode}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(t.status)}`}>
                      {getStatusBadgeText(t.status)}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${catInfo?.badgeColor}`}>
                      {catInfo?.nameEn}
                    </span>
                    {t.isDirectToExecutive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        <Crown className="w-3 h-3 text-purple-600" />
                        สายตรงผู้บริหาร
                      </span>
                    )}
                    {t.type === 'suggestion' ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        💡 ข้อเสนอแนะ
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        ⚠️ ข้อร้องเรียน
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {t.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {t.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>หน่วยงานรับเรื่อง: <strong className="text-slate-800">{t.gatekeeperDepartment}</strong></span>
                    <span>ผู้รับผิดชอบ: <strong className="text-slate-800">{t.assignedOfficerName || 'อยู่ระหว่างมอบหมาย'}</strong></span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      ยื่นเมื่อ: {new Date(t.createdAt).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {isResolved && (
                    <button
                      type="button"
                      id={`btn-csat-${t.id}`}
                      onClick={() => onOpenSatisfaction(t)}
                      className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>ประเมินความพึงพอใจ (CSAT)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id={`btn-view-timeline-${t.id}`}
                    onClick={() => onOpenTracking(t.trackingCode)}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <span>ติดตามความคืบหน้า</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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