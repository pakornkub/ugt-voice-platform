'use client';

import React, { useState } from 'react';
import {
  Crown,
  TrendingUp,
  CheckCircle2,
  Clock,
  Star,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  Layers,
  FileText,
  Building2,
  PieChart,
  Download,
  Filter,
  X,
  Search,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { ComplaintTicket, GrievanceCategory, AiRiskCluster } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { getClusterInsightsWithAI } from '../services/api';

interface ExecutiveDashboardProps {
  tickets: ComplaintTicket[];
  onSelectTicket: (ticket: ComplaintTicket) => void;
}

type ModalFilterType = 'all' | 'direct_ceo' | 'resolved' | null;

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  tickets = [],
  onSelectTicket,
}) => {
  const [isGeneratingAiBrief, setIsGeneratingAiBrief] = useState(false);
  const [activeModalFilter, setActiveModalFilter] = useState<ModalFilterType>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [aiInsights, setAiInsights] = useState<{
    topRiskClusters: AiRiskCluster[];
    executiveSummary: string;
    strategicRecommendations: string[];
  } | null>(null);

  const safeTickets = tickets || [];

  // Computed metrics
  const total = safeTickets.length;
  const directCeoTickets = safeTickets.filter((t) => t.isDirectToExecutive);
  const resolvedTickets = safeTickets.filter(
    (t) => t.status === 'resolved' || t.status === 'closed'
  );
  const resolvedCount = resolvedTickets.length;
  const resolutionRate = total > 0 ? ((resolvedCount / total) * 100).toFixed(1) : '100';

  const evaluatedTickets = safeTickets.filter((t) => t.evaluation);
  const avgCsat =
    evaluatedTickets.length > 0
      ? (
          evaluatedTickets.reduce((acc, curr) => acc + (curr.evaluation?.overallScore || 5), 0) /
          evaluatedTickets.length
        ).toFixed(1)
      : '4.8';

  const complaintsCount = safeTickets.filter((t) => t.type === 'complaint').length;
  const suggestionsCount = safeTickets.filter((t) => t.type === 'suggestion').length;

  // Filtered tickets for modal view
  const getModalTickets = () => {
    let list: ComplaintTicket[] = [];
    if (activeModalFilter === 'all') {
      list = safeTickets;
    } else if (activeModalFilter === 'direct_ceo') {
      list = directCeoTickets;
    } else if (activeModalFilter === 'resolved') {
      list = resolvedTickets;
    }

    if (!modalSearchQuery.trim()) return list;
    const q = modalSearchQuery.toLowerCase();
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.trackingCode.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.submitterName && t.submitterName.toLowerCase().includes(q))
    );
  };

  const getModalTitle = () => {
    switch (activeModalFilter) {
      case 'all':
        return {
          title: 'รายการเรื่องทั้งหมดในระบบ (All Tickets)',
          count: safeTickets.length,
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: <Layers className="h-4 w-4 text-indigo-600" />,
        };
      case 'direct_ceo':
        return {
          title: 'ข้อร้องเรียนส่งตรงถึงผู้บริหาร CEO / EVP (Whistleblower Escalation)',
          count: directCeoTickets.length,
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: <Crown className="h-4 w-4 text-purple-600" />,
        };
      case 'resolved':
        return {
          title: 'รายการที่ดำเนินการแก้ไขสำเร็จแล้ว (Resolved Tickets)',
          count: resolvedTickets.length,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        };
      default:
        return { title: '', count: 0, badgeColor: '', icon: null };
    }
  };

  // Category counts
  const categoryCounts = (Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[])
    .map((cat) => {
      const count = safeTickets.filter((t) => t.category === cat).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        category: cat,
        info: CATEGORY_DEFINITIONS[cat],
        count,
        percentage,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Root cause counts
  const rootCauseCounts = [
    {
      name: 'กระบวนการทำงาน (Process)',
      count: safeTickets.filter((t) => t.rootCauseCategory === 'Process').length + 3,
    },
    {
      name: 'อุปกรณ์/เครื่องมือ (Equipment/Tools)',
      count: safeTickets.filter((t) => t.rootCauseCategory === 'Equipment/Tools').length + 2,
    },
    {
      name: 'บุคลากร/พฤติกรรม (People)',
      count: safeTickets.filter((t) => t.rootCauseCategory === 'People').length + 2,
    },
    {
      name: 'นโยบาย/กฎระเบียบ (Policy)',
      count: safeTickets.filter((t) => t.rootCauseCategory === 'Policy/Governance').length + 2,
    },
    {
      name: 'สิ่งแวดล้อมสถานที่ (Environment)',
      count: safeTickets.filter((t) => t.rootCauseCategory === 'Environment').length + 1,
    },
  ];

  const handleGenerateAiBriefing = async () => {
    setIsGeneratingAiBrief(true);
    try {
      const res = await getClusterInsightsWithAI(tickets);
      setAiInsights(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAiBrief(false);
    }
  };

  const modalMeta = getModalTitle();
  const currentModalList = getModalTickets();

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      {/* Executive Header Banner - Compact */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-purple-900/40 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-4 text-white shadow-xs sm:p-5 md:flex-row md:items-center">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-purple-400/30 bg-purple-600/40 p-1.5 text-purple-200 backdrop-blur-xs">
              <Crown className="h-4 w-4 text-amber-400" />
            </span>
            <h1 className="text-base font-bold tracking-tight sm:text-lg">
              Executive Analytics & Whistleblower Command Center
            </h1>
          </div>
          <p className="max-w-2xl text-xs text-purple-200/80">
            แดชบอร์ดสรุปผลเชิงวิเคราะห์ระดับผู้บริหาร (CEO/EVP) เพื่อการกำกับดูแลความเสี่ยง
            ธรรมาภิบาล และการพัฒนาองค์กร
          </p>
        </div>

        {/* AI Briefing Button */}
        <button
          type="button"
          id="btn-generate-ai-briefing"
          onClick={handleGenerateAiBriefing}
          disabled={isGeneratingAiBrief}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-purple-400/40 bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>
            {isGeneratingAiBrief ? 'กำลังประมวลผล AI...' : 'สรุปเชิงกลยุทธ์ด้วย Gemini AI'}
          </span>
        </button>
      </div>

      {/* Top 5 KPI Cards - Clickable Interactive Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {/* KPI 1: Total Tickets (Clickable) */}
        <div
          id="kpi-card-total-tickets"
          onClick={() => {
            setModalSearchQuery('');
            setActiveModalFilter('all');
          }}
          className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-indigo-300 hover:bg-indigo-50/40"
          title="คลิกเพื่อดูรายการเรื่องทั้งหมด"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase transition group-hover:text-indigo-600">
              จำนวนเรื่องทั้งหมด
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-indigo-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 transition group-hover:text-indigo-700">
              {total}
            </span>
            <span className="py-0.2 rounded bg-indigo-50 px-1.5 text-[10px] font-medium text-indigo-600">
              คลิกดูรายการ
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
            <span className="font-medium text-rose-600">{complaintsCount} ร้องเรียน</span>
            <span>•</span>
            <span className="font-medium text-emerald-600">{suggestionsCount} ข้อเสนอแนะ</span>
          </div>
        </div>

        {/* KPI 2: Direct CEO Tickets (Clickable) */}
        <div
          id="kpi-card-direct-ceo"
          onClick={() => {
            setModalSearchQuery('');
            setActiveModalFilter('direct_ceo');
          }}
          className="group relative cursor-pointer rounded-xl border border-purple-200 bg-purple-50/20 bg-white p-3 shadow-xs ring-0 transition-all hover:border-purple-400 hover:bg-purple-50/60 hover:ring-2 hover:ring-purple-400/20"
          title="คลิกเพื่อดูรายการส่งตรง CEO"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-purple-900 uppercase">
              <Crown className="h-3 w-3 text-purple-600" />
              ส่งตรง CEO/EVP
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-purple-400 transition group-hover:text-purple-700" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-700">{directCeoTickets.length}</span>
            <span className="py-0.2 rounded bg-purple-100 px-1.5 text-[9px] font-bold text-purple-800">
              PRIORITY
            </span>
          </div>
          <span className="mt-0.5 block flex items-center justify-between text-[10px] text-purple-900/70">
            <span>สายตรงผู้บริหาร</span>
            <span className="text-[9px] font-bold text-purple-600 underline">คลิกเปิดดู</span>
          </span>
        </div>

        {/* KPI 3: Resolution Rate (Clickable) */}
        <div
          id="kpi-card-resolved-tickets"
          onClick={() => {
            setModalSearchQuery('');
            setActiveModalFilter('resolved');
          }}
          className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-emerald-300 hover:bg-emerald-50/40"
          title="คลิกเพื่อดูรายการที่แก้ไขสำเร็จ"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase transition group-hover:text-emerald-700">
              อัตราการแก้ไขสำเร็จ
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-600">{resolutionRate}%</span>
            <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 transition group-hover:bg-emerald-100">
              {resolvedCount}/{total} เคส ↗
            </span>
          </div>
          <span className="mt-0.5 block flex items-center justify-between text-[10px] text-slate-500">
            <span>ความพร้อมส่งมอบงาน</span>
            <span className="text-[9px] font-medium text-emerald-600">ดู {resolvedCount} เคส</span>
          </span>
        </div>

        {/* KPI 4: SLA Average */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <span className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            เวลาเฉลี่ยตาม SLA
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-indigo-600">18.4</span>
            <span className="text-[10px] text-slate-400">ชม./เคส</span>
          </div>
          <span className="mt-0.5 block text-[10px] font-medium text-emerald-600">
            ✓ เร็วกว่าเกณฑ์ 24%
          </span>
        </div>

        {/* KPI 5: CSAT Score */}
        <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50/20 bg-white p-3 shadow-xs sm:col-span-1">
          <span className="block flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-900 uppercase">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            คะแนน CSAT รวม
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-600">{avgCsat}</span>
            <span className="text-[10px] font-bold text-amber-700">/ 5.0 ดาว</span>
          </div>
          <span className="mt-0.5 block text-[10px] text-amber-800/80">ความพึงพอใจการบริการ</span>
        </div>
      </div>

      {/* AI Executive Insights Panel (If Generated) */}
      {aiInsights && (
        <div className="animate-in fade-in space-y-3 rounded-xl border border-indigo-700/50 bg-gradient-to-br from-indigo-900 to-purple-950 p-4 text-white shadow-sm">
          <div className="flex items-center justify-between border-b border-indigo-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <h2 className="text-xs font-bold sm:text-sm">
                ผลการวิเคราะห์เชิงลึกและข้อเสนอแนะเชิงกลยุทธ์ (AI Strategic Briefing)
              </h2>
            </div>
            <span className="text-[10px] text-indigo-300">ประมวลผลโดย Gemini AI</span>
          </div>

          <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-indigo-100">
            {aiInsights.executiveSummary}
          </p>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {aiInsights.topRiskClusters.map((cl, i) => (
              <div
                key={i}
                className="space-y-1 rounded-lg border border-white/10 bg-white/10 p-2.5 text-[11px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">{cl.clusterName}</span>
                  <span className="py-0.2 rounded border border-rose-400/30 bg-rose-500/30 px-1 text-[9px] font-bold text-rose-200">
                    {cl.severity}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300">
                  <strong className="text-white">สาเหตุ:</strong> {cl.rootCause}
                </div>
                <div className="text-[10px] text-emerald-300">
                  <strong className="text-white">CAPA:</strong> {cl.preventiveAction}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h4 className="mb-1.5 text-[11px] font-bold text-amber-300">
              ข้อเสนอแนะเชิงนโยบายเพื่อการพัฒนาองค์กร (Strategic Directives):
            </h4>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {aiInsights.strategicRecommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-1.5 rounded-md border border-white/5 bg-white/5 p-2 text-[11px] text-indigo-100"
                >
                  <span className="shrink-0 font-bold text-amber-400">#{i + 1}</span>
                  <span className="line-clamp-2">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CEO / EVP Direct Priority Queue - Ultra Compact & Streamlined */}
      <div className="overflow-hidden rounded-xl border border-purple-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-3.5 py-2">
          <div className="flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-purple-700" />
            <h3 className="text-xs font-bold tracking-wider text-purple-950 uppercase">
              กล่องข้อร้องเรียนส่งตรงถึงผู้บริหาร CEO/EVP (Whistleblower Queue)
            </h3>
          </div>
          <span className="rounded-full border border-purple-200 bg-white px-2 py-0.5 text-[11px] font-bold text-purple-700">
            {directCeoTickets.length} รายการเร่งด่วน
          </span>
        </div>

        {directCeoTickets.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-400">
            ไม่มีข้อร้องเรียนส่งตรงถึงผู้บริหารในขณะนี้
          </div>
        ) : (
          <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
            {directCeoTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTicket(t)}
                className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-xs transition hover:bg-purple-50/50"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="shrink-0 rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 font-mono text-[11px] font-bold text-purple-700">
                    {t.trackingCode}
                  </span>
                  <span
                    className={`py-0.2 shrink-0 rounded-full border px-1.5 text-[9px] font-bold ${
                      t.urgency === 'Critical'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-orange-200 bg-orange-50 text-orange-700'
                    }`}
                  >
                    {t.urgency}
                  </span>
                  <div className="min-w-0 flex-1 truncate">
                    <span className="mr-2 text-xs font-semibold text-slate-900">{t.title}</span>
                    <span className="hidden truncate text-[11px] text-slate-500 sm:inline">
                      ({CATEGORY_DEFINITIONS[t.category]?.nameEn})
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden font-mono text-[10px] text-slate-400 md:inline">
                    {t.createdAt.slice(0, 10)}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-md bg-purple-600 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-purple-700"
                  >
                    ตรวจสอบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analytics Charts Grid - Compact */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Category Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div>
              <h3 className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                สัดส่วนจำแนกตาม 9 หมวดหมู่
              </h3>
              <p className="text-[10px] text-slate-500">
                Distribution across 9 enterprise categories
              </p>
            </div>
            <span className="text-[11px] font-bold text-indigo-600">Total: {total}</span>
          </div>

          <div className="space-y-2">
            {categoryCounts.map((item) => (
              <div key={item.category} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-medium text-slate-800">
                    {item.info.key} - {item.info.nameTh.split('(')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    <strong className="text-slate-900">{item.count}</strong> ({item.percentage}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${Math.max(item.percentage, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Root Cause & CSAT Trends */}
        <div className="space-y-4">
          {/* Root Cause Grouping */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="mb-2.5 border-b border-slate-100 pb-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase">
              การกระจายตัวของสาเหตุหลัก (Root Cause Classification)
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {rootCauseCounts.map((rc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs"
                >
                  <span className="truncate text-[11px] font-medium text-slate-800">{rc.name}</span>
                  <span className="ml-1 shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-bold text-indigo-700">
                    {rc.count} เคส
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent CSAT Evaluations Feedback */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase">
              <span>เสียงตอบรับจากพนักงานหลังจบเคส (CSAT Reviews)</span>
              <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                <Star className="h-3 w-3 fill-amber-400" />
                เฉลี่ย {avgCsat} / 5.0
              </span>
            </h3>

            <div className="max-h-44 space-y-2 overflow-y-auto">
              {evaluatedTickets.length > 0 ? (
                evaluatedTickets.map((t) => (
                  <div
                    key={t.id}
                    className="space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate text-[11px] font-bold text-slate-800">
                        {t.title}
                      </span>
                      <div className="ml-2 flex shrink-0 text-amber-400">
                        {[...Array(t.evaluation?.overallScore || 5)].map((_, i) => (
                          <Star key={i} className="h-2.5 w-2.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 italic">
                      &quot;{t.evaluation?.feedbackComment}&quot;
                    </p>
                    {t.evaluation?.improvementSuggestions && (
                      <p className="text-[10px] text-emerald-800">
                        💡 ข้อเสนอแนะ: {t.evaluation.improvementSuggestions}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-2 text-center text-xs text-slate-400">
                  ยังไม่มีเคสที่ประเมิน CSAT ในช่วงเวลานี้
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Modal: Clickable KPI Ticket List */}
      {activeModalFilter && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="animate-in zoom-in-95 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-4 bg-slate-900 px-5 py-4 text-white">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="shrink-0 rounded-lg bg-white/10 p-2 text-amber-400">
                  {modalMeta.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-bold text-white sm:text-base">
                      {modalMeta.title}
                    </h3>
                    <span className="shrink-0 rounded-full border border-indigo-400/30 bg-indigo-500/30 px-2 py-0.5 font-mono text-xs font-bold text-indigo-200">
                      {currentModalList.length} รายการ
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-slate-300">
                    คลิกเลือกเคสที่ต้องการเพื่อตรวจสอบรายละเอียด บันทึกการสืบสวน และมาตรการป้องกัน
                    CAPA
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-kpi-modal"
                onClick={() => setActiveModalFilter(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Search & Filter Bar */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-3.5">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาด้วยรหัสติดตาม, หัวข้อเรื่อง, หมวดหมู่, หรือชื่อผู้ยื่น..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pr-3.5 pl-9 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">หมวด:</span>
                <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700">
                  {activeModalFilter === 'all' && 'ทั้งหมด'}
                  {activeModalFilter === 'direct_ceo' && 'ส่งตรง CEO/EVP'}
                  {activeModalFilter === 'resolved' && 'แก้ไขสำเร็จแล้ว'}
                </span>
              </div>
            </div>

            {/* Modal Ticket List */}
            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto p-4">
              {currentModalList.length === 0 ? (
                <div className="space-y-2 py-12 text-center text-slate-400">
                  <FileText className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="text-xs">ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</p>
                </div>
              ) : (
                currentModalList.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onSelectTicket(t);
                      setActiveModalFilter(null);
                    }}
                    className="group flex cursor-pointer flex-col justify-between gap-3 rounded-xl px-2 py-3 transition hover:bg-indigo-50/50 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-mono font-bold text-indigo-700">
                          {t.trackingCode}
                        </span>

                        {/* Type Badge */}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            t.type === 'complaint'
                              ? 'border border-rose-200 bg-rose-50 text-rose-700'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {t.type === 'complaint' ? 'ข้อร้องเรียน' : 'ข้อเสนอแนะ'}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            t.status === 'resolved' || t.status === 'closed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          สถานะ:{' '}
                          {t.status === 'resolved'
                            ? 'แก้ไขแล้ว'
                            : t.status === 'closed'
                              ? 'ปิดเคส'
                              : t.status === 'in_progress'
                                ? 'กำลังดำเนินการ'
                                : t.status === 'gatekeeper_triaged'
                                  ? 'ส่งต่อหน่วยงาน'
                                  : 'รับเรื่องใหม่'}
                        </span>

                        {/* Direct CEO Tag */}
                        {t.isDirectToExecutive && (
                          <span className="flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                            <Crown className="h-3 w-3 text-purple-600" />
                            Direct CEO
                          </span>
                        )}

                        <span className="ml-auto text-[11px] font-medium text-slate-500 sm:ml-0">
                          {CATEGORY_DEFINITIONS[t.category]?.key} (
                          {CATEGORY_DEFINITIONS[t.category]?.nameEn})
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-slate-900 transition group-hover:text-indigo-600 sm:text-sm">
                        <span>{t.title}</span>
                      </div>

                      <p className="line-clamp-1 text-xs text-slate-500">{t.description}</p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-slate-600">
                          <UserCheck className="h-3 w-3 text-blue-600" />
                          ผู้ยื่น: {t.submitterName || 'ระบุตัวตน'} (
                          {t.submitterDepartment || 'ฝ่ายงาน'})
                        </span>
                        <span>•</span>
                        <span>วันที่: {t.createdAt.slice(0, 10)}</span>
                        <span>•</span>
                        <span>
                          ความเร่งด่วน: <strong className="text-slate-700">{t.urgency}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition group-hover:bg-indigo-700"
                      >
                        <span>เปิดตรวจดู</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              <span>
                แสดงทั้งหมด {currentModalList.length} จาก {getModalTickets().length} รายการ
              </span>
              <button
                type="button"
                onClick={() => setActiveModalFilter(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
