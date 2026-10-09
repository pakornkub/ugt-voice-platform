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
  History,
  X,
  Globe,
  ShieldCheck,
  ScrollText,
  LogOut,
} from 'lucide-react';
import { UserRole, NotificationItem, AppTabId, RolePermissionConfig } from '../types';
import { INITIAL_ROLE_PERMISSIONS } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import type { ShellIdentity } from '../app/shell-context';
import { ssoLogoutAction } from '@/lib/actions/auth';
import { clickableProps } from './clickableProps';

interface NavbarProps {
  currentRole: UserRole;
  // ugt-nextjs-auth-setup (2026-09-02): identity from the real session,
  // replacing upstream's free role-switcher. Optional + defaulted so this
  // component still renders standalone (e.g. Navbar.test.tsx) without a live session.
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
  onOpenRecentSearches?: () => void;
  recentSearchesCount?: number;
  rolePermissions?: Record<UserRole, RolePermissionConfig>;
}

const DEFAULT_IDENTITY: ShellIdentity = {
  name: 'ผู้ใช้งาน',
  email: '',
  appRole: 'employee',
  roleName: null,
  employee: null,
  permissions: [],
};

const INDIGO_TAB_ACTIVE = 'bg-indigo-50 font-semibold text-indigo-700';

// Unread / history count bubble ("9+" once past nine).
const CountBadge: React.FC<Readonly<{ count: number; className: string }>> = ({
  count,
  className,
}) => (count > 0 ? <span className={className}>{count > 9 ? '9+' : count}</span> : null);

const NavTabButton: React.FC<
  Readonly<{
    id: string;
    isActive: boolean;
    onSelect: () => void;
    icon: React.ReactNode;
    label: string;
    activeClass?: string;
    inactiveClass?: string;
    weightClass?: string;
  }>
> = ({
  id,
  isActive,
  onSelect,
  icon,
  label,
  activeClass = INDIGO_TAB_ACTIVE,
  inactiveClass = 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
  weightClass = 'font-medium',
}) => (
  <button
    id={id}
    type="button"
    onClick={onSelect}
    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${weightClass} ${
      isActive ? activeClass : inactiveClass
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export const Navbar: React.FC<Readonly<NavbarProps>> = ({
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
  onOpenRecentSearches,
  recentSearchesCount = 0,
  rolePermissions: propRolePermissions,
}) => {
  const { lang, setLang, toggleLang, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isIdentityMenuOpen, setIsIdentityMenuOpen] = useState(false);
  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const rolePermissions = propRolePermissions || INITIAL_ROLE_PERMISSIONS;
  const currentRoleConfig = rolePermissions[currentRole] || rolePermissions.employee;
  const allowedTabs: AppTabId[] = currentRoleConfig?.allowedTabs || [
    'submit',
    'my_tickets',
    'workflow',
  ];

  const canAccessExecutive = allowedTabs.includes('executive');

  const handleTabSelect = (tab: string) => {
    if (onTabChange) onTabChange(tab);
    if (onSelectTab) onSelectTab(tab);
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
      label: t('role.employee'),
      sub: t('role.employee.sub'),
      icon: <UserCheck className="h-4 w-4 text-emerald-600" />,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    },
    gatekeeper: {
      label: t('role.gatekeeper'),
      sub: t('role.gatekeeper.sub'),
      icon: <Shield className="h-4 w-4 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
    },
    executive: {
      label: t('role.executive'),
      sub: t('role.executive.sub'),
      icon: <Crown className="h-4 w-4 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200 text-purple-800',
    },
    admin: {
      label: t('role.admin'),
      sub: t('role.admin.sub'),
      icon: <SlidersHorizontal className="h-4 w-4 text-rose-600" />,
      color: 'bg-rose-50 border-rose-200 text-rose-800',
    },
  };

  // SSO admin pages — governed by RoleAccessConfigs.allowedTabs (the upstream RBAC matrix) like
  // every other tab (2026-10-09, docs/project-context/decisions.md).
  const canSeeUsers = allowedTabs.includes('admin_users');
  const canSeeAuditLogs = allowedTabs.includes('admin_audit_logs');
  const hasAdminSection = canSeeUsers || canSeeAuditLogs;

  // Tabs governed by RoleAccessConfigs.allowedTabs (upstream matrix), in display order.
  const mainTabs: {
    tab: AppTabId;
    domId: string;
    icon: React.ReactNode;
    label: string;
    activeClass?: string;
    inactiveClass?: string;
    weightClass?: string;
  }[] = [
    {
      tab: 'submit',
      domId: 'nav-tab-submit',
      icon: <FileText className="h-3.5 w-3.5" />,
      label: t('tab.submit'),
    },
    {
      tab: 'my_tickets',
      domId: 'nav-tab-my-tickets',
      icon: <LifeBuoy className="h-3.5 w-3.5" />,
      label: t('tab.my_tickets'),
    },
    {
      tab: 'gatekeeper',
      domId: 'nav-tab-gatekeeper',
      icon: <Shield className="h-3.5 w-3.5 text-emerald-600" />,
      label: t('tab.gatekeeper'),
      activeClass: 'bg-emerald-50 font-semibold text-emerald-800',
    },
    {
      tab: 'clustering',
      domId: 'nav-tab-clustering',
      icon: <Layers className="h-3.5 w-3.5" />,
      label: t('tab.clustering'),
    },
    {
      tab: 'admin_gatekeeper',
      domId: 'nav-tab-admin-gatekeeper',
      icon: <Users className="h-3.5 w-3.5" />,
      label: t('tab.admin_gatekeeper'),
    },
    // this app's own tab-visibility settings (RoleAccessConfigs), unchanged
    {
      tab: 'rbac_management',
      domId: 'nav-tab-rbac-management',
      icon: <SlidersHorizontal className="h-3.5 w-3.5 text-rose-600" />,
      label: t('tab.rbac_management'),
      activeClass: 'bg-rose-50 font-bold text-rose-800 ring-1 ring-rose-300',
      inactiveClass: 'text-rose-700 hover:bg-rose-50/60 hover:text-rose-900',
      weightClass: 'font-bold',
    },
    // คู่มือ — upstream moved it from a quick button to a tab
    {
      tab: 'workflow',
      domId: 'nav-tab-workflow',
      icon: <GitBranch className="h-3.5 w-3.5 text-indigo-600" />,
      label: t('tab.workflow'),
      activeClass: `${INDIGO_TAB_ACTIVE} ring-1 ring-indigo-300`,
    },
  ];

  const adminTabs = [
    {
      id: 'admin_users',
      domId: 'nav-tab-admin-users',
      visible: canSeeUsers,
      icon: <Users className="h-3.5 w-3.5" />,
      label: lang === 'en' ? 'Users' : 'จัดการผู้ใช้',
    },
    {
      id: 'admin_audit_logs',
      domId: 'nav-tab-admin-audit-logs',
      visible: canSeeAuditLogs,
      icon: <ScrollText className="h-3.5 w-3.5" />,
      label: lang === 'en' ? 'Audit Logs' : 'บันทึกการใช้งาน',
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-screen-2xl">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div
            className="flex shrink-0 cursor-pointer items-center gap-3"
            {...clickableProps(() => {
              if (allowedTabs.includes('submit')) handleTabSelect('submit');
              else if (allowedTabs[0]) handleTabSelect(allowedTabs[0]);
            })}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm shadow-indigo-200">
              <Shield className="h-5 w-5" />
            </div>
            {/* Phones show the logo only — the name would push the action buttons off-screen. */}
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight whitespace-nowrap text-slate-900 sm:text-lg">
                  UGT VoicePlatform
                </span>
                <span className="hidden items-center rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-indigo-700 xl:inline-flex">
                  Grievance & Whistleblower
                </span>
              </div>
              <p className="hidden text-xs text-slate-500 xl:block">{t('brand.desc')}</p>
            </div>
          </div>

          {/* Quick Tracking Search Bar with Recent Searches Trigger */}
          <div className="hidden items-center gap-1.5 lg:flex">
            <form onSubmit={handleSearchSubmit} className="relative flex w-44 items-center xl:w-56">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                id="global-tracking-search"
                placeholder={t('nav.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-7 pl-9 text-xs text-slate-800 placeholder-slate-400 transition focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>

            {/* Recent Searches Trigger Button */}
            <button
              type="button"
              id="btn-navbar-recent-searches"
              onClick={onOpenRecentSearches}
              className="relative flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              title={t('nav.recent_searches_tooltip')}
            >
              <History className="h-4 w-4 text-indigo-600" />
              <CountBadge
                count={recentSearchesCount}
                className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white"
              />
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            {/* Mobile History / Tracking Search Button */}
            <button
              type="button"
              id="btn-mobile-recent-searches"
              onClick={onOpenRecentSearches}
              className="relative rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-indigo-700 lg:hidden"
              title={t('nav.recent_searches_tooltip')}
            >
              <History className="h-4 w-4 text-indigo-600" />
              <CountBadge
                count={recentSearchesCount}
                className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-xs"
              />
            </button>

            {/* Quick Dashboard Button (only visible if allowed by the Screen Visibility Matrix) */}
            {canAccessExecutive && (
              <button
                id="btn-quick-dashboard"
                type="button"
                onClick={() => handleTabSelect('executive')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shadow-xs transition 2xl:px-3 ${
                  activeTab === 'executive'
                    ? 'border-purple-700 bg-purple-700 text-white ring-2 ring-purple-400/40'
                    : 'border-purple-200 bg-white text-purple-900 hover:border-purple-300 hover:bg-purple-50'
                }`}
                title={t('nav.quick_dashboard')}
                aria-label={t('nav.quick_dashboard')}
              >
                <LayoutDashboard
                  className={`h-3.5 w-3.5 ${activeTab === 'executive' ? 'text-purple-200' : 'text-purple-600'}`}
                />
                <span className="hidden 2xl:inline">{t('nav.quick_dashboard')}</span>
              </button>
            )}

            {/* Quick Export Data Button (only visible to HR Admin) */}
            {currentRole === 'admin' && (
              <button
                id="btn-quick-export"
                type="button"
                onClick={onOpenExport}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-emerald-900 shadow-xs transition hover:border-emerald-300 hover:bg-emerald-50 2xl:px-3"
                title={t('nav.quick_export')}
                aria-label={t('nav.quick_export')}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden 2xl:inline">{t('nav.quick_export')}</span>
              </button>
            )}

            {/* Notification Center Trigger */}
            <button
              id="btn-notifications-open"
              type="button"
              onClick={onOpenNotifications}
              className="relative rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              title={t('nav.notifications')}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Language Switcher Button (TH/EN, default TH) */}
            <div
              id="btn-lang-switcher"
              className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 shadow-2xs"
              title={
                lang === 'th'
                  ? 'ภาษา: ไทย (คลิกเพื่อเปลี่ยนเป็น EN)'
                  : 'Language: English (Click to switch to TH)'
              }
            >
              <button
                id="btn-lang-toggle"
                type="button"
                onClick={toggleLang}
                className="flex items-center rounded-md p-1 text-slate-400 transition hover:bg-slate-200/60 hover:text-indigo-600"
                title={lang === 'th' ? 'สลับภาษา TH/EN' : 'Toggle Language TH/EN'}
              >
                <Globe className="h-3.5 w-3.5" />
                <span className="ml-0.5 text-[10px] font-black text-indigo-700 sm:hidden">
                  {lang.toUpperCase()}
                </span>
              </button>
              <button
                id="btn-lang-th"
                type="button"
                onClick={() => setLang('th')}
                className={`hidden rounded-md px-2 py-1 text-xs font-bold transition sm:inline ${
                  lang === 'th'
                    ? 'bg-white font-black text-indigo-700 shadow-xs ring-1 ring-slate-200/80'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="เปลี่ยนเป็นภาษาไทย (TH)"
              >
                TH
              </button>
              <span className="hidden px-0.5 text-[11px] font-bold text-slate-300 select-none sm:inline">
                /
              </span>
              <button
                id="btn-lang-en"
                type="button"
                onClick={() => setLang('en')}
                className={`hidden rounded-md px-2 py-1 text-xs font-bold transition sm:inline ${
                  lang === 'en'
                    ? 'bg-white font-black text-indigo-700 shadow-xs ring-1 ring-slate-200/80'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Switch to English (EN)"
              >
                EN
              </button>
            </div>

            {/* Identity Menu — replaces upstream's free role-switcher dropdown
                (ugt-nextjs-auth-setup, 2026-09-02): บทบาทมาจาก session จริง
                อ่านอย่างเดียว ไม่มีปุ่มสลับ */}
            <div className="relative">
              <button
                id="btn-identity-menu"
                type="button"
                onClick={() => setIsIdentityMenuOpen(!isIdentityMenuOpen)}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition sm:px-3 ${roleLabels[currentRole].color}`}
                aria-label={roleLabels[currentRole].label.split('(')[0]}
              >
                <div className="flex items-center gap-1.5">
                  {roleLabels[currentRole].icon}
                  {/* Same label as upstream's role button; name/email live in the menu below. */}
                  <span className="hidden max-w-44 truncate font-semibold sm:inline">
                    {roleLabels[currentRole].label.split('(')[0]}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>

              {isIdentityMenuOpen && (
                <>
                  <div
                    aria-hidden="true"
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
                        <span>{lang === 'en' ? 'Sign out' : 'ออกจากระบบ'}</span>
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
          <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-slate-100 py-1.5 sm:gap-2 lg:flex-wrap">
            {mainTabs
              .filter((tab) => allowedTabs.includes(tab.tab))
              .map((tab) => (
                <NavTabButton
                  key={tab.tab}
                  id={tab.domId}
                  isActive={activeTab === tab.tab}
                  onSelect={() => handleTabSelect(tab.tab)}
                  icon={tab.icon}
                  label={tab.label}
                  activeClass={tab.activeClass}
                  inactiveClass={tab.inactiveClass}
                  weightClass={tab.weightClass}
                />
              ))}

            {/* SSO admin section — visibility from allowedTabs (upstream RBAC matrix) */}
            {hasAdminSection && (
              <span className="mx-1 hidden self-center text-slate-200 sm:inline" aria-hidden>
                |
              </span>
            )}

            {adminTabs
              .filter((tab) => tab.visible)
              .map((tab) => (
                <NavTabButton
                  key={tab.id}
                  id={tab.domId}
                  isActive={activeTab === tab.id}
                  onSelect={() => handleTabSelect(tab.id)}
                  icon={tab.icon}
                  label={tab.label}
                  activeClass="bg-slate-800 font-semibold text-white"
                />
              ))}
          </nav>
        )}
      </div>
    </header>
  );
};
