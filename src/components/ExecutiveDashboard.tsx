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
import { ComplaintTicket, GrievanceCategory, TicketStatus } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { getStoredRolePermissions } from '../services/api';
import { mapLoginEmailForTicket } from '../services/employeeDirectory';
import { Language, useLanguage } from '../context/LanguageContext';
import { clickableProps } from './clickableProps';

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

interface CategoryCountItem {
  category: GrievanceCategory;
  info: (typeof CATEGORY_DEFINITIONS)[GrievanceCategory];
  count: number;
  percentage: number;
  resolvedCount: number;
  pendingCount: number;
  urgentCount: number;
}

type ModalFilterType =
  'all' | 'direct_ceo' | 'resolved' | 'employee' | 'category' | 'root_cause' | null;
type ModalStatusFilter = 'all' | 'pending' | 'in_progress' | 'resolved' | 'critical';

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

// ── Shared helpers ──────────────────────────────────────────────────────────

/** Picks the English or Thai variant of a UI string. */
const pick = <T,>(lang: Language, en: T, th: T): T => (lang === 'en' ? en : th);

const starSlots = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

const isResolved = (t: ComplaintTicket) => t.status === 'resolved' || t.status === 'closed';
const isPending = (t: ComplaintTicket) =>
  t.status === 'submitted' || t.status === 'gatekeeper_triaged';
const isUrgent = (t: ComplaintTicket) => t.urgency === 'Critical' || t.urgency === 'High';
const percentOf = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 100) : 0;

const STATUS_BADGES: Record<TicketStatus, { cls: string; en: string; th: string }> = {
  submitted: { cls: 'bg-amber-100 text-amber-800', en: 'Submitted', th: 'รับเรื่องใหม่' },
  gatekeeper_triaged: {
    cls: 'bg-amber-100 text-amber-800',
    en: 'Triaged',
    th: 'ส่งต่อหน่วยงาน',
  },
  in_progress: { cls: 'bg-blue-100 text-blue-800', en: 'In Progress', th: 'กำลังดำเนินการ' },
  resolved: { cls: 'bg-emerald-100 text-emerald-800', en: 'Resolved', th: 'แก้ไขแล้ว' },
  closed: { cls: 'bg-emerald-100 text-emerald-800', en: 'Closed', th: 'ปิดเคส' },
};

const STATUS_FILTER_TABS: Array<{
  key: Exclude<ModalStatusFilter, 'all'>;
  active: string;
  idle: string;
  en: string;
  th: string;
}> = [
  {
    key: 'pending',
    active: 'bg-amber-600 text-white',
    idle: 'border border-amber-200 bg-white text-amber-700 hover:bg-amber-50',
    en: 'Pending',
    th: 'รอดำเนินการ',
  },
  {
    key: 'in_progress',
    active: 'bg-blue-600 text-white',
    idle: 'border border-blue-200 bg-white text-blue-700 hover:bg-blue-50',
    en: 'In Progress',
    th: 'กำลังดำเนินการ',
  },
  {
    key: 'resolved',
    active: 'bg-emerald-600 text-white',
    idle: 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50',
    en: 'Resolved / Closed',
    th: 'แก้ไขแล้ว / ปิดเคส',
  },
  {
    key: 'critical',
    active: 'bg-rose-600 text-white',
    idle: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
    en: 'Critical / High',
    th: 'เคสด่วน (Critical/High)',
  },
];

const ROOT_CAUSE_CONFIGS: Array<
  Omit<RootCauseItem, 'count' | 'percentage' | 'resolvedCount' | 'pendingCount' | 'urgentCount'>
> = [
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

const ROOT_CAUSE_ICONS: Record<RootCauseKey, React.ReactNode> = {
  Process: <Workflow className="h-3.5 w-3.5 shrink-0 text-blue-600" />,
  'Equipment/Tools': <Wrench className="h-3.5 w-3.5 shrink-0 text-indigo-600" />,
  People: <Users className="h-3.5 w-3.5 shrink-0 text-rose-600" />,
  'Policy/Governance': <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-purple-600" />,
  'Workplace/Facilities': <Building className="h-3.5 w-3.5 shrink-0 text-emerald-600" />,
};

const RANK_STYLES = [
  {
    badge:
      'bg-gradient-to-br from-amber-400 to-amber-500 text-white ring-2 ring-amber-200/80 shadow-xs',
    border: 'border-amber-200 bg-amber-50/20 hover:bg-amber-50/40',
    barColor: 'bg-amber-500',
  },
  {
    badge:
      'bg-gradient-to-br from-slate-400 to-slate-500 text-white ring-2 ring-slate-200 shadow-xs',
    border: 'border-slate-200 bg-slate-50/30 hover:bg-slate-50/60',
    barColor: 'bg-slate-500',
  },
  {
    badge:
      'bg-gradient-to-br from-amber-700 to-orange-700 text-white ring-2 ring-orange-200 shadow-xs',
    border: 'border-orange-200/80 bg-orange-50/20 hover:bg-orange-50/40',
    barColor: 'bg-amber-700',
  },
];

const getRankStyle = (index: number) => ({
  ...(RANK_STYLES[index] ?? {
    badge: 'bg-slate-200 text-slate-700',
    border: 'border-slate-200',
    barColor: 'bg-indigo-600',
  }),
  label: `#${index + 1}`,
});

// ── Data builders (pure) ────────────────────────────────────────────────────

const isIdentifiedSubmitter = (t: ComplaintTicket) =>
  !!t.submitterName &&
  t.confidentiality !== 'anonymous' &&
  !t.submitterName.includes('ไม่เปิดเผย') &&
  !t.submitterName.includes('Anonymous');

const mergeIntoSubmitter = (existing: TopSubmitterItem, t: ComplaintTicket) => {
  existing.totalCount += 1;
  if (t.type === 'complaint') existing.complaintCount += 1;
  if (t.type === 'suggestion') existing.suggestionCount += 1;
  if (t.isDirectToExecutive) existing.directCeoCount += 1;
  if (!existing.categories.includes(t.category)) existing.categories.push(t.category);
  if (!existing.employeeId && t.submitterEmployeeId) existing.employeeId = t.submitterEmployeeId;
  if ((!existing.department || existing.department === 'ทั่วไป') && t.submitterDepartment) {
    existing.department = t.submitterDepartment;
  }
  if ((t.createdAt || '') > existing.lastSubmittedAt) existing.lastSubmittedAt = t.createdAt || '';
};

const createSubmitter = (key: string, name: string, t: ComplaintTicket): TopSubmitterItem => ({
  key,
  name,
  employeeId: t.submitterEmployeeId,
  department: t.submitterDepartment || 'ทั่วไป',
  email: t.submitterEmail,
  totalCount: 1,
  complaintCount: t.type === 'complaint' ? 1 : 0,
  suggestionCount: t.type === 'suggestion' ? 1 : 0,
  directCeoCount: t.isDirectToExecutive ? 1 : 0,
  categories: [t.category],
  lastSubmittedAt: t.createdAt || '',
});

const compareSubmitters = (a: TopSubmitterItem, b: TopSubmitterItem) =>
  b.totalCount - a.totalCount ||
  b.directCeoCount - a.directCeoCount ||
  b.complaintCount - a.complaintCount;

/** Top 3 identified employees with the most complaints or suggestions. */
const buildTopSubmitters = (tickets: ComplaintTicket[]): TopSubmitterItem[] => {
  const map = new Map<string, TopSubmitterItem>();
  tickets.filter(isIdentifiedSubmitter).forEach((t) => {
    const name = t.submitterName as string;
    const key = t.submitterEmployeeId?.trim() || name.trim();
    const existing = map.get(key);
    if (existing) mergeIntoSubmitter(existing, t);
    else map.set(key, createSubmitter(key, name, t));
  });
  return Array.from(map.values()).sort(compareSubmitters).slice(0, 3);
};

const buildCategoryCounts = (tickets: ComplaintTicket[], total: number): CategoryCountItem[] =>
  (Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[])
    .map((cat) => {
      const catTickets = tickets.filter((t) => t.category === cat);
      return {
        category: cat,
        info: CATEGORY_DEFINITIONS[cat],
        count: catTickets.length,
        percentage: percentOf(catTickets.length, total),
        resolvedCount: catTickets.filter(isResolved).length,
        pendingCount: catTickets.filter(isPending).length,
        urgentCount: catTickets.filter(isUrgent).length,
      };
    })
    .sort((a, b) => b.count - a.count);

const buildRootCauseCounts = (tickets: ComplaintTicket[], total: number): RootCauseItem[] =>
  ROOT_CAUSE_CONFIGS.map((cfg) => {
    const rcTickets = tickets.filter((t) => getTicketRootCauseCategory(t) === cfg.key);
    return {
      ...cfg,
      count: rcTickets.length,
      percentage: percentOf(rcTickets.length, total),
      resolvedCount: rcTickets.filter(isResolved).length,
      pendingCount: rcTickets.filter((t) => !isResolved(t)).length,
      urgentCount: rcTickets.filter(isUrgent).length,
    };
  });

interface ModalSelection {
  filter: ModalFilterType;
  employee: TopSubmitterItem | null;
  category: GrievanceCategory | null;
  rootCause: RootCauseItem | null;
}

const belongsToEmployee = (t: ComplaintTicket, emp: TopSubmitterItem) =>
  (!!emp.employeeId && t.submitterEmployeeId === emp.employeeId) ||
  (!!t.submitterName && t.submitterName.trim().toLowerCase() === emp.name.trim().toLowerCase());

/** Tickets that belong to the modal's selection, before status/search filters. */
const getSelectionTickets = (tickets: ComplaintTicket[], sel: ModalSelection) => {
  switch (sel.filter) {
    case 'all':
      return tickets;
    case 'direct_ceo':
      return tickets.filter((t) => t.isDirectToExecutive);
    case 'resolved':
      return tickets.filter(isResolved);
    case 'employee':
      return sel.employee
        ? tickets.filter((t) => belongsToEmployee(t, sel.employee as TopSubmitterItem))
        : [];
    case 'category':
      return sel.category ? tickets.filter((t) => t.category === sel.category) : [];
    case 'root_cause':
      return sel.rootCause
        ? tickets.filter((t) => getTicketRootCauseCategory(t) === sel.rootCause?.key)
        : [];
    default:
      return [];
  }
};

const STATUS_PREDICATES: Record<ModalStatusFilter, (t: ComplaintTicket) => boolean> = {
  all: () => true,
  pending: isPending,
  in_progress: (t) => t.status === 'in_progress',
  resolved: isResolved,
  critical: isUrgent,
};

const matchesSearch = (t: ComplaintTicket, query: string) => {
  const q = query.toLowerCase();
  return (
    t.title.toLowerCase().includes(q) ||
    t.trackingCode.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.category.toLowerCase().includes(q) ||
    !!t.submitterName?.toLowerCase().includes(q) ||
    !!t.rootCauseSummary?.toLowerCase().includes(q)
  );
};

const filterModalTickets = (
  tickets: ComplaintTicket[],
  sel: ModalSelection,
  status: ModalStatusFilter,
  query: string
) => {
  const list = getSelectionTickets(tickets, sel).filter(STATUS_PREDICATES[status]);
  return query.trim() ? list.filter((t) => matchesSearch(t, query)) : list;
};

interface ModalMeta {
  title: string;
  count: number;
  badgeColor: string;
  icon: React.ReactNode;
}

const getModalMeta = (
  lang: Language,
  tickets: ComplaintTicket[],
  sel: ModalSelection
): ModalMeta => {
  const count = getSelectionTickets(tickets, sel).length;
  const indigo = 'bg-indigo-100 text-indigo-800 border-indigo-200';
  switch (sel.filter) {
    case 'all':
      return {
        title: pick(lang, 'All Tickets in System', 'รายการเรื่องทั้งหมดในระบบ (All Tickets)'),
        count,
        badgeColor: indigo,
        icon: <Layers className="h-4 w-4 text-indigo-600" />,
      };
    case 'direct_ceo':
      return {
        title: pick(
          lang,
          'Direct to Executive CEO / EVP (Whistleblower Escalation)',
          'ข้อร้องเรียนส่งตรงถึงผู้บริหาร CEO / EVP (Whistleblower Escalation)'
        ),
        count,
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Crown className="h-4 w-4 text-purple-600" />,
      };
    case 'resolved':
      return {
        title: pick(
          lang,
          'Successfully Resolved Tickets',
          'รายการที่ดำเนินการแก้ไขสำเร็จแล้ว (Resolved Tickets)'
        ),
        count,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
      };
    case 'employee':
      return {
        title: pick(
          lang,
          `Ticket History for: ${sel.employee?.name ?? ''} (${sel.employee?.employeeId ?? 'Employee'})`,
          `ประวัติข้อร้องเรียนและข้อเสนอแนะ: คุณ${sel.employee?.name ?? ''} (${sel.employee?.employeeId ?? 'พนักงาน'})`
        ),
        count: sel.employee?.totalCount ?? 0,
        badgeColor: indigo,
        icon: <Users className="h-4 w-4 text-indigo-600" />,
      };
    case 'category':
      return getCategoryModalMeta(lang, sel.category, count);
    case 'root_cause':
      return {
        title: pick(
          lang,
          `Root Cause Classification: ${sel.rootCause?.nameEn || sel.rootCause?.name || ''}`,
          `การกระจายตัวของสาเหตุหลัก: ${sel.rootCause?.name || ''}`
        ),
        count,
        badgeColor: sel.rootCause?.badgeColor || 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Target className="h-4 w-4 text-amber-600" />,
      };
    default:
      return { title: '', count: 0, badgeColor: '', icon: null };
  }
};

const getCategoryModalMeta = (
  lang: Language,
  category: GrievanceCategory | null,
  count: number
): ModalMeta => {
  const info = category ? CATEGORY_DEFINITIONS[category] : null;
  return {
    title: pick(
      lang,
      `Category: ${info?.key ?? ''} - ${info?.nameEn ?? ''}`,
      `หมวดหมู่เรื่อง: ${info?.key ?? ''} - ${info?.nameTh ?? ''} (${info?.nameEn ?? ''})`
    ),
    count,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: category ? getCategoryIcon(category) : <Layers className="h-4 w-4 text-indigo-600" />,
  };
};

/** Short label for the "Filter:" chip in the modal's search bar. */
const getModalFilterLabel = (lang: Language, sel: ModalSelection) => {
  switch (sel.filter) {
    case 'all':
      return pick(lang, 'All', 'ทั้งหมด');
    case 'direct_ceo':
      return pick(lang, 'Direct CEO/EVP', 'ส่งตรง CEO/EVP');
    case 'resolved':
      return pick(lang, 'Resolved', 'แก้ไขสำเร็จแล้ว');
    case 'employee':
      return `${pick(lang, 'Staff', 'พนักงาน')}: ${sel.employee?.name || ''}`;
    case 'category': {
      const info = sel.category ? CATEGORY_DEFINITIONS[sel.category] : null;
      const name = info ? `${info.key} - ${pick(lang, info.nameEn, info.nameTh)}` : '';
      return `${pick(lang, 'Category', 'หมวด')}: ${name}`;
    }
    case 'root_cause': {
      const name = sel.rootCause ? pick(lang, sel.rootCause.nameEn, sel.rootCause.name) : '';
      return `${pick(lang, 'Root Cause', 'สาเหตุ')}: ${name}`;
    }
    default:
      return '';
  }
};

// ── Presentational sections ─────────────────────────────────────────────────

const DashboardHeader: React.FC = () => {
  const { lang } = useLanguage();
  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-purple-900/40 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-4 text-white shadow-xs sm:p-5 md:flex-row md:items-center">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-purple-400/30 bg-purple-600/40 p-1.5 text-purple-200 backdrop-blur-xs">
            <Crown className="h-4 w-4 text-amber-400" />
          </span>
          <h1 className="text-base font-bold tracking-tight sm:text-lg">
            {pick(
              lang,
              'Executive Analytics & Governance Command Center',
              'Executive Analytics & Whistleblower Command Center'
            )}
          </h1>
        </div>
        <p className="max-w-2xl text-xs text-purple-200/80">
          {pick(
            lang,
            'Executive oversight dashboard (CEO/EVP) for risk governance, compliance, and strategic organizational improvement.',
            'แดชบอร์ดสรุปผลเชิงวิเคราะห์ระดับผู้บริหาร (CEO/EVP) เพื่อการกำกับดูแลความเสี่ยง ธรรมาภิบาล และการพัฒนาองค์กร'
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded-full border border-purple-400/20 bg-white/10 px-3 py-1 font-mono text-xs text-purple-200">
          {pick(lang, 'Real-Time Insights', 'ข้อมูลภาพรวมแบบเรียลไทม์')}
        </span>
      </div>
    </div>
  );
};

interface KpiCardsProps {
  total: number;
  complaintsCount: number;
  suggestionsCount: number;
  directCeoCount: number;
  resolvedCount: number;
  resolutionRate: string;
  avgCsat: string;
  onOpenList: (filter: ModalFilterType) => void;
}

const KpiCards: React.FC<Readonly<KpiCardsProps>> = ({
  total,
  complaintsCount,
  suggestionsCount,
  directCeoCount,
  resolvedCount,
  resolutionRate,
  avgCsat,
  onOpenList,
}) => {
  const { lang } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {/* KPI 1: Total Tickets (Clickable) */}
      <div
        id="kpi-card-total-tickets"
        {...clickableProps(() => onOpenList('all'))}
        className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-indigo-300 hover:bg-indigo-50/40"
        title={pick(lang, 'Click to view all tickets', 'คลิกเพื่อดูรายการเรื่องทั้งหมด')}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase transition group-hover:text-indigo-600">
            {pick(lang, 'Total Cases', 'จำนวนเรื่องทั้งหมด')}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-indigo-600" />
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-black text-slate-900 transition group-hover:text-indigo-700">
            {total}
          </span>
          <span className="py-0.2 rounded bg-indigo-50 px-1.5 text-[10px] font-medium text-indigo-600">
            {pick(lang, 'View List', 'คลิกดูรายการ')}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
          <span className="font-medium text-rose-600">
            {complaintsCount} {pick(lang, 'Grievances', 'ร้องเรียน')}
          </span>
          <span>•</span>
          <span className="font-medium text-emerald-600">
            {suggestionsCount} {pick(lang, 'Suggestions', 'ข้อเสนอแนะ')}
          </span>
        </div>
      </div>

      {/* KPI 2: Direct CEO Tickets (Clickable) */}
      <div
        id="kpi-card-direct-ceo"
        {...clickableProps(() => onOpenList('direct_ceo'))}
        className="group relative cursor-pointer rounded-xl border border-purple-200 bg-purple-50/20 bg-white p-3 shadow-xs ring-0 transition-all hover:border-purple-400 hover:bg-purple-50/60 hover:ring-2 hover:ring-purple-400/20"
        title={pick(lang, 'Click to view Direct CEO tickets', 'คลิกเพื่อดูรายการส่งตรง CEO')}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-purple-900 uppercase">
            <Crown className="h-3 w-3 text-purple-600" />
            {pick(lang, 'Direct to CEO/EVP', 'ส่งตรง CEO/EVP')}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-purple-400 transition group-hover:text-purple-700" />
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-black text-purple-700">{directCeoCount}</span>
          <span className="py-0.2 rounded bg-purple-100 px-1.5 text-[9px] font-bold text-purple-800">
            PRIORITY
          </span>
        </div>
        <span className="mt-0.5 block flex items-center justify-between text-[10px] text-purple-900/70">
          <span>{pick(lang, 'Executive Bypass', 'สายตรงผู้บริหาร')}</span>
          <span className="text-[9px] font-bold text-purple-600 underline">
            {pick(lang, 'View details', 'คลิกเปิดดู')}
          </span>
        </span>
      </div>

      {/* KPI 3: Resolution Rate (Clickable) */}
      <div
        id="kpi-card-resolved-tickets"
        {...clickableProps(() => onOpenList('resolved'))}
        className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-emerald-300 hover:bg-emerald-50/40"
        title={pick(lang, 'Click to view resolved tickets', 'คลิกเพื่อดูรายการที่แก้ไขสำเร็จ')}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase transition group-hover:text-emerald-700">
            {pick(lang, 'Resolution Rate', 'อัตราการแก้ไขสำเร็จ')}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:text-emerald-600" />
        </div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-black text-emerald-600">{resolutionRate}%</span>
          <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 transition group-hover:bg-emerald-100">
            {resolvedCount}/{total} {pick(lang, 'cases', 'เคส')} ↗
          </span>
        </div>
        <span className="mt-0.5 block flex items-center justify-between text-[10px] text-slate-500">
          <span>{pick(lang, 'Delivery readiness', 'ความพร้อมส่งมอบงาน')}</span>
          <span className="text-[9px] font-medium text-emerald-600">
            {pick(lang, `View ${resolvedCount} cases`, `ดู ${resolvedCount} เคส`)}
          </span>
        </span>
      </div>

      {/* KPI 4: Resolution Average Time */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <span className="block text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          {pick(lang, 'Avg. Resolution Time', 'ระยะเวลาเฉลี่ยในการแก้ไข')}
        </span>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-black text-indigo-600">18.4</span>
          <span className="text-[10px] text-slate-400">{pick(lang, 'hrs/case', 'ชม./เคส')}</span>
        </div>
        <span className="mt-0.5 block text-[10px] font-medium text-emerald-600">
          {pick(lang, '⚡ Rapid Triage & Action', '⚡ จัดการได้อย่างรวดเร็ว')}
        </span>
      </div>

      {/* KPI 5: CSAT Score */}
      <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50/20 bg-white p-3 shadow-xs sm:col-span-1">
        <span className="block flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-900 uppercase">
          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
          {pick(lang, 'Overall CSAT Score', 'คะแนน CSAT รวม')}
        </span>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-black text-amber-600">{avgCsat}</span>
          <span className="text-[10px] font-bold text-amber-700">
            {pick(lang, '/ 5.0 Stars', '/ 5.0 ดาว')}
          </span>
        </div>
        <span className="mt-0.5 block text-[10px] text-amber-800/80">
          {pick(lang, 'Service Satisfaction Index', 'ความพึงพอใจการบริการ')}
        </span>
      </div>
    </div>
  );
};

interface DirectCeoQueueProps {
  tickets: ComplaintTicket[];
  onSelectTicket: (ticket: ComplaintTicket) => void;
}

const DirectCeoQueue: React.FC<Readonly<DirectCeoQueueProps>> = ({ tickets, onSelectTicket }) => {
  const { lang } = useLanguage();
  return (
    <div className="overflow-hidden rounded-xl border border-purple-200 bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5 text-purple-700" />
          <h3 className="text-xs font-bold tracking-wider text-purple-950 uppercase">
            {pick(
              lang,
              'Direct to Executive CEO / EVP Queue',
              'กล่องข้อร้องเรียนส่งตรงถึงผู้บริหาร CEO/EVP (Whistleblower Queue)'
            )}
          </h3>
        </div>
        <span className="rounded-full border border-purple-200 bg-white px-2 py-0.5 text-[11px] font-bold text-purple-700">
          {tickets.length} {pick(lang, 'Priority cases', 'รายการเร่งด่วน')}
        </span>
      </div>

      {tickets.length === 0 ? (
        <div className="p-3 text-center text-xs text-slate-400">
          {pick(
            lang,
            'No direct executive tickets at this moment',
            'ไม่มีข้อร้องเรียนส่งตรงถึงผู้บริหารในขณะนี้'
          )}
        </div>
      ) : (
        <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
          {tickets.map((t) => (
            <div
              key={t.id}
              {...clickableProps(() => onSelectTicket(t))}
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
                  {pick(lang, 'Inspect', 'ตรวจสอบ')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface StatusChipsProps {
  resolved: number;
  pending: number;
  urgent: number;
  chipBg: string;
  className: string;
}

/** Resolved / pending / urgent mini chips shared by the category and root-cause cards. */
const StatusChips: React.FC<Readonly<StatusChipsProps>> = ({
  resolved,
  pending,
  urgent,
  chipBg,
  className,
}) => {
  const { lang } = useLanguage();
  const base = `py-0.2 rounded border px-1.5 text-[9px] font-medium ${chipBg}`;
  return (
    <div className={className}>
      {resolved > 0 && (
        <span className={`${base} border-emerald-200 text-emerald-700`}>
          {pick(lang, `Resolved ${resolved}`, `แก้ไขแล้ว ${resolved}`)}
        </span>
      )}
      {pending > 0 && (
        <span className={`${base} border-amber-200 text-amber-700`}>
          {pick(lang, `Pending ${pending}`, `รอดำเนินการ ${pending}`)}
        </span>
      )}
      {urgent > 0 && (
        <span className={`${base} border-rose-200 text-rose-700`}>
          {pick(lang, `Urgent ${urgent}`, `ด่วน ${urgent}`)}
        </span>
      )}
    </div>
  );
};

interface PanelFooterProps {
  className: string;
  actionClassName: string;
  hint: React.ReactNode;
}

const PanelFooter: React.FC<Readonly<PanelFooterProps>> = ({
  className,
  actionClassName,
  hint,
}) => {
  const { lang } = useLanguage();
  return (
    <div className={className}>
      <span className="flex items-center gap-1.5">
        <span className="text-base">👆</span>
        <span>{hint}</span>
      </span>
      <span className={actionClassName}>{pick(lang, 'Click to view', 'คลิกเพื่อดู')}</span>
    </div>
  );
};

interface CategoryBreakdownProps {
  items: CategoryCountItem[];
  total: number;
  onSelect: (category: GrievanceCategory) => void;
}

const CategoryBreakdown: React.FC<Readonly<CategoryBreakdownProps>> = ({
  items,
  total,
  onSelect,
}) => {
  const { lang } = useLanguage();
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase">
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            <span>{pick(lang, 'Proportion by 6 Categories', 'สัดส่วนจำแนกตาม 6 หมวดหมู่')}</span>
          </h3>
          <p className="text-[10px] text-slate-500">
            {pick(
              lang,
              'Distribution across 6 enterprise categories (click to explore)',
              'Distribution across 6 enterprise categories (คลิกเพื่อดูรายละเอียดแต่ละรายการ)'
            )}
          </p>
        </div>
        <span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
          {pick(lang, `Total: ${total} cases`, `รวม: ${total} เรื่อง`)}
        </span>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.category}
            {...clickableProps(() => onSelect(item.category))}
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
                      {pick(
                        lang,
                        `${item.info.key} - ${item.info.nameEn}`,
                        `${item.info.key} - ${item.info.nameTh.split('(')[0]}`
                      )}
                    </span>
                    {lang === 'th' && (
                      <span className="hidden text-[10px] text-slate-400 transition group-hover:text-indigo-500 sm:inline">
                        ({item.info.nameEn})
                      </span>
                    )}
                  </div>
                  <StatusChips
                    resolved={item.resolvedCount}
                    pending={item.pendingCount}
                    urgent={item.urgentCount}
                    chipBg="bg-emerald-50"
                    className="mt-0.5 flex items-center gap-1"
                  />
                </div>
              </div>

              <div className="ml-2 flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <span className="block text-[11px] text-slate-500">
                    <strong className="font-bold text-slate-900 group-hover:text-indigo-700">
                      {item.count}
                    </strong>{' '}
                    {pick(lang, 'cases', 'เรื่อง')} ({item.percentage}%)
                  </span>
                </div>
                <span className="hidden items-center gap-0.5 rounded border border-indigo-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 shadow-2xs group-hover:inline-flex">
                  {pick(lang, 'View', 'คลิกดู')} <ChevronRight className="h-3 w-3" />
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

      <PanelFooter
        className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 text-[11px] text-indigo-900"
        actionClassName="ml-1 shrink-0 text-xs font-bold text-indigo-600"
        hint={pick(
          lang,
          <>
            <strong>Click category</strong> to view all grievances & suggestions
          </>,
          <>
            <strong>คลิกที่หมวดหมู่</strong>{' '}
            เพื่อเปิดดูรายการข้อร้องเรียนและข้อเสนอแนะทั้งหมดในหมวดนั้น
          </>
        )}
      />
    </div>
  );
};

interface SubmitterRowProps {
  emp: TopSubmitterItem;
  index: number;
  maxCount: number;
  onSelect: (emp: TopSubmitterItem) => void;
}

const SubmitterRow: React.FC<Readonly<SubmitterRowProps>> = ({
  emp,
  index,
  maxCount,
  onSelect,
}) => {
  const { lang } = useLanguage();
  const rank = getRankStyle(index);
  const widthPercent = Math.round((emp.totalCount / maxCount) * 100);

  return (
    <div
      {...clickableProps(() => onSelect(emp))}
      className={`group relative cursor-pointer rounded-xl border p-2.5 transition-all duration-200 ${rank.border}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        {/* Left: Rank & Info */}
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${rank.badge}`}
          >
            {rank.label}
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
                  {pick(
                    lang,
                    `Direct CEO ${emp.directCeoCount}`,
                    `ส่งตรง CEO ${emp.directCeoCount}`
                  )}
                </span>
              )}
            </div>

            <p className="mt-0.5 truncate text-[11px] text-slate-500">{emp.department}</p>

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
                  +{emp.categories.length - 3} {pick(lang, 'more', 'หมวด')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Metrics */}
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <div className="flex items-center gap-1">
            <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-700 sm:text-sm">
              {emp.totalCount} {pick(lang, 'cases', 'เรื่อง')}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            {emp.complaintCount > 0 && (
              <span className="py-0.2 rounded border border-rose-100 bg-rose-50 px-1.5 font-medium text-rose-700">
                {pick(lang, `Grievances ${emp.complaintCount}`, `ร้องเรียน ${emp.complaintCount}`)}
              </span>
            )}
            {emp.suggestionCount > 0 && (
              <span className="py-0.2 rounded border border-emerald-100 bg-emerald-50 px-1.5 font-medium text-emerald-700">
                {pick(lang, `Suggestions ${emp.suggestionCount}`, `เสนอแนะ ${emp.suggestionCount}`)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Proportion Progress Line */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100/80">
        <div
          className={`h-1 rounded-full transition-all duration-500 ${rank.barColor}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
};

interface TopSubmittersProps {
  items: TopSubmitterItem[];
  onSelect: (emp: TopSubmitterItem) => void;
}

const TopSubmitters: React.FC<Readonly<TopSubmittersProps>> = ({ items, onSelect }) => {
  const { lang } = useLanguage();
  const maxCount = items[0]?.totalCount || 1;
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-amber-200/80 bg-amber-50 p-1.5 text-amber-700">
            <Trophy className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase">
              <span>
                {pick(
                  lang,
                  'Top 3 Most Active Submitters',
                  'Top 3 พนักงานที่มีข้อร้องเรียนหรือเสนอแนะมากที่สุด'
                )}
              </span>
            </h3>
            <p className="text-[10px] text-slate-500">
              Most active submitters across grievances & suggestions
            </p>
          </div>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
          {pick(lang, 'Top 3 Submitters', 'Top 3 พนักงาน')}
        </span>
      </div>

      <div className="space-y-2.5">
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            {pick(
              lang,
              'No identified submitters on record yet',
              'ยังไม่มีข้อมูลผู้ยื่นเรื่องที่ระบุตัวตน'
            )}
          </p>
        ) : (
          items.map((emp, index) => (
            <SubmitterRow
              key={emp.key}
              emp={emp}
              index={index}
              maxCount={maxCount}
              onSelect={onSelect}
            />
          ))
        )}
      </div>

      {/* Submitter Card Footer */}
      <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2 text-[10px] text-slate-500">
        <span>
          {pick(
            lang,
            '💡 Click submitter name to inspect all history',
            '💡 คลิกที่รายชื่อพนักงานเพื่อเปิดดูประวัติข้อร้องเรียนและข้อเสนอแนะทั้งหมด'
          )}
        </span>
        <span className="ml-1 shrink-0 font-semibold text-indigo-600">
          {pick(lang, 'Click to view', 'คลิกเพื่อดู')}
        </span>
      </div>
    </div>
  );
};

interface RootCausePanelProps {
  items: RootCauseItem[];
  onSelect: (item: RootCauseItem) => void;
}

const RootCausePanel: React.FC<Readonly<RootCausePanelProps>> = ({ items, onSelect }) => {
  const { lang } = useLanguage();
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase">
            <Target className="h-3.5 w-3.5 text-amber-600" />
            <span>
              {pick(
                lang,
                'Root Cause Classification',
                'การกระจายตัวของสาเหตุหลัก (Root Cause Classification)'
              )}
            </span>
          </h3>
          <p className="text-[10px] text-slate-500">
            {pick(
              lang,
              'Root cause analysis & preventive action breakdown (click to explore)',
              'Root cause analysis & preventive action breakdown (คลิกเพื่อดูรายละเอียดแต่ละรายการ)'
            )}
          </p>
        </div>
        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
          {pick(lang, '5 Dimensions', '5 มิติสาเหตุ')}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((rc) => (
          <div
            key={rc.key}
            {...clickableProps(() => onSelect(rc))}
            className={`group flex cursor-pointer flex-col justify-between gap-2 rounded-xl border border-slate-200 p-2.5 text-xs transition-all duration-200 hover:shadow-xs ${rc.bgLight} ${rc.borderHover}`}
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {ROOT_CAUSE_ICONS[rc.key]}
                  <span className="truncate text-[11px] font-bold text-slate-900 transition group-hover:text-indigo-600">
                    {pick(lang, rc.nameEn, rc.name)}
                  </span>
                </div>
                <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                  {pick(lang, rc.nameEn, rc.nameTh)}
                </span>
                <StatusChips
                  resolved={rc.resolvedCount}
                  pending={rc.pendingCount}
                  urgent={rc.urgentCount}
                  chipBg="bg-white/90"
                  className="mt-1.5 flex flex-wrap items-center gap-1"
                />
              </div>
              <div className="ml-1 flex shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-black text-indigo-700 shadow-2xs group-hover:border-indigo-300">
                    {rc.count} {pick(lang, 'cases', 'เคส')}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                </div>
                <span className="text-[9px] font-bold text-indigo-600 group-hover:underline">
                  {pick(lang, 'Explore →', 'คลิกดูรายการ →')}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-1 space-y-0.5">
              <div className="flex items-center justify-between text-[9px] font-medium text-slate-400">
                <span>{pick(lang, 'Proportion', 'สัดส่วน')}</span>
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

      <PanelFooter
        className="flex items-center justify-between rounded-lg border border-amber-200/60 bg-amber-50/50 p-2.5 text-[11px] text-amber-900"
        actionClassName="ml-1 shrink-0 text-xs font-bold text-amber-700"
        hint={pick(
          lang,
          <>
            <strong>Click root cause</strong> to inspect case investigations and CAPA preventive
            actions
          </>,
          <>
            <strong>คลิกที่สาเหตุหลัก</strong> เพื่อเปิดดูรายการเคส บันทึกการสืบสวน และแนวทางป้องกัน
            (CAPA) ทั้งหมด
          </>
        )}
      />
    </div>
  );
};

interface CsatReviewsProps {
  tickets: ComplaintTicket[];
  avgCsat: string;
}

const CsatReviews: React.FC<Readonly<CsatReviewsProps>> = ({ tickets, avgCsat }) => {
  const { lang } = useLanguage();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <h3 className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-1.5 text-xs font-bold tracking-wider text-slate-900 uppercase">
        <span>
          {pick(lang, 'Employee CSAT Reviews', 'เสียงตอบรับจากพนักงานหลังจบเคส (CSAT Reviews)')}
        </span>
        <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
          <Star className="h-3 w-3 fill-amber-400" />
          {pick(lang, `Avg ${avgCsat} / 5.0`, `เฉลี่ย ${avgCsat} / 5.0`)}
        </span>
      </h3>

      <div className="max-h-44 space-y-2 overflow-y-auto">
        {tickets.length > 0 ? (
          tickets.map((t) => (
            <div
              key={t.id}
              className="space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="truncate text-[11px] font-bold text-slate-800">{t.title}</span>
                <div className="ml-2 flex shrink-0 text-amber-400">
                  {starSlots(t.evaluation?.overallScore || 5).map((slot) => (
                    <Star key={slot} className="h-2.5 w-2.5 fill-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-600 italic">
                &quot;{t.evaluation?.feedbackComment}&quot;
              </p>
              {t.evaluation?.improvementSuggestions && (
                <p className="text-[10px] text-emerald-800">
                  💡 {pick(lang, 'Suggestion:', 'ข้อเสนอแนะ:')}{' '}
                  {t.evaluation.improvementSuggestions}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="py-2 text-center text-xs text-slate-400">
            {pick(
              lang,
              'No CSAT evaluations in this period yet',
              'ยังไม่มีเคสที่ประเมิน CSAT ในช่วงเวลานี้'
            )}
          </p>
        )}
      </div>
    </div>
  );
};

// ── Ticket list modal ───────────────────────────────────────────────────────

const SubmitterLine: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket: t }) => {
  const { lang } = useLanguage();
  const executive = getStoredRolePermissions().executive;
  const hasConfidential = executive?.canViewConfidentialIdentities ?? true;
  const canViewAnonEmail = executive?.canViewAnonymousSubmitterEmail ?? true;

  if (t.confidentiality === 'anonymous') {
    if (!canViewAnonEmail) {
      return <>{pick(lang, 'Submitter: Anonymous', 'ผู้ยื่น: ไม่ระบุตัวตน (Anonymous)')}</>;
    }
    const mapped = mapLoginEmailForTicket({
      loginEmail: t.loginEmail,
      submitterEmail: t.submitterEmail,
      submitterEmployeeId: t.submitterEmployeeId,
      submitterName: t.submitterName,
    });
    const email = t.loginEmail || t.submitterEmail || mapped.loginEmail;
    return (
      <span>
        {pick(lang, 'Submitter: Anonymous', 'ผู้ยื่น: ไม่ระบุตัวตน')}{' '}
        <span className="py-0.2 rounded border border-indigo-200 bg-indigo-50 px-1 font-mono text-[10px] font-semibold text-indigo-600">
          {email}
        </span>
      </span>
    );
  }
  if (t.confidentiality === 'confidential_restricted' && !hasConfidential) {
    return (
      <>
        {pick(lang, 'Submitter: [Confidential Protected]', 'ผู้ยื่น: [ปกปิดตัวตนตามนโยบายความลับ]')}
      </>
    );
  }
  const name = t.submitterName || pick(lang, 'Identified', 'ระบุตัวตน');
  const dept = t.submitterDepartment || pick(lang, 'General', 'ฝ่ายงาน');
  return <>{`${pick(lang, 'Submitter', 'ผู้ยื่น')}: ${name} (${dept})`}</>;
};

const RootCausePreview: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket: t }) => {
  const { lang } = useLanguage();
  return (
    <div className="mt-1 space-y-0.5 rounded-lg border border-amber-200/80 bg-amber-50/70 p-2 text-[11px]">
      <div className="flex items-center gap-1 font-semibold text-amber-900">
        <Target className="h-3 w-3 shrink-0 text-amber-600" />
        <span>
          {pick(lang, 'Root Cause:', 'สาเหตุหลัก (Root Cause):')}{' '}
          {t.rootCauseCategory || getTicketRootCauseCategory(t)}
        </span>
      </div>
      {t.rootCauseSummary && <p className="text-[11px] text-slate-700">{t.rootCauseSummary}</p>}
      {t.preventiveActionPlan && (
        <p className="text-[10.5px] text-emerald-800">
          🛡️{' '}
          <span className="font-semibold">
            {pick(lang, 'Preventive Action (CAPA):', 'แนวทางป้องกัน (CAPA):')}
          </span>{' '}
          {t.preventiveActionPlan}
        </p>
      )}
    </div>
  );
};

interface ModalTicketRowProps {
  ticket: ComplaintTicket;
  filter: ModalFilterType;
  onOpen: (ticket: ComplaintTicket) => void;
}

const ModalTicketRow: React.FC<Readonly<ModalTicketRowProps>> = ({ ticket: t, filter, onOpen }) => {
  const { lang } = useLanguage();
  const isComplaint = t.type === 'complaint';
  const status = STATUS_BADGES[t.status];
  const showRootCause = !!(t.rootCauseSummary || t.rootCauseCategory || filter === 'root_cause');

  return (
    <div
      {...clickableProps(() => onOpen(t))}
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
              isComplaint
                ? 'border border-rose-200 bg-rose-50 text-rose-700'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {isComplaint
              ? pick(lang, 'Grievance', 'ข้อร้องเรียน')
              : pick(lang, 'Suggestion', 'ข้อเสนอแนะ')}
          </span>

          {/* Status Badge */}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.cls}`}>
            {pick(lang, 'Status: ', 'สถานะ: ')}
            {pick(lang, status.en, status.th)}
          </span>

          {/* Direct CEO Tag */}
          {t.isDirectToExecutive && (
            <span className="flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
              <Crown className="h-3 w-3 text-purple-600" />
              Direct CEO
            </span>
          )}

          <span className="ml-auto text-[11px] font-medium text-slate-500 sm:ml-0">
            {CATEGORY_DEFINITIONS[t.category]?.key} ({CATEGORY_DEFINITIONS[t.category]?.nameEn})
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-slate-900 transition group-hover:text-indigo-600 sm:text-sm">
          <span>{t.title}</span>
        </div>

        <p className="line-clamp-1 text-xs text-slate-500">{t.description}</p>

        {/* Root Cause & CAPA (Preventive Action) Preview */}
        {showRootCause && <RootCausePreview ticket={t} />}

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-600">
            <UserCheck className="h-3 w-3 text-blue-600" />
            <SubmitterLine ticket={t} />
          </span>
          <span>•</span>
          <span>
            {pick(lang, 'Date', 'วันที่')}: {t.createdAt.slice(0, 10)}
          </span>
          <span>•</span>
          <span>
            {pick(lang, 'Urgency', 'ความเร่งด่วน')}:{' '}
            <strong className="text-slate-700">{t.urgency}</strong>
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition group-hover:bg-indigo-700"
        >
          <span>{pick(lang, 'View Details', 'ดูรายละเอียดเคส')}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

interface StatusFilterTabsProps {
  status: ModalStatusFilter;
  shownCount: number;
  hasSearch: boolean;
  onStatusChange: (status: ModalStatusFilter) => void;
  onReset: () => void;
}

const StatusFilterTabs: React.FC<Readonly<StatusFilterTabsProps>> = ({
  status,
  shownCount,
  hasSearch,
  onStatusChange,
  onReset,
}) => {
  const { lang } = useLanguage();
  return (
    <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50/70 px-4 py-2 text-xs">
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="mr-1 text-[11px] font-semibold text-slate-500">
          {pick(lang, 'Status:', 'สถานะ:')}
        </span>
        <button
          type="button"
          onClick={() => onStatusChange('all')}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
            status === 'all'
              ? 'bg-slate-900 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          {pick(lang, 'All', 'ทั้งหมด')} ({shownCount})
        </button>
        {STATUS_FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onStatusChange(tab.key)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              status === tab.key ? tab.active : tab.idle
            }`}
          >
            {pick(lang, tab.en, tab.th)}
          </button>
        ))}
      </div>

      {/* Reset Search / Filter */}
      {(hasSearch || status !== 'all') && (
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-[11px] font-semibold text-indigo-600 hover:underline"
        >
          {pick(lang, 'Reset Filters', 'ล้างตัวกรอง')}
        </button>
      )}
    </div>
  );
};

interface TicketModalProps {
  selection: ModalSelection;
  meta: ModalMeta;
  list: ComplaintTicket[];
  searchQuery: string;
  statusFilter: ModalStatusFilter;
  onSearchChange: (query: string) => void;
  onStatusChange: (status: ModalStatusFilter) => void;
  onClose: () => void;
  onSelectTicket: (ticket: ComplaintTicket) => void;
}

const TicketModal: React.FC<Readonly<TicketModalProps>> = ({
  selection,
  meta,
  list,
  searchQuery,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onClose,
  onSelectTicket,
}) => {
  const { lang } = useLanguage();
  const openTicket = (ticket: ComplaintTicket) => {
    onSelectTicket(ticket);
    onClose();
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="animate-in zoom-in-95 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 bg-slate-900 px-5 py-4 text-white">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="shrink-0 rounded-lg bg-white/10 p-2 text-amber-400">{meta.icon}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-bold text-white sm:text-base">{meta.title}</h3>
                <span className="shrink-0 rounded-full border border-indigo-400/30 bg-indigo-500/30 px-2 py-0.5 font-mono text-xs font-bold text-indigo-200">
                  {list.length} {pick(lang, 'cases', 'รายการ')}
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-300">
                {pick(
                  lang,
                  'Click on any case to review details, investigation notes, and CAPA preventive plans',
                  'คลิกเลือกเคสที่ต้องการเพื่อตรวจสอบรายละเอียด บันทึกการสืบสวน และมาตรการป้องกัน CAPA'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-kpi-modal"
            aria-label={pick(lang, 'Close', 'ปิด')}
            onClick={onClose}
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
              placeholder={pick(
                lang,
                'Search tracking code, title, category, submitter...',
                'ค้นหาด้วยรหัสติดตาม, หัวข้อเรื่อง, หมวดหมู่, หรือชื่อผู้ยื่น...'
              )}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pr-3.5 pl-9 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">{pick(lang, 'Filter:', 'หมวด/เงื่อนไข:')}</span>
            <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700">
              {getModalFilterLabel(lang, selection)}
            </span>
          </div>
        </div>

        <StatusFilterTabs
          status={statusFilter}
          shownCount={list.length}
          hasSearch={!!searchQuery}
          onStatusChange={onStatusChange}
          onReset={() => {
            onSearchChange('');
            onStatusChange('all');
          }}
        />

        {/* Modal Ticket List */}
        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto p-4">
          {list.length === 0 ? (
            <div className="space-y-2 py-12 text-center text-slate-400">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="text-xs">
                {pick(
                  lang,
                  'No tickets match the search or filter criteria',
                  'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา'
                )}
              </p>
            </div>
          ) : (
            list.map((t) => (
              <ModalTicketRow key={t.id} ticket={t} filter={selection.filter} onOpen={openTicket} />
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          <span>
            {pick(
              lang,
              `Showing ${list.length} of ${list.length} records`,
              `แสดงทั้งหมด ${list.length} จาก ${list.length} รายการ`
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {pick(lang, 'Close Window', 'ปิดหน้าต่าง')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Dashboard ───────────────────────────────────────────────────────────────

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
  const [modalStatusFilter, setModalStatusFilter] = useState<ModalStatusFilter>('all');

  // Computed metrics
  const total = tickets.length;
  const directCeoTickets = tickets.filter((t) => t.isDirectToExecutive);
  const resolvedCount = tickets.filter(isResolved).length;
  const resolutionRate = total > 0 ? ((resolvedCount / total) * 100).toFixed(1) : '100';

  const evaluatedTickets = tickets.filter((t) => t.evaluation);
  const avgCsat =
    evaluatedTickets.length > 0
      ? (
          evaluatedTickets.reduce((acc, curr) => acc + (curr.evaluation?.overallScore || 5), 0) /
          evaluatedTickets.length
        ).toFixed(1)
      : '4.8';

  const complaintsCount = tickets.filter((t) => t.type === 'complaint').length;
  const suggestionsCount = tickets.filter((t) => t.type === 'suggestion').length;

  const topSubmitters = useMemo(() => buildTopSubmitters(tickets), [tickets]);
  const categoryCounts = useMemo(() => buildCategoryCounts(tickets, total), [tickets, total]);
  const rootCauseCounts = useMemo(() => buildRootCauseCounts(tickets, total), [tickets, total]);

  const selection: ModalSelection = {
    filter: activeModalFilter,
    employee: selectedEmployee,
    category: selectedCategory,
    rootCause: selectedRootCause,
  };
  const modalList = filterModalTickets(tickets, selection, modalStatusFilter, modalSearchQuery);

  const openList = (filter: ModalFilterType) => {
    setModalSearchQuery('');
    setActiveModalFilter(filter);
  };
  const openCategory = (category: GrievanceCategory) => {
    setSelectedCategory(category);
    setModalStatusFilter('all');
    openList('category');
  };
  const openEmployee = (employee: TopSubmitterItem) => {
    setSelectedEmployee(employee);
    openList('employee');
  };
  const openRootCause = (rootCause: RootCauseItem) => {
    setSelectedRootCause(rootCause);
    setModalStatusFilter('all');
    openList('root_cause');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <DashboardHeader />

      <KpiCards
        total={total}
        complaintsCount={complaintsCount}
        suggestionsCount={suggestionsCount}
        directCeoCount={directCeoTickets.length}
        resolvedCount={resolvedCount}
        resolutionRate={resolutionRate}
        avgCsat={avgCsat}
        onOpenList={openList}
      />

      <DirectCeoQueue tickets={directCeoTickets} onSelectTicket={onSelectTicket} />

      {/* Analytics Charts Grid - Compact */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <CategoryBreakdown items={categoryCounts} total={total} onSelect={openCategory} />
          <TopSubmitters items={topSubmitters} onSelect={openEmployee} />
        </div>

        <div className="space-y-4">
          <RootCausePanel items={rootCauseCounts} onSelect={openRootCause} />
          <CsatReviews tickets={evaluatedTickets} avgCsat={avgCsat} />
        </div>
      </div>

      {/* Interactive Modal: Clickable KPI Ticket List */}
      {activeModalFilter && (
        <TicketModal
          selection={selection}
          meta={getModalMeta(lang, tickets, selection)}
          list={modalList}
          searchQuery={modalSearchQuery}
          statusFilter={modalStatusFilter}
          onSearchChange={setModalSearchQuery}
          onStatusChange={setModalStatusFilter}
          onClose={() => setActiveModalFilter(null)}
          onSelectTicket={onSelectTicket}
        />
      )}
    </div>
  );
};
