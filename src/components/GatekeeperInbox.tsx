'use client';

import React, { useState, useEffect } from 'react';
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
  AlertTriangle
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
  setActiveGatekeeperDepartment
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
  const assignedDepts = gkConfig?.assignedDepartments && gkConfig.assignedDepartments.length > 0
    ? gkConfig.assignedDepartments
    : (['IT'] as GrievanceCategory[]);

  const defaultDept = isStrictGatekeeper
    ? (assignedDepts.length === 1 ? assignedDepts[0] : 'ALL')
    : 'ALL';

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(defaultDept);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyCeoDirect, setOnlyCeoDirect] = useState<boolean>(false);

  useEffect(() => {
    if (isStrictGatekeeper && assignedDepts.length > 0) {
      if (selectedDeptFilter !== 'ALL' && !assignedDepts.includes(selectedDeptFilter as GrievanceCategory)) {
        setSelectedDeptFilter(assignedDepts.length === 1 ? assignedDepts[0] : 'ALL');
      }
    }
  }, [isStrictGatekeeper, assignedDepts.join(','), selectedDeptFilter]);

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

  // Department-scoped tickets (dynamically changes when selectedDeptFilter changes)
  const deptScopedTickets = scopedTickets.filter((t) => {
    if (selectedDeptFilter !== 'ALL' && t.category !== selectedDeptFilter) return false;
    return true;
  });

  // Dynamic counts according to current department scope
  const receivedCount = deptScopedTickets.filter((t) => t.status === 'submitted' || t.status === 'gatekeeper_triaged').length;
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
  const [rootCauseCategory, setRootCauseCategory] = useState<ComplaintTicket['rootCauseCategory']>('Process');
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
    setOfficerEmail(ticket.assignedOfficerEmail || defaultOfficer?.email || 'officer.lead@company.internal');
    setTargetStatus(ticket.status === 'submitted' ? 'gatekeeper_triaged' : ticket.status === 'gatekeeper_triaged' ? 'in_progress' : ticket.status);
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
      actionNote: actionNote || (targetStatus === 'resolved' ? 'แก้ไขปัญหาเสร็จสิ้น พร้อมส่งมอบให้พนักงานประเมิน' : 'Gatekeeper รับเรื่องและมอบหมายผู้รับผิดชอบ'),
      resolutionSummary: targetStatus === 'resolved' ? resolutionSummary : triageTicket.resolutionSummary,
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
  const availableCategories = isStrictGatekeeper && assignedDepts.length > 0 && assignedDepts.length < Object.keys(CATEGORY_DEFINITIONS).length
    ? assignedDepts
    : (Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[]);

  const departmentsList = [
    ...(availableCategories.length > 1 ? [{ key: 'ALL', label: 'ทุกหน่วยงานที่ได้รับมอบหมาย' }] : []),
    ...availableCategories.map((k) => ({
      key: k,
      label: `${k} - ${CATEGORY_DEFINITIONS[k]?.nameTh.split('(')[0].trim()}`,
    })),
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="p-1.5 bg-indigo-600 rounded-lg text-white">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold">
              Gatekeeper Triage & Resolution Hub
            </h1>
            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-md">
              ศูนย์คัดกรองข้อร้องเรียน
            </span>
            {isStrictGatekeeper && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-md">
                หน่วยงานที่รับผิดชอบ: {assignedDepts.join(', ')}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            {isStrictGatekeeper 
              ? `ระบบคัดกรองและดำเนินการเฉพาะคำร้องที่ส่งมายังหน่วยงาน ${assignedDepts.map(d => CATEGORY_DEFINITIONS[d]?.nameTh.split('(')[0]).join(', ')} ตามสิทธิ์ RBAC`
              : 'ระบบคัดกรอง มอบหมายเจ้าหน้าที่ผู้รับผิดชอบ กำหนดระยะเวลา SLA และบันทึกผลการแก้ไขปัญหาตามหมวดหมู่'}
          </p>
        </div>

        {/* Dynamic & Clickable Counter Pills: 5 Buttons (4 Operational Statuses + 1 Direct to CEO) */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
            className={`px-3 py-2 rounded-xl text-center transition cursor-pointer border text-left group ${
              selectedStatusFilter === 'received' && !onlyCeoDirect
                ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                : 'bg-white/10 hover:bg-white/15 border-white/10'
            }`}
            title="คลิกเพื่อกรองเฉพาะรายการ 'รับเรื่อง' ตามหน่วยงานที่เลือก"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="block text-[10px] text-amber-200 font-bold uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3 text-amber-300 inline" />
                รับเรื่อง
              </span>
              {selectedStatusFilter === 'received' && !onlyCeoDirect && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-amber-400 group-hover:scale-105 transition-transform">
                {receivedCount}
              </span>
              <span className="text-[10px] text-slate-300 font-normal">เคส</span>
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
            className={`px-3 py-2 rounded-xl text-center transition cursor-pointer border text-left group ${
              selectedStatusFilter === 'in_progress' && !onlyCeoDirect
                ? 'bg-blue-500/30 border-blue-400 ring-2 ring-blue-400/50 shadow-md'
                : 'bg-white/10 hover:bg-white/15 border-white/10'
            }`}
            title="คลิกเพื่อกรองเฉพาะรายการ 'กำลังแก้ไข' ตามหน่วยงานที่เลือก"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="block text-[10px] text-blue-200 font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-300 inline" />
                กำลังแก้ไข
              </span>
              {selectedStatusFilter === 'in_progress' && !onlyCeoDirect && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-blue-400 group-hover:scale-105 transition-transform">
                {inProgressOnlyCount}
              </span>
              <span className="text-[10px] text-slate-300 font-normal">เคส</span>
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
            className={`px-3 py-2 rounded-xl text-center transition cursor-pointer border text-left group ${
              selectedStatusFilter === 'resolved' && !onlyCeoDirect
                ? 'bg-emerald-500/30 border-emerald-400 ring-2 ring-emerald-400/50 shadow-md'
                : 'bg-white/10 hover:bg-white/15 border-white/10'
            }`}
            title="คลิกเพื่อกรองเฉพาะรายการ 'แก้ไขเสร็จ' ตามหน่วยงานที่เลือก"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="block text-[10px] text-emerald-200 font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-300 inline" />
                แก้ไขเสร็จ
              </span>
              {selectedStatusFilter === 'resolved' && !onlyCeoDirect && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-emerald-400 group-hover:scale-105 transition-transform">
                {resolvedOnlyCount}
              </span>
              <span className="text-[10px] text-slate-300 font-normal">เคส</span>
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
            className={`px-3 py-2 rounded-xl text-center transition cursor-pointer border text-left group ${
              selectedStatusFilter === 'closed' && !onlyCeoDirect
                ? 'bg-teal-500/30 border-teal-300 ring-2 ring-teal-400/50 shadow-md'
                : 'bg-white/10 hover:bg-white/15 border-white/10'
            }`}
            title="คลิกเพื่อกรองเฉพาะรายการ 'ปิดเรื่อง' ตามหน่วยงานที่เลือก"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="block text-[10px] text-teal-200 font-bold uppercase tracking-wider flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-teal-300 inline" />
                ปิดเรื่อง
              </span>
              {selectedStatusFilter === 'closed' && !onlyCeoDirect && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-pulse" />
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-teal-300 group-hover:scale-105 transition-transform">
                {closedOnlyCount}
              </span>
              <span className="text-[10px] text-slate-300 font-normal">เคส</span>
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
            className={`px-3 py-2 rounded-xl text-center transition cursor-pointer border text-left group ${
              onlyCeoDirect
                ? 'bg-purple-500/35 border-purple-300 ring-2 ring-purple-400/50 shadow-md'
                : 'bg-white/10 hover:bg-white/15 border-white/10'
            }`}
            title="คลิกเพื่อกรองเฉพาะเคส 'ส่งตรง CEO / EVP' ตามหน่วยงานที่เลือก"
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="block text-[10px] text-purple-200 font-bold uppercase tracking-wider flex items-center gap-1">
                <Crown className="w-3 h-3 text-yellow-300 inline" />
                ส่งตรง CEO
              </span>
              {onlyCeoDirect && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-purple-300 group-hover:scale-105 transition-transform">
                {ceoDirectCount}
              </span>
              <span className="text-[10px] text-slate-300 font-normal">เคส</span>
            </div>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              id="gatekeeper-search"
              placeholder="ค้นหา Tracking Code, ชื่อเรื่อง, ผู้ยื่น..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition ${
              onlyCeoDirect
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-400/50'
                : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
            }`}
            title="กรองเฉพาะข้อร้องเรียนส่งตรง CEO/EVP ตามหน่วยงานที่เลือก"
          >
            <Crown className="w-3.5 h-3.5 text-yellow-500" />
            <span>เฉพาะข้อร้องเรียนส่งตรง CEO/EVP</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              onlyCeoDirect ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-900'
            }`}>
              {ceoDirectCount}
            </span>
          </button>
        </div>

        {/* Department Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">หน่วยงาน (รับเรื่อง + กำลังแก้ไข):</span>
          {departmentsList.map((d) => {
            const isTargetTicket = (t: ComplaintTicket) => 
              t.status === 'submitted' || t.status === 'gatekeeper_triaged' || t.status === 'in_progress';

            const count = d.key === 'ALL'
              ? scopedTickets.filter(isTargetTicket).length
              : scopedTickets.filter((t) => t.category === d.key && isTargetTicket(t)).length;

            return (
              <button
                key={d.key}
                type="button"
                id={`filter-dept-${d.key}`}
                onClick={() => setSelectedDeptFilter(d.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap border transition flex items-center gap-1.5 ${
                  selectedDeptFilter === d.key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{d.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedDeptFilter === d.key ? 'bg-white/20 text-white' : count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">สถานะ:</span>
          {[
            { key: 'ALL', label: 'ทั้งหมด', count: deptScopedTickets.length, badge: 'bg-slate-200 text-slate-700' },
            { key: 'received', label: 'รับเรื่อง (รอคัดกรอง)', count: receivedCount, badge: 'bg-amber-100 text-amber-800' },
            { key: 'in_progress', label: 'กำลังแก้ไข', count: inProgressOnlyCount, badge: 'bg-blue-100 text-blue-800' },
            { key: 'resolved', label: 'แก้ไขเสร็จ', count: resolvedOnlyCount, badge: 'bg-emerald-100 text-emerald-800' },
            { key: 'closed', label: 'ปิดเรื่อง', count: closedOnlyCount, badge: 'bg-teal-100 text-teal-800' },
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
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{st.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : st.badge
                }`}>
                  {st.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tickets Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            รายการเคสในความรับผิดชอบ ({filteredTickets.length} รายการ)
          </span>
          <span className="text-xs text-slate-500">คลิกที่รายการเพื่อดูรายละเอียดไทม์ไลน์</span>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
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
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
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
                          CEO/EVP
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        t.urgency === 'Critical' ? 'bg-red-100 text-red-800' :
                        t.urgency === 'High' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.urgency} Urgency
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {t.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span>หน่วยงาน: <strong className="text-slate-700">{t.gatekeeperDepartment}</strong></span>
                      <span>ผู้รับผิดชอบ: <strong className="text-slate-700">{t.assignedOfficerName || 'ยังไม่มอบหมาย'}</strong></span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        SLA: {t.slaTargetHours} ชม. ({new Date(t.slaDueDate).toLocaleDateString('th-TH')})
                      </span>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      type="button"
                      id={`btn-triage-${t.id}`}
                      onClick={(e) => openTriageModal(t, e)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs rounded-lg transition flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>จัดการ / อัปเดตสถานะ</span>
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Triage & Management Action Modal */}
      {triageTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-700">
                  {triageTicket.trackingCode}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                  จัดการเคสและอัปเดตความคืบหน้า (Gatekeeper Action)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTriageTicket(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-medium"
              >
                ปิด
              </button>
            </div>

            <form onSubmit={handleSaveTriage} className="p-6 space-y-4">
              
              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ปรับเปลี่ยนสถานะการดำเนินงาน (Workflow Status):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                      className={`p-2 rounded-lg text-xs font-bold border text-center transition ${
                        targetStatus === s.key
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                        <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                          เลือกจากรายชื่อ Gatekeeper ประจำหน่วยงาน {triageTicket.category}:
                        </span>
                        <div className="flex flex-wrap gap-1.5 mb-2">
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
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span>{o.name}</span>
                                {o.isLead && <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">LEAD</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      เจ้าหน้าที่ผู้รับผิดชอบหลัก (Assigned Officer):
                    </label>
                    <input
                      type="text"
                      required
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
                      placeholder="เช่น กิตติศักดิ์ ชัยชนะ (Lead Engineer)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      อีเมลติดต่อเจ้าหน้าที่:
                    </label>
                    <input
                      type="email"
                      required
                      value={officerEmail}
                      onChange={(e) => setOfficerEmail(e.target.value)}
                      placeholder="officer@company.internal"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Root Cause Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    การจัดกลุ่มหมวดหมู่สาเหตุหลัก (Root Cause Category):
                  </label>
                  <select
                    value={rootCauseCategory}
                    onChange={(e) => setRootCauseCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="Process">กระบวนการ / ขั้นตอนการทำงาน (Process)</option>
                    <option value="People">บุคคลากร / พฤติกรรม / การสื่อสาร (People)</option>
                    <option value="Equipment/Tools">อุปกรณ์ / เครื่องจักร / ซอฟต์แวร์ (Equipment/Tools)</option>
                    <option value="Policy/Governance">นโยบาย / กฎระเบียบบริษัท (Policy/Governance)</option>
                    <option value="Environment">สิ่งแวดล้อม / สถานที่ทางกายภาพ (Environment)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    มาตรการป้องกันไม่ให้เกิดซ้ำ (Preventive Action Plan):
                  </label>
                  <input
                    type="text"
                    value={preventivePlan}
                    onChange={(e) => setPreventivePlan(e.target.value)}
                    placeholder="เช่น อัปเกรดเครื่องมือ, เพิ่มระบบตรวจสอบอัตโนมัติ"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Note to Timeline */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  บันทึกความคืบหน้าแจ้งพนักงาน (Action Note for Timeline):
                </label>
                <textarea
                  rows={2}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="อธิบายการกระทำ เช่น ลงพื้นที่ตรวจสอบแล้ว พบสาเหตุคือ..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Resolution Summary (If marking resolved) */}
              {targetStatus === 'resolved' && (
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl space-y-1.5 text-xs">
                  <label className="block font-bold text-emerald-900">
                    สรุปผลการแก้ไขปัญหาฉบับสมบูรณ์ (Resolution Statement):
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={resolutionSummary}
                    onChange={(e) => setResolutionSummary(e.target.value)}
                    placeholder="สรุปผลการแก้ปัญหาอย่างละเอียด เช่น ซ่อมแซมเสร็จสิ้น ตรวจสอบมาตรฐาน 100%..."
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  />
                  <p className="text-[11px] text-emerald-700">
                    * เมื่อบันทึกสถานะ Resolved ระบบจะส่งการแจ้งเตือนอัตโนมัติให้พนักงานเข้าประเมินความพึงพอใจ (CSAT)
                  </p>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTriageTicket(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="btn-save-triage-confirm"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
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