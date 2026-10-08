'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { TrackingTimelineModal } from '@/components/TrackingTimelineModal';
import { SatisfactionModal } from '@/components/SatisfactionModal';
import { RecentSearchesPanel } from '@/components/RecentSearchesPanel';
import { ExportAnalyticsModal } from '@/components/ExportAnalyticsModal';
import {
  AppTabId,
  ComplaintTicket,
  NotificationItem,
  RolePermissionConfig,
  UserRole,
} from '@/types';
import {
  INITIAL_ROLE_PERMISSIONS,
  getTickets,
  getTicketByTrackingCode,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getStoredRolePermissions,
  addRecentSearch,
  getRecentSearches,
} from '@/services/api';
import {
  FileText,
  ListChecks,
  Shield,
  Crown,
  Layers,
  Bell,
  CheckCircle2,
  Clock,
  Smartphone,
  X,
} from 'lucide-react';
import {
  PATH_TO_TAB,
  RBAC_PERMISSION_TABS,
  ShellContext,
  ShellIdentity,
  TAB_TO_PATH,
} from '../shell-context';

export default function Shell({
  identity,
  children,
}: {
  identity: ShellIdentity;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = PATH_TO_TAB[pathname] || 'submit';

  // Role now comes from the authenticated session (ugt-nextjs-auth-setup,
  // 2026-09-02) — no more free client-side role-switcher state. Assigned by
  // an admin from /admin/users; see docs/project-context/decisions.md.
  const currentRole = identity.appRole;
  const [tickets, setTickets] = useState<ComplaintTicket[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSimulator, setIsMobileSimulator] = useState(false);

  const [selectedTicketForTracking, setSelectedTicketForTracking] =
    useState<ComplaintTicket | null>(null);
  const [selectedTicketForSatisfaction, setSelectedTicketForSatisfaction] =
    useState<ComplaintTicket | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRecentSearchesOpen, setIsRecentSearchesOpen] = useState(false);
  const [recentSearchesCount, setRecentSearchesCount] = useState(0);

  // Seeded with the defaults (not getStoredRolePermissions()) so SSR and
  // hydration markup match; refreshData() swaps in the stored matrix after mount.
  const [rolePermissions, setRolePermissions] =
    useState<Record<UserRole, RolePermissionConfig>>(INITIAL_ROLE_PERMISSIONS);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshRecentSearchesCount = () => {
    setRecentSearchesCount(getRecentSearches().length);
  };

  const refreshData = () => {
    setTickets(getTickets() || []);
    setNotifications(getNotifications() || []);
    setRolePermissions(getStoredRolePermissions());
  };

  // localStorage is client-only: reading it after mount (not in useState)
  // keeps SSR and hydration markup identical. Goes away with the
  // localStorage → Server Action rewiring (.claude/state/handoff.md → Next).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
    refreshRecentSearchesCount();
  }, []);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Safe navigation with RBAC permission enforcement (upstream App.tsx
  // handleNavigateTab). The four admin_* tabs added by auth/mail setup are
  // governed by RBAC permission keys (checked in Navbar), not allowedTabs, so
  // they bypass the allowedTabs matrix here.
  const navigateTab = (tab: string) => {
    const currentConfig = rolePermissions[currentRole];
    const isAllowed =
      RBAC_PERMISSION_TABS.includes(tab as AppTabId) ||
      currentConfig?.allowedTabs?.includes(tab as AppTabId);

    // If the target tab is not permitted for the active role, do NOT elevate
    if (!isAllowed) {
      showNotification(
        `⚠️ บัญชีในบทบาท "${currentConfig?.roleTitleTh || currentRole}" ไม่มีสิทธิ์เข้าถึงหน้านี้ตามเมทริกซ์สิทธิ์`
      );
      return;
    }
    router.push(TAB_TO_PATH[tab as keyof typeof TAB_TO_PATH] || '/submit');
  };

  const handleTicketCreated = (newTicket: ComplaintTicket) => {
    refreshData();
    showNotification(`บันทึกคำร้อง ${newTicket.trackingCode} เข้าระบบและส่งไปยัง Gatekeeper แล้ว`);
  };

  const handleTicketUpdated = (updatedTicket: ComplaintTicket) => {
    refreshData();
    if (selectedTicketForTracking && selectedTicketForTracking.id === updatedTicket.id) {
      setSelectedTicketForTracking(updatedTicket);
    }
    showNotification(`อัปเดตสถานะคำร้อง ${updatedTicket.trackingCode} เรียบร้อยแล้ว`);
  };

  const openTrackingByCode = (code: string) => {
    const found = getTicketByTrackingCode(code);

    // Automatically log this search into recent searches
    addRecentSearch(code, found);
    refreshRecentSearchesCount();

    if (found) {
      setSelectedTicketForTracking(found);
    } else {
      showNotification(`ไม่พบรหัสติดตาม "${code}" ในระบบ (บันทึกลงประวัติค้นหาแล้ว)`);
      setIsRecentSearchesOpen(true);
    }
  };

  const openTracking = (ticket: ComplaintTicket) => setSelectedTicketForTracking(ticket);
  const openSatisfaction = (ticket: ComplaintTicket) => setSelectedTicketForSatisfaction(ticket);

  const handleNotificationClick = (item: NotificationItem) => {
    const updated = markNotificationAsRead(item.id);
    setNotifications(updated);
    setIsNotificationsOpen(false);
    openTrackingByCode(item.trackingCode);
  };

  const handleMarkAllRead = () => {
    setNotifications(markAllNotificationsAsRead());
  };

  const openRecentSearches = () => {
    refreshRecentSearchesCount();
    setIsRecentSearchesOpen(true);
  };

  const currentRoleConfig = rolePermissions[currentRole] || rolePermissions.employee;
  const allowedTabs: AppTabId[] = currentRoleConfig?.allowedTabs || [
    'submit',
    'my_tickets',
    'workflow',
  ];
  const canViewDirectCeo = currentRoleConfig?.canViewDirectCeoTickets ?? false;

  const visibleNotifications = (notifications || []).filter((n) => {
    if (n.type === 'direct_ceo_alert' || n.recipientRole === 'executive') {
      return canViewDirectCeo;
    }
    return true;
  });

  return (
    <ShellContext.Provider
      value={{
        currentRole,
        identity,
        tickets,
        notifications: visibleNotifications,
        rolePermissions,
        recentSearchesCount,
        isRecentSearchesOpen,
        openRecentSearches,
        closeRecentSearches: () => {
          setIsRecentSearchesOpen(false);
          refreshRecentSearchesCount();
        },
        isMobileSimulator,
        activeTab,
        refreshData,
        navigateTab,
        handleTicketCreated,
        handleTicketUpdated,
        openTrackingByCode,
        openTracking,
        openSatisfaction,
      }}
    >
      <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
        {/* Top Navigation */}
        <Navbar
          currentRole={currentRole}
          identity={identity}
          activeTab={activeTab}
          onTabChange={navigateTab}
          onSelectTab={navigateTab}
          isMobileSimulator={isMobileSimulator}
          onToggleMobileSimulator={() => setIsMobileSimulator(!isMobileSimulator)}
          notifications={visibleNotifications}
          onSelectTrackingCode={openTrackingByCode}
          onSearchTrackingCode={openTrackingByCode}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenExport={() => setIsExportModalOpen(true)}
          onOpenRecentSearches={openRecentSearches}
          recentSearchesCount={recentSearchesCount}
          rolePermissions={rolePermissions}
        />

        {/* Floating Global Toast Notification */}
        {toastMessage && (
          <div className="animate-in fade-in slide-in-from-top-4 fixed top-20 right-4 z-50 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white shadow-xl duration-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium">{toastMessage}</p>
          </div>
        )}

        {/* Main Content Area (supports Optional Mobile Simulator Framing) */}
        <main
          className={`flex-1 pb-16 md:pb-8 ${isMobileSimulator ? 'flex justify-center px-4 py-6' : ''}`}
        >
          <div
            className={
              isMobileSimulator
                ? 'relative flex min-h-[720px] w-full max-w-md flex-col overflow-hidden rounded-3xl border-4 border-slate-800 bg-white shadow-2xl'
                : 'w-full'
            }
          >
            {isMobileSimulator && (
              <div className="flex items-center justify-between bg-slate-800 px-4 py-1 font-mono text-[11px] text-white">
                <span>9:41 AM</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">UGT VoicePlatform Mobile</span>
                  <Smartphone className="h-3 w-3 text-indigo-400" />
                </div>
              </div>
            )}

            <div className="flex-1">{children}</div>
          </div>
        </main>

        {/* Mobile Responsive Bottom Navigation Bar (filtered strictly by the screen visibility matrix) */}
        <div className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur-md md:hidden">
          {allowedTabs.includes('submit') && (
            <button
              type="button"
              onClick={() => navigateTab('submit')}
              className={`flex flex-col items-center rounded-lg p-1.5 text-[10px] font-medium transition ${
                activeTab === 'submit' ? 'font-bold text-indigo-600' : 'text-slate-500'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>ยื่นเรื่อง</span>
            </button>
          )}

          {allowedTabs.includes('my_tickets') && (
            <button
              type="button"
              onClick={() => navigateTab('my_tickets')}
              className={`flex flex-col items-center rounded-lg p-1.5 text-[10px] font-medium transition ${
                activeTab === 'my_tickets' ? 'font-bold text-indigo-600' : 'text-slate-500'
              }`}
            >
              <ListChecks className="h-4 w-4" />
              <span>คำร้องของฉัน</span>
            </button>
          )}

          {allowedTabs.includes('gatekeeper') && (
            <button
              type="button"
              onClick={() => navigateTab('gatekeeper')}
              className={`flex flex-col items-center rounded-lg p-1.5 text-[10px] font-medium transition ${
                activeTab === 'gatekeeper' ? 'font-bold text-indigo-600' : 'text-slate-500'
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>Gatekeeper</span>
            </button>
          )}

          {allowedTabs.includes('executive') && (
            <button
              type="button"
              onClick={() => navigateTab('executive')}
              className={`flex flex-col items-center rounded-lg p-1.5 text-[10px] font-medium transition ${
                activeTab === 'executive' ? 'font-bold text-indigo-600' : 'text-slate-500'
              }`}
            >
              <Crown className="h-4 w-4 text-purple-600" />
              <span>Dashboard</span>
            </button>
          )}

          {allowedTabs.includes('clustering') && (
            <button
              type="button"
              onClick={() => navigateTab('clustering')}
              className={`flex flex-col items-center rounded-lg p-1.5 text-[10px] font-medium transition ${
                activeTab === 'clustering' ? 'font-bold text-indigo-600' : 'text-slate-500'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>สาเหตุ CAPA</span>
            </button>
          )}
        </div>

        {/* Notifications Drawer / Slide-Over Modal */}
        {isNotificationsOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsNotificationsOpen(false)}
            />
            <div className="animate-in slide-in-from-right relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      ศูนย์การแจ้งเตือน (Notifications)
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      อัปเดตสถานะคำร้อง & ข้อความแจ้งเตือน
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {visibleNotifications.some((n) => !n.read) && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="rounded-md px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800"
                    >
                      อ่านทั้งหมด
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {visibleNotifications.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Bell className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    <p className="text-xs">ยังไม่มีการแจ้งเตือนในขณะนี้</p>
                  </div>
                ) : (
                  visibleNotifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition ${
                        item.read
                          ? 'border-slate-200 bg-white hover:border-slate-300'
                          : 'border-indigo-200 bg-indigo-50/50 shadow-xs hover:bg-indigo-50'
                      }`}
                    >
                      <div className="mt-0.5">
                        {item.type === 'direct_ceo_alert' ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                            <Crown className="h-3.5 w-3.5" />
                          </div>
                        ) : item.type === 'satisfaction_pending' ? (
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                            <Clock className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{item.title}</span>
                          {!item.read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                          )}
                        </div>
                        <p className="line-clamp-2 text-xs text-slate-600">{item.message}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-mono">{item.trackingCode}</span>
                          <span>
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Real-time Tracking & Progress Timeline Modal */}
        {selectedTicketForTracking && (
          <TrackingTimelineModal
            ticket={selectedTicketForTracking}
            currentRole={currentRole}
            onClose={() => setSelectedTicketForTracking(null)}
            onOpenSatisfactionModal={(t) => {
              setSelectedTicketForTracking(null);
              setSelectedTicketForSatisfaction(t);
            }}
            onTicketUpdated={handleTicketUpdated}
          />
        )}

        {/* Satisfaction Survey Modal (CSAT) */}
        {selectedTicketForSatisfaction && (
          <SatisfactionModal
            ticket={selectedTicketForSatisfaction}
            onClose={() => setSelectedTicketForSatisfaction(null)}
            onEvaluationCompleted={(updated) => {
              handleTicketUpdated(updated);
              setSelectedTicketForSatisfaction(null);
            }}
          />
        )}

        {/* Export & Analytics Data Hub Modal (HR Admin only) */}
        {isExportModalOpen && currentRole === 'admin' && (
          <ExportAnalyticsModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            tickets={tickets}
          />
        )}

        {/* Recent tracking-code searches slide-over */}
        <RecentSearchesPanel
          isOpen={isRecentSearchesOpen}
          onClose={() => {
            setIsRecentSearchesOpen(false);
            refreshRecentSearchesCount();
          }}
          onSelectTicket={setSelectedTicketForTracking}
          onSearchAgain={openTrackingByCode}
        />
      </div>
    </ShellContext.Provider>
  );
}
