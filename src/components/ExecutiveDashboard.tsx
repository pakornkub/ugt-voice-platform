'use client';

import React, { useState, useMemo } from 'react';
import {
  Crown,
  CheckCircle2,
  Star,
  ShieldAlert,
  ArrowUpRight,
  Layers,
  FileText,
  Building,
  Filter,
  X,
  Search,
  ChevronRight,
  UserCheck,
  Users,
  Trophy,
  Award,
  Target,
  Workflow,
  Wrench,
  Scale,
  Lock,
  FileCheck2,
} from 'lucide-react';
import { ComplaintTicket, GrievanceCategory } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { getStoredRolePermissions } from '../services/api';
import { mapLoginEmailForTicket } from '../services/employeeDirectory';
import { useLanguage } from '../context/LanguageContext';

interface ExecutiveDashboardProps {
  tickets: ComplaintTicket[];
  onSelectTicket: (ticket: ComplaintTicket) => void;
}

export interface TopSubmitterItem {
  key: string;
  name: string;
  employeeId?: string;
  department: string;
  email?: string;
  totalCount: number;
  complaintCount: number;
  suggestionCount: number;
  directCeoCount: number;
  categories: GrievanceCategory[];
  lastSubmittedAt: string;
}

export type RootCauseKey =
  'Process' | 'Equipment/Tools' | 'People' | 'Policy/Governance' | 'Workplace/Facilities';

export interface RootCauseItem {
  key: RootCauseKey;
  name: string;
  nameTh: string;
  nameEn: string;
  iconName: string;
  badgeColor: string;
  color: string;
  bgLight: string;
  borderHover: string;
  count: number;
  percentage: number;
  resolvedCount: number;
  pendingCount: number;
  urgentCount: number;
}

export const getCategoryIcon = (category: GrievanceCategory) => {
  switch (category) {
    case 'Compliance':
      return <Scale className="h-3.5 w-3.5 shrink-0 text-indigo-600" />;
    case 'Quality':
      return <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />;
    case 'HR':
      return <Users className="h-3.5 w-3.5 shrink-0 text-blue-600" />;
    case 'Ethics':
      return <Award className="h-3.5 w-3.5 shrink-0 text-purple-600" />;
    case 'Harassment':
      return <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-600" />;
    case 'Fraud':
      return <Lock className="h-3.5 w-3.5 shrink-0 text-red-600" />;
    default:
      return <Layers className="h-3.5 w-3.5 shrink-0 text-slate-600" />;
  }
};

export const getTicketRootCauseCategory = (t: ComplaintTicket): RootCauseKey => {
  if (t.rootCauseCategory) {
    if ((t.rootCauseCategory as string) === 'Policy') return 'Policy/Governance';
    return t.rootCauseCategory as RootCauseKey;
  }
  if (t.category === 'Quality') return 'Equipment/Tools';
  if (t.category === 'Harassment' || t.category === 'Ethics') return 'People';
  if (t.category === 'Compliance' || t.category === 'Fraud') return 'Policy/Governance';
  return 'Process';
};

type ModalFilterType =
  'all' | 'direct_ceo' | 'resolved' | 'employee' | 'category' | 'root_cause' | null;

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  tickets = [],
  onSelectTicket,
}) => {
  const { lang } = useLanguage();
  const [activeModalFilter, setActiveModalFilter] = useState<ModalFilterType>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<TopSubmitterItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GrievanceCategory | null>(null);
  const [selectedRootCause, setSelectedRootCause] = useState<RootCauseItem | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState<
    'all' | 'pending' | 'in_progress' | 'resolved' | 'critical'
  >('all');

  const safeTickets = useMemo(() => tickets || [], [tickets]);

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
    } else if (activeModalFilter === 'employee' && selectedEmployee) {
      list = safeTickets.filter(
        (t) =>
          (selectedEmployee.employeeId && t.submitterEmployeeId === selectedEmployee.employeeId) ||
          (t.submitterName &&
            t.submitterName.trim().toLowerCase() === selectedEmployee.name.trim().toLowerCase())
      );
    } else if (activeModalFilter === 'category' && selectedCategory) {
      list = safeTickets.filter((t) => t.category === selectedCategory);
    } else if (activeModalFilter === 'root_cause' && selectedRootCause) {
      list = safeTickets.filter((t) => getTicketRootCauseCategory(t) === selectedRootCause.key);
    }

    // Apply secondary status / urgency filter within modal
    if (modalStatusFilter === 'pending') {
      list = list.filter((t) => t.status === 'submitted' || t.status === 'gatekeeper_triaged');
    } else if (modalStatusFilter === 'in_progress') {
      list = list.filter((t) => t.status === 'in_progress');
    } else if (modalStatusFilter === 'resolved') {
      list = list.filter((t) => t.status === 'resolved' || t.status === 'closed');
    } else if (modalStatusFilter === 'critical') {
      list = list.filter((t) => t.urgency === 'Critical' || t.urgency === 'High');
    }

    if (!modalSearchQuery.trim()) return list;
    const q = modalSearchQuery.toLowerCase();
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.trackingCode.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.submitterName && t.submitterName.toLowerCase().includes(q)) ||
        (t.rootCauseSummary && t.rootCauseSummary.toLowerCase().includes(q))
    );
  };

  const getModalTitle = () => {
    switch (activeModalFilter) {
      case 'all':
        return {
          title:
            lang === 'en' ? 'All Tickets in System' : 'รายการเรื่องทั้งหมดในระบบ (All Tickets)',
          count: safeTickets.length,
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: <Layers className="h-4 w-4 text-indigo-600" />,
        };
      case 'direct_ceo':
        return {
          title:
            lang === 'en'
              ? 'Direct to Executive CEO / EVP (Whistleblower Escalation)'
              : 'ข้อร้องเรียนส่งตรงถึงผู้บริหาร CEO / EVP (Whistleblower Escalation)',
          count: directCeoTickets.length,
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: <Crown className="h-4 w-4 text-purple-600" />,
        };
      case 'resolved':
        return {
          title:
            lang === 'en'
              ? 'Successfully Resolved Tickets'
              : 'รายการที่ดำเนินการแก้ไขสำเร็จแล้ว (Resolved Tickets)',
          count: resolvedTickets.length,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        };
      case 'employee':
        return {
          title:
            lang === 'en'
              ? `Ticket History for: ${selectedEmployee?.name || ''} (${selectedEmployee?.employeeId || 'Employee'})`
              : `ประวัติข้อร้องเรียนและข้อเสนอแนะ: คุณ${selectedEmployee?.name || ''} (${selectedEmployee?.employeeId || 'พนักงาน'})`,
          count: selectedEmployee?.totalCount || 0,
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: <Users className="h-4 w-4 text-indigo-600" />,
        };
      case 'category': {
        const catInfo = selectedCategory ? CATEGORY_DEFINITIONS[selectedCategory] : null;
        return {
          title:
            lang === 'en'
              ? `Category: ${catInfo?.key || ''} - ${catInfo?.nameEn || ''}`
              : `หมวดหมู่เรื่อง: ${catInfo?.key || ''} - ${catInfo?.nameTh || ''} (${catInfo?.nameEn || ''})`,
          count: safeTickets.filter((t) => t.category === selectedCategory).length,
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          icon: selectedCategory ? (
            getCategoryIcon(selectedCategory)
          ) : (
            <Layers className="h-4 w-4 text-indigo-600" />
          ),
        };
      }
      case 'root_cause': {
        return {
          title:
            lang === 'en'
              ? `Root Cause Classification: ${selectedRootCause?.nameEn || selectedRootCause?.name || ''}`
              : `การกระจายตัวของสาเหตุหลัก: ${selectedRootCause?.name || ''}`,
          count: selectedRootCause
            ? safeTickets.filter((t) => getTicketRootCauseCategory(t) === selectedRootCause.key)
                .length
            : 0,
          badgeColor:
            selectedRootCause?.badgeColor || 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <Target className="h-4 w-4 text-amber-600" />,
        };
      }
      default:
        return { title: '', count: 0, badgeColor: '', icon: null };
    }
  };

  // Top 3 Employees with Most Complaints or Suggestions
  const topSubmitters = useMemo<TopSubmitterItem[]>(() => {
    const map = new Map<string, TopSubmitterItem>();

    safeTickets.forEach((t) => {
      // Exclude anonymous or missing submitters
      if (
        !t.submitterName ||
        t.confidentiality === 'anonymous' ||
        t.submitterName.includes('ไม่เปิดเผย') ||
        t.submitterName.includes('Anonymous')
      ) {
        return;
      }

      const key = (t.submitterEmployeeId && t.submitterEmployeeId.trim()) || t.submitterName.trim();
      const isComplaint = t.type === 'complaint';
      const isSuggestion = t.type === 'suggestion';
      const isDirect = !!t.isDirectToExecutive;
      const ticketTime = t.createdAt || '';

      const existing = map.get(key);
      if (existing) {
        existing.totalCount += 1;
        if (isComplaint) existing.complaintCount += 1;
        if (isSuggestion) existing.suggestionCount += 1;
        if (isDirect) existing.directCeoCount += 1;
        if (!existing.categories.includes(t.category)) {
          existing.categories.push(t.category);
        }
        if (!existing.employeeId && t.submitterEmployeeId) {
          existing.employeeId = t.submitterEmployeeId;
        }
        if ((!existing.department || existing.department === 'ทั่วไป') && t.submitterDepartment) {
          existing.department = t.submitterDepartment;
        }
        if (ticketTime > existing.lastSubmittedAt) {
          existing.lastSubmittedAt = ticketTime;
        }
      } else {
        map.set(key, {
          key,
          name: t.submitterName,
          employeeId: t.submitterEmployeeId,
          department: t.submitterDepartment || 'ทั่วไป',
          email: t.submitterEmail,
          totalCount: 1,
          complaintCount: isComplaint ? 1 : 0,
          suggestionCount: isSuggestion ? 1 : 0,
          directCeoCount: isDirect ? 1 : 0,
          categories: [t.category],
          lastSubmittedAt: ticketTime,
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => {
        if (b.totalCount !== a.totalCount) {
          return b.totalCount - a.totalCount;
        }
        if (b.directCeoCount !== a.directCeoCount) {
          return b.directCeoCount - a.directCeoCount;
        }
        return b.complaintCount - a.complaintCount;
      })
      .slice(0, 3);
  }, [safeTickets]);

  // Category counts with resolution status breakdown
  const categoryCounts = useMemo(() => {
    return (Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[])
      .map((cat) => {
        const catTickets = safeTickets.filter((t) => t.category === cat);
        const count = catTickets.length;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        const resolved = catTickets.filter(
          (t) => t.status === 'resolved' || t.status === 'closed'
        ).length;
        const inProgress = catTickets.filter((t) => t.status === 'in_progress').length;
        const pending = catTickets.filter(
          (t) => t.status === 'submitted' || t.status === 'gatekeeper_triaged'
        ).length;
        const urgent = catTickets.filter(
          (t) => t.urgency === 'Critical' || t.urgency === 'High'
        ).length;
        return {
          category: cat,
          info: CATEGORY_DEFINITIONS[cat],
          count,
          percentage,
          resolvedCount: resolved,
          inProgressCount: inProgress,
          pendingCount: pending,
          urgentCount: urgent,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [safeTickets, total]);

  // Root cause counts
  const rootCauseCounts = useMemo<RootCauseItem[]>(() => {
    const configs: Array<{
      key: RootCauseKey;
      name: string;
      nameTh: string;
      nameEn: string;
      iconName: string;
      badgeColor: string;
      color: string;
      bgLight: string;
      borderHover: string;
    }> = [
      {
        key: 'Process',
        name: 'กระบวนการทำงาน (Process)',
        nameTh: 'กระบวนการทำงานและขั้นตอนอนุมัติ',
        nameEn: 'Process & Workflow',
        iconName: 'Workflow',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        color: 'text-blue-700',
        bgLight: 'bg-blue-50/40 hover:bg-blue-50/80',
        borderHover: 'hover:border-blue-300',
      },
      {
        key: 'Equipment/Tools',
        name: 'อุปกรณ์และเครื่องมือ (Equipment/Tools)',
        nameTh: 'อุปกรณ์ เครื่องมือ และระบบไอที',
        nameEn: 'Equipment & IT Tools',
        iconName: 'Wrench',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        color: 'text-indigo-700',
        bgLight: 'bg-indigo-50/40 hover:bg-indigo-50/80',
        borderHover: 'hover:border-indigo-300',
      },
      {
        key: 'People',
        name: 'บุคลากรและพฤติกรรม (People)',
        nameTh: 'บุคลากร วัฒนธรรม และพฤติกรรม',
        nameEn: 'People & Culture',
        iconName: 'Users',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        color: 'text-rose-700',
        bgLight: 'bg-rose-50/40 hover:bg-rose-50/80',
        borderHover: 'hover:border-rose-300',
      },
      {
        key: 'Policy/Governance',
        name: 'นโยบายและกฎระเบียบ (Policy)',
        nameTh: 'นโยบาย ระเบียบบริษัท และธรรมาภิบาล',
        nameEn: 'Policy & Governance',
        iconName: 'ShieldAlert',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        color: 'text-purple-700',
        bgLight: 'bg-purple-50/40 hover:bg-purple-50/80',
        borderHover: 'hover:border-purple-300',
      },
      {
        key: 'Workplace/Facilities',
        name: 'สถานที่ทำงานและกายภาพ (Workplace/Facilities)',
        nameTh: 'สถานที่ทำงาน กายภาพ และความปลอดภัย',
        nameEn: 'Workplace & Facilities',
        iconName: 'Building',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        color: 'text-emerald-700',
        bgLight: 'bg-emerald-50/40 hover:bg-emerald-50/80',
        borderHover: 'hover:border-emerald-300',
      },
    ];

    return configs.map((cfg) => {
      const rcTickets = safeTickets.filter((t) => getTicketRootCauseCategory(t) === cfg.key);
      const count = rcTickets.length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      const resolved = rcTickets.filter(
        (t) => t.status === 'resolved' || t.status === 'closed'
      ).length;
      const pending = rcTickets.filter(
        (t) => t.status !== 'resolved' && t.status !== 'closed'
      ).length;
      const urgent = rcTickets.filter(
        (t) => t.urgency === 'Critical' || t.urgency === 'High'
      ).length;
      return {
        ...cfg,
        count,
        percentage,
        resolvedCount: resolved,
        pendingCount: pending,
        urgentCount: urgent,
      };
    });
  }, [safeTickets, total]);

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
              {lang === 'en'
                ? 'Executive Analytics & Governance Command Center'
                : 'Executive Analytics & Whistleblower Command Center'}
            </h1>
          </div>
          <p className="max-w-2xl text-xs text-purple-200/80">
            {lang === 'en'
              ? 'Executive oversight dashboard (CEO/EVP) for risk governance, compliance, and strategic organizational improvement.'
              : 'แดชบอร์ดสรุปผลเชิงวิเคราะห์ระดับผู้บริหาร (CEO/EVP) เพื่อการกำกับดูแลความเสี่ยง ธรรมาภิบาล และการพัฒนาองค์กร'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-purple-400/20 bg-white/10 px-3 py-1 font-mono text-xs text-purple-200">
            {lang === 'en' ? 'Real-Time Insights' : 'ข้อมูลภาพรวมแบบเรียลไทม์'}
          </span>
        </div>
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
          title={lang === 'en' ? 'Click to view all tickets' : 'คลิกเพื่อดูรายการเรื่องทั้งหมด'}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase transition group-hover:text-indigo-600">
              {lang === 'en' ? 'Total Cases' : 'จำนวนเรื่องทั้งหมด'}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-indigo-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 transition group-hover:text-indigo-700">
              {total}
            </span>
            <span className="py-0.2 rounded bg-indigo-50 px-1.5 text-[10px] font-medium text-indigo-600">
              {lang === 'en' ? 'View List' : 'คลิกดูรายการ'}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
            <span className="font-medium text-rose-600">
              {complaintsCount} {lang === 'en' ? 'Grievances' : 'ร้องเรียน'}
            </span>
            <span>•</span>
            <span className="font-medium text-emerald-600">
              {suggestionsCount} {lang === 'en' ? 'Suggestions' : 'ข้อเสนอแนะ'}
            </span>
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
          title={lang === 'en' ? 'Click to view Direct CEO tickets' : 'คลิกเพื่อดูรายการส่งตรง CEO'}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-purple-900 uppercase">
              <Crown className="h-3 w-3 text-purple-600" />
              {lang === 'en' ? 'Direct to CEO/EVP' : 'ส่งตรง CEO/EVP'}
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
            <span>{lang === 'en' ? 'Executive Bypass' : 'สายตรงผู้บริหาร'}</span>
            <span className="text-[9px] font-bold text-purple-600 underline">
              {lang === 'en' ? 'View details' : 'คลิกเปิดดู'}
            </span>
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
          title={
            lang === 'en' ? 'Click to view resolved tickets' : 'คลิกเพื่อดูรายการที่แก้ไขสำเร็จ'
          }
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase transition group-hover:text-emerald-700">
              {lang === 'en' ? 'Resolution Rate' : 'อัตราการแก้ไขสำเร็จ'}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-600">{resolutionRate}%</span>
            <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 transition group-hover:bg-emerald-100">
              {resolvedCount}/{total} {lang === 'en' ? 'cases' : 'เคส'} ↗
            </span>
          </div>
          <span className="mt-0.5 block flex items-center justify-between text-[10px] text-slate-500">
            <span>{lang === 'en' ? 'Delivery readiness' : 'ความพร้อมส่งมอบงาน'}</span>
            <span className="text-[9px] font-medium text-emerald-600">
              {lang === 'en' ? `View ${resolvedCount} cases` : `ดู ${resolvedCount} เคส`}
            </span>
          </span>
        </div>

        {/* KPI 4: Resolution Average Time */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <span className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            {lang === 'en' ? 'Avg. Resolution Time' : 'ระยะเวลาเฉลี่ยในการแก้ไข'}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-indigo-600">18.4</span>
            <span className="text-[10px] text-slate-400">
              {lang === 'en' ? 'hrs/case' : 'ชม./เคส'}
            </span>
          </div>
          <span className="mt-0.5 block text-[10px] font-medium text-emerald-600">
            {lang === 'en' ? '⚡ Rapid Triage & Action' : '⚡ จัดการได้อย่างรวดเร็ว'}
          </span>
        </div>

        {/* KPI 5: CSAT Score */}
        <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50/20 bg-white p-3 shadow-xs sm:col-span-1">
          <span className="block flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-900 uppercase">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            {lang === 'en' ? 'Overall CSAT Score' : 'คะแนน CSAT รวม'}
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-600">{avgCsat}</span>
            <span className="text-[10px] font-bold text-amber-700">
              {lang === 'en' ? '/ 5.0 Stars' : '/ 5.0 ดาว'}
            </span>
          </div>
          <span className="mt-0.5 block text-[10px] text-amber-800/80">
            {lang === 'en' ? 'Service Satisfaction Index' : 'ความพึงพอใจการบริการ'}
          </span>
        </div>
      </div>

      {/* CEO / EVP Direct Priority Queue - Ultra Compact & Streamlined */}
      <div className="overflow-hidden rounded-xl border border-purple-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-3.5 py-2">
          <div className="flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-purple-700" />
            <h3 className="text-xs font-bold tracking-wider text-purple-950 uppercase">
              {lang === 'en'
                ? 'Direct to Executive CEO / EVP Queue'
                : 'กล่องข้อร้องเรียนส่งตรงถึงผู้บริหาร CEO/EVP (Whistleblower Queue)'}
            </h3>
          </div>
          <span className="rounded-full border border-purple-200 bg-white px-2 py-0.5 text-[11px] font-bold text-purple-700">
            {directCeoTickets.length} {lang === 'en' ? 'Priority cases' : 'รายการเร่งด่วน'}
          </span>
        </div>

        {directCeoTickets.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-400">
            {lang === 'en'
              ? 'No direct executive tickets at this moment'
              : 'ไม่มีข้อร้องเรียนส่งตรงถึงผู้บริหารในขณะนี้'}
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
                    {lang === 'en' ? 'Inspect' : 'ตรวจสอบ'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analytics Charts Grid - Compact */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Column: Category Breakdown & Top 3 Active Submitters */}
        <div className="space-y-4">
          {/* Category Breakdown */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase">
                  <Layers className="h-3.5 w-3.5 text-indigo-600" />
                  <span>
                    {lang === 'en' ? 'Proportion by 6 Categories' : 'สัดส่วนจำแนกตาม 6 หมวดหมู่'}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500">
                  {lang === 'en'
                    ? 'Distribution across 6 enterprise categories (click to explore)'
                    : 'Distribution across 6 enterprise categories (คลิกเพื่อดูรายละเอียดแต่ละรายการ)'}
                </p>
              </div>
              <span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                {lang === 'en' ? `Total: ${total} cases` : `รวม: ${total} เรื่อง`}
              </span>
            </div>

            <div className="space-y-1.5">
              {categoryCounts.map((item) => (
                <div
                  key={item.category}
                  onClick={() => {
                    setSelectedCategory(item.category);
                    setActiveModalFilter('category');
                    setModalSearchQuery('');
                    setModalStatusFilter('all');
                  }}
                  className="group -mx-1 cursor-pointer space-y-1.5 rounded-xl border border-slate-100/60 p-2.5 shadow-2xs transition-all duration-150 hover:border-indigo-200/90 hover:bg-indigo-50/70 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="shrink-0 rounded-lg bg-slate-100/80 p-1.5 transition group-hover:bg-indigo-100">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[11.5px] font-bold text-slate-800 transition group-hover:text-indigo-600">
                            {lang === 'en'
                              ? `${item.info.key} - ${item.info.nameEn}`
                              : `${item.info.key} - ${item.info.nameTh.split('(')[0]}`}
                          </span>
                          {lang === 'th' && (
                            <span className="hidden text-[10px] text-slate-400 transition group-hover:text-indigo-500 sm:inline">
                              ({item.info.nameEn})
                            </span>
                          )}
                        </div>
                        {/* Mini Status Breakdown Chips */}
                        <div className="mt-0.5 flex items-center gap-1">
                          {item.resolvedCount > 0 && (
                            <span className="py-0.2 rounded border border-emerald-200 bg-emerald-50 px-1.5 text-[9px] font-medium text-emerald-700">
                              {lang === 'en'
                                ? `Resolved ${item.resolvedCount}`
                                : `แก้ไขแล้ว ${item.resolvedCount}`}
                            </span>
                          )}
                          {item.pendingCount > 0 && (
                            <span className="py-0.2 rounded border border-amber-200 bg-amber-50 px-1.5 text-[9px] font-medium text-amber-700">
                              {lang === 'en'
                                ? `Pending ${item.pendingCount}`
                                : `รอดำเนินการ ${item.pendingCount}`}
                            </span>
                          )}
                          {item.urgentCount > 0 && (
                            <span className="py-0.2 rounded border border-rose-200 bg-rose-50 px-1.5 text-[9px] font-medium text-rose-700">
                              {lang === 'en'
                                ? `Urgent ${item.urgentCount}`
                                : `ด่วน ${item.urgentCount}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <span className="block text-[11px] text-slate-500">
                          <strong className="font-bold text-slate-900 group-hover:text-indigo-700">
                            {item.count}
                          </strong>{' '}
                          {lang === 'en' ? 'cases' : 'เรื่อง'} ({item.percentage}%)
                        </span>
                      </div>
                      <span className="hidden items-center gap-0.5 rounded border border-indigo-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 shadow-2xs group-hover:inline-flex">
                        {lang === 'en' ? 'View' : 'คลิกดู'} <ChevronRight className="h-3 w-3" />
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:hidden group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500 group-hover:bg-indigo-700"
                      style={{ width: `${Math.max(item.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Category Card Footer */}
            <div className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 text-[11px] text-indigo-900">
              <span className="flex items-center gap-1.5">
                <span className="text-base">👆</span>
                <span>
                  {lang === 'en' ? (
                    <>
                      <strong>Click category</strong> to view all grievances & suggestions
                    </>
                  ) : (
                    <>
                      <strong>คลิกที่หมวดหมู่</strong>{' '}
                      เพื่อเปิดดูรายการข้อร้องเรียนและข้อเสนอแนะทั้งหมดในหมวดนั้น
                    </>
                  )}
                </span>
              </span>
              <span className="ml-1 shrink-0 text-xs font-bold text-indigo-600">
                {lang === 'en' ? 'Click to view' : 'คลิกเพื่อดู'}
              </span>
            </div>
          </div>

          {/* Top 3 Employees with Most Complaints or Suggestions */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="rounded-lg border border-amber-200/80 bg-amber-50 p-1.5 text-amber-700">
                  <Trophy className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase">
                    <span>
                      {lang === 'en'
                        ? 'Top 3 Most Active Submitters'
                        : 'Top 3 พนักงานที่มีข้อร้องเรียนหรือเสนอแนะมากที่สุด'}
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {lang === 'en'
                      ? 'Most active submitters across grievances & suggestions'
                      : 'Most active submitters across grievances & suggestions'}
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                {lang === 'en' ? 'Top 3 Submitters' : 'Top 3 พนักงาน'}
              </span>
            </div>

            <div className="space-y-2.5">
              {topSubmitters.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  {lang === 'en'
                    ? 'No identified submitters on record yet'
                    : 'ยังไม่มีข้อมูลผู้ยื่นเรื่องที่ระบุตัวตน'}
                </p>
              ) : (
                topSubmitters.map((emp, index) => {
                  const rankStyles = [
                    {
                      badge:
                        'bg-gradient-to-br from-amber-400 to-amber-500 text-white ring-2 ring-amber-200/80 shadow-xs',
                      label: '#1',
                      border: 'border-amber-200 bg-amber-50/20 hover:bg-amber-50/40',
                      barColor: 'bg-amber-500',
                    },
                    {
                      badge:
                        'bg-gradient-to-br from-slate-400 to-slate-500 text-white ring-2 ring-slate-200 shadow-xs',
                      label: '#2',
                      border: 'border-slate-200 bg-slate-50/30 hover:bg-slate-50/60',
                      barColor: 'bg-slate-500',
                    },
                    {
                      badge:
                        'bg-gradient-to-br from-amber-700 to-orange-700 text-white ring-2 ring-orange-200 shadow-xs',
                      label: '#3',
                      border: 'border-orange-200/80 bg-orange-50/20 hover:bg-orange-50/40',
                      barColor: 'bg-amber-700',
                    },
                  ][index] || {
                    badge: 'bg-slate-200 text-slate-700',
                    label: `#${index + 1}`,
                    border: 'border-slate-200',
                    barColor: 'bg-indigo-600',
                  };

                  const maxCount = topSubmitters[0]?.totalCount || 1;
                  const widthPercent = Math.round((emp.totalCount / maxCount) * 100);

                  return (
                    <div
                      key={emp.key}
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setActiveModalFilter('employee');
                        setModalSearchQuery('');
                      }}
                      className={`group relative cursor-pointer rounded-xl border p-2.5 transition-all duration-200 ${rankStyles.border}`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        {/* Left: Rank & Info */}
                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${rankStyles.badge}`}
                          >
                            {rankStyles.label}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 transition group-hover:text-indigo-600">
                                {emp.name}
                              </span>
                              {emp.employeeId && (
                                <span className="py-0.2 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] text-slate-600">
                                  {emp.employeeId}
                                </span>
                              )}
                              {emp.directCeoCount > 0 && (
                                <span className="py-0.2 flex items-center gap-0.5 rounded-full border border-purple-200 bg-purple-50 px-1.5 text-[9px] font-bold text-purple-700">
                                  <Crown className="h-2.5 w-2.5 text-purple-600" />
                                  {lang === 'en'
                                    ? `Direct CEO ${emp.directCeoCount}`
                                    : `ส่งตรง CEO ${emp.directCeoCount}`}
                                </span>
                              )}
                            </div>

                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {emp.department}
                            </p>

                            {/* Categories Chips */}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              {emp.categories.slice(0, 3).map((cat) => (
                                <span
                                  key={cat}
                                  className="rounded border border-slate-200 bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600"
                                >
                                  {CATEGORY_DEFINITIONS[cat]?.key || cat}
                                </span>
                              ))}
                              {emp.categories.length > 3 && (
                                <span className="text-[9px] text-slate-400">
                                  +{emp.categories.length - 3} {lang === 'en' ? 'more' : 'หมวด'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Metrics */}
                        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                          <div className="flex items-center gap-1">
                            <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-700 sm:text-sm">
                              {emp.totalCount} {lang === 'en' ? 'cases' : 'เรื่อง'}
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                          </div>

                          <div className="flex items-center gap-1 text-[10px]">
                            {emp.complaintCount > 0 && (
                              <span className="py-0.2 rounded border border-rose-100 bg-rose-50 px-1.5 font-medium text-rose-700">
                                {lang === 'en'
                                  ? `Grievances ${emp.complaintCount}`
                                  : `ร้องเรียน ${emp.complaintCount}`}
                              </span>
                            )}
                            {emp.suggestionCount > 0 && (
                              <span className="py-0.2 rounded border border-emerald-100 bg-emerald-50 px-1.5 font-medium text-emerald-700">
                                {lang === 'en'
                                  ? `Suggestions ${emp.suggestionCount}`
                                  : `เสนอแนะ ${emp.suggestionCount}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Proportion Progress Line */}
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100/80">
                        <div
                          className={`h-1 rounded-full transition-all duration-500 ${rankStyles.barColor}`}
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Submitter Card Footer */}
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2 text-[10px] text-slate-500">
              <span>
                {lang === 'en'
                  ? '💡 Click submitter name to inspect all history'
                  : '💡 คลิกที่รายชื่อพนักงานเพื่อเปิดดูประวัติข้อร้องเรียนและข้อเสนอแนะทั้งหมด'}
              </span>
              <span className="ml-1 shrink-0 font-semibold text-indigo-600">
                {lang === 'en' ? 'Click to view' : 'คลิกเพื่อดู'}
              </span>
            </div>
          </div>
        </div>

        {/* Root Cause & CSAT Trends */}
        <div className="space-y-4">
          {/* Root Cause Grouping */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase">
                  <Target className="h-3.5 w-3.5 text-amber-600" />
                  <span>
                    {lang === 'en'
                      ? 'Root Cause Classification'
                      : 'การกระจายตัวของสาเหตุหลัก (Root Cause Classification)'}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500">
                  {lang === 'en'
                    ? 'Root cause analysis & preventive action breakdown (click to explore)'
                    : 'Root cause analysis & preventive action breakdown (คลิกเพื่อดูรายละเอียดแต่ละรายการ)'}
                </p>
              </div>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                {lang === 'en' ? '5 Dimensions' : '5 มิติสาเหตุ'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {rootCauseCounts.map((rc) => (
                <div
                  key={rc.key}
                  onClick={() => {
                    setSelectedRootCause(rc);
                    setActiveModalFilter('root_cause');
                    setModalSearchQuery('');
                    setModalStatusFilter('all');
                  }}
                  className={`group flex cursor-pointer flex-col justify-between gap-2 rounded-xl border border-slate-200 p-2.5 text-xs transition-all duration-200 hover:shadow-xs ${rc.bgLight} ${rc.borderHover}`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {rc.key === 'Process' && (
                          <Workflow className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                        )}
                        {rc.key === 'Equipment/Tools' && (
                          <Wrench className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                        )}
                        {rc.key === 'People' && (
                          <Users className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                        )}
                        {rc.key === 'Policy/Governance' && (
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                        )}
                        {rc.key === 'Workplace/Facilities' && (
                          <Building className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        )}
                        <span className="truncate text-[11px] font-bold text-slate-900 transition group-hover:text-indigo-600">
                          {lang === 'en' ? rc.nameEn : rc.name}
                        </span>
                      </div>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {lang === 'en' ? rc.nameEn : rc.nameTh}
                      </span>

                      {/* Mini Status Breakdown Chips */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {rc.resolvedCount > 0 && (
                          <span className="py-0.2 rounded border border-emerald-200 bg-white/90 px-1.5 text-[9px] font-medium text-emerald-700">
                            {lang === 'en'
                              ? `Resolved ${rc.resolvedCount}`
                              : `แก้ไขแล้ว ${rc.resolvedCount}`}
                          </span>
                        )}
                        {rc.pendingCount > 0 && (
                          <span className="py-0.2 rounded border border-amber-200 bg-white/90 px-1.5 text-[9px] font-medium text-amber-700">
                            {lang === 'en'
                              ? `Pending ${rc.pendingCount}`
                              : `รอดำเนินการ ${rc.pendingCount}`}
                          </span>
                        )}
                        {rc.urgentCount > 0 && (
                          <span className="py-0.2 rounded border border-rose-200 bg-white/90 px-1.5 text-[9px] font-medium text-rose-700">
                            {lang === 'en' ? `Urgent ${rc.urgentCount}` : `ด่วน ${rc.urgentCount}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-1 flex shrink-0 flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-black text-indigo-700 shadow-2xs group-hover:border-indigo-300">
                          {rc.count} {lang === 'en' ? 'cases' : 'เคส'}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                      </div>
                      <span className="text-[9px] font-bold text-indigo-600 group-hover:underline">
                        {lang === 'en' ? 'Explore →' : 'คลิกดูรายการ →'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center justify-between text-[9px] font-medium text-slate-400">
                      <span>{lang === 'en' ? 'Proportion' : 'สัดส่วน'}</span>
                      <span>{rc.percentage}%</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/70">
                      <div
                        className="h-1 rounded-full bg-indigo-600 transition-all duration-500 group-hover:bg-indigo-700"
                        style={{ width: `${Math.max(rc.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Root Cause Footer */}
            <div className="flex items-center justify-between rounded-lg border border-amber-200/60 bg-amber-50/50 p-2.5 text-[11px] text-amber-900">
              <span className="flex items-center gap-1.5">
                <span className="text-base">👆</span>
                <span>
                  {lang === 'en' ? (
                    <>
                      <strong>Click root cause</strong> to inspect case investigations and CAPA
                      preventive actions
                    </>
                  ) : (
                    <>
                      <strong>คลิกที่สาเหตุหลัก</strong> เพื่อเปิดดูรายการเคส บันทึกการสืบสวน
                      และแนวทางป้องกัน (CAPA) ทั้งหมด
                    </>
                  )}
                </span>
              </span>
              <span className="ml-1 shrink-0 text-xs font-bold text-amber-700">
                {lang === 'en' ? 'Click to view' : 'คลิกเพื่อดู'}
              </span>
            </div>
          </div>

          {/* Recent CSAT Evaluations Feedback */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase">
              <span>
                {lang === 'en'
                  ? 'Employee CSAT Reviews'
                  : 'เสียงตอบรับจากพนักงานหลังจบเคส (CSAT Reviews)'}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                <Star className="h-3 w-3 fill-amber-400" />
                {lang === 'en' ? `Avg ${avgCsat} / 5.0` : `เฉลี่ย ${avgCsat} / 5.0`}
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
                        💡 {lang === 'en' ? 'Suggestion:' : 'ข้อเสนอแนะ:'}{' '}
                        {t.evaluation.improvementSuggestions}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-2 text-center text-xs text-slate-400">
                  {lang === 'en'
                    ? 'No CSAT evaluations in this period yet'
                    : 'ยังไม่มีเคสที่ประเมิน CSAT ในช่วงเวลานี้'}
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
                      {currentModalList.length} {lang === 'en' ? 'cases' : 'รายการ'}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-slate-300">
                    {lang === 'en'
                      ? 'Click on any case to review details, investigation notes, and CAPA preventive plans'
                      : 'คลิกเลือกเคสที่ต้องการเพื่อตรวจสอบรายละเอียด บันทึกการสืบสวน และมาตรการป้องกัน CAPA'}
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
                  placeholder={
                    lang === 'en'
                      ? 'Search tracking code, title, category, submitter...'
                      : 'ค้นหาด้วยรหัสติดตาม, หัวข้อเรื่อง, หมวดหมู่, หรือชื่อผู้ยื่น...'
                  }
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pr-3.5 pl-9 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">
                  {lang === 'en' ? 'Filter:' : 'หมวด/เงื่อนไข:'}
                </span>
                <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700">
                  {activeModalFilter === 'all' && (lang === 'en' ? 'All' : 'ทั้งหมด')}
                  {activeModalFilter === 'direct_ceo' &&
                    (lang === 'en' ? 'Direct CEO/EVP' : 'ส่งตรง CEO/EVP')}
                  {activeModalFilter === 'resolved' &&
                    (lang === 'en' ? 'Resolved' : 'แก้ไขสำเร็จแล้ว')}
                  {activeModalFilter === 'employee' &&
                    `${lang === 'en' ? 'Staff' : 'พนักงาน'}: ${selectedEmployee?.name || ''}`}
                  {activeModalFilter === 'category' &&
                    `${lang === 'en' ? 'Category' : 'หมวด'}: ${selectedCategory ? `${CATEGORY_DEFINITIONS[selectedCategory]?.key} - ${lang === 'en' ? CATEGORY_DEFINITIONS[selectedCategory]?.nameEn : CATEGORY_DEFINITIONS[selectedCategory]?.nameTh}` : ''}`}
                  {activeModalFilter === 'root_cause' &&
                    `${lang === 'en' ? 'Root Cause' : 'สาเหตุ'}: ${selectedRootCause ? (lang === 'en' ? selectedRootCause.nameEn : selectedRootCause.name) : ''}`}
                </span>
              </div>
            </div>

            {/* Modal Quick Filter Tabs */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50/70 px-4 py-2 text-xs">
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold text-slate-500">
                  {lang === 'en' ? 'Status:' : 'สถานะ:'}
                </span>
                <button
                  type="button"
                  onClick={() => setModalStatusFilter('all')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    modalStatusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'en' ? 'All' : 'ทั้งหมด'} ({getModalTickets().length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalStatusFilter('pending')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    modalStatusFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'border border-amber-200 bg-white text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {lang === 'en' ? 'Pending' : 'รอดำเนินการ'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalStatusFilter('in_progress')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    modalStatusFilter === 'in_progress'
                      ? 'bg-blue-600 text-white'
                      : 'border border-blue-200 bg-white text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {lang === 'en' ? 'In Progress' : 'กำลังดำเนินการ'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalStatusFilter('resolved')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    modalStatusFilter === 'resolved'
                      ? 'bg-emerald-600 text-white'
                      : 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {lang === 'en' ? 'Resolved / Closed' : 'แก้ไขแล้ว / ปิดเคส'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalStatusFilter('critical')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    modalStatusFilter === 'critical'
                      ? 'bg-rose-600 text-white'
                      : 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  {lang === 'en' ? 'Critical / High' : 'เคสด่วน (Critical/High)'}
                </button>
              </div>

              {/* Reset Search / Filter */}
              {(modalSearchQuery || modalStatusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setModalSearchQuery('');
                    setModalStatusFilter('all');
                  }}
                  className="shrink-0 text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  {lang === 'en' ? 'Reset Filters' : 'ล้างตัวกรอง'}
                </button>
              )}
            </div>

            {/* Modal Ticket List */}
            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto p-4">
              {currentModalList.length === 0 ? (
                <div className="space-y-2 py-12 text-center text-slate-400">
                  <FileText className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="text-xs">
                    {lang === 'en'
                      ? 'No tickets match the search or filter criteria'
                      : 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา'}
                  </p>
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
                          {t.type === 'complaint'
                            ? lang === 'en'
                              ? 'Grievance'
                              : 'ข้อร้องเรียน'
                            : lang === 'en'
                              ? 'Suggestion'
                              : 'ข้อเสนอแนะ'}
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
                          {lang === 'en' ? 'Status: ' : 'สถานะ: '}
                          {t.status === 'resolved'
                            ? lang === 'en'
                              ? 'Resolved'
                              : 'แก้ไขแล้ว'
                            : t.status === 'closed'
                              ? lang === 'en'
                                ? 'Closed'
                                : 'ปิดเคส'
                              : t.status === 'in_progress'
                                ? lang === 'en'
                                  ? 'In Progress'
                                  : 'กำลังดำเนินการ'
                                : t.status === 'gatekeeper_triaged'
                                  ? lang === 'en'
                                    ? 'Triaged'
                                    : 'ส่งต่อหน่วยงาน'
                                  : lang === 'en'
                                    ? 'Submitted'
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

                      {/* Root Cause & CAPA (Preventive Action) Preview */}
                      {(t.rootCauseSummary ||
                        t.rootCauseCategory ||
                        activeModalFilter === 'root_cause') && (
                        <div className="mt-1 space-y-0.5 rounded-lg border border-amber-200/80 bg-amber-50/70 p-2 text-[11px]">
                          <div className="flex items-center gap-1 font-semibold text-amber-900">
                            <Target className="h-3 w-3 shrink-0 text-amber-600" />
                            <span>
                              {lang === 'en' ? 'Root Cause:' : 'สาเหตุหลัก (Root Cause):'}{' '}
                              {t.rootCauseCategory || getTicketRootCauseCategory(t)}
                            </span>
                          </div>
                          {t.rootCauseSummary && (
                            <p className="text-[11px] text-slate-700">{t.rootCauseSummary}</p>
                          )}
                          {t.preventiveActionPlan && (
                            <p className="text-[10.5px] text-emerald-800">
                              🛡️{' '}
                              <span className="font-semibold">
                                {lang === 'en'
                                  ? 'Preventive Action (CAPA):'
                                  : 'แนวทางป้องกัน (CAPA):'}
                              </span>{' '}
                              {t.preventiveActionPlan}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-slate-600">
                          <UserCheck className="h-3 w-3 text-blue-600" />
                          {(() => {
                            const rolePermissions = getStoredRolePermissions();
                            const hasConfidential =
                              rolePermissions.executive?.canViewConfidentialIdentities ?? true;
                            const canViewAnonEmail =
                              rolePermissions.executive?.canViewAnonymousSubmitterEmail ?? true;
                            if (t.confidentiality === 'anonymous') {
                              if (canViewAnonEmail) {
                                const mapped = mapLoginEmailForTicket({
                                  loginEmail: t.loginEmail,
                                  submitterEmail: t.submitterEmail,
                                  submitterEmployeeId: t.submitterEmployeeId,
                                  submitterName: t.submitterName,
                                });
                                const email = t.loginEmail || t.submitterEmail || mapped.loginEmail;
                                return (
                                  <span>
                                    {lang === 'en'
                                      ? 'Submitter: Anonymous'
                                      : 'ผู้ยื่น: ไม่ระบุตัวตน'}{' '}
                                    <span className="py-0.2 rounded border border-indigo-200 bg-indigo-50 px-1 font-mono text-[10px] font-semibold text-indigo-600">
                                      {email}
                                    </span>
                                  </span>
                                );
                              }
                              return lang === 'en'
                                ? 'Submitter: Anonymous'
                                : 'ผู้ยื่น: ไม่ระบุตัวตน (Anonymous)';
                            }
                            if (
                              t.confidentiality === 'confidential_restricted' &&
                              !hasConfidential
                            ) {
                              return lang === 'en'
                                ? 'Submitter: [Confidential Protected]'
                                : 'ผู้ยื่น: [ปกปิดตัวตนตามนโยบายความลับ]';
                            }
                            return `${lang === 'en' ? 'Submitter' : 'ผู้ยื่น'}: ${t.submitterName || (lang === 'en' ? 'Identified' : 'ระบุตัวตน')} (${t.submitterDepartment || (lang === 'en' ? 'General' : 'ฝ่ายงาน')})`;
                          })()}
                        </span>
                        <span>•</span>
                        <span>
                          {lang === 'en' ? 'Date' : 'วันที่'}: {t.createdAt.slice(0, 10)}
                        </span>
                        <span>•</span>
                        <span>
                          {lang === 'en' ? 'Urgency' : 'ความเร่งด่วน'}:{' '}
                          <strong className="text-slate-700">{t.urgency}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition group-hover:bg-indigo-700"
                      >
                        <span>{lang === 'en' ? 'View Details' : 'ดูรายละเอียดเคส'}</span>
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
                {lang === 'en'
                  ? `Showing ${currentModalList.length} of ${getModalTickets().length} records`
                  : `แสดงทั้งหมด ${currentModalList.length} จาก ${getModalTickets().length} รายการ`}
              </span>
              <button
                type="button"
                onClick={() => setActiveModalFilter(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {lang === 'en' ? 'Close Window' : 'ปิดหน้าต่าง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
