'use client';

import React, { useState } from 'react';
import {
  Shield,
  Search,
  Crown,
  CheckCircle2,
  Clock,
  UserCheck,
  FileText,
  Edit3,
  ChevronRight,
  Lock,
  MessageSquare,
} from 'lucide-react';
import {
  ComplaintTicket,
  DepartmentGatekeeperConfig,
  GrievanceCategory,
  TicketStatus,
  UserRole,
  UrgencyLevel,
} from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import {
  getStatusBadgeText,
  getStatusColor,
  getUrgencyBadgeText,
  getUrgencyColor,
  logTicketResolvedEmail,
} from '../services/api';
import { updateTicketWorkflow } from '@/lib/actions/tickets';
import { useShell } from '../app/shell-context';
import { clickableProps } from './clickableProps';

interface GatekeeperInboxProps {
  tickets: ComplaintTicket[];
  currentRole?: UserRole;
  onSelectTicket: (ticket: ComplaintTicket) => void;
  onTicketUpdated: (ticket: ComplaintTicket) => void;
}

type RiskSeverity = ComplaintTicket['riskSeverity'];
type RootCauseCategory = ComplaintTicket['rootCauseCategory'];

const DIRECT_CEO_RESTRICTED_NOTICE =
  'สิทธิ์การเข้าถึงถูกจำกัด: ข้อร้องเรียนนี้ส่งตรงถึง CEO/EVP (Whistleblower Escalation) เฉพาะผู้บริหารระดับสูงหรือผู้ได้รับมอบหมายสิทธิ์เท่านั้น';

const isPending = (t: ComplaintTicket) =>
  t.status === 'submitted' || t.status === 'gatekeeper_triaged';
const isOpenCase = (t: ComplaintTicket) => isPending(t) || t.status === 'in_progress';

/** Status-chip / counter filters; unknown keys fall back to an exact status match. */
const STATUS_PREDICATES: Record<string, (t: ComplaintTicket) => boolean> = {
  received: isPending,
  in_progress: (t) => t.status === 'in_progress',
  resolved: (t) => t.status === 'resolved',
  closed: (t) => t.status === 'closed',
  submitted: (t) => t.status === 'submitted',
  gatekeeper_triaged: (t) => t.status === 'gatekeeper_triaged',
  active_in_progress: (t) => t.status === 'in_progress' || t.status === 'gatekeeper_triaged',
};

const matchesStatusFilter = (t: ComplaintTicket, filter: string) =>
  filter === 'ALL' || (STATUS_PREDICATES[filter]?.(t) ?? t.status === filter);

const matchesSearch = (t: ComplaintTicket, query: string) => {
  const q = query.toLowerCase();
  return (
    t.trackingCode.toLowerCase().includes(q) ||
    t.title.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    !!t.submitterName?.toLowerCase().includes(q)
  );
};

const CATEGORY_COUNT = Object.keys(CATEGORY_DEFINITIONS).length;

// ── Header counters ─────────────────────────────────────────────────────────

interface CounterCardProps {
  id: string;
  title: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  active: boolean;
  activeClass: string;
  labelClass: string;
  dotClass: string;
  countClass: string;
  onClick: () => void;
}

const CounterCard: React.FC<Readonly<CounterCardProps>> = ({
  id,
  title,
  label,
  icon,
  count,
  active,
  activeClass,
  labelClass,
  dotClass,
  countClass,
  onClick,
}) => (
  <button
    type="button"
    id={id}
    onClick={onClick}
    className={`group cursor-pointer rounded-xl border px-3 py-2 text-center text-left transition ${
      active ? activeClass : 'border-white/10 bg-white/10 hover:bg-white/15'
    }`}
    title={title}
  >
    <div className="flex items-center justify-between gap-1.5">
      <span
        className={`block flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase ${labelClass}`}
      >
        {icon}
        {label}
      </span>
      {active && <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${dotClass}`} />}
    </div>
    <div className="mt-0.5 flex items-baseline gap-1">
      <span
        className={`text-lg font-black transition-transform group-hover:scale-105 ${countClass}`}
      >
        {count}
      </span>
      <span className="text-[10px] font-normal text-slate-300">เคส</span>
    </div>
  </button>
);

const STATUS_COUNTERS = [
  {
    key: 'received',
    id: 'counter-card-status-received',
    label: 'รับเรื่อง',
    icon: <FileText className="inline h-3 w-3 text-amber-300" />,
    activeClass: 'border-amber-400 bg-amber-500/30 shadow-md ring-2 ring-amber-400/50',
    labelClass: 'text-amber-200',
    dotClass: 'bg-amber-400',
    countClass: 'text-amber-400',
  },
  {
    key: 'in_progress',
    id: 'counter-card-status-in-progress',
    label: 'กำลังแก้ไข',
    icon: <Clock className="inline h-3 w-3 text-blue-300" />,
    activeClass: 'border-blue-400 bg-blue-500/30 shadow-md ring-2 ring-blue-400/50',
    labelClass: 'text-blue-200',
    dotClass: 'bg-blue-400',
    countClass: 'text-blue-400',
  },
  {
    key: 'resolved',
    id: 'counter-card-status-resolved',
    label: 'แก้ไขเสร็จ',
    icon: <CheckCircle2 className="inline h-3 w-3 text-emerald-300" />,
    activeClass: 'border-emerald-400 bg-emerald-500/30 shadow-md ring-2 ring-emerald-400/50',
    labelClass: 'text-emerald-200',
    dotClass: 'bg-emerald-400',
    countClass: 'text-emerald-400',
  },
  {
    key: 'closed',
    id: 'counter-card-status-closed',
    label: 'ปิดเรื่อง',
    icon: <UserCheck className="inline h-3 w-3 text-teal-300" />,
    activeClass: 'border-teal-300 bg-teal-500/30 shadow-md ring-2 ring-teal-400/50',
    labelClass: 'text-teal-200',
    dotClass: 'bg-teal-300',
    countClass: 'text-teal-300',
  },
];

const IsolatedCeoBadge: React.FC = () => (
  <div
    id="badge-ceo-whistleblower-isolated"
    className="flex flex-col justify-center rounded-xl border border-purple-800/40 bg-purple-950/30 px-3 py-2 text-center text-left text-purple-300/80"
    title="ช่องทางสายตรง CEO/EVP (Whistleblower Escalation) ถูกแยกจัดเก็บเป็นความลับเฉพาะผู้บริหารระดับสูงและผู้ได้รับมอบหมายตามสิทธิ์ RBAC & ISO 37002"
  >
    <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-purple-300 uppercase">
      <Lock className="inline h-3 w-3 shrink-0 text-yellow-400" />
      <span>สายตรง CEO (จำกัดสิทธิ์)</span>
    </div>
    <div className="mt-0.5 text-[10px] font-medium text-purple-400">Whistleblower Isolated</div>
  </div>
);

interface InboxFilters {
  statusFilter: string;
  onlyCeoDirect: boolean;
}

interface InboxBannerProps {
  isStrictGatekeeper: boolean;
  assignedDepts: GrievanceCategory[];
  canViewDirectCeo: boolean;
  counts: Record<string, number>;
  filters: InboxFilters;
  onToggleStatus: (key: string) => void;
  onToggleCeoDirect: () => void;
}

const InboxBanner: React.FC<Readonly<InboxBannerProps>> = ({
  isStrictGatekeeper,
  assignedDepts,
  canViewDirectCeo,
  counts,
  filters,
  onToggleStatus,
  onToggleCeoDirect,
}) => (
  <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-6 text-white shadow-sm lg:flex-row lg:items-center">
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-indigo-600 p-1.5 text-white">
          <Shield className="h-5 w-5" />
        </span>
        <h1 className="text-xl font-bold">Gatekeeper Triage & Resolution Hub</h1>
        <span className="rounded-md border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">
          ศูนย์คัดกรองข้อร้องเรียน
        </span>
        {isStrictGatekeeper && (
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
            หมวดหมู่ที่รับผิดชอบ: {assignedDepts.join(', ')}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-300 sm:text-sm">
        {isStrictGatekeeper
          ? `ระบบคัดกรองและดำเนินการเฉพาะคำร้องในหมวดหมู่ ${assignedDepts.map((d) => CATEGORY_DEFINITIONS[d]?.nameTh.split('(')[0]).join(', ')} ตามสิทธิ์ RBAC`
          : 'ระบบคัดกรอง มอบหมายเจ้าหน้าที่ผู้รับผิดชอบ และบันทึกผลการแก้ไขปัญหาตามหมวดหมู่'}
      </p>
    </div>

    {/* Dynamic & Clickable Counter Pills: 5 Buttons (4 Operational Statuses + 1 Direct to CEO) */}
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {STATUS_COUNTERS.map((c) => (
        <CounterCard
          key={c.key}
          id={c.id}
          title={`คลิกเพื่อกรองเฉพาะรายการ '${c.label}' ตามหมวดหมู่ที่เลือก`}
          label={c.label}
          icon={c.icon}
          count={counts[c.key]}
          active={filters.statusFilter === c.key && !filters.onlyCeoDirect}
          activeClass={c.activeClass}
          labelClass={c.labelClass}
          dotClass={c.dotClass}
          countClass={c.countClass}
          onClick={() => onToggleStatus(c.key)}
        />
      ))}

      {/* Button 5: ส่งตรง CEO (Enforce Strict RBAC Isolation) */}
      {canViewDirectCeo ? (
        <CounterCard
          id="counter-card-ceo-direct"
          title="คลิกเพื่อกรองเฉพาะเคส 'ส่งตรง CEO / EVP' ตามหมวดหมู่ที่เลือก"
          label="ส่งตรง CEO"
          icon={<Crown className="inline h-3 w-3 text-yellow-300" />}
          count={counts.ceoDirect}
          active={filters.onlyCeoDirect}
          activeClass="border-purple-300 bg-purple-500/35 shadow-md ring-2 ring-purple-400/50"
          labelClass="text-purple-200"
          dotClass="bg-purple-300"
          countClass="text-purple-300"
          onClick={onToggleCeoDirect}
        />
      ) : (
        <IsolatedCeoBadge />
      )}
    </div>
  </div>
);

// ── Filter toolbar ──────────────────────────────────────────────────────────

interface FilterToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  canViewDirectCeo: boolean;
  filters: InboxFilters;
  onToggleCeoDirect: () => void;
  ceoDirectCount: number;
  departments: Array<{ key: string; label: string }>;
  deptCounts: Record<string, number>;
  activeDeptFilter: string;
  onSelectDept: (key: string) => void;
  statusChips: Array<{ key: string; label: string; count: number; badge: string }>;
  onSelectStatus: (key: string) => void;
}

const FilterToolbar: React.FC<Readonly<FilterToolbarProps>> = ({
  searchQuery,
  onSearchChange,
  canViewDirectCeo,
  filters,
  onToggleCeoDirect,
  ceoDirectCount,
  departments,
  deptCounts,
  activeDeptFilter,
  onSelectDept,
  statusChips,
  onSelectStatus,
}) => (
  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {/* Search Box */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          id="gatekeeper-search"
          aria-label="ค้นหา Tracking Code, ชื่อเรื่อง, ผู้ยื่น"
          placeholder="ค้นหา Tracking Code, ชื่อเรื่อง, ผู้ยื่น..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-9 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      {/* Special CEO Direct Toggle Filter (Only shown if user has canViewDirectCeo permission) */}
      {canViewDirectCeo && (
        <button
          type="button"
          id="filter-ceo-direct"
          onClick={onToggleCeoDirect}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            filters.onlyCeoDirect
              ? 'border-purple-600 bg-purple-600 text-white shadow-xs ring-2 ring-purple-400/50'
              : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
          }`}
          title="กรองเฉพาะข้อร้องเรียนส่งตรง CEO/EVP ตามหมวดหมู่ที่เลือก"
        >
          <Crown className="h-3.5 w-3.5 text-yellow-500" />
          <span>เฉพาะข้อร้องเรียนส่งตรง CEO/EVP</span>
          <span
            className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold ${
              filters.onlyCeoDirect ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-900'
            }`}
          >
            {ceoDirectCount}
          </span>
        </button>
      )}
    </div>

    {/* Category Chips */}
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1">
      <span className="text-xs font-semibold whitespace-nowrap text-slate-500">หมวดหมู่:</span>
      {departments.map((d) => {
        const isActive = activeDeptFilter === d.key;
        const count = deptCounts[d.key];
        let countClass = 'bg-slate-200 text-slate-600';
        if (isActive) countClass = 'bg-white/20 text-white';
        else if (count > 0) countClass = 'bg-blue-100 text-blue-800';

        return (
          <button
            key={d.key}
            type="button"
            id={`filter-dept-${d.key}`}
            onClick={() => onSelectDept(d.key)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
              isActive
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{d.label}</span>
            <span className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold ${countClass}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>

    {/* Status Chips */}
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 pt-1">
      <span className="text-xs font-semibold whitespace-nowrap text-slate-500">สถานะ:</span>
      {statusChips.map((st) => {
        const isActive = filters.statusFilter === st.key && !filters.onlyCeoDirect;
        return (
          <button
            key={st.key}
            type="button"
            id={`filter-status-${st.key}`}
            onClick={() => onSelectStatus(st.key)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
              isActive
                ? 'border-slate-900 bg-slate-900 font-semibold text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{st.label}</span>
            <span
              className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold ${
                isActive ? 'bg-white/20 text-white' : st.badge
              }`}
            >
              {st.count}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

// ── Ticket list ─────────────────────────────────────────────────────────────

interface TicketRowProps {
  ticket: ComplaintTicket;
  onSelect: (ticket: ComplaintTicket) => void;
  onTriage: (ticket: ComplaintTicket, e: React.MouseEvent) => void;
}

const TicketRow: React.FC<Readonly<TicketRowProps>> = ({ ticket: t, onSelect, onTriage }) => {
  const catInfo = CATEGORY_DEFINITIONS[t.category];
  return (
    <div
      id={`ticket-row-${t.id}`}
      {...clickableProps(() => onSelect(t))}
      className="flex cursor-pointer flex-col justify-between gap-3 p-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">
            {t.trackingCode}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusColor(t.status)}`}
          >
            {getStatusBadgeText(t.status)}
          </span>
          <span
            className={`rounded border px-2 py-0.5 text-[11px] font-medium ${catInfo?.badgeColor}`}
          >
            {catInfo?.nameEn}
          </span>
          {t.isDirectToExecutive && (
            <span className="inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
              <Crown className="h-3 w-3 text-purple-600" />
              CEO/EVP
            </span>
          )}
          <span
            className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${getUrgencyColor(t.urgency)}`}
          >
            {getUrgencyBadgeText(t.urgency)}
          </span>
          {!!t.anonymousMessages?.length && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
              <MessageSquare className="h-3 w-3 text-amber-600" />
              <span>แชทนิรนาม ({t.anonymousMessages.length})</span>
            </span>
          )}
        </div>

        <h3 className="line-clamp-1 text-xs font-bold text-slate-900 sm:text-sm">{t.title}</h3>
        <p className="line-clamp-1 text-xs text-slate-500">{t.description}</p>

        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
          <span>
            หมวดหมู่: <strong className="text-slate-700">{catInfo?.nameTh || t.category}</strong>
          </span>
          <span>
            ผู้รับผิดชอบ:{' '}
            <strong className="text-slate-700">{t.assignedOfficerName || 'ยังไม่มอบหมาย'}</strong>
          </span>
        </div>
      </div>

      {/* Actions Right */}
      <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 pt-2 sm:border-t-0 sm:pt-0">
        <button
          type="button"
          id={`btn-triage-${t.id}`}
          onClick={(e) => onTriage(t, e)}
          className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>จัดการ / อัปเดตสถานะ</span>
        </button>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </div>
    </div>
  );
};

// ── Triage modal ────────────────────────────────────────────────────────────

interface TriageForm {
  officerName: string;
  officerEmail: string;
  targetStatus: TicketStatus;
  urgency: UrgencyLevel;
  riskSeverity: RiskSeverity;
  actionNote: string;
  resolutionSummary: string;
  rootCauseCategory: RootCauseCategory;
  preventivePlan: string;
}

type SetTriageField = <K extends keyof TriageForm>(key: K, value: TriageForm[K]) => void;

const NEXT_TRIAGE_STATUS: Partial<Record<TicketStatus, TicketStatus>> = {
  submitted: 'gatekeeper_triaged',
  gatekeeper_triaged: 'in_progress',
};

const buildTriageForm = (
  ticket: ComplaintTicket,
  deptConfig: DepartmentGatekeeperConfig | undefined
): TriageForm => {
  const defaultOfficer = deptConfig?.leadOfficer || deptConfig?.officers?.[0];
  return {
    officerName: ticket.assignedOfficerName || defaultOfficer?.name || 'เจ้าหน้าที่ผู้รับผิดชอบ',
    officerEmail:
      ticket.assignedOfficerEmail || defaultOfficer?.email || 'officer.lead@company.internal',
    targetStatus: NEXT_TRIAGE_STATUS[ticket.status] ?? ticket.status,
    urgency: ticket.urgency || 'Medium',
    riskSeverity: ticket.riskSeverity || 'Moderate',
    actionNote: '',
    resolutionSummary: ticket.resolutionSummary || '',
    rootCauseCategory: ticket.rootCauseCategory || 'Process',
    preventivePlan: ticket.preventiveActionPlan || '',
  };
};

const WORKFLOW_STATUS_OPTIONS: Array<{ key: TicketStatus; label: string }> = [
  { key: 'gatekeeper_triaged', label: 'รับเรื่อง (Triaged)' },
  { key: 'in_progress', label: 'กำลังแก้ไข (In Progress)' },
  { key: 'resolved', label: 'แก้ไขเสร็จ (Resolved)' },
  { key: 'closed', label: 'ปิดเรื่อง (Closed)' },
];

const URGENCY_OPTIONS: Array<{ value: UrgencyLevel; label: string }> = [
  { value: 'Low', label: '🟢 ต่ำ / ทั่วไป (Low)' },
  { value: 'Medium', label: '🟡 ปานกลาง (Medium)' },
  { value: 'High', label: '🔴 เร่งด่วน (High)' },
  { value: 'Critical', label: '🔥 วิกฤติ / ฉุกเฉิน (Critical)' },
];

const RISK_OPTIONS: Array<{ value: RiskSeverity; label: string }> = [
  { value: 'Low', label: 'เสี่ยงต่ำ (Low)' },
  { value: 'Moderate', label: 'เสี่ยงปานกลาง (Moderate)' },
  { value: 'High', label: 'เสี่ยงสูง (High)' },
  { value: 'Severe', label: 'วิกฤติรุนแรง (Severe)' },
];

const ROOT_CAUSE_OPTIONS: Array<{ value: NonNullable<RootCauseCategory>; label: string }> = [
  { value: 'Process', label: 'กระบวนการ / ขั้นตอนการทำงาน (Process)' },
  { value: 'People', label: 'บุคคลากร / พฤติกรรม / การสื่อสาร (People)' },
  { value: 'Equipment/Tools', label: 'อุปกรณ์ / เครื่องจักร / ซอฟต์แวร์ (Equipment/Tools)' },
  { value: 'Policy/Governance', label: 'นโยบาย / กฎระเบียบบริษัท (Policy/Governance)' },
  { value: 'Workplace/Facilities', label: 'สถานที่ทำงานและกายภาพ (Workplace/Facilities)' },
];

const UrgencyRiskFields: React.FC<Readonly<{ form: TriageForm; setField: SetTriageField }>> = ({
  form,
  setField,
}) => (
  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
    <span className="block text-xs font-bold text-slate-700">
      ทบทวนระดับความเร่งด่วนและความเสี่ยง (Urgency & Risk Assessment):
    </span>
    <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
      <div>
        <label
          htmlFor="triage-urgency"
          className="mb-1 block text-[11px] font-semibold text-slate-600"
        >
          ระดับความเร่งด่วน (Urgency):
        </label>
        <select
          id="triage-urgency"
          value={form.urgency}
          onChange={(e) => setField('urgency', e.target.value as UrgencyLevel)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          {URGENCY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="triage-risk"
          className="mb-1 block text-[11px] font-semibold text-slate-600"
        >
          ระดับความเสี่ยง (Risk Severity):
        </label>
        <select
          id="triage-risk"
          value={form.riskSeverity}
          onChange={(e) => setField('riskSeverity', e.target.value as RiskSeverity)}
          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          {RISK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
);

interface AssigneeFieldsProps {
  ticket: ComplaintTicket;
  form: TriageForm;
  setField: SetTriageField;
}

const AssigneeFields: React.FC<Readonly<AssigneeFieldsProps>> = ({ ticket, form, setField }) => {
  /* Fast selector from the configured department officers */
  const officers = useShell().gatekeeperConfigs[ticket.category]?.officers || [];
  return (
    <div className="space-y-2 text-xs">
      {officers.length > 0 && (
        <div>
          <span className="mb-1 block text-[11px] font-semibold text-slate-500">
            เลือกจากรายชื่อ Gatekeeper ประจำหมวดหมู่ {ticket.category}:
          </span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {officers.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setField('officerName', o.name);
                  setField('officerEmail', o.email);
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                  form.officerName === o.name
                    ? 'border-indigo-300 bg-indigo-50 font-bold text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{o.name}</span>
                {o.isLead && (
                  <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">
                    LEAD
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="triage-officer-name" className="mb-1 block font-semibold text-slate-700">
            เจ้าหน้าที่ผู้รับผิดชอบหลัก (Assigned Officer):
          </label>
          <input
            id="triage-officer-name"
            type="text"
            required
            value={form.officerName}
            onChange={(e) => setField('officerName', e.target.value)}
            placeholder="เช่น กิตติศักดิ์ ชัยชนะ (Lead Engineer)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="triage-officer-email" className="mb-1 block font-semibold text-slate-700">
            อีเมลติดต่อเจ้าหน้าที่:
          </label>
          <input
            id="triage-officer-email"
            type="email"
            required
            value={form.officerEmail}
            onChange={(e) => setField('officerEmail', e.target.value)}
            placeholder="officer@company.internal"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[11px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};

const RootCauseFields: React.FC<Readonly<{ form: TriageForm; setField: SetTriageField }>> = ({
  form,
  setField,
}) => (
  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
    <div>
      <label htmlFor="triage-root-cause" className="mb-1 block font-semibold text-slate-700">
        การจัดกลุ่มหมวดหมู่สาเหตุหลัก (Root Cause Category):
      </label>
      <select
        id="triage-root-cause"
        value={form.rootCauseCategory}
        onChange={(e) => setField('rootCauseCategory', e.target.value as RootCauseCategory)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      >
        {ROOT_CAUSE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label htmlFor="triage-preventive" className="mb-1 block font-semibold text-slate-700">
        มาตรการป้องกันไม่ให้เกิดซ้ำ (Preventive Action Plan):
      </label>
      <input
        id="triage-preventive"
        type="text"
        value={form.preventivePlan}
        onChange={(e) => setField('preventivePlan', e.target.value)}
        placeholder="เช่น อัปเกรดเครื่องมือ, เพิ่มระบบตรวจสอบอัตโนมัติ"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      />
    </div>
  </div>
);

interface TriageModalProps {
  ticket: ComplaintTicket;
  onClose: () => void;
  onSaved: (ticket: ComplaintTicket) => void;
}

const TriageModal: React.FC<Readonly<TriageModalProps>> = ({ ticket, onClose, onSaved }) => {
  const { gatekeeperConfigs } = useShell();
  const [form, setForm] = useState<TriageForm>(() =>
    buildTriageForm(ticket, gatekeeperConfigs[ticket.category])
  );
  const [isSaving, setIsSaving] = useState(false);
  const setField: SetTriageField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const isResolved = form.targetStatus === 'resolved';
    const updates = {
      status: form.targetStatus,
      urgency: form.urgency,
      riskSeverity: form.riskSeverity,
      assignedOfficerName: form.officerName,
      assignedOfficerEmail: form.officerEmail,
      actionNote:
        form.actionNote ||
        (isResolved
          ? 'แก้ไขปัญหาเสร็จสิ้น พร้อมส่งมอบให้พนักงานประเมิน'
          : 'Gatekeeper รับเรื่องและมอบหมายผู้รับผิดชอบ'),
      resolutionSummary: isResolved ? form.resolutionSummary : ticket.resolutionSummary,
      rootCauseCategory: form.rootCauseCategory,
      preventiveActionPlan: form.preventivePlan,
      actorName: 'Gatekeeper Supervisor',
      actorRole: 'Gatekeeper Lead',
    };

    setIsSaving(true);
    updateTicketWorkflow(ticket.id, updates)
      .then((updated) => {
        if (!updated) return;
        logTicketResolvedEmail(updated, updates);
        onSaved(updated);
      })
      .catch((error) => {
        console.error('updateTicketWorkflow failed', error);
        alert('บันทึกการอัปเดตไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      })
      .finally(() => setIsSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="animate-in fade-in zoom-in-95 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <span className="font-mono text-xs font-bold text-indigo-700">
              {ticket.trackingCode}
            </span>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base">
              จัดการเคสและอัปเดตความคืบหน้า (Gatekeeper Action)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-400 hover:text-slate-700"
          >
            ปิด
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 p-6">
          {/* Status Selector */}
          <div>
            <span id="triage-status-label" className="mb-1 block text-xs font-bold text-slate-700">
              ปรับเปลี่ยนสถานะการดำเนินงาน (Workflow Status):
            </span>
            <div
              role="group"
              aria-labelledby="triage-status-label"
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {WORKFLOW_STATUS_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={form.targetStatus === s.key}
                  onClick={() => setField('targetStatus', s.key)}
                  className={`rounded-lg border p-2 text-center text-xs font-bold transition ${
                    form.targetStatus === s.key
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <UrgencyRiskFields form={form} setField={setField} />
          <AssigneeFields ticket={ticket} form={form} setField={setField} />
          <RootCauseFields form={form} setField={setField} />

          {/* Action Note to Timeline */}
          <div>
            <label
              htmlFor="triage-action-note"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              บันทึกความคืบหน้าแจ้งพนักงาน (Action Note for Timeline):
            </label>
            <textarea
              id="triage-action-note"
              rows={2}
              value={form.actionNote}
              onChange={(e) => setField('actionNote', e.target.value)}
              placeholder="อธิบายการกระทำ เช่น ลงพื้นที่ตรวจสอบแล้ว พบสาเหตุคือ..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Resolution Summary (If marking resolved) */}
          {form.targetStatus === 'resolved' && (
            <div className="space-y-1.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs">
              <label htmlFor="triage-resolution" className="block font-bold text-emerald-900">
                สรุปผลการแก้ไขปัญหาฉบับสมบูรณ์ (Resolution Statement):
              </label>
              <textarea
                id="triage-resolution"
                required
                rows={2}
                value={form.resolutionSummary}
                onChange={(e) => setField('resolutionSummary', e.target.value)}
                placeholder="สรุปผลการแก้ปัญหาอย่างละเอียด เช่น ซ่อมแซมเสร็จสิ้น ตรวจสอบมาตรฐาน 100%..."
                className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-emerald-700">
                * เมื่อบันทึกสถานะ Resolved
                ระบบจะส่งการแจ้งเตือนอัตโนมัติให้พนักงานเข้าประเมินความพึงพอใจ (CSAT)
              </p>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              id="btn-save-triage-confirm"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-6 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>บันทึกการอัปเดต (Save & Dispatch)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Inbox ───────────────────────────────────────────────────────────────────

export const GatekeeperInbox: React.FC<GatekeeperInboxProps> = ({
  tickets = [],
  currentRole = 'gatekeeper',
  onSelectTicket,
  onTicketUpdated,
}) => {
  const { rolePermissions, gatekeeperCategories } = useShell();
  const currentRoleConfig = rolePermissions[currentRole] || rolePermissions.gatekeeper;
  const isStrictGatekeeper = currentRole === 'gatekeeper';
  const canViewDirectCeo = currentRoleConfig?.canViewDirectCeoTickets ?? false;
  // Server-resolved (resolveViewer): today the RBAC page's assignedDepartments, empty → ['HR'].
  const assignedDepts: GrievanceCategory[] = gatekeeperCategories;

  let defaultDept = 'ALL';
  if (isStrictGatekeeper && assignedDepts.length === 1) defaultDept = assignedDepts[0];

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(defaultDept);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyCeoDirect, setOnlyCeoDirect] = useState<boolean>(false);
  const [triageTicket, setTriageTicket] = useState<ComplaintTicket | null>(null);

  // A strict gatekeeper's selection outside their assigned depts falls back
  // at render time — derived, not reset via an effect.
  const selectionOutOfScope =
    isStrictGatekeeper &&
    selectedDeptFilter !== 'ALL' &&
    !assignedDepts.includes(selectedDeptFilter as GrievanceCategory);
  const activeDeptFilter = selectionOutOfScope ? defaultDept : selectedDeptFilter;

  // Scoped tickets based on Role, Assigned Departments, and Strict Whistleblower/Direct-to-CEO Security Privileges
  const scopedTickets = tickets.filter((t) => {
    // Direct-to-executive tickets stay isolated from roles without canViewDirectCeoTickets.
    if (t.isDirectToExecutive && !canViewDirectCeo) return false;
    // A gatekeeper only sees the departments assigned to them.
    return !isStrictGatekeeper || assignedDepts.includes(t.category);
  });

  // Department-scoped tickets (dynamically changes when activeDeptFilter changes)
  const deptScopedTickets = scopedTickets.filter(
    (t) => activeDeptFilter === 'ALL' || t.category === activeDeptFilter
  );

  // Dynamic counts according to current department scope
  const counts: Record<string, number> = {
    received: deptScopedTickets.filter(isPending).length,
    in_progress: deptScopedTickets.filter(STATUS_PREDICATES.in_progress).length,
    resolved: deptScopedTickets.filter(STATUS_PREDICATES.resolved).length,
    closed: deptScopedTickets.filter(STATUS_PREDICATES.closed).length,
    ceoDirect: deptScopedTickets.filter((t) => t.isDirectToExecutive).length,
  };

  const filteredTickets = deptScopedTickets.filter(
    (t) =>
      (!onlyCeoDirect || t.isDirectToExecutive) &&
      matchesStatusFilter(t, selectedStatusFilter) &&
      (!searchQuery.trim() || matchesSearch(t, searchQuery))
  );

  const toggleStatusFilter = (key: string) => {
    if (selectedStatusFilter === key && !onlyCeoDirect) {
      setSelectedStatusFilter('ALL');
    } else {
      setSelectedStatusFilter(key);
      setOnlyCeoDirect(false);
    }
  };

  const toggleCeoDirect = () => {
    if (onlyCeoDirect) {
      setOnlyCeoDirect(false);
    } else {
      setOnlyCeoDirect(true);
      setSelectedStatusFilter('ALL');
    }
  };

  const selectStatusChip = (key: string) => {
    setSelectedStatusFilter(key);
    if (key !== 'ALL') setOnlyCeoDirect(false);
  };

  const openTriageModal = (ticket: ComplaintTicket, e: React.MouseEvent) => {
    e.stopPropagation();
    if (ticket.isDirectToExecutive && !canViewDirectCeo) {
      globalThis.alert(DIRECT_CEO_RESTRICTED_NOTICE); // same blocking alert as upstream
      return;
    }
    setTriageTicket(ticket);
  };

  // If strict gatekeeper and assigned departments are configured, only allow access to those assigned departments
  const availableCategories =
    isStrictGatekeeper && assignedDepts.length < CATEGORY_COUNT
      ? assignedDepts
      : (Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[]);

  const departmentsList = [
    ...(availableCategories.length > 1
      ? [{ key: 'ALL', label: 'ทุกหมวดหมู่ที่ได้รับมอบหมาย' }]
      : []),
    ...availableCategories.map((k) => ({
      key: k,
      label: `${k} - ${CATEGORY_DEFINITIONS[k]?.nameTh.split('(')[0].trim()}`,
    })),
  ];

  const deptCounts: Record<string, number> = { ALL: scopedTickets.filter(isOpenCase).length };
  availableCategories.forEach((k) => {
    deptCounts[k] = scopedTickets.filter((t) => t.category === k && isOpenCase(t)).length;
  });

  const statusChips = [
    {
      key: 'ALL',
      label: 'ทั้งหมด',
      count: deptScopedTickets.length,
      badge: 'bg-slate-200 text-slate-700',
    },
    {
      key: 'received',
      label: 'รับเรื่อง (รอคัดกรอง)',
      count: counts.received,
      badge: 'bg-amber-100 text-amber-800',
    },
    {
      key: 'in_progress',
      label: 'กำลังแก้ไข',
      count: counts.in_progress,
      badge: 'bg-blue-100 text-blue-800',
    },
    {
      key: 'resolved',
      label: 'แก้ไขเสร็จ',
      count: counts.resolved,
      badge: 'bg-emerald-100 text-emerald-800',
    },
    {
      key: 'closed',
      label: 'ปิดเรื่อง',
      count: counts.closed,
      badge: 'bg-teal-100 text-teal-800',
    },
  ];

  const filters: InboxFilters = { statusFilter: selectedStatusFilter, onlyCeoDirect };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <InboxBanner
        isStrictGatekeeper={isStrictGatekeeper}
        assignedDepts={assignedDepts}
        canViewDirectCeo={canViewDirectCeo}
        counts={counts}
        filters={filters}
        onToggleStatus={toggleStatusFilter}
        onToggleCeoDirect={toggleCeoDirect}
      />

      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        canViewDirectCeo={canViewDirectCeo}
        filters={filters}
        onToggleCeoDirect={toggleCeoDirect}
        ceoDirectCount={counts.ceoDirect}
        departments={departmentsList}
        deptCounts={deptCounts}
        activeDeptFilter={activeDeptFilter}
        onSelectDept={setSelectedDeptFilter}
        statusChips={statusChips}
        onSelectStatus={selectStatusChip}
      />

      {/* Tickets Table / List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">
            รายการเคสในความรับผิดชอบ ({filteredTickets.length} รายการ)
          </span>
          <span className="text-xs text-slate-500">คลิกที่รายการเพื่อดูรายละเอียดไทม์ไลน์</span>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            ไม่พบข้อร้องเรียนตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                onSelect={onSelectTicket}
                onTriage={openTriageModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Triage & Management Action Modal */}
      {triageTicket && (
        <TriageModal
          ticket={triageTicket}
          onClose={() => setTriageTicket(null)}
          onSaved={(updated) => {
            onTicketUpdated(updated);
            setTriageTicket(null);
          }}
        />
      )}
    </div>
  );
};
