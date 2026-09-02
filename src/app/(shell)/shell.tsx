'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { TrackingTimelineModal } from '@/components/TrackingTimelineModal';
import { SatisfactionModal } from '@/components/SatisfactionModal';
import { ExportAnalyticsModal } from '@/components/ExportAnalyticsModal';
import { ComplaintTicket, NotificationItem, UserRole } from '@/types';
import {
  getTickets,
  getTicketByTrackingCode,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/api';
import { FileText, ListChecks, Shield, Crown, Layers, Bell, CheckCircle2, Clock, Smartphone, X } from 'lucide-react';
import { PATH_TO_TAB, ShellContext, TAB_TO_PATH } from '../shell-context';

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = PATH_TO_TAB[pathname] || 'submit';

  const [currentRole, setCurrentRole] = useState<UserRole>('employee');
  const [tickets, setTickets] = useState<ComplaintTicket[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSimulator, setIsMobileSimulator] = useState(false);

  const [selectedTicketForTracking, setSelectedTicketForTracking] = useState<ComplaintTicket | null>(null);
  const [selectedTicketForSatisfaction, setSelectedTicketForSatisfaction] = useState<ComplaintTicket | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshData = () => {
    setTickets(getTickets() || []);
    setNotifications(getNotifications() || []);
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const navigateTab = (tab: string) => {
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
    if (found) {
      setSelectedTicketForTracking(found);
    } else {
      alert(`ไม่พบรหัสติดตาม "${code}" ในระบบ กรุณาตรวจสอบความถูกต้อง`);
    }
  };

  const openTracking = (ticket: ComplaintTicket) => setSelectedTicketForTracking(ticket);
  const openSatisfaction = (ticket: ComplaintTicket) => setSelectedTicketForSatisfaction(ticket);

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (newRole === 'gatekeeper') navigateTab('gatekeeper');
    else if (newRole === 'executive') navigateTab('executive');
    else if (newRole === 'admin') navigateTab('rbac_management');
    else if (newRole === 'employee') navigateTab('submit');
  };

  const handleNotificationClick = (item: NotificationItem) => {
    const updated = markNotificationAsRead(item.id);
    setNotifications(updated);
    setIsNotificationsOpen(false);
    openTrackingByCode(item.trackingCode);
  };

  const handleMarkAllRead = () => {
    setNotifications(markAllNotificationsAsRead());
  };

  return (
    <ShellContext.Provider
      value={{
        currentRole,
        tickets,
        notifications,
        isMobileSimulator,
        activeTab,
        refreshData,
        navigateTab,
        setCurrentRole,
        handleRoleChange,
        handleTicketCreated,
        handleTicketUpdated,
        openTrackingByCode,
        openTracking,
        openSatisfaction,
      }}
    >
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
        {/* Top Navigation */}
        <Navbar
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          onSelectRole={handleRoleChange}
          activeTab={activeTab}
          onTabChange={navigateTab}
          onSelectTab={navigateTab}
          isMobileSimulator={isMobileSimulator}
          onToggleMobileSimulator={() => setIsMobileSimulator(!isMobileSimulator)}
          notifications={notifications}
          onSelectTrackingCode={openTrackingByCode}
          onSearchTrackingCode={openTrackingByCode}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenExport={() => setIsExportModalOpen(true)}
        />

        {/* Floating Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium">{toastMessage}</p>
          </div>
        )}

        {/* Main Content Area (supports Optional Mobile Simulator Framing) */}
        <main className={`flex-1 pb-16 md:pb-8 ${isMobileSimulator ? 'py-6 px-4 flex justify-center' : ''}`}>
          <div
            className={
              isMobileSimulator
                ? 'w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-slate-800 overflow-hidden min-h-[720px] relative flex flex-col'
                : 'w-full'
            }
          >
            {isMobileSimulator && (
              <div className="bg-slate-800 text-white text-[11px] py-1 px-4 flex items-center justify-between font-mono">
                <span>9:41 AM</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">UGT VoiceCare Mobile</span>
                  <Smartphone className="w-3 h-3 text-indigo-400" />
                </div>
              </div>
            )}

            <div className="flex-1">{children}</div>
          </div>
        </main>

        {/* Mobile Responsive Bottom Navigation Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around">
          <button
            type="button"
            onClick={() => navigateTab('submit')}
            className={`flex flex-col items-center p-1.5 rounded-lg text-[10px] font-medium transition ${
              activeTab === 'submit' ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ยื่นเรื่อง</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTab('my_tickets')}
            className={`flex flex-col items-center p-1.5 rounded-lg text-[10px] font-medium transition ${
              activeTab === 'my_tickets' ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>คำร้องของฉัน</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTab('gatekeeper')}
            className={`flex flex-col items-center p-1.5 rounded-lg text-[10px] font-medium transition ${
              activeTab === 'gatekeeper' ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Gatekeeper</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTab('executive')}
            className={`flex flex-col items-center p-1.5 rounded-lg text-[10px] font-medium transition ${
              activeTab === 'executive' ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Crown className="w-4 h-4 text-purple-600" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTab('clustering')}
            className={`flex flex-col items-center p-1.5 rounded-lg text-[10px] font-medium transition ${
              activeTab === 'clustering' ? 'text-indigo-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>สาเหตุ CAPA</span>
          </button>
        </div>

        {/* Notifications Drawer / Slide-Over Modal */}
        {isNotificationsOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsNotificationsOpen(false)}
            />
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10 animate-in slide-in-from-right duration-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">ศูนย์การแจ้งเตือน (Notifications)</h2>
                    <p className="text-[11px] text-slate-500">อัปเดตสถานะคำร้อง & ข้อความแจ้งเตือน</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notifications.some((n) => !n.read) && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded-md hover:bg-indigo-50"
                    >
                      อ่านทั้งหมด
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">ยังไม่มีการแจ้งเตือนในขณะนี้</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex gap-3 ${
                        item.read
                          ? 'bg-white border-slate-200 hover:border-slate-300'
                          : 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50 shadow-xs'
                      }`}
                    >
                      <div className="mt-0.5">
                        {item.type === 'direct_ceo_alert' ? (
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                            <Crown className="w-3.5 h-3.5" />
                          </div>
                        ) : item.type === 'satisfaction_pending' ? (
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">{item.title}</span>
                          {!item.read && <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{item.message}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-mono">{item.trackingCode}</span>
                          <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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

        {/* Export & Analytics Data Hub Modal */}
        {isExportModalOpen && (
          <ExportAnalyticsModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} tickets={tickets} />
        )}
      </div>
    </ShellContext.Provider>
  );
}
