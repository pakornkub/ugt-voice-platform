'use client';

import React, { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  Shield, 
  ShieldCheck, 
  UserCheck, 
  Crown, 
  Users, 
  Lock, 
  Check, 
  X, 
  RotateCcw, 
  Save, 
  Eye, 
  HelpCircle, 
  Building2, 
  Info, 
  FileText, 
  ListChecks, 
  GitBranch, 
  Layers, 
  Sparkles, 
  ChevronRight,
  AlertTriangle,
  FileCheck2,
  Scale,
  Plus,
  Trash2,
  Mail,
  Phone,
  UserPlus,
  Briefcase,
  Building,
  Edit2
} from 'lucide-react';
import { UserRole, AppTabId, GrievanceCategory, RolePermissionConfig, ExecutiveMember } from '../types';
import { 
  APP_TABS, 
  INITIAL_ROLE_PERMISSIONS, 
  getStoredRolePermissions, 
  saveStoredRolePermissions, 
  resetRolePermissionsToDefault,
  getActiveGatekeeperDepartment,
  setActiveGatekeeperDepartment,
  getStoredGatekeeperConfigs,
  getStoredExecutives,
  addExecutiveMember,
  updateExecutiveMember,
  deleteExecutiveMember,
  getStoredHrAdmins
} from '../services/api';
import { CATEGORY_DEFINITIONS } from '../mockData';

interface RoleBasedAccessManagementProps {
  currentRole: UserRole;
  onSwitchRole: (role: UserRole) => void;
  onNavigateTab: (tab: AppTabId) => void;
  onPermissionsUpdated?: () => void;
}

export const RoleBasedAccessManagement: React.FC<RoleBasedAccessManagementProps> = ({
  currentRole,
  onSwitchRole,
  onNavigateTab,
  onPermissionsUpdated,
}) => {
  const [permissions, setPermissions] = useState<Record<UserRole, RolePermissionConfig>>(getStoredRolePermissions());
  const [selectedRoleForDetail, setSelectedRoleForDetail] = useState<UserRole>('employee');
  const [activeGkDept, setActiveGkDept] = useState<GrievanceCategory>(getActiveGatekeeperDepartment());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(true);

  // Executive Management Direct In-Box State
  const [executives, setExecutives] = useState<ExecutiveMember[]>(() => getStoredExecutives());
  const [isAddingExec, setIsAddingExec] = useState(false);
  const [editingExecId, setEditingExecId] = useState<string | null>(null);
  const [execName, setExecName] = useState('');
  const [execPosition, setExecPosition] = useState('');
  const [execDepartment, setExecDepartment] = useState('');
  const [execEmail, setExecEmail] = useState('');
  const [execPhone, setExecPhone] = useState('');
  const [execRoleType, setExecRoleType] = useState<ExecutiveMember['roleType']>('CEO');
  const [execIsWhistleblower, setExecIsWhistleblower] = useState(true);
  const [execCanViewConfidential, setExecCanViewConfidential] = useState(true);

  const gatekeeperConfigs = getStoredGatekeeperConfigs();

  useEffect(() => {
    setPermissions(getStoredRolePermissions());
    setActiveGkDept(getActiveGatekeeperDepartment());
    setExecutives(getStoredExecutives());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleSaveExecSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!execName.trim() || !execEmail.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุล และอีเมลของผู้บริหาร');
      return;
    }

    if (editingExecId) {
      const updated = updateExecutiveMember(editingExecId, {
        name: execName.trim(),
        position: execPosition.trim() || 'ผู้บริหารระดับสูง',
        department: execDepartment.trim() || 'Executive Committee',
        email: execEmail.trim(),
        phone: execPhone.trim() || undefined,
        roleType: execRoleType,
        isPrimaryWhistleblowerReceiver: execIsWhistleblower,
        canViewConfidentialIdentities: execCanViewConfidential,
      });
      setExecutives(updated);
      showToast(`อัปเดตข้อมูลผู้บริหาร "${execName}" เรียบร้อยแล้ว`);
    } else {
      const updated = addExecutiveMember({
        name: execName.trim(),
        position: execPosition.trim() || 'ผู้บริหารระดับสูง',
        department: execDepartment.trim() || 'Executive Committee',
        email: execEmail.trim(),
        phone: execPhone.trim() || undefined,
        roleType: execRoleType,
        isPrimaryWhistleblowerReceiver: execIsWhistleblower,
        canViewConfidentialIdentities: execCanViewConfidential,
        receiveAlertNotifications: true,
        assignedCommittees: ['คณะกรรมการบริหาร (ExCom)'],
        status: 'active',
      });
      setExecutives(updated);
      showToast(`เพิ่มรายชื่อผู้บริหาร "${execName}" เข้าระบบเรียบร้อยแล้ว`);
    }

    // Reset Form
    setIsAddingExec(false);
    setEditingExecId(null);
    setExecName('');
    setExecPosition('');
    setExecDepartment('');
    setExecEmail('');
    setExecPhone('');
    setExecRoleType('CEO');
    setExecIsWhistleblower(true);
    setExecCanViewConfidential(true);
  };

  const handleStartEditExec = (exec: ExecutiveMember) => {
    setEditingExecId(exec.id);
    setExecName(exec.name);
    setExecPosition(exec.position);
    setExecDepartment(exec.department);
    setExecEmail(exec.email);
    setExecPhone(exec.phone || '');
    setExecRoleType(exec.roleType);
    setExecIsWhistleblower(exec.isPrimaryWhistleblowerReceiver);
    setExecCanViewConfidential(exec.canViewConfidentialIdentities);
    setIsAddingExec(true);
  };

  const handleDeleteExec = (id: string, name: string) => {
    if (confirm(`ยืนยันการลบรายชื่อผู้บริหาร "${name}" ออกจากระบบ?`)) {
      const updated = deleteExecutiveMember(id);
      setExecutives(updated);
      showToast(`ลบรายชื่อผู้บริหาร "${name}" เรียบร้อยแล้ว`);
    }
  };

  const handleToggleExecStatus = (id: string) => {
    const target = executives.find(e => e.id === id);
    if (!target) return;
    const newStatus = target.status === 'active' ? 'inactive' : 'active';
    const updated = updateExecutiveMember(id, { status: newStatus });
    setExecutives(updated);
    showToast(`เปลี่ยนสถานะเป็น ${newStatus === 'active' ? 'เปิดใช้งาน' : 'ระงับชั่วคราว'}`);
  };

  const handleToggleTabPermission = (role: UserRole, tabId: AppTabId) => {
    // Prevent removing RBAC tab from admin role to prevent lockout
    if (role === 'admin' && tabId === 'rbac_management') {
      showToast('⚠️ ไม่สามารถปิดสิทธิ์หน้า RBAC สำหรับ HR Admin เพื่อป้องกันการล็อกระบบ');
      return;
    }

    setPermissions((prev) => {
      const roleConfig = prev[role];
      const hasTab = roleConfig.allowedTabs.includes(tabId);
      const newAllowed = hasTab
        ? roleConfig.allowedTabs.filter((t) => t !== tabId)
        : [...roleConfig.allowedTabs, tabId];

      const updated = {
        ...prev,
        [role]: {
          ...roleConfig,
          allowedTabs: newAllowed,
        },
      };

      saveStoredRolePermissions(updated);
      setIsSaved(false);
      setTimeout(() => setIsSaved(true), 800);
      if (onPermissionsUpdated) onPermissionsUpdated();
      return updated;
    });

    showToast(`อัปเดตสิทธิ์แท็บสำหรับ ${permissions[role].roleTitleTh.split(' ')[0]} แล้ว`);
  };

  const handleToggleSpecialPermission = (role: UserRole, key: keyof RolePermissionConfig) => {
    if (role === 'admin' && key === 'canManageRolePermissions') {
      showToast('⚠️ HR Admin จำเป็นต้องมีสิทธิ์จัดการ RBAC เสมอ');
      return;
    }

    setPermissions((prev) => {
      const roleConfig = prev[role];
      const currentValue = !!roleConfig[key];
      const updated = {
        ...prev,
        [role]: {
          ...roleConfig,
          [key]: !currentValue,
        },
      };

      saveStoredRolePermissions(updated);
      setIsSaved(false);
      setTimeout(() => setIsSaved(true), 800);
      if (onPermissionsUpdated) onPermissionsUpdated();
      return updated;
    });

    showToast(`อัปเดตสิทธิ์ความปลอดภัยสำหรับ ${permissions[role].roleTitleTh.split(' ')[0]} แล้ว`);
  };

  const handleGatekeeperDeptToggle = (cat: GrievanceCategory) => {
    setPermissions((prev) => {
      const gkConfig = prev.gatekeeper;
      const currentDepts = gkConfig.assignedDepartments || [];
      const hasDept = currentDepts.includes(cat);
      const newDepts = hasDept
        ? currentDepts.filter((d) => d !== cat)
        : [...currentDepts, cat];

      const finalDepts = newDepts.length > 0 ? newDepts : ['IT' as GrievanceCategory];
      const isAllDepts = finalDepts.length === Object.keys(CATEGORY_DEFINITIONS).length;

      const updated = {
        ...prev,
        gatekeeper: {
          ...gkConfig,
          canViewAllDepartments: isAllDepts,
          assignedDepartments: finalDepts,
        },
      };

      saveStoredRolePermissions(updated);
      setIsSaved(false);
      setTimeout(() => setIsSaved(true), 800);
      if (onPermissionsUpdated) onPermissionsUpdated();
      return updated;
    });

    showToast(`อัปเดตขอบเขตหน่วยงาน Gatekeeper แล้ว`);
  };

  const handleSetGatekeeperViewDept = (cat: GrievanceCategory) => {
    setActiveGkDept(cat);
    setActiveGatekeeperDepartment(cat);
    showToast(`ตั้งค่าจำลองมุมมอง Gatekeeper ประจำฝ่าย: ${CATEGORY_DEFINITIONS[cat].nameTh.split('(')[0]}`);
    if (onPermissionsUpdated) onPermissionsUpdated();
  };

  const handleResetDefaults = () => {
    if (window.confirm('คุณต้องการรีเซ็ตสิทธิ์ของทุก Role กลับเป็นค่าเริ่มต้นตามนโยบายองค์กรใช่หรือไม่?')) {
      const defaults = resetRolePermissionsToDefault();
      setPermissions(defaults);
      showToast('รีเซ็ตสิทธิ์ RBAC กลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว');
      if (onPermissionsUpdated) onPermissionsUpdated();
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'employee':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'gatekeeper':
        return <Shield className="w-4 h-4 text-emerald-600" />;
      case 'executive':
        return <Crown className="w-4 h-4 text-purple-600" />;
      case 'admin':
        return <SlidersHorizontal className="w-4 h-4 text-rose-600" />;
    }
  };

  const getTabIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileText': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'ListChecks': return <ListChecks className="w-4 h-4 text-indigo-500" />;
      case 'GitBranch': return <GitBranch className="w-4 h-4 text-slate-500" />;
      case 'Shield': return <Shield className="w-4 h-4 text-emerald-500" />;
      case 'Crown': return <Crown className="w-4 h-4 text-purple-500" />;
      case 'Layers': return <Layers className="w-4 h-4 text-amber-500" />;
      case 'Users': return <Users className="w-4 h-4 text-teal-500" />;
      case 'SlidersHorizontal': return <SlidersHorizontal className="w-4 h-4 text-rose-500" />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const rolesList: UserRole[] = ['employee', 'gatekeeper', 'executive', 'admin'];

  return (
    <div className="max-w-7xl mx-auto py-4 px-4 space-y-5">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-medium animate-in fade-in">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner - Enterprise RBAC Control Center */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-rose-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 bg-rose-500/20 text-rose-300 rounded-xl backdrop-blur-xs border border-rose-400/30">
              <SlidersHorizontal className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              Role-Based Access Control (RBAC) & Governance Matrix
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/30 font-mono">
              HR ADMIN & EXECUTIVE PANEL
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            ระบบกำหนดสิทธิ์การมองเห็นหน้าจอและการเข้าถึงข้อมูลตามบทบาทหน้าที่ (พนักงานทั่วไป / Gatekeeper ประจำหน่วยงาน / ผู้บริหารระดับสูง / HR Admin) เพื่อความปลอดภัยของข้อมูลตามมาตรฐาน Whistleblower Protection Act, PDPA และ ISO 37002
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap">
          <a
            href="#executive-management-box"
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 border border-purple-400/40"
          >
            <Crown className="w-3.5 h-3.5 text-yellow-300" />
            <span>กล่องใส่/แก้ไขรายชื่อผู้บริหาร ({executives.length})</span>
          </a>

          <button
            type="button"
            id="btn-reset-rbac-defaults"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition flex items-center gap-1.5"
            title="รีเซ็ตสิทธิ์เป็นค่าเริ่มต้นตามนโยบายองค์กร"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
            <span>รีเซ็ตค่ามาตรฐาน</span>
          </button>
          
          <div className="px-3.5 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ระบบบันทึกอัตโนมัติ (Live Synced)</span>
          </div>
        </div>
      </div>

      {/* Role Quick Status Cards & Role Switcher Simulator */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {rolesList.map((roleKey) => {
          const config = permissions[roleKey];
          const isCurrent = currentRole === roleKey;
          const allowedCount = config.allowedTabs.length;

          return (
            <div
              key={roleKey}
              onClick={() => setSelectedRoleForDetail(roleKey)}
              className={`rounded-xl border p-4 transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedRoleForDetail === roleKey
                  ? 'bg-white border-rose-500 ring-2 ring-rose-400/30 shadow-md'
                  : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-xs'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${config.badgeColor}`}>
                      {getRoleIcon(roleKey)}
                    </div>
                    <span className="font-bold text-xs text-slate-900">
                      {config.roleTitleTh.split('(')[0]}
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      มุมมองปัจจุบัน
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {config.descriptionTh}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-600">
                  สิทธิ์เข้าถึง <strong className="text-slate-900 font-bold">{allowedCount}</strong> หน้าจอ
                </span>

                <button
                  type="button"
                  id={`btn-switch-role-to-${roleKey}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitchRole(roleKey);
                    showToast(`สลับจำลองมุมมองเป็น: ${config.roleTitleTh}`);
                  }}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>{isCurrent ? 'กำลังดู' : 'ทดสอบมุมมอง'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main RBAC Permission Matrix Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Header / Sub-banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-slate-100/60 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-rose-600" />
              <span>ตารางเมทริกซ์สิทธิ์การมองเห็นหน้าจอ (Screen Visibility Matrix)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนดว่าแต่ละบทบาทสามารถเข้าถึงและมองเห็นแท็บเมนูใดได้บ้างในระบบ โดยการเปลี่ยนแปลงจะมีผลทันที
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>ติ๊กถูกเพื่อเปิดสิทธิ์ / ติ๊กออกเพื่อปิดสิทธิ์</span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-2/5">หน้าจอ / ฟังก์ชันงาน (Module / Screen)</th>
                {rolesList.map((roleKey) => (
                  <th key={roleKey} className="py-3 px-3 text-center w-[15%]">
                    <div className="flex items-center justify-center gap-1 text-slate-800">
                      {getRoleIcon(roleKey)}
                      <span className="truncate">{permissions[roleKey].roleTitleTh.split('(')[0]}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {APP_TABS.map((tab) => {
                const isCoreTab = tab.category === 'core';
                return (
                  <tr key={tab.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 shrink-0 mt-0.5">
                          {getTabIcon(tab.iconName)}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {tab.nameTh}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                              ({tab.nameEn})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            {tab.descriptionTh}
                          </p>
                        </div>
                      </div>
                    </td>

                    {rolesList.map((roleKey) => {
                      const isAllowed = permissions[roleKey].allowedTabs.includes(tab.id);
                      const isLockedAdmin = roleKey === 'admin' && tab.id === 'rbac_management';

                      return (
                        <td key={roleKey} className="py-3 px-3 text-center align-middle">
                          <button
                            type="button"
                            id={`toggle-${roleKey}-${tab.id}`}
                            onClick={() => handleToggleTabPermission(roleKey, tab.id)}
                            disabled={isLockedAdmin}
                            title={isLockedAdmin ? 'HR Admin มีสิทธิ์ถาวรเพื่อป้องกันการล็อกระบบ' : `คลิกเพื่อเปิด/ปิดสิทธิ์ ${tab.nameTh} สำหรับ ${roleKey}`}
                            className={`w-9 h-9 rounded-xl inline-flex items-center justify-center transition-all shadow-xs ${
                              isAllowed
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            } ${isLockedAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {isAllowed ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <X className="w-4 h-4 stroke-[2.5]" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Matrix Bottom Note */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>เขียว = มีสิทธิ์เข้าถึง (Visible & Permitted)</span>
            <span className="mx-1">•</span>
            <X className="w-3.5 h-3.5 text-slate-400" />
            <span>เทา = ไม่มีสิทธิ์เข้าถึง (Hidden & Restricted)</span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            RBAC Protocol: Least Privilege Principle (PoLP)
          </div>
        </div>

      </div>

      {/* Special Security Rules & Gatekeeper Department Scoping */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Gatekeeper Department Scope Setting */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                  ขอบเขตหน่วยงานประจำตัว Gatekeeper (Departmental Scoping)
                </h3>
                <p className="text-[11px] text-slate-500">
                  กำหนดว่าผู้ประสานงาน (Gatekeeper) สามารถมองเห็นและจัดการคำร้องของฝ่ายงานใดบ้าง
                </p>
              </div>
            </div>
          </div>

          {/* Department Selection Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">หน่วยงานที่อนุญาตให้ Gatekeeper เข้าถึงได้:</span>
              <span className="text-[11px] text-emerald-700 font-medium">
                เลือกแล้ว {(permissions.gatekeeper.assignedDepartments || []).length} / 9 หน่วยงาน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[]).map((cat) => {
                const info = CATEGORY_DEFINITIONS[cat];
                const isAssigned = (permissions.gatekeeper.assignedDepartments || []).includes(cat);
                const isCurrentlyActiveView = activeGkDept === cat;

                return (
                  <div
                    key={cat}
                    onClick={() => handleGatekeeperDeptToggle(cat)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                      isAssigned
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">
                          {cat}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">
                          {info.nameTh.split('(')[0]}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {gatekeeperConfigs[cat]?.leadOfficer?.name || 'Lead Officer'}
                      </span>
                    </div>

                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                      isAssigned ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct Simulator for Gatekeeper Role (No Filter Needed) */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-2xs shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-900 block">
                  จำลองเข้าปฏิบัติงานในฐานะ Gatekeeper ประจำฝ่าย
                </span>
                <span className="text-[11px] text-slate-600">
                  สลับบทบาทเป็น Gatekeeper และเปิดศูนย์คัดกรองงาน (Triage Hub) ได้ทันที
                </span>
              </div>
            </div>

            <button
              type="button"
              id="btn-simulate-gatekeeper-direct"
              onClick={() => {
                onSwitchRole('gatekeeper');
                onNavigateTab('gatekeeper');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
            >
              <span>เข้าสู่โหมด Gatekeeper</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick link to Executive & HR Admin Management Directory */}
          <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-rose-50 rounded-xl border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Crown className="w-3.5 h-3.5 text-purple-600" />
                <span>การ Maintain รายชื่อผู้บริหาร และ HR Admin / Gatekeeper</span>
              </div>
              <p className="text-[11px] text-slate-600">
                เพิ่ม/แก้ไขรายชื่อคณะผู้บริหาร (CEO/EVP), สิทธิ์รับข้อร้องเรียนสายตรง Whistleblower, บัญชี HR Admin และผู้รับผิดชอบ 9 ฝ่ายงาน
              </p>
            </div>

            <button
              type="button"
              id="btn-goto-personnel-directory"
              onClick={() => onNavigateTab('admin_gatekeeper')}
              className="px-3.5 py-1.5 bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <Users className="w-3.5 h-3.5 text-indigo-300" />
              <span>เปิดศูนย์จัดการรายชื่อบุคลากร</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>

        </div>

        {/* Security & Confidentiality Privileges Table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                  สิทธิ์เชิงลึกด้านความมั่นคงปลอดภัย (Security & Compliance Privileges)
                </h3>
                <p className="text-[11px] text-slate-500">
                  การควบคุมสิทธิ์ดูข้อมูลอ่อนไหว (Confidentiality) และการแก้ไขมาตรการ CAPA
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            
            {/* Privilege 1: Direct CEO Whistleblower View */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-purple-600" />
                  <span className="font-bold text-xs text-slate-900">
                    เข้าถึงกล่องข้อร้องเรียนสายตรง CEO/EVP (Whistleblower Escalation)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  เห็นข้อร้องเรียนร้ายแรงที่ยื่นส่งตรงถึงผู้บริหารระดับสูงเพื่อการตรวจสอบอิสระ
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {rolesList.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleToggleSpecialPermission(r, 'canViewDirectCeoTickets')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                      permissions[r].canViewDirectCeoTickets
                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                    title={`${r}: ${permissions[r].canViewDirectCeoTickets ? 'มีสิทธิ์' : 'ไม่มีสิทธิ์'}`}
                  >
                    {r === 'employee' ? 'พนักงาน' : r === 'gatekeeper' ? 'GK' : r === 'executive' ? 'ผู้บริหาร' : 'Admin'}
                  </button>
                ))}
              </div>
            </div>

            {/* Privilege 2: Confidential Identity Disclosure */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-bold text-xs text-slate-900">
                    ดูตัวตนผู้ร้องเรียนกรณีจำกัดสิทธิ์ (Confidential Restricted)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  สิทธิ์ปลดล็อกดูชื่อและเบอร์ติดต่อผู้ยื่นเพื่อประสานงานคุ้มครองพยาน (เฉพาะ HR Admin / GRC)
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {rolesList.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleToggleSpecialPermission(r, 'canViewConfidentialIdentities')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                      permissions[r].canViewConfidentialIdentities
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                    title={`${r}: ${permissions[r].canViewConfidentialIdentities ? 'มีสิทธิ์' : 'ไม่มีสิทธิ์'}`}
                  >
                    {r === 'employee' ? 'พนักงาน' : r === 'gatekeeper' ? 'GK' : r === 'executive' ? 'ผู้บริหาร' : 'Admin'}
                  </button>
                ))}
              </div>
            </div>

            {/* Privilege 3: Root Cause & CAPA Edit */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-bold text-xs text-slate-900">
                    บันทึกสาเหตุเชิงลึก & แผนป้องกัน CAPA
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  สามารถระบุ Root Cause Category และบันทึกมาตรการป้องกันเชิงโครงสร้าง
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {rolesList.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleToggleSpecialPermission(r, 'canEditRootCauseAndCapa')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                      permissions[r].canEditRootCauseAndCapa
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                    title={`${r}: ${permissions[r].canEditRootCauseAndCapa ? 'มีสิทธิ์' : 'ไม่มีสิทธิ์'}`}
                  >
                    {r === 'employee' ? 'พนักงาน' : r === 'gatekeeper' ? 'GK' : r === 'executive' ? 'ผู้บริหาร' : 'Admin'}
                  </button>
                ))}
              </div>
            </div>

            {/* Privilege 4: Department Officers Setup */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  <span className="font-bold text-xs text-slate-900">
                    จัดการแต่งตั้ง Gatekeeper & กำหนด SLA
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  สิทธิ์แต่งตั้ง Lead Officer และกำหนดระยะเวลา SLA ใน 9 หมวดหมู่
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {rolesList.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleToggleSpecialPermission(r, 'canManageGatekeeperOfficers')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border transition ${
                      permissions[r].canManageGatekeeperOfficers
                        ? 'bg-teal-100 text-teal-800 border-teal-300'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                    title={`${r}: ${permissions[r].canManageGatekeeperOfficers ? 'มีสิทธิ์' : 'ไม่มีสิทธิ์'}`}
                  >
                    {r === 'employee' ? 'พนักงาน' : r === 'gatekeeper' ? 'GK' : r === 'executive' ? 'ผู้บริหาร' : 'Admin'}
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              มาตรฐาน PDPA และ Whistleblower Protection Act
            </span>
            <span className="text-emerald-700 font-semibold">Audit Logging Enabled</span>
          </div>

        </div>

      </div>

      {/* DEDICATED EXECUTIVE MANAGEMENT DIRECTORY BOX (กล่องใส่/แก้ไขรายชื่อคณะผู้บริหารโดยตรง) */}
      <div className="bg-white rounded-2xl border-2 border-purple-300/80 p-5 sm:p-6 shadow-sm space-y-5" id="executive-management-box">
        
        {/* Box Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-xl shadow-xs">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  ทำเนียบและศูนย์จัดการรายชื่อคณะผู้บริหาร (Executive Roster & Whistleblower Direct Channel)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {executives.length} ท่าน
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                เพิ่ม/แก้ไขรายชื่อผู้บริหารระดับสูง (CEO/EVP/ประธานกรรมการ) เพื่อรับเรื่องร้องเรียนสายตรง หรือสิทธิ์เข้าถึงข้อเท็จจริงลับเฉพาะ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-toggle-add-exec-form"
              onClick={() => {
                if (isAddingExec) {
                  setIsAddingExec(false);
                  setEditingExecId(null);
                } else {
                  setEditingExecId(null);
                  setExecName('');
                  setExecPosition('');
                  setExecDepartment('');
                  setExecEmail('');
                  setExecPhone('');
                  setExecRoleType('CEO');
                  setExecIsWhistleblower(true);
                  setExecCanViewConfidential(true);
                  setIsAddingExec(true);
                }
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs ${
                isAddingExec
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isAddingExec ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>ปิดฟอร์ม</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ เพิ่มผู้บริหารใหม่</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('admin_gatekeeper')}
              className="px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition flex items-center gap-1"
            >
              <span>เปิดศูนย์บุคลากรเต็มรูปแบบ</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Add / Edit Form Panel */}
        {isAddingExec && (
          <form onSubmit={handleSaveExecSubmit} className="bg-purple-50/50 rounded-xl p-4 border border-purple-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-purple-600" />
                {editingExecId ? 'แก้ไขข้อมูลผู้บริหาร' : 'เพิ่มรายชื่อผู้บริหารระดับสูงใหม่'}
              </span>
              <span className="text-[11px] text-purple-700 font-medium">
                * ระบุชื่อ-นามสกุล และอีเมลเพื่อรับการแจ้งเตือน
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณประเสริฐ อัครเดชานนท์"
                  value={execName}
                  onChange={(e) => setExecName(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ตำแหน่งบริหาร <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Chief Executive Officer (CEO)"
                  value={execPosition}
                  onChange={(e) => setExecPosition(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ประเภทบทบาท (Role Level)
                </label>
                <select
                  value={execRoleType}
                  onChange={(e) => setExecRoleType(e.target.value as ExecutiveMember['roleType'])}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="CEO">CEO (ประธานเจ้าหน้าที่บริหาร)</option>
                  <option value="EVP">EVP (รองกรรมการผู้จัดการใหญ่)</option>
                  <option value="GRC_Chair">ประธานคณะกรรมการบรรษัทภิบาล</option>
                  <option value="Audit_Committee">คณะกรรมการตรวจสอบ (Audit Committee)</option>
                  <option value="Board_Member">กรรมการบริษัท (Board Member)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  สังกัด / ฝ่ายงาน
                </label>
                <input
                  type="text"
                  placeholder="เช่น สำนักประธานเจ้าหน้าที่บริหาร"
                  value={execDepartment}
                  onChange={(e) => setExecDepartment(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  อีเมลองค์กร <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="executive@enterprise.co.th"
                  value={execEmail}
                  onChange={(e) => setExecEmail(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ติดต่อภายใน
                </label>
                <input
                  type="text"
                  placeholder="เช่น 02-998-1001 หรือต่อ 101"
                  value={execPhone}
                  onChange={(e) => setExecPhone(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Special Privileges Checkboxes */}
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={execIsWhistleblower}
                  onChange={(e) => setExecIsWhistleblower(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <span>รับข้อร้องเรียนส่งตรง (Whistleblower Direct Receiver)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={execCanViewConfidential}
                  onChange={(e) => setExecCanViewConfidential(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <span>สิทธิ์เปิดดูตัวตนกรณีลับเฉพาะ (Confidential Disclosure)</span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-200/80">
              <button
                type="button"
                onClick={() => {
                  setIsAddingExec(false);
                  setEditingExecId(null);
                }}
                className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                id="btn-save-exec-in-box"
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingExecId ? 'บันทึกการแก้ไข' : 'บันทึกรายชื่อผู้บริหาร'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Executive Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {executives.map((exec) => {
            const isActive = exec.status === 'active';

            return (
              <div
                key={exec.id}
                className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                  isActive
                    ? 'bg-gradient-to-b from-white to-purple-50/20 border-purple-200/90 shadow-2xs hover:shadow-xs'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {exec.name}
                        </h4>
                        <span className="text-[10px] text-purple-700 font-semibold block truncate">
                          {exec.position}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5 text-slate-500 truncate">
                      <Building className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{exec.department}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 truncate font-mono">
                      <Mail className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="truncate">{exec.email}</span>
                    </div>

                    {exec.phone && (
                      <div className="flex items-center gap-1.5 text-slate-500 truncate">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{exec.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges for Whistleblower & Confidential Privileges */}
                  <div className="flex flex-wrap gap-1 pt-1.5">
                    {exec.isPrimaryWhistleblowerReceiver && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5 text-amber-600" />
                        Whistleblower Receiver
                      </span>
                    )}

                    {exec.canViewConfidentialIdentities && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5 text-purple-600" />
                        Confidential Access
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="mt-3 pt-2 border-t border-purple-100/80 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleExecStatus(exec.id)}
                    className="text-[10px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    {isActive ? 'พักสถานะ' : 'เปิดใช้งาน'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartEditExec(exec)}
                      className="p-1 text-slate-500 hover:text-purple-700 rounded hover:bg-purple-50 transition"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteExec(exec.id, exec.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                      title="ลบรายชื่อ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};