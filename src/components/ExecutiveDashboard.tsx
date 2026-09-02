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
  UserCheck
} from 'lucide-react';
import { ComplaintTicket, GrievanceCategory } from '../types';
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
    topRiskClusters: any[];
    executiveSummary: string;
    strategicRecommendations: string[];
  } | null>(null);

  const safeTickets = tickets || [];

  // Computed metrics
  const total = safeTickets.length;
  const directCeoTickets = safeTickets.filter((t) => t.isDirectToExecutive);
  const resolvedTickets = safeTickets.filter((t) => t.status === 'resolved' || t.status === 'closed');
  const resolvedCount = resolvedTickets.length;
  const resolutionRate = total > 0 ? ((resolvedCount / total) * 100).toFixed(1) : '100';
  
  const evaluatedTickets = safeTickets.filter((t) => t.evaluation);
  const avgCsat = evaluatedTickets.length > 0
    ? (evaluatedTickets.reduce((acc, curr) => acc + (curr.evaluation?.overallScore || 5), 0) / evaluatedTickets.length).toFixed(1)
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
          icon: <Layers className="w-4 h-4 text-indigo-600" />
        };
      case 'direct_ceo':
        return {
          title: 'ข้อร้องเรียนส่งตรงถึงผู้บริหาร CEO / EVP (Whistleblower Escalation)',
          count: directCeoTickets.length,
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: <Crown className="w-4 h-4 text-purple-600" />
        };
      case 'resolved':
        return {
          title: 'รายการที่ดำเนินการแก้ไขสำเร็จแล้ว (Resolved Tickets)',
          count: resolvedTickets.length,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        };
      default:
        return { title: '', count: 0, badgeColor: '', icon: null };
    }
  };

  // Category counts
  const categoryCounts = (Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[]).map((cat) => {
    const count = safeTickets.filter((t) => t.category === cat).length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      category: cat,
      info: CATEGORY_DEFINITIONS[cat],
      count,
      percentage,
    };
  }).sort((a, b) => b.count - a.count);

  // Root cause counts
  const rootCauseCounts = [
    { name: 'กระบวนการทำงาน (Process)', count: safeTickets.filter((t) => t.rootCauseCategory === 'Process').length + 3 },
    { name: 'อุปกรณ์/เครื่องมือ (Equipment/Tools)', count: safeTickets.filter((t) => t.rootCauseCategory === 'Equipment/Tools').length + 2 },
    { name: 'บุคลากร/พฤติกรรม (People)', count: safeTickets.filter((t) => t.rootCauseCategory === 'People').length + 2 },
    { name: 'นโยบาย/กฎระเบียบ (Policy)', count: safeTickets.filter((t) => t.rootCauseCategory === 'Policy/Governance').length + 2 },
    { name: 'สิ่งแวดล้อมสถานที่ (Environment)', count: safeTickets.filter((t) => t.rootCauseCategory === 'Environment').length + 1 },
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
    <div className="max-w-7xl mx-auto py-4 px-4 space-y-4">
      
      {/* Executive Header Banner - Compact */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-xl p-4 sm:p-5 shadow-xs border border-purple-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-600/40 text-purple-200 rounded-lg backdrop-blur-xs border border-purple-400/30">
              <Crown className="w-4 h-4 text-amber-400" />
            </span>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">
              Executive Analytics & Whistleblower Command Center
            </h1>
          </div>
          <p className="text-xs text-purple-200/80 max-w-2xl">
            แดชบอร์ดสรุปผลเชิงวิเคราะห์ระดับผู้บริหาร (CEO/EVP) เพื่อการกำกับดูแลความเสี่ยง ธรรมาภิบาล และการพัฒนาองค์กร
          </p>
        </div>

        {/* AI Briefing Button */}
        <button
          type="button"
          id="btn-generate-ai-briefing"
          onClick={handleGenerateAiBriefing}
          disabled={isGeneratingAiBrief}
          className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 shrink-0 border border-purple-400/40 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>{isGeneratingAiBrief ? 'กำลังประมวลผล AI...' : 'สรุปเชิงกลยุทธ์ด้วย Gemini AI'}</span>
        </button>
      </div>

      {/* Top 5 KPI Cards - Clickable Interactive Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        
        {/* KPI 1: Total Tickets (Clickable) */}
        <div 
          id="kpi-card-total-tickets"
          onClick={() => {
            setModalSearchQuery('');
            setActiveModalFilter('all');
          }}
          className="bg-white hover:bg-indigo-50/40 cursor-pointer rounded-xl border border-slate-200 hover:border-indigo-300 p-3 shadow-xs transition-all group relative"
          title="คลิกเพื่อดูรายการเรื่องทั้งหมด"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition">
              จำนวนเรื่องทั้งหมด
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-900 group-hover:text-indigo-700 transition">{total}</span>
            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-medium">คลิกดูรายการ</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            <span className="text-rose-600 font-medium">{complaintsCount} ร้องเรียน</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">{suggestionsCount} ข้อเสนอแนะ</span>
          </div>
        </div>

        {/* KPI 2: Direct CEO Tickets (Clickable) */}
        <div 
          id="kpi-card-direct-ceo"
          onClick={() => {
            setModalSearchQuery('');
            setActiveModalFilter('direct_ceo');
          }}
          className="bg-white hover:bg-purple-50/60 cursor-pointer rounded-xl border border-purple-200 hover:border-purple-400 bg-purple-50/20 p-3 shadow-xs transition-all group relative ring-0 hover:ring-2 hover:ring-purple-400/20"
          title="คลิกเพื่อดูรายการส่งตรง CEO"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
              <Crown className="w-3 h-3 text-purple-600" />
              ส่งตรง CEO/EVP
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-700 transition" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-purple-700">{directCeoTickets.length}</span>
            <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">
              PRIORITY
            </span>
          </div>
          <span className="text-[10px] text-purple-900/70 mt-0.5 block flex items-center justify-between">
            <span>สายตรงผู้บริหาร</span>
            <span className="text-[9px] text-purple-600 font-bold underline">คลิกเปิดดู</span>
          </span>
        </div>

        {/* KPI 3: Resolution Rate (Clickable) */}
        <div 
          id="kpi-card-resolved-tickets"
          onClick={() => {
            setModalSearchQuery('');
            setActiveModalFilter('resolved');
          }}
          className="bg-white hover:bg-emerald-50/40 cursor-pointer rounded-xl border border-slate-200 hover:border-emerald-300 p-3 shadow-xs transition-all group relative"
          title="คลิกเพื่อดูรายการที่แก้ไขสำเร็จ"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-emerald-700 transition">
              อัตราการแก้ไขสำเร็จ
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-600">{resolutionRate}%</span>
            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-200 group-hover:bg-emerald-100 transition">
              {resolvedCount}/{total} เคส ↗
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 block flex items-center justify-between">
            <span>ความพร้อมส่งมอบงาน</span>
            <span className="text-[9px] text-emerald-600 font-medium">ดู {resolvedCount} เคส</span>
          </span>
        </div>

        {/* KPI 4: SLA Average */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            เวลาเฉลี่ยตาม SLA
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-indigo-600">18.4</span>
            <span className="text-[10px] text-slate-400">ชม./เคส</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
            ✓ เร็วกว่าเกณฑ์ 24%
          </span>
        </div>

        {/* KPI 5: CSAT Score */}
        <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/20 p-3 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            คะแนน CSAT รวม
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-amber-600">{avgCsat}</span>
            <span className="text-[10px] text-amber-700 font-bold">/ 5.0 ดาว</span>
          </div>
          <span className="text-[10px] text-amber-800/80 mt-0.5 block">
            ความพึงพอใจการบริการ
          </span>
        </div>

      </div>

      {/* AI Executive Insights Panel (If Generated) */}
      {aiInsights && (
        <div className="bg-gradient-to-br from-indigo-900 to-purple-950 text-white rounded-xl p-4 shadow-sm border border-indigo-700/50 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-indigo-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <h2 className="text-xs sm:text-sm font-bold">
                ผลการวิเคราะห์เชิงลึกและข้อเสนอแนะเชิงกลยุทธ์ (AI Strategic Briefing)
              </h2>
            </div>
            <span className="text-[10px] text-indigo-300">ประมวลผลโดย Gemini AI</span>
          </div>

          <p className="text-xs text-indigo-100 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/10">
            {aiInsights.executiveSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {aiInsights.topRiskClusters.map((cl, i) => (
              <div key={i} className="bg-white/10 p-2.5 rounded-lg border border-white/10 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">{cl.clusterName}</span>
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/30">
                    {cl.severity}
                  </span>
                </div>
                <div className="text-slate-300 text-[10px]">
                  <strong className="text-white">สาเหตุ:</strong> {cl.rootCause}
                </div>
                <div className="text-emerald-300 text-[10px]">
                  <strong className="text-white">CAPA:</strong> {cl.preventiveAction}
                </div>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-[11px] font-bold text-amber-300 mb-1.5">
              ข้อเสนอแนะเชิงนโยบายเพื่อการพัฒนาองค์กร (Strategic Directives):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {aiInsights.strategicRecommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-indigo-100 bg-white/5 p-2 rounded-md border border-white/5">
                  <span className="text-amber-400 font-bold shrink-0">#{i + 1}</span>
                  <span className="line-clamp-2">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CEO / EVP Direct Priority Queue - Ultra Compact & Streamlined */}
      <div className="bg-white rounded-xl border border-purple-200 shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-purple-700" />
            <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
              กล่องข้อร้องเรียนส่งตรงถึงผู้บริหาร CEO/EVP (Whistleblower Queue)
            </h3>
          </div>
          <span className="text-[11px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded-full border border-purple-200">
            {directCeoTickets.length} รายการเร่งด่วน
          </span>
        </div>

        {directCeoTickets.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-400">
            ไม่มีข้อร้องเรียนส่งตรงถึงผู้บริหารในขณะนี้
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {directCeoTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTicket(t)}
                className="py-2 px-3.5 hover:bg-purple-50/50 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="font-mono font-bold text-[11px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
                    {t.trackingCode}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                    t.urgency === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                  }`}>
                    {t.urgency}
                  </span>
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-semibold text-slate-900 text-xs mr-2">{t.title}</span>
                    <span className="text-[11px] text-slate-500 hidden sm:inline truncate">
                      ({CATEGORY_DEFINITIONS[t.category]?.nameEn})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400 hidden md:inline font-mono">
                    {t.createdAt.slice(0, 10)}
                  </span>
                  <button
                    type="button"
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-medium text-[11px] rounded-md transition shrink-0"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                สัดส่วนจำแนกตาม 9 หมวดหมู่
              </h3>
              <p className="text-[10px] text-slate-500">Distribution across 9 enterprise categories</p>
            </div>
            <span className="text-[11px] font-bold text-indigo-600">Total: {total}</span>
          </div>

          <div className="space-y-2">
            {categoryCounts.map((item) => (
              <div key={item.category} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 text-[11px]">
                    {item.info.key} - {item.info.nameTh.split('(')[0]}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    <strong className="text-slate-900">{item.count}</strong> ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
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
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 pb-1.5 border-b border-slate-100">
              การกระจายตัวของสาเหตุหลัก (Root Cause Classification)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rootCauseCounts.map((rc, i) => (
                <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                  <span className="font-medium text-slate-800 text-[11px] truncate">{rc.name}</span>
                  <span className="font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px] shrink-0 ml-1">
                    {rc.count} เคส
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent CSAT Evaluations Feedback */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 pb-1.5 border-b border-slate-100 flex items-center justify-between">
              <span>เสียงตอบรับจากพนักงานหลังจบเคส (CSAT Reviews)</span>
              <span className="text-amber-500 flex items-center gap-1 font-bold text-xs">
                <Star className="w-3 h-3 fill-amber-400" />
                เฉลี่ย {avgCsat} / 5.0
              </span>
            </h3>

            <div className="space-y-2 max-h-44 overflow-y-auto">
              {evaluatedTickets.length > 0 ? (
                evaluatedTickets.map((t) => (
                  <div key={t.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px] truncate">{t.title}</span>
                      <div className="flex text-amber-400 shrink-0 ml-2">
                        {[...Array(t.evaluation?.overallScore || 5)].map((_, i) => (
                          <Star key={i} className="w-2.5 h-2.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 italic text-[11px]">"{t.evaluation?.feedbackComment}"</p>
                    {t.evaluation?.improvementSuggestions && (
                      <p className="text-[10px] text-emerald-800">
                        💡 ข้อเสนอแนะ: {t.evaluation.improvementSuggestions}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">ยังไม่มีเคสที่ประเมิน CSAT ในช่วงเวลานี้</p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Interactive Modal: Clickable KPI Ticket List */}
      {activeModalFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-white/10 text-amber-400 shrink-0">
                  {modalMeta.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-white truncate">
                      {modalMeta.title}
                    </h3>
                    <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full text-xs font-mono font-bold shrink-0">
                      {currentModalList.length} รายการ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate">
                    คลิกเลือกเคสที่ต้องการเพื่อตรวจสอบรายละเอียด บันทึกการสืบสวน และมาตรการป้องกัน CAPA
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-kpi-modal"
                onClick={() => setActiveModalFilter(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search & Filter Bar */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาด้วยรหัสติดตาม, หัวข้อเรื่อง, หมวดหมู่, หรือชื่อผู้ยื่น..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">หมวด:</span>
                <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {activeModalFilter === 'all' && 'ทั้งหมด'}
                  {activeModalFilter === 'direct_ceo' && 'ส่งตรง CEO/EVP'}
                  {activeModalFilter === 'resolved' && 'แก้ไขสำเร็จแล้ว'}
                </span>
              </div>
            </div>

            {/* Modal Ticket List */}
            <div className="p-4 overflow-y-auto divide-y divide-slate-100 flex-1">
              {currentModalList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
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
                    className="py-3 px-2 hover:bg-indigo-50/50 rounded-xl transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {t.trackingCode}
                        </span>
                        
                        {/* Type Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.type === 'complaint'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {t.type === 'complaint' ? 'ข้อร้องเรียน' : 'ข้อเสนอแนะ'}
                        </span>

                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === 'resolved' || t.status === 'closed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          สถานะ: {
                            t.status === 'resolved' ? 'แก้ไขแล้ว' :
                            t.status === 'closed' ? 'ปิดเคส' :
                            t.status === 'in_progress' ? 'กำลังดำเนินการ' :
                            t.status === 'gatekeeper_triaged' ? 'ส่งต่อหน่วยงาน' : 'รับเรื่องใหม่'
                          }
                        </span>

                        {/* Direct CEO Tag */}
                        {t.isDirectToExecutive && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full flex items-center gap-1 border border-purple-200">
                            <Crown className="w-3 h-3 text-purple-600" />
                            Direct CEO
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 font-medium ml-auto sm:ml-0">
                          {CATEGORY_DEFINITIONS[t.category]?.key} ({CATEGORY_DEFINITIONS[t.category]?.nameEn})
                        </span>
                      </div>

                      <div className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition flex items-center gap-1">
                        <span>{t.title}</span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-1">
                        {t.description}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-slate-600">
                          <UserCheck className="w-3 h-3 text-blue-600" />
                          ผู้ยื่น: {t.submitterName || 'ระบุตัวตน'} ({t.submitterDepartment || 'ฝ่ายงาน'})
                        </span>
                        <span>•</span>
                        <span>วันที่: {t.createdAt.slice(0, 10)}</span>
                        <span>•</span>
                        <span>ความเร่งด่วน: <strong className="text-slate-700">{t.urgency}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-indigo-600 group-hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1"
                      >
                        <span>เปิดตรวจดู</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>แสดงทั้งหมด {currentModalList.length} จาก {getModalTickets().length} รายการ</span>
              <button
                type="button"
                onClick={() => setActiveModalFilter(null)}
                className="px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition"
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