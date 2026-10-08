'use client';

import React, { useState } from 'react';
import {
  Shield,
  Search,
  Filter,
  Crown,
  CheckCircle2,
  Clock,
  UserCheck,
  ArrowUpRight,
  AlertCircle,
  Layers,
  FileText,
  Paperclip,
  Edit3,
  ChevronRight,
  Sparkles,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { ComplaintTicket, GrievanceCategory, TicketStatus, UserRole } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import {
  getStatusBadgeText,
  getStatusColor,
  updateTicketWorkflow,
  getStoredGatekeeperConfigs,
  getStoredRolePermissions,
  getActiveGatekeeperDepartment,
  setActiveGatekeeperDepartment,
} from '../services/api';

interface GatekeeperInboxProps {
  tickets: ComplaintTicket[];
  currentRole?: UserRole;
  onSelectTicket: (ticket: ComplaintTicket) => void;
  onTicketUpdated: (ticket: ComplaintTicket) => void;
}

export const GatekeeperInbox: React.FC<GatekeeperInboxProps> = ({
  tickets = [],
  currentRole = 'gatekeeper',
  onSelectTicket,
  onTicketUpdated,
}) => {
  const rolePermissions = getStoredRolePermissions();
  const gkConfig = rolePermissions.gatekeeper;
  const isStrictGatekeeper = currentRole === 'gatekeeper';
  const assignedDepts =
    gkConfig?.assignedDepartments && gkConfig.assignedDepartments.length > 0
      ? gkConfig.assignedDepartments
      : (['HR'] as GrievanceCategory[]);

  const defaultDept = isStrictGatekeeper
    ? assignedDepts.length === 1
      ? assignedDepts[0]
      : 'ALL'
    : 'ALL';

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(defaultDept);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyCeoDirect, setOnlyCeoDirect] = useState<boolean>(false);

  // A strict gatekeeper's selection outside their assigned depts falls back
  // at render time — derived, not reset via an effect.
  const activeDeptFilter =
    isStrictGatekeeper &&
    selectedDeptFilter !== 'ALL' &&
    !assignedDepts.includes(selectedDeptFilter as GrievanceCategory)
      ? defaultDept
      : selectedDeptFilter;

  const safeTickets = tickets || [];

  // Scoped tickets based on Role & Department
  const scopedTickets = safeTickets.filter((t) => {
    if (isStrictGatekeeper) {
      // If gatekeeper has specific assigned departments, only allow seeing those
      if (assignedDepts.length > 0 && !assignedDepts.includes(t.category)) {
        return false;
      }
    }
    return true;
  });

  // Department-scoped tickets (dynamically changes when activeDeptFilter changes)
  const deptScopedTickets = scopedTickets.filter((t) => {
    if (activeDeptFilter !== 'ALL' && t.category !== activeDeptFilter) return false;
    return true;
  });

  // Dynamic counts according to current department scope
  const receivedCount = deptScopedTickets.filter(
    (t) => t.status === 'submitted' || t.status === 'gatekeeper_triaged'
  ).length;
  const inProgressOnlyCount = deptScopedTickets.filter((t) => t.status === 'in_progress').length;
  const resolvedOnlyCount = deptScopedTickets.filter((t) => t.status === 'resolved').length;
  const closedOnlyCount = deptScopedTickets.filter((t) => t.status === 'closed').length;
  const ceoDirectCount = deptScopedTickets.filter((t) => t.isDirectToExecutive).length;

  // Active triage modal state
  const [triageTicket, setTriageTicket] = useState<ComplaintTicket | null>(null);
  const [officerName, setOfficerName] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [targetStatus, setTargetStatus] = useState<TicketStatus>('in_progress');
  const [actionNote, setActionNote] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [rootCauseCategory, setRootCauseCategory] =
    useState<ComplaintTicket['rootCauseCategory']>('Process');
  const [preventivePlan, setPreventivePlan] = useState('');

  // Filtered tickets from deptScopedTickets
  const filteredTickets = deptScopedTickets.filter((t) => {
    if (onlyCeoDirect && !t.isDirectToExecutive) return false;
    if (selectedStatusFilter === 'received') {
      if (t.status !== 'submitted' && t.status !== 'gatekeeper_triaged') return false;
    } else if (selectedStatusFilter === 'in_progress') {
      if (t.status !== 'in_progress') return false;
    } else if (selectedStatusFilter === 'resolved') {
      if (t.status !== 'resolved') return false;
    } else if (selectedStatusFilter === 'closed') {
      if (t.status !== 'closed') return false;
    } else if (selectedStatusFilter === 'submitted') {
      if (t.status !== 'submitted') return false;
    } else if (selectedStatusFilter === 'gatekeeper_triaged') {
      if (t.status !== 'gatekeeper_triaged') return false;
    } else if (selectedStatusFilter === 'active_in_progress') {
      if (t.status !== 'in_progress' && t.status !== 'gatekeeper_triaged') return false;
    } else if (selectedStatusFilter !== 'ALL' && t.status !== selectedStatusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.trackingCode.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.submitterName && t.submitterName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const openTriageModal = (ticket: ComplaintTicket, e: React.MouseEvent) => {
    e.stopPropagation();
    setTriageTicket(ticket);

    const gatekeeperConfigs = getStoredGatekeeperConfigs();
    const deptConfig = gatekeeperConfigs[ticket.category];
    const defaultOfficer = deptConfig?.leadOfficer || deptConfig?.officers?.[0];

    setOfficerName(ticket.assignedOfficerName || defaultOfficer?.name || 'เจ้าหน้าที่ผู้รับผิดชอบ');
    setOfficerEmail(
      ticket.assignedOfficerEmail || defaultOfficer?.email || 'officer.lead@company.internal'
    );
    setTargetStatus(
      ticket.status === 'submitted'
        ? 'gatekeeper_triaged'
        : ticket.status === 'gatekeeper_triaged'
          ? 'in_progress'
          : ticket.status
    );
    setActionNote('');
    setResolutionSummary(ticket.resolutionSummary || '');
    setRootCauseCategory(ticket.rootCauseCategory || 'Process');
    setPreventivePlan(ticket.preventiveActionPlan || '');
  };

  const handleSaveTriage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!triageTicket) return;

    const updated = updateTicketWorkflow(triageTicket.id, {
      status: targetStatus,
      assignedOfficerName: officerName,
      assignedOfficerEmail: officerEmail,
      actionNote:
        actionNote ||
        (targetStatus === 'resolved'
          ? 'แก้ไขปัญหาเสร็จสิ้น พร้อมส่งมอบให้พนักงานประเมิน'
          : 'Gatekeeper รับเรื่องและมอบหมายผู้รับผิดชอบ'),
      resolutionSummary:
        targetStatus === 'resolved' ? resolutionSummary : triageTicket.resolutionSummary,
      rootCauseCategory,
      preventiveActionPlan: preventivePlan,
      actorName: 'Gatekeeper Supervisor',
      actorRole: 'Gatekeeper Lead',
    });

    if (updated) {
      onTicketUpdated(updated);
      setTriageTicket(null);
    }
  };

  // If strict gatekeeper and assigned departments are configured, only allow access to those assigned departments
  const availableCategories =
    isStrictGatekeeper &&
    assignedDepts.length > 0 &&
    assignedDepts.length < Object.keys(CATEGORY_DEFINITIONS).length
      ? assignedDepts
      : (Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[]);

  const departmentsList = [
    ...(availableCategories.length > 1
      ? [{ key: 'ALL', label: 'ทุกหน่วยงานที่ได้รับมอบหมาย' }]
      : []),
    ...availableCategories.map((k) => ({
      key: k,
      label: `${k} - ${CATEGORY_DEFINITIONS[k]?.nameTh.split('(')[0].trim()}`,
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-6 text-white shadow-sm md:flex-row md:items-center">
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
                หน่วยงานที่รับผิดชอบ: {assignedDepts.join(', ')}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 sm:text-sm">
            {isStrictGatekeeper
              ? `ระบบคัดกรองและดำเนินการเฉพาะคำร้องที่ส่งมายังหน่วยงาน ${assignedDepts.map((d) => CATEGORY_DEFINITIONS[d]?.nameTh.split('(')[0]).join(', ')} ตามสิทธิ์ RBAC`
              : 'ระบบคัดกรอง มอบหมายเจ้าหน้าที่ผู้รับผิดชอบ กำหนดระยะเวลา SLA และบันทึกผลการแก้ไขปัญหาตามหมวดหมู่'}
          </p>
        </div>

        {/* Dynamic & Clickable Counter Pills: 5 Buttons (4 Operational Statuses + 1 Direct to CEO) */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Button 1: รับเรื่อง */}
          <button
            type="button"
            id="counter-card-status-received"
            onClick={() => {
              if (selectedStatusFilter === 'received' && !onlyCeoDirect) {
                setSelectedStatusFilter('ALL');
              } else {
                setSelectedStatusFilter('received');
                setOnlyCeoDirect(false);
              }
            }}
            className={`group cursor-pointer rounded-xl border px-3 py-2 text-center text-left transition ${
              selectedStatusFilter === 'received' && !onlyCeoDirect
                ? 'border-amber-400 bg-amber-500/30 shadow-md ring-2 ring-amber-400/50'
                : 'border-white/10 bg-white/10 hover:bg-white/15'
            }`}
            title="คลิกเพื่อกรองเฉพาะรายการ 'รับเรื่อง' ตามหน่วยงานที่เลือก"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="block flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-200 uppercase">
                <FileText className="inline h-3 w-3 text-amber-300" />
                รับเรื่อง
              </span>
              {selectedStatusFilter === 'received' && !onlyCeoDirect && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              )}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-lg font-black text-amber-400 transition-transform group-hover:scale-105">
                {receivedCount}
              </span>
              <span className="text-[10px] font-normal text-slate-300">เคส</span>
            </div>
          </button>

          {/* Button 2: กำลังแก้ไข */}
          <button
            type="button"
            id="counter-card-status-in-progress"
            onClick={() => {
              if (selectedStatusFilter === 'in_progress' && !onlyCeoDirect) {
                setSelectedStatusFilter('ALL');
              } else {
                setSelectedStatusFilter('in_progress');
                setOnlyCeoDirect(false);
              }
            }}
            className={`group cursor-pointer rounded-xl border px-3 py-2 text-center text-left transition ${
              selectedStatusFilter === 'in_progress' && !onlyCeoDirect
                ? 'border-blue-400 bg-blue-500/30 shadow-md ring-2 ring-blue-400/50'
                : 'border-white/10 bg-white/10 hover:bg-white/15'
            }`}
            title="คลิกเพื่อกรองเฉพาะรายการ 'กำลังแก้ไข' ตามหน่วยงานที่เลือก"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="block flex items-center gap-1 text-[10px] font-bold tracking-wider text-blue-200 uppercase">
                <Clock className="inline h-3 w-3 text-blue-300" />
                กำลังแก้ไข
              </span>
              {selectedStatusFilter === 'in_progress' && !onlyCeoDirect && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
              )}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-lg font-black text-blue-400 transition-transform group-hover:scale-105">
                {inProgressOnlyCount}
              </span>
              <span className="text-[10px] font-normal text-slate-300">เคส</span>
            </div>
          </button>

          {/* Button 3: แก้ไขเสร็จ */}
          <button
            type="button"
            id="counter-card-status-resolved"
            onClick={() => {
              if (selectedStatusFilter === 'resolved' && !onlyCeoDirect) {
                setSelectedStatusFilter('ALL');
              } else {
                setSelectedStatusFilter('resolved');
                setOnlyCeoDirect(false);
              }
            }}
            className={`group cursor-pointer rounded-xl border px-3 py-2 text-center text-left transition ${
              selectedStatusFilter === 'resolved' && !onlyCeoDirect
                ? 'border-emerald-400 bg-emerald-500/30 shadow-md ring-2 ring-emerald-400/50'
                : 'border-white/10 bg-white/10 hover:bg-white/15'
            }`}
            title="คลิกเพื่อกรองเฉพาะรายการ 'แก้ไขเสร็จ' ตามหน่วยงานที่เลือก"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="block flex items-center gap-1 text-[10px] font-bold tracking-wider text-emerald-200 uppercase">
                <CheckCircle2 className="inline h-3 w-3 text-emerald-300" />
                แก้ไขเสร็จ
              </span>
              {selectedStatusFilter === 'resolved' && !onlyCeoDirect && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              )}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-lg font-black text-emerald-400 transition-transform group-hover:scale-105">
                {resolvedOnlyCount}
              </span>
              <span className="text-[10px] font-normal text-slate-300">เคส</span>
            </div>
          </button>

          {/* Button 4: ปิดเรื่อง */}
          <button
            type="button"
            id="counter-card-status-closed"
            onClick={() => {
              if (selectedStatusFilter === 'closed' && !onlyCeoDirect) {
                setSelectedStatusFilter('ALL');
              } else {
                setSelectedStatusFilter('closed');
                setOnlyCeoDirect(false);
              }
            }}
            className={`group cursor-pointer rounded-xl border px-3 py-2 text-center text-left transition ${
              selectedStatusFilter === 'closed' && !onlyCeoDirect
                ? 'border-teal-300 bg-teal-500/30 shadow-md ring-2 ring-teal-400/50'
                : 'border-white/10 bg-white/10 hover:bg-white/15'
            }`}
            title="คลิกเพื่อกรองเฉพาะรายการ 'ปิดเรื่อง' ตามหน่วยงานที่เลือก"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="block flex items-center gap-1 text-[10px] font-bold tracking-wider text-teal-200 uppercase">
                <UserCheck className="inline h-3 w-3 text-teal-300" />
                ปิดเรื่อง
              </span>
              {selectedStatusFilter === 'closed' && !onlyCeoDirect && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-300" />
              )}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-lg font-black text-teal-300 transition-transform group-hover:scale-105">
                {closedOnlyCount}
              </span>
              <span className="text-[10px] font-normal text-slate-300">เคส</span>
            </div>
          </button>

          {/* Button 5: ส่งตรง CEO */}
          <button
            type="button"
            id="counter-card-ceo-direct"
            onClick={() => {
              if (onlyCeoDirect) {
                setOnlyCeoDirect(false);
              } else {
                setOnlyCeoDirect(true);
                setSelectedStatusFilter('ALL');
              }
            }}
            className={`group cursor-pointer rounded-xl border px-3 py-2 text-center text-left transition ${
              onlyCeoDirect
                ? 'border-purple-300 bg-purple-500/35 shadow-md ring-2 ring-purple-400/50'
                : 'border-white/10 bg-white/10 hover:bg-white/15'
            }`}
            title="คลิกเพื่อกรองเฉพาะเคส 'ส่งตรง CEO / EVP' ตามหน่วยงานที่เลือก"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="block flex items-center gap-1 text-[10px] font-bold tracking-wider text-purple-200 uppercase">
                <Crown className="inline h-3 w-3 text-yellow-300" />
                ส่งตรง CEO
              </span>
              {onlyCeoDirect && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-300" />
              )}
            </div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-lg font-black text-purple-300 transition-transform group-hover:scale-105">
                {ceoDirectCount}
              </span>
              <span className="text-[10px] font-normal text-slate-300">เคส</span>
            </div>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="gatekeeper-search"
              placeholder="ค้นหา Tracking Code, ชื่อเรื่อง, ผู้ยื่น..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pr-3 pl-9 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Special CEO Direct Toggle Filter */}
          <button
            type="button"
            id="filter-ceo-direct"
            onClick={() => {
              if (onlyCeoDirect) {
                setOnlyCeoDirect(false);
              } else {
                setOnlyCeoDirect(true);
                setSelectedStatusFilter('ALL');
              }
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              onlyCeoDirect
                ? 'border-purple-600 bg-purple-600 text-white shadow-xs ring-2 ring-purple-400/50'
                : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
            title="กรองเฉพาะข้อร้องเรียนส่งตรง CEO/EVP ตามหน่วยงานที่เลือก"
          >
            <Crown className="h-3.5 w-3.5 text-yellow-500" />
            <span>เฉพาะข้อร้องเรียนส่งตรง CEO/EVP</span>
            <span
              className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold ${
                onlyCeoDirect ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-900'
              }`}
            >
              {ceoDirectCount}
            </span>
          </button>
        </div>

        {/* Department Chips */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-xs font-semibold whitespace-nowrap text-slate-500">
            หน่วยงาน (รับเรื่อง + กำลังแก้ไข):
          </span>
          {departmentsList.map((d) => {
            const isTargetTicket = (t: ComplaintTicket) =>
              t.status === 'submitted' ||
              t.status === 'gatekeeper_triaged' ||
              t.status === 'in_progress';

            const count =
              d.key === 'ALL'
                ? scopedTickets.filter(isTargetTicket).length
                : scopedTickets.filter((t) => t.category === d.key && isTargetTicket(t)).length;

            return (
              <button
                key={d.key}
                type="button"
                id={`filter-dept-${d.key}`}
                onClick={() => setSelectedDeptFilter(d.key)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
                  activeDeptFilter === d.key
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{d.label}</span>
                <span
                  className={`py-0.2 rounded-full px-1.5 text-[10px] font-bold ${
                    activeDeptFilter === d.key
                      ? 'bg-white/20 text-white'
                      : count > 0
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Chips */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 pt-1">
          <span className="text-xs font-semibold whitespace-nowrap text-slate-500">สถานะ:</span>
          {[
            {
              key: 'ALL',
              label: 'ทั้งหมด',
              count: deptScopedTickets.length,
              badge: 'bg-slate-200 text-slate-700',
            },
            {
              key: 'received',
              label: 'รับเรื่อง (รอคัดกรอง)',
              count: receivedCount,
              badge: 'bg-amber-100 text-amber-800',
            },
            {
              key: 'in_progress',
              label: 'กำลังแก้ไข',
              count: inProgressOnlyCount,
              badge: 'bg-blue-100 text-blue-800',
            },
            {
              key: 'resolved',
              label: 'แก้ไขเสร็จ',
              count: resolvedOnlyCount,
              badge: 'bg-emerald-100 text-emerald-800',
            },
            {
              key: 'closed',
              label: 'ปิดเรื่อง',
              count: closedOnlyCount,
              badge: 'bg-teal-100 text-teal-800',
            },
          ].map((st) => {
            const isActive = selectedStatusFilter === st.key && !onlyCeoDirect;
            return (
              <button
                key={st.key}
                type="button"
                id={`filter-status-${st.key}`}
                onClick={() => {
                  setSelectedStatusFilter(st.key);
                  if (st.key !== 'ALL') setOnlyCeoDirect(false);
                }}
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
            {filteredTickets.map((t) => {
              const catInfo = CATEGORY_DEFINITIONS[t.category];
              return (
                <div
                  key={t.id}
                  id={`ticket-row-${t.id}`}
                  onClick={() => onSelectTicket(t)}
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
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          t.urgency === 'Critical'
                            ? 'bg-red-100 text-red-800'
                            : t.urgency === 'High'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.urgency} Urgency
                      </span>
                    </div>

                    <h3 className="line-clamp-1 text-xs font-bold text-slate-900 sm:text-sm">
                      {t.title}
                    </h3>
                    <p className="line-clamp-1 text-xs text-slate-500">{t.description}</p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                      <span>
                        หน่วยงาน:{' '}
                        <strong className="text-slate-700">{t.gatekeeperDepartment}</strong>
                      </span>
                      <span>
                        ผู้รับผิดชอบ:{' '}
                        <strong className="text-slate-700">
                          {t.assignedOfficerName || 'ยังไม่มอบหมาย'}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 pt-2 sm:border-t-0 sm:pt-0">
                    <button
                      type="button"
                      id={`btn-triage-${t.id}`}
                      onClick={(e) => openTriageModal(t, e)}
                      className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>จัดการ / อัปเดตสถานะ</span>
                    </button>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Triage & Management Action Modal */}
      {triageTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-700">
                  {triageTicket.trackingCode}
                </span>
                <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base">
                  จัดการเคสและอัปเดตความคืบหน้า (Gatekeeper Action)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTriageTicket(null)}
                className="text-xs font-medium text-slate-400 hover:text-slate-700"
              >
                ปิด
              </button>
            </div>

            <form onSubmit={handleSaveTriage} className="space-y-4 p-6">
              {/* Status Selector */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  ปรับเปลี่ยนสถานะการดำเนินงาน (Workflow Status):
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { key: 'gatekeeper_triaged', label: 'รับเรื่อง (Triaged)' },
                    { key: 'in_progress', label: 'กำลังแก้ไข (In Progress)' },
                    { key: 'resolved', label: 'แก้ไขเสร็จ (Resolved)' },
                    { key: 'closed', label: 'ปิดเรื่อง (Closed)' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setTargetStatus(s.key as TicketStatus)}
                      className={`rounded-lg border p-2 text-center text-xs font-bold transition ${
                        targetStatus === s.key
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignee Details */}
              <div className="space-y-2 text-xs">
                {/* Fast Selector from Configured Department Officers */}
                {(() => {
                  const deptConfig = getStoredGatekeeperConfigs()[triageTicket.category];
                  const officers = deptConfig?.officers || [];
                  if (officers.length > 0) {
                    return (
                      <div>
                        <span className="mb-1 block text-[11px] font-semibold text-slate-500">
                          เลือกจากรายชื่อ Gatekeeper ประจำหน่วยงาน {triageTicket.category}:
                        </span>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {officers.map((o) => {
                            const isSelected = officerName === o.name;
                            return (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => {
                                  setOfficerName(o.name);
                                  setOfficerEmail(o.email);
                                }}
                                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                                  isSelected
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
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">
                      เจ้าหน้าที่ผู้รับผิดชอบหลัก (Assigned Officer):
                    </label>
                    <input
                      type="text"
                      required
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
                      placeholder="เช่น กิตติศักดิ์ ชัยชนะ (Lead Engineer)"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">
                      อีเมลติดต่อเจ้าหน้าที่:
                    </label>
                    <input
                      type="email"
                      required
                      value={officerEmail}
                      onChange={(e) => setOfficerEmail(e.target.value)}
                      placeholder="officer@company.internal"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[11px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Root Cause Classification */}
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    การจัดกลุ่มหมวดหมู่สาเหตุหลัก (Root Cause Category):
                  </label>
                  <select
                    value={rootCauseCategory}
                    onChange={(e) =>
                      setRootCauseCategory(e.target.value as ComplaintTicket['rootCauseCategory'])
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Process">กระบวนการ / ขั้นตอนการทำงาน (Process)</option>
                    <option value="People">บุคคลากร / พฤติกรรม / การสื่อสาร (People)</option>
                    <option value="Equipment/Tools">
                      อุปกรณ์ / เครื่องจักร / ซอฟต์แวร์ (Equipment/Tools)
                    </option>
                    <option value="Policy/Governance">
                      นโยบาย / กฎระเบียบบริษัท (Policy/Governance)
                    </option>
                    <option value="Environment">
                      สิ่งแวดล้อม / สถานที่ทางกายภาพ (Environment)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">
                    มาตรการป้องกันไม่ให้เกิดซ้ำ (Preventive Action Plan):
                  </label>
                  <input
                    type="text"
                    value={preventivePlan}
                    onChange={(e) => setPreventivePlan(e.target.value)}
                    placeholder="เช่น อัปเกรดเครื่องมือ, เพิ่มระบบตรวจสอบอัตโนมัติ"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Note to Timeline */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  บันทึกความคืบหน้าแจ้งพนักงาน (Action Note for Timeline):
                </label>
                <textarea
                  rows={2}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="อธิบายการกระทำ เช่น ลงพื้นที่ตรวจสอบแล้ว พบสาเหตุคือ..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Resolution Summary (If marking resolved) */}
              {targetStatus === 'resolved' && (
                <div className="space-y-1.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs">
                  <label className="block font-bold text-emerald-900">
                    สรุปผลการแก้ไขปัญหาฉบับสมบูรณ์ (Resolution Statement):
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
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
                  onClick={() => setTriageTicket(null)}
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
      )}
    </div>
  );
};
