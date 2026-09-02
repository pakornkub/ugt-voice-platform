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
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Users,
  GitBranch,
  LayoutDashboard,
  FileSpreadsheet,
  ShieldCheck,
  ScrollText,
  LogOut,
  Mail,
} from 'lucide-react';
import { UserRole, NotificationItem, AppTabId } from '../types';
import { getStoredRolePermissions } from '../services/api';
import type { ShellIdentity } from '../app/shell-context';
import { ssoLogoutAction } from '@/lib/actions/auth';

interface NavbarProps {
  currentRole: UserRole;
  // ugt-nextjs-auth-setup (2026-09-02): identity from the real session,
  // replacing the free role-switcher. Optional + defaulted so this component
  // still renders standalone (e.g. Navbar.test.tsx) without a live session.
  identity?: ShellIdentity;
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

const DEFAULT_IDENTITY: ShellIdentity = {
  name: 'ผู้ใช้งาน',
  email: '',
  appRole: 'employee',
  roleName: null,
  permissions: [],
};

export const Navbar: React.FC<NavbarProps> = ({
  currentRole = 'employee',
  identity = DEFAULT_IDENTITY,
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
  const [isIdentityMenuOpen, setIsIdentityMenuOpen] = useState(false);
  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const rolePermissions = getStoredRolePermissions();
  const currentRoleConfig = rolePermissions[currentRole] || rolePermissions.employee;
  const allowedTabs: AppTabId[] = currentRoleConfig?.allowedTabs || [
    'submit',
    'my_tickets',
    'workflow',
  ];

  const canAccessExecutive = allowedTabs.includes('executive');

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

  const roleLabels: Record<
    UserRole,
    { label: string; sub: string; icon: React.ReactNode; color: string }
  > = {
    employee: {
      label: 'พนักงานทั่วไป (Employee)',
      sub: 'ยื่นข้อร้องเรียน และติดตามสถานะ',
      icon: <UserCheck className="h-4 w-4 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    },
    gatekeeper: {
      label: 'Gatekeeper ประจำหน่วยงาน',
      sub: 'เห็นเฉพาะหน่วยงานที่ตนรับผิดชอบ',
      icon: <Shield className="h-4 w-4 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
    },
    executive: {
      label: 'ผู้บริหารระดับสูง (CEO/EVP)',
      sub: 'Dashboard ภาพรวม & ข้อร้องเรียนลับ',
      icon: <Crown className="h-4 w-4 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200 text-purple-800',
    },
    admin: {
      label: 'HR Admin & ตัวแทนผู้บริหาร',
      sub: 'กำหนดสิทธิ์ RBAC & Gatekeeper',
      icon: <SlidersHorizontal className="h-4 w-4 text-rose-600" />,
      color: 'bg-rose-50 border-rose-200 text-rose-800',
    },
  };

  // ugt-nextjs-auth-setup (2026-09-02): visibility of these 3 comes from the
  // new RBAC permission system, not RoleAccessConfigs.allowedTabs like the
  // tabs above — see docs/project-context/decisions.md.
  const canSeeUsers = identity.permissions.includes('users:read');
  const canSeeRoles = identity.permissions.includes('roles:read');
  const canSeeAuditLogs = identity.permissions.includes('audit-logs:read');
  // ugt-nextjs-mail-setup (2026-09-02): same pattern as the 3 above.
  const canSeeMailTemplates = identity.permissions.includes('mail-templates:manage');
  const hasAdminSection = canSeeUsers || canSeeRoles || canSeeAuditLogs || canSeeMailTemplates;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div
            className="flex shrink-0 cursor-pointer items-center gap-3"
            onClick={() => {
              if (allowedTabs.includes('submit')) handleTabSelect('submit');
              else if (allowedTabs[0]) handleTabSelect(allowedTabs[0]);
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm shadow-indigo-200">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                  UGT VoiceCare
                </span>
                <span className="hidden items-center rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 sm:inline-flex">
                  Grievance & Whistleblower
                </span>
              </div>
              <p className="hidden text-xs text-slate-500 md:block">
                ระบบบันทึกข้อร้องเรียน ข้อเสนอแนะ และติดตามผลเรียลไทม์
              </p>
            </div>
          </div>

          {/* Quick Tracking Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative hidden w-64 items-center lg:flex xl:w-72"
          >
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="global-tracking-search"
              placeholder="ค้นหารหัสติดตาม เช่น TK-2026..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-9 text-xs text-slate-800 placeholder-slate-400 transition focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </form>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Dashboard Button */}
            <button
              id="btn-quick-dashboard"
              type="button"
              onClick={() => handleTabSelect('executive')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-xs transition ${
                activeTab === 'executive'
                  ? 'border-purple-700 bg-purple-700 text-white ring-2 ring-purple-400/40'
                  : 'border-purple-200 bg-white text-purple-900 hover:border-purple-300 hover:bg-purple-50'
              }`}
              title="เปิดดู Dashboard ภาพรวม"
            >
              <LayoutDashboard
                className={`h-3.5 w-3.5 ${activeTab === 'executive' ? 'text-purple-200' : 'text-purple-600'}`}
              />
              <span>Dashboard</span>
            </button>

            {/* Quick Manual / Workflow Button (คู่มือที่เดียวข้างๆ Dashboard) */}
            <button
              id="btn-quick-manual"
              type="button"
              onClick={() => handleTabSelect('workflow')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-xs transition ${
                activeTab === 'workflow'
                  ? 'border-indigo-700 bg-indigo-700 text-white ring-2 ring-indigo-400/40'
                  : 'border-indigo-200 bg-white text-indigo-900 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
              title="เปิดดูคู่มือและผังขั้นตอนการทำงาน (Workflow)"
            >
              <GitBranch
                className={`h-3.5 w-3.5 ${activeTab === 'workflow' ? 'text-indigo-200' : 'text-indigo-600'}`}
              />
              <span>คู่มือ</span>
            </button>

            {/* Quick Export Data Button (ส่งออกข้อมูลสำหรับวิเคราะห์ ข้างๆ ปุ่มคู่มือ) */}
            <button
              id="btn-quick-export"
              type="button"
              onClick={onOpenExport}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-xs transition hover:border-emerald-300 hover:bg-emerald-50"
              title="ส่งออกชุดข้อมูลสำหรับนำไปวิเคราะห์ต่อยอด (Export for Analytics)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>ส่งออกข้อมูล</span>
            </button>

            {/* Notification Center Trigger */}
            <button
              id="btn-notifications-open"
              type="button"
              onClick={onOpenNotifications}
              className="relative rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              title="การแจ้งเตือน"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Identity Menu — replaces the old free role-switcher dropdown
                (ugt-nextjs-auth-setup, 2026-09-02): บทบาทมาจาก session จริง
                อ่านอย่างเดียว ไม่มีปุ่มสลับ */}
            <div className="relative">
              <button
                id="btn-identity-menu"
                type="button"
                onClick={() => setIsIdentityMenuOpen(!isIdentityMenuOpen)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${roleLabels[currentRole].color}`}
              >
                <div className="flex items-center gap-1.5">
                  {roleLabels[currentRole].icon}
                  <span className="max-w-[8rem] truncate font-semibold">{identity.name}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>

              {isIdentityMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsIdentityMenuOpen(false)}
                  />
                  <div className="animate-in fade-in slide-in-from-top-2 absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                    <div className="border-b border-slate-100 bg-slate-50 px-3.5 py-3">
                      <p className="truncate text-xs font-bold text-slate-900">{identity.name}</p>
                      <p className="truncate text-[11px] text-slate-500">{identity.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${roleLabels[currentRole].color}`}
                        >
                          {roleLabels[currentRole].icon}
                          {roleLabels[currentRole].label.split('(')[0]}
                        </span>
                        {identity.roleName && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            <ShieldCheck className="h-3 w-3 text-slate-400" />
                            {identity.roleName}
                          </span>
                        )}
                      </div>
                    </div>

                    <form action={ssoLogoutAction}>
                      <button
                        id="btn-sign-out"
                        type="submit"
                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>ออกจากระบบ</span>
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic RBAC-Filtered Navigation Tabs */}
        {!isMobileSimulator && (
          <nav className="no-scrollbar flex space-x-1 overflow-x-auto border-t border-slate-100 py-1.5 sm:space-x-2">
            {/* Tab: Submit */}
            {allowedTabs.includes('submit') && (
              <button
                id="nav-tab-submit"
                type="button"
                onClick={() => handleTabSelect('submit')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'submit'
                    ? 'bg-indigo-50 font-semibold text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>ยื่นข้อร้องเรียน / ข้อเสนอแนะ</span>
              </button>
            )}

            {/* Tab: My Tickets */}
            {allowedTabs.includes('my_tickets') && (
              <button
                id="nav-tab-my-tickets"
                type="button"
                onClick={() => handleTabSelect('my_tickets')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'my_tickets'
                    ? 'bg-indigo-50 font-semibold text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                <span>ติดตามสถานะ (Timeline)</span>
              </button>
            )}

            {/* Tab: Gatekeeper Portal */}
            {allowedTabs.includes('gatekeeper') && (
              <button
                id="nav-tab-gatekeeper"
                type="button"
                onClick={() => handleTabSelect('gatekeeper')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'gatekeeper'
                    ? 'bg-emerald-50 font-semibold text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                <span>Gatekeeper Triage Portal</span>
              </button>
            )}

            {/* Tab: Root Cause & CAPA */}
            {allowedTabs.includes('clustering') && (
              <button
                id="nav-tab-clustering"
                type="button"
                onClick={() => handleTabSelect('clustering')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'clustering'
                    ? 'bg-indigo-50 font-semibold text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>วิเคราะห์สาเหตุ CAPA</span>
              </button>
            )}

            {/* Tab: Personnel & Governance Directory */}
            {allowedTabs.includes('admin_gatekeeper') && (
              <button
                id="nav-tab-admin-gatekeeper"
                type="button"
                onClick={() => handleTabSelect('admin_gatekeeper')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'admin_gatekeeper'
                    ? 'bg-indigo-50 font-semibold text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>จัดการผู้บริหาร, Admin & Gatekeeper</span>
              </button>
            )}

            {/* Tab: Role-Based Access Control (RBAC) — this app's own
                tab-visibility settings (RoleAccessConfigs), unchanged */}
            {allowedTabs.includes('rbac_management') && (
              <button
                id="nav-tab-rbac-management"
                type="button"
                onClick={() => handleTabSelect('rbac_management')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === 'rbac_management'
                    ? 'bg-rose-50 font-bold text-rose-800 ring-1 ring-rose-300'
                    : 'text-rose-700 hover:bg-rose-50/60 hover:text-rose-900'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-rose-600" />
                <span>กำหนดสิทธิ์เข้าถึง (RBAC)</span>
              </button>
            )}

            {/* ugt-nextjs-auth-setup (2026-09-02): admin section — visibility
                from RBAC permissions (identity.permissions), not allowedTabs */}
            {hasAdminSection && (
              <span className="mx-1 hidden self-center text-slate-200 sm:inline" aria-hidden>
                |
              </span>
            )}

            {canSeeUsers && (
              <button
                id="nav-tab-admin-users"
                type="button"
                onClick={() => handleTabSelect('admin_users')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'admin_users'
                    ? 'bg-slate-800 font-semibold text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>จัดการผู้ใช้</span>
              </button>
            )}

            {canSeeRoles && (
              <button
                id="nav-tab-admin-roles"
                type="button"
                onClick={() => handleTabSelect('admin_roles')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'admin_roles'
                    ? 'bg-slate-800 font-semibold text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>บทบาทและสิทธิ์</span>
              </button>
            )}

            {canSeeAuditLogs && (
              <button
                id="nav-tab-admin-audit-logs"
                type="button"
                onClick={() => handleTabSelect('admin_audit_logs')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'admin_audit_logs'
                    ? 'bg-slate-800 font-semibold text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ScrollText className="h-3.5 w-3.5" />
                <span>บันทึกการใช้งาน</span>
              </button>
            )}

            {canSeeMailTemplates && (
              <button
                id="nav-tab-admin-mail-templates"
                type="button"
                onClick={() => handleTabSelect('admin_mail_templates')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  activeTab === 'admin_mail_templates'
                    ? 'bg-slate-800 font-semibold text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                <span>เทมเพลตอีเมล</span>
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};
