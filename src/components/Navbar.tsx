'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  Search, 
  Bell, 
  UserCheck, 
  Crown, 
  LifeBuoy, 
  Layers, 
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Users,
  GitBranch,
  LayoutDashboard,
  FileSpreadsheet
} from 'lucide-react';
import { UserRole, NotificationItem, AppTabId } from '../types';
import { getStoredRolePermissions } from '../services/api';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange?: (role: UserRole) => void;
  onSelectRole?: (role: UserRole) => void;
  activeTab: string;
  onTabChange?: (tab: string) => void;
  onSelectTab?: (tab: string) => void;
  isMobileSimulator?: boolean;
  onToggleMobileSimulator?: () => void;
  notifications?: NotificationItem[];
  onSelectTrackingCode?: (code: string) => void;
  onSearchTrackingCode?: (code: string) => void;
  onOpenNotifications?: () => void;
  onOpenExport?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole = 'employee',
  onRoleChange,
  onSelectRole,
  activeTab = 'submit',
  onTabChange,
  onSelectTab,
  isMobileSimulator = false,
  notifications = [],
  onSelectTrackingCode,
  onSearchTrackingCode,
  onOpenNotifications,
  onOpenExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const rolePermissions = getStoredRolePermissions();
  const currentRoleConfig = rolePermissions[currentRole] || rolePermissions.employee;
  const allowedTabs: AppTabId[] = currentRoleConfig?.allowedTabs || ['submit', 'my_tickets', 'workflow'];

  const canAccessExecutive = allowedTabs.includes('executive');

  const handleRoleSelect = (r: UserRole) => {
    if (onRoleChange) onRoleChange(r);
    if (onSelectRole) onSelectRole(r);
  };

  const handleTabSelect = (t: string) => {
    if (onTabChange) onTabChange(t);
    if (onSelectTab) onSelectTab(t);
  };

  const handleSearchCode = (code: string) => {
    if (onSelectTrackingCode) onSelectTrackingCode(code);
    if (onSearchTrackingCode) onSearchTrackingCode(code);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleSearchCode(searchQuery.trim());
      setSearchQuery('');
    }
  };

  const roleLabels: Record<UserRole, { label: string; sub: string; icon: React.ReactNode; color: string }> = {
    employee: {
      label: 'พนักงานทั่วไป (Employee)',
      sub: 'ยื่นข้อร้องเรียน และติดตามสถานะ',
      icon: <UserCheck className="w-4 h-4 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    },
    gatekeeper: {
      label: 'Gatekeeper ประจำหน่วยงาน',
      sub: 'เห็นเฉพาะหน่วยงานที่ตนรับผิดชอบ',
      icon: <Shield className="w-4 h-4 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
    },
    executive: {
      label: 'ผู้บริหารระดับสูง (CEO/EVP)',
      sub: 'Dashboard ภาพรวม & ข้อร้องเรียนลับ',
      icon: <Crown className="w-4 h-4 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200 text-purple-800',
    },
    admin: {
      label: 'HR Admin & ตัวแทนผู้บริหาร',
      sub: 'กำหนดสิทธิ์ RBAC & Gatekeeper',
      icon: <SlidersHorizontal className="w-4 h-4 text-rose-600" />,
      color: 'bg-rose-50 border-rose-200 text-rose-800',
    },
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 shrink-0 cursor-pointer" 
            onClick={() => {
              if (allowedTabs.includes('submit')) handleTabSelect('submit');
              else if (allowedTabs[0]) handleTabSelect(allowedTabs[0]);
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                  UGT VoiceCare
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Grievance & Whistleblower
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                ระบบบันทึกข้อร้องเรียน ข้อเสนอแนะ และติดตามผลเรียลไทม์
              </p>
            </div>
          </div>

          {/* Quick Tracking Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative w-64 xl:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              id="global-tracking-search"
              placeholder="ค้นหารหัสติดตาม เช่น TK-2026..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400 transition"
            />
          </form>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Dashboard Button */}
            <button
              id="btn-quick-dashboard"
              type="button"
              onClick={() => handleTabSelect('executive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-xs ${
                activeTab === 'executive'
                  ? 'bg-purple-700 text-white border-purple-700 ring-2 ring-purple-400/40'
                  : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-50 hover:border-purple-300'
              }`}
              title="เปิดดู Dashboard ภาพรวม"
            >
              <LayoutDashboard className={`w-3.5 h-3.5 ${activeTab === 'executive' ? 'text-purple-200' : 'text-purple-600'}`} />
              <span>Dashboard</span>
            </button>

            {/* Quick Manual / Workflow Button (คู่มือที่เดียวข้างๆ Dashboard) */}
            <button
              id="btn-quick-manual"
              type="button"
              onClick={() => handleTabSelect('workflow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-xs ${
                activeTab === 'workflow'
                  ? 'bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-400/40'
                  : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
              }`}
              title="เปิดดูคู่มือและผังขั้นตอนการทำงาน (Workflow)"
            >
              <GitBranch className={`w-3.5 h-3.5 ${activeTab === 'workflow' ? 'text-indigo-200' : 'text-indigo-600'}`} />
              <span>คู่มือ</span>
            </button>

            {/* Quick Export Data Button (ส่งออกข้อมูลสำหรับวิเคราะห์ ข้างๆ ปุ่มคู่มือ) */}
            <button
              id="btn-quick-export"
              type="button"
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-xs bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
              title="ส่งออกชุดข้อมูลสำหรับนำไปวิเคราะห์ต่อยอด (Export for Analytics)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>ส่งออกข้อมูล</span>
            </button>

            {/* Notification Center Trigger */}
            <button
              id="btn-notifications-open"
              type="button"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200"
              title="การแจ้งเตือน"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Role Switcher Menu */}
            <div className="relative">
              <button
                id="btn-role-dropdown"
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${roleLabels[currentRole].color}`}
              >
                <div className="flex items-center gap-1.5">
                  {roleLabels[currentRole].icon}
                  <span className="font-semibold">{roleLabels[currentRole].label.split('(')[0]}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {isRoleDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsRoleDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        สลับบทบาทการใช้งาน (Role-Based Access)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ระบบจะปรับเปลี่ยนเมนูและข้อมูลที่มองเห็นตามสิทธิ์ของบทบาททันที
                      </p>
                    </div>
                    {(['employee', 'gatekeeper', 'executive', 'admin'] as UserRole[]).map((r) => {
                      const item = roleLabels[r];
                      const isSelected = currentRole === r;
                      return (
                        <button
                          key={r}
                          id={`role-select-${r}`}
                          type="button"
                          onClick={() => {
                            handleRoleSelect(r);
                            setIsRoleDropdownOpen(false);
                            if (r === 'employee') handleTabSelect('submit');
                            if (r === 'gatekeeper') handleTabSelect('gatekeeper');
                            if (r === 'executive') handleTabSelect('executive');
                            if (r === 'admin') handleTabSelect('rbac_management');
                          }}
                          className={`w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-slate-50 transition ${
                            isSelected ? 'bg-indigo-50/70 text-indigo-900 font-semibold' : 'text-slate-700'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">{item.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{item.label}</span>
                              {isSelected && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.sub}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Dynamic RBAC-Filtered Navigation Tabs */}
        {!isMobileSimulator && (
          <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-100 py-1.5 overflow-x-auto no-scrollbar">
            
            {/* Tab: Submit */}
            {allowedTabs.includes('submit') && (
              <button
                id="nav-tab-submit"
                type="button"
                onClick={() => handleTabSelect('submit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'submit'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ยื่นข้อร้องเรียน / ข้อเสนอแนะ</span>
              </button>
            )}

            {/* Tab: My Tickets */}
            {allowedTabs.includes('my_tickets') && (
              <button
                id="nav-tab-my-tickets"
                type="button"
                onClick={() => handleTabSelect('my_tickets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'my_tickets'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>ติดตามสถานะ (Timeline)</span>
              </button>
            )}

            {/* Tab: Gatekeeper Portal */}
            {allowedTabs.includes('gatekeeper') && (
              <button
                id="nav-tab-gatekeeper"
                type="button"
                onClick={() => handleTabSelect('gatekeeper')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'gatekeeper'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gatekeeper Triage Portal</span>
              </button>
            )}

            {/* Tab: Root Cause & CAPA */}
            {allowedTabs.includes('clustering') && (
              <button
                id="nav-tab-clustering"
                type="button"
                onClick={() => handleTabSelect('clustering')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'clustering'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>วิเคราะห์สาเหตุ CAPA</span>
              </button>
            )}

            {/* Tab: Personnel & Governance Directory */}
            {allowedTabs.includes('admin_gatekeeper') && (
              <button
                id="nav-tab-admin-gatekeeper"
                type="button"
                onClick={() => handleTabSelect('admin_gatekeeper')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'admin_gatekeeper'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>จัดการผู้บริหาร, Admin & Gatekeeper</span>
              </button>
            )}

            {/* Tab: Role-Based Access Control (RBAC) */}
            {allowedTabs.includes('rbac_management') && (
              <button
                id="nav-tab-rbac-management"
                type="button"
                onClick={() => handleTabSelect('rbac_management')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'rbac_management'
                    ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-300 font-bold'
                    : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50/60'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-rose-600" />
                <span>กำหนดสิทธิ์เข้าถึง (RBAC)</span>
              </button>
            )}

          </nav>
        )}
      </div>
    </header>
  );
};