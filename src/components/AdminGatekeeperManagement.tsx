'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  Users, 
  UserPlus, 
  UserCheck, 
  Crown, 
  Trash2, 
  Clock, 
  Mail, 
  Phone, 
  Briefcase, 
  Building, 
  CheckCircle2, 
  AlertTriangle, 
  Settings2, 
  Sliders, 
  Layers, 
  Sparkles, 
  Zap, 
  Info, 
  ChevronRight, 
  User, 
  Plus,
  SlidersHorizontal,
  Lock,
  Eye,
  Bell,
  Check,
  X,
  Edit2,
  RotateCcw,
  Search,
  Filter
} from 'lucide-react';
import { 
  ComplaintTicket, 
  DepartmentGatekeeperConfig, 
  GatekeeperOfficer, 
  ExecutiveMember,
  HrAdminMember,
  GrievanceCategory 
} from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { 
  getStoredGatekeeperConfigs, 
  updateDepartmentGatekeeperConfig, 
  resetGatekeeperConfigsToDefault,
  getStoredExecutives,
  addExecutiveMember,
  updateExecutiveMember,
  deleteExecutiveMember,
  resetExecutivesToDefault,
  getStoredHrAdmins,
  addHrAdminMember,
  updateHrAdminMember,
  deleteHrAdminMember,
  resetHrAdminsToDefault
} from '../services/api';

interface AdminGatekeeperManagementProps {
  tickets?: ComplaintTicket[];
}

type ManagementSubTab = 'gatekeepers' | 'executives' | 'hr_admins';

export const AdminGatekeeperManagement: React.FC<AdminGatekeeperManagementProps> = ({ tickets = [] }) => {
  const [activeSubTab, setActiveSubTab] = useState<ManagementSubTab>('gatekeepers');
  
  // Gatekeeper states
  const [configs, setConfigs] = useState<Record<GrievanceCategory, DepartmentGatekeeperConfig>>(() => getStoredGatekeeperConfigs());
  const [selectedCategory, setSelectedCategory] = useState<GrievanceCategory>('HR');
  const [isAddingOfficer, setIsAddingOfficer] = useState(false);
  const [newOfficerName, setNewOfficerName] = useState('');
  const [newOfficerEmail, setNewOfficerEmail] = useState('');
  const [newOfficerRole, setNewOfficerRole] = useState('');
  const [newOfficerPhone, setNewOfficerPhone] = useState('');

  // Executive states
  const [executives, setExecutives] = useState<ExecutiveMember[]>(() => getStoredExecutives());
  const [execSearch, setExecSearch] = useState('');
  const [isAddingExec, setIsAddingExec] = useState(false);
  const [editingExecId, setEditingExecId] = useState<string | null>(null);
  const [execName, setExecName] = useState('');
  const [execPosition, setExecPosition] = useState('');
  const [execDepartment, setExecDepartment] = useState('');
  const [execEmail, setExecEmail] = useState('');
  const [execPhone, setExecPhone] = useState('');
  const [execRoleType, setExecRoleType] = useState<ExecutiveMember['roleType']>('EVP');
  const [execIsWhistleblower, setExecIsWhistleblower] = useState(true);
  const [execCanViewConfidential, setExecCanViewConfidential] = useState(false);
  const [execReceiveAlerts, setExecReceiveAlerts] = useState(true);
  const [execCommittees, setExecCommittees] = useState('');

  // HR Admin states
  const [hrAdmins, setHrAdmins] = useState<HrAdminMember[]>(() => getStoredHrAdmins());
  const [adminSearch, setAdminSearch] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('');
  const [adminPosition, setAdminPosition] = useState('');
  const [adminDepartment, setAdminDepartment] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminRoleLevel, setAdminRoleLevel] = useState<HrAdminMember['roleLevel']>('hr_manager');
  const [adminCanManageRbac, setAdminCanManageRbac] = useState(true);
  const [adminCanManageGatekeepers, setAdminCanManageGatekeepers] = useState(true);
  const [adminCanManageExecutives, setAdminCanManageExecutives] = useState(false);
  const [adminReceiveAlerts, setAdminReceiveAlerts] = useState(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentConfig = configs[selectedCategory];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --- Gatekeeper Handlers ---
  const handleUpdateConfig = (updates: Partial<DepartmentGatekeeperConfig>) => {
    const updated = updateDepartmentGatekeeperConfig(selectedCategory, updates);
    setConfigs(updated);
    showToast(`บันทึกการตั้งค่า Gatekeeper หน่วยงาน ${selectedCategory} เรียบร้อยแล้ว`);
  };

  const handleSetLeadOfficer = (officer: GatekeeperOfficer) => {
    const updatedOfficers = currentConfig.officers.map((o) => ({
      ...o,
      isLead: o.id === officer.id,
    }));
    handleUpdateConfig({
      leadOfficer: { ...officer, isLead: true },
      officers: updatedOfficers,
    });
    showToast(`แต่งตั้งให้คุณ "${officer.name}" เป็น Lead Gatekeeper ของหน่วยงาน`);
  };

  const handleRemoveOfficer = (officerId: string) => {
    if (currentConfig.officers.length <= 1) {
      alert('แต่ละหน่วยงานต้องมีเจ้าหน้าที่ Gatekeeper อย่างน้อย 1 ท่าน');
      return;
    }
    const target = currentConfig.officers.find((o) => o.id === officerId);
    if (target?.isLead) {
      alert('ไม่สามารถลบ Lead Gatekeeper ได้ กรุณาแต่งตั้งเจ้าหน้าที่ท่านอื่นเป็น Lead ก่อนทำการลบ');
      return;
    }

    const updatedOfficers = currentConfig.officers.filter((o) => o.id !== officerId);
    handleUpdateConfig({ officers: updatedOfficers });
    showToast(`ลบเจ้าหน้าที่ออกจากรายชื่อ Gatekeeper เรียบร้อยแล้ว`);
  };

  const handleAddOfficerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficerName.trim() || !newOfficerEmail.trim()) {
      alert('กรุณากรอกชื่อและอีเมลของเจ้าหน้าที่');
      return;
    }

    const newOfficer: GatekeeperOfficer = {
      id: `usr-${selectedCategory.toLowerCase()}-${Date.now()}`,
      name: newOfficerName.trim(),
      email: newOfficerEmail.trim(),
      roleTitle: newOfficerRole.trim() || 'Gatekeeper Specialist',
      phone: newOfficerPhone.trim() || '02-555-0000',
      isLead: false,
    };

    const updatedOfficers = [...currentConfig.officers, newOfficer];
    handleUpdateConfig({ officers: updatedOfficers });
    
    // Reset Form
    setNewOfficerName('');
    setNewOfficerEmail('');
    setNewOfficerRole('');
    setNewOfficerPhone('');
    setIsAddingOfficer(false);
    showToast(`เพิ่มคุณ "${newOfficer.name}" เป็น Gatekeeper ประจำหน่วยงานเรียบร้อยแล้ว`);
  };

  const handleResetGatekeepersToDefaults = () => {
    if (confirm('คุณต้องการรีเซ็ตรายชื่อ Gatekeeper ของทุกหน่วยงานกลับเป็นค่าเริ่มต้นขององค์กรใช่หรือไม่?')) {
      const defs = resetGatekeeperConfigsToDefault();
      setConfigs(defs);
      showToast('รีเซ็ตรายชื่อ Gatekeeper ทุกหน่วยงานเป็นค่าเริ่มต้นแล้ว');
    }
  };

  // --- Executive Handlers ---
  const handleSaveExecutive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!execName.trim() || !execEmail.trim() || !execPosition.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุล, ตำแหน่ง และอีเมลของผู้บริหาร');
      return;
    }

    const committeeArray = execCommittees
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    if (editingExecId) {
      const updated = updateExecutiveMember(editingExecId, {
        name: execName.trim(),
        position: execPosition.trim(),
        department: execDepartment.trim() || 'Executive Committee',
        email: execEmail.trim(),
        phone: execPhone.trim() || '02-998-1000',
        roleType: execRoleType,
        isPrimaryWhistleblowerReceiver: execIsWhistleblower,
        canViewConfidentialIdentities: execCanViewConfidential,
        receiveAlertNotifications: execReceiveAlerts,
        assignedCommittees: committeeArray.length > 0 ? committeeArray : ['คณะกรรมการบริหารระดับสูง (ExCom)'],
      });
      setExecutives(updated);
      showToast(`อัปเดตข้อมูลผู้บริหาร "${execName}" เรียบร้อยแล้ว`);
    } else {
      const updated = addExecutiveMember({
        name: execName.trim(),
        position: execPosition.trim(),
        department: execDepartment.trim() || 'Executive Committee',
        email: execEmail.trim(),
        phone: execPhone.trim() || '02-998-1000',
        roleType: execRoleType,
        isPrimaryWhistleblowerReceiver: execIsWhistleblower,
        canViewConfidentialIdentities: execCanViewConfidential,
        receiveAlertNotifications: execReceiveAlerts,
        assignedCommittees: committeeArray.length > 0 ? committeeArray : ['คณะกรรมการบริหารระดับสูง (ExCom)'],
        status: 'active',
      });
      setExecutives(updated);
      showToast(`เพิ่มผู้บริหาร "${execName}" ในบัญชีรายชื่อเรียบร้อยแล้ว`);
    }

    // Clear form
    setIsAddingExec(false);
    setEditingExecId(null);
    setExecName('');
    setExecPosition('');
    setExecDepartment('');
    setExecEmail('');
    setExecPhone('');
    setExecCommittees('');
  };

  const handleEditExecClick = (exec: ExecutiveMember) => {
    setEditingExecId(exec.id);
    setExecName(exec.name);
    setExecPosition(exec.position);
    setExecDepartment(exec.department);
    setExecEmail(exec.email);
    setExecPhone(exec.phone || '');
    setExecRoleType(exec.roleType);
    setExecIsWhistleblower(exec.isPrimaryWhistleblowerReceiver);
    setExecCanViewConfidential(exec.canViewConfidentialIdentities);
    setExecReceiveAlerts(exec.receiveAlertNotifications);
    setExecCommittees(exec.assignedCommittees.join(', '));
    setIsAddingExec(true);
  };

  const handleToggleExecStatus = (exec: ExecutiveMember) => {
    const newStatus = exec.status === 'active' ? 'inactive' : 'active';
    const updated = updateExecutiveMember(exec.id, { status: newStatus });
    setExecutives(updated);
    showToast(`เปลี่ยนสถานะผู้บริหารเป็น ${newStatus === 'active' ? 'พร้อมปฏิบัติงาน (Active)' : 'พักสถานะ (Inactive)'}`);
  };

  const handleDeleteExec = (id: string, name: string) => {
    if (confirm(`คุณต้องการลบรายชื่อผู้บริหาร "${name}" ออกจากระบบใช่หรือไม่?`)) {
      const updated = deleteExecutiveMember(id);
      setExecutives(updated);
      showToast(`ลบรายชื่อผู้บริหารเรียบร้อยแล้ว`);
    }
  };

  const handleResetExecsToDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตรายชื่อคณะผู้บริหารกลับเป็นค่าเริ่มต้นใช่หรือไม่?')) {
      const defs = resetExecutivesToDefault();
      setExecutives(defs);
      showToast('รีเซ็ตรายชื่อคณะผู้บริหารเป็นค่าเริ่มต้นเรียบร้อยแล้ว');
    }
  };

  // --- HR Admin Handlers ---
  const handleSaveHrAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminPosition.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุล, ตำแหน่ง และอีเมลของ HR Admin');
      return;
    }

    if (editingAdminId) {
      const updated = updateHrAdminMember(editingAdminId, {
        name: adminName.trim(),
        position: adminPosition.trim(),
        department: adminDepartment.trim() || 'People & Culture Group',
        email: adminEmail.trim(),
        phone: adminPhone.trim() || '02-998-2000',
        roleLevel: adminRoleLevel,
        canManageRbac: adminCanManageRbac,
        canManageGatekeepers: adminCanManageGatekeepers,
        canManageExecutives: adminCanManageExecutives,
        receiveSystemAlerts: adminReceiveAlerts,
      });
      setHrAdmins(updated);
      showToast(`อัปเดตข้อมูล HR Admin "${adminName}" เรียบร้อยแล้ว`);
    } else {
      const updated = addHrAdminMember({
        name: adminName.trim(),
        position: adminPosition.trim(),
        department: adminDepartment.trim() || 'People & Culture Group',
        email: adminEmail.trim(),
        phone: adminPhone.trim() || '02-998-2000',
        roleLevel: adminRoleLevel,
        canManageRbac: adminCanManageRbac,
        canManageGatekeepers: adminCanManageGatekeepers,
        canManageExecutives: adminCanManageExecutives,
        receiveSystemAlerts: adminReceiveAlerts,
        status: 'active',
      });
      setHrAdmins(updated);
      showToast(`เพิ่มเจ้าหน้าที่ HR Admin "${adminName}" เรียบร้อยแล้ว`);
    }

    // Clear form
    setIsAddingAdmin(false);
    setEditingAdminId(null);
    setAdminName('');
    setAdminPosition('');
    setAdminDepartment('');
    setAdminEmail('');
    setAdminPhone('');
  };

  const handleEditAdminClick = (admin: HrAdminMember) => {
    setEditingAdminId(admin.id);
    setAdminName(admin.name);
    setAdminPosition(admin.position);
    setAdminDepartment(admin.department);
    setAdminEmail(admin.email);
    setAdminPhone(admin.phone || '');
    setAdminRoleLevel(admin.roleLevel);
    setAdminCanManageRbac(admin.canManageRbac);
    setAdminCanManageGatekeepers(admin.canManageGatekeepers);
    setAdminCanManageExecutives(admin.canManageExecutives);
    setAdminReceiveAlerts(admin.receiveSystemAlerts);
    setIsAddingAdmin(true);
  };

  const handleToggleAdminStatus = (admin: HrAdminMember) => {
    const newStatus = admin.status === 'active' ? 'inactive' : 'active';
    const updated = updateHrAdminMember(admin.id, { status: newStatus });
    setHrAdmins(updated);
    showToast(`เปลี่ยนสถานะเจ้าหน้าที่เป็น ${newStatus === 'active' ? 'พร้อมปฏิบัติงาน (Active)' : 'พักสถานะ (Inactive)'}`);
  };

  const handleDeleteAdmin = (id: string, name: string) => {
    if (confirm(`คุณต้องการลบรายชื่อเจ้าหน้าที่ HR Admin "${name}" ออกจากระบบใช่หรือไม่?`)) {
      const updated = deleteHrAdminMember(id);
      setHrAdmins(updated);
      showToast(`ลบรายชื่อเจ้าหน้าที่ HR Admin เรียบร้อยแล้ว`);
    }
  };

  const handleResetAdminsToDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตรายชื่อเจ้าหน้าที่ HR Admin กลับเป็นค่าเริ่มต้นใช่หรือไม่?')) {
      const defs = resetHrAdminsToDefault();
      setHrAdmins(defs);
      showToast('รีเซ็ตรายชื่อ HR Admin เป็นค่าเริ่มต้นเรียบร้อยแล้ว');
    }
  };

  // Stats calculation
  const categoryKeys = Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[];
  const totalOfficersCount = categoryKeys.reduce((acc, cat) => acc + (configs[cat]?.officers?.length || 0), 0);
  const currentDeptTicketsCount = tickets.filter((t) => t.category === selectedCategory).length;
  const currentDeptPendingCount = tickets.filter((t) => t.category === selectedCategory && t.status === 'submitted').length;

  const filteredExecutives = executives.filter((ex) => 
    ex.name.toLowerCase().includes(execSearch.toLowerCase()) ||
    ex.position.toLowerCase().includes(execSearch.toLowerCase()) ||
    ex.department.toLowerCase().includes(execSearch.toLowerCase()) ||
    ex.email.toLowerCase().includes(execSearch.toLowerCase())
  );

  const filteredAdmins = hrAdmins.filter((ad) => 
    ad.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
    ad.position.toLowerCase().includes(adminSearch.toLowerCase()) ||
    ad.department.toLowerCase().includes(adminSearch.toLowerCase()) ||
    ad.email.toLowerCase().includes(adminSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-xs text-indigo-300 font-semibold tracking-wider uppercase mb-1">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>ศูนย์บริหารจัดการโครงสร้างบุคลากรและสิทธิ์ (Personnel & Governance Directory)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              จัดการผู้บริหารระดับสูง, HR Admin & Gatekeeper ประจำฝ่าย
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              จุดศูนย์กลางสำหรับ HR Admin และตัวแทนผู้บริหารในการ Maintain รายชื่อคณะผู้บริหาร (CEO/EVP Whistleblower Channel), เจ้าหน้าที่ HR Admin & GRC และผู้รับผิดชอบ Gatekeeper ทั้ง 9 หน่วยงาน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3.5 py-2 bg-white/10 backdrop-blur rounded-xl border border-white/15 text-center">
              <span className="text-[11px] text-slate-300 block">ผู้บริหาร (Executives)</span>
              <span className="text-lg font-bold text-purple-300">{executives.length} ท่าน</span>
            </div>
            <div className="px-3.5 py-2 bg-white/10 backdrop-blur rounded-xl border border-white/15 text-center">
              <span className="text-[11px] text-slate-300 block">HR Admins</span>
              <span className="text-lg font-bold text-rose-300">{hrAdmins.length} ท่าน</span>
            </div>
            <div className="px-3.5 py-2 bg-white/10 backdrop-blur rounded-xl border border-white/15 text-center">
              <span className="text-[11px] text-slate-300 block">Gatekeepers (9 ฝ่าย)</span>
              <span className="text-lg font-bold text-indigo-300">{totalOfficersCount} ท่าน</span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Switcher */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
          <button
            type="button"
            id="subtab-gatekeepers"
            onClick={() => setActiveSubTab('gatekeepers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'gatekeepers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>1. Gatekeeper ประจำ 9 ฝ่ายงาน ({totalOfficersCount})</span>
          </button>

          <button
            type="button"
            id="subtab-executives"
            onClick={() => setActiveSubTab('executives')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'executives'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>2. คณะผู้บริหารระดับสูง & CEO Direct ({executives.length})</span>
          </button>

          <button
            type="button"
            id="subtab-hr-admins"
            onClick={() => setActiveSubTab('hr_admins')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'hr_admins'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>3. ทีมงาน HR Admin & GRC Operator ({hrAdmins.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: GATEKEEPERS MANAGEMENT                                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'gatekeepers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Left Column: 9 Categories List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span>เลือกหน่วยงาน (9 หมวดหมู่)</span>
                </h3>
                <button
                  type="button"
                  id="btn-reset-gatekeepers"
                  onClick={handleResetGatekeepersToDefaults}
                  className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium transition"
                  title="รีเซ็ตเป็นค่าเริ่มต้น"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>รีเซ็ตค่าเดิม</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {categoryKeys.map((catKey) => {
                  const catDef = CATEGORY_DEFINITIONS[catKey];
                  const cfg = configs[catKey];
                  const isSelected = selectedCategory === catKey;
                  const officerCount = cfg?.officers?.length || 1;
                  const deptTickets = tickets.filter((t) => t.category === catKey).length;

                  return (
                    <button
                      key={catKey}
                      type="button"
                      id={`btn-select-dept-${catKey.toLowerCase()}`}
                      onClick={() => {
                        setSelectedCategory(catKey);
                        setIsAddingOfficer(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {catKey.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <span>{catDef.nameTh}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[170px] sm:max-w-[200px]">
                            {cfg?.leadOfficer?.name ? `Lead: ${cfg.leadOfficer.name}` : catDef.responsibleDept}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {officerCount} ท่าน
                        </span>
                        <ChevronRight className={`w-4 h-4 transition ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-400'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Selected Department Details & Officers List */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Department Summary & SLA Settings Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      หมวด {selectedCategory}
                    </span>
                    <h2 className="text-base font-bold text-slate-900">
                      {CATEGORY_DEFINITIONS[selectedCategory].nameTh}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    หน่วยงานผู้รับผิดชอบหลัก: <span className="font-medium text-slate-700">{currentConfig.departmentName}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">เคสทั้งหมดในฝ่าย</div>
                    <div className="text-sm font-bold text-slate-900">{currentDeptTicketsCount} เคส ({currentDeptPendingCount} รอดำเนินการ)</div>
                  </div>
                </div>
              </div>

              {/* SLA & Auto-Assign Settings Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>เกณฑ์เวลาแก้ไขมาตรฐาน (SLA Target Hours)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="input-sla-hours"
                      min="1"
                      max="720"
                      value={currentConfig.defaultSlaHours}
                      onChange={(e) => handleUpdateConfig({ defaultSlaHours: parseInt(e.target.value) || 24 })}
                      className="w-24 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                    />
                    <span className="text-xs text-slate-500">ชั่วโมง ({Math.round((currentConfig.defaultSlaHours / 24) * 10) / 10} วันทำการ)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>รูปแบบการจ่ายงานอัตโนมัติ (Auto-Assign Mode)</span>
                  </label>
                  <select
                    id="select-auto-assign-mode"
                    value={currentConfig.autoAssignMode}
                    onChange={(e) => handleUpdateConfig({ autoAssignMode: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                  >
                    <option value="lead_manual">จ่ายให้ Lead คัดกรองก่อนเสมอ (แนะนำ)</option>
                    <option value="round_robin">จ่ายวนตามลำดับเจ้าหน้าที่ (Round-Robin)</option>
                    <option value="workload_balanced">จ่ายตามภาระงานคงค้าง (Workload Balanced)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Officers Roster Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>รายชื่อ Gatekeeper ผู้ปฏิบัติงาน ({currentConfig.officers.length} ท่าน)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เจ้าหน้าที่ที่มีสิทธิ์รับแจ้งเตือน และเปิดดูข้อมูลเคสของฝ่าย {selectedCategory}
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-add-gatekeeper-toggle"
                  onClick={() => setIsAddingOfficer(!isAddingOfficer)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isAddingOfficer ? 'ยกเลิก' : 'เพิ่ม Gatekeeper'}</span>
                </button>
              </div>

              {/* Add Officer Inline Form */}
              {isAddingOfficer && (
                <form onSubmit={handleAddOfficerSubmit} className="p-4 bg-indigo-50/50 border-b border-indigo-100 space-y-3 animate-in fade-in">
                  <div className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>กรอกข้อมูลเจ้าหน้าที่ Gatekeeper ท่านใหม่</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">ชื่อ - นามสกุล *</label>
                      <input
                        type="text"
                        id="input-new-officer-name"
                        placeholder="เช่น คุณกิตติศักดิ์ ชัยชนะ"
                        value={newOfficerName}
                        onChange={(e) => setNewOfficerName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">อีเมลทางการองค์กร *</label>
                      <input
                        type="email"
                        id="input-new-officer-email"
                        placeholder="เช่น kittisak.c@company.internal"
                        value={newOfficerEmail}
                        onChange={(e) => setNewOfficerEmail(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">ตำแหน่งงาน / ความเชี่ยวชาญ</label>
                      <input
                        type="text"
                        id="input-new-officer-role"
                        placeholder="เช่น Senior Network Engineer"
                        value={newOfficerRole}
                        onChange={(e) => setNewOfficerRole(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อภายใน</label>
                      <input
                        type="text"
                        id="input-new-officer-phone"
                        placeholder="เช่น 02-555-4011 หรือ ต่อ 1804"
                        value={newOfficerPhone}
                        onChange={(e) => setNewOfficerPhone(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingOfficer(false)}
                      className="px-3 py-1.5 bg-white text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium border border-slate-200"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      id="btn-submit-new-officer"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      บันทึก Gatekeeper
                    </button>
                  </div>
                </form>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">เจ้าหน้าที่ / อีเมล</th>
                      <th className="py-2.5 px-4 hidden sm:table-cell">ตำแหน่ง</th>
                      <th className="py-2.5 px-4 hidden md:table-cell">เบอร์ติดต่อ</th>
                      <th className="py-2.5 px-4 text-center">บทบาท (Lead)</th>
                      <th className="py-2.5 px-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentConfig.officers.map((officer) => {
                      const isLead = officer.isLead || currentConfig.leadOfficer?.id === officer.id;
                      return (
                        <tr key={officer.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                isLead ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {officer.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{officer.name}</span>
                                  {isLead && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded border border-amber-200">
                                      <Crown className="w-3 h-3 text-amber-600" />
                                      <span>LEAD</span>
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {officer.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 hidden sm:table-cell">
                            <div className="text-slate-700 font-medium">
                              {officer.roleTitle}
                            </div>
                          </td>

                          <td className="py-3 px-4 hidden md:table-cell">
                            <div className="text-slate-600 text-[11px] flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{officer.phone || '-'}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            {isLead ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                <span>ผู้รับผิดชอบหลัก</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                id={`btn-set-lead-${officer.id}`}
                                onClick={() => handleSetLeadOfficer(officer)}
                                className="px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 transition"
                              >
                                ตั้งเป็น Lead
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {!isLead && (
                              <button
                                type="button"
                                id={`btn-remove-officer-${officer.id}`}
                                onClick={() => handleRemoveOfficer(officer.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="ลบออกจากรายชื่อ Gatekeeper"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: EXECUTIVE MEMBERS MANAGEMENT                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'executives' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Actions & Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                id="search-executives"
                placeholder="ค้นหารายชื่อ, ตำแหน่ง, ฝ่าย หรืออีเมลผู้บริหาร..."
                value={execSearch}
                onChange={(e) => setExecSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-reset-execs"
                onClick={handleResetExecsToDefault}
                className="px-3 py-1.5 bg-white text-slate-600 hover:text-rose-600 rounded-lg text-xs font-medium border border-slate-200 transition flex items-center gap-1"
                title="รีเซ็ตเป็นค่าเริ่มต้น"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ตรายชื่อเริ่มต้น</span>
              </button>

              <button
                type="button"
                id="btn-add-executive-toggle"
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
                    setExecCommittees('');
                    setIsAddingExec(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isAddingExec ? 'ปิดฟอร์ม' : 'เพิ่มรายชื่อผู้บริหาร'}</span>
              </button>
            </div>
          </div>

          {/* Add / Edit Executive Form Modal / Inline Box */}
          {isAddingExec && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-5 shadow-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-700" />
                  <h3 className="font-bold text-sm text-purple-950">
                    {editingExecId ? 'แก้ไขข้อมูลผู้บริหารระดับสูง' : 'ลงทะเบียนผู้บริหารระดับสูงท่านใหม่'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingExec(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveExecutive} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ชื่อ - นามสกุล *</label>
                    <input
                      type="text"
                      id="exec-name"
                      placeholder="เช่น คุณประเสริฐ อัครเดชานนท์"
                      value={execName}
                      onChange={(e) => setExecName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ตำแหน่งทางการบริหาร *</label>
                    <input
                      type="text"
                      id="exec-position"
                      placeholder="เช่น ประธานเจ้าหน้าที่บริหาร (CEO)"
                      value={execPosition}
                      onChange={(e) => setExecPosition(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">สายงาน / สังกัด</label>
                    <input
                      type="text"
                      id="exec-department"
                      placeholder="เช่น Office of the CEO"
                      value={execDepartment}
                      onChange={(e) => setExecDepartment(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">อีเมลผู้บริหาร *</label>
                    <input
                      type="email"
                      id="exec-email"
                      placeholder="เช่น prasert.ceo@enterprise.co.th"
                      value={execEmail}
                      onChange={(e) => setExecEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">เบอร์ติดต่อด่วน</label>
                    <input
                      type="text"
                      id="exec-phone"
                      placeholder="เช่น 02-998-1001"
                      value={execPhone}
                      onChange={(e) => setExecPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ประเภทบทบาท (Role Classification)</label>
                    <select
                      id="exec-role-type"
                      value={execRoleType}
                      onChange={(e) => setExecRoleType(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="CEO">CEO (ประธานเจ้าหน้าที่บริหาร)</option>
                      <option value="EVP">EVP (รองกรรมการผู้จัดการใหญ่อาวุโส)</option>
                      <option value="GRC_Chair">ประธานกำกับดูแลบรรษัทภิบาล (GRC Chair)</option>
                      <option value="Audit_Committee">ประธาน/กรรมการตรวจสอบ (Audit Committee)</option>
                      <option value="Board_Member">กรรมการบริษัท (Board Member)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">คณะกรรมการที่สังกัด (คั่นด้วยจุลภาค ,)</label>
                  <input
                    type="text"
                    id="exec-committees"
                    placeholder="เช่น คณะกรรมการบริหารระดับสูง (ExCom), คณะกรรมการจริยธรรมองค์กร"
                    value={execCommittees}
                    onChange={(e) => setExecCommittees(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Privileges Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-purple-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="exec-check-whistleblower"
                      checked={execIsWhistleblower}
                      onChange={(e) => setExecIsWhistleblower(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">รับเคสสายตรง Whistleblower</span>
                      <span className="text-[10px] text-slate-500">เปิดสิทธิ์รับเคส Direct CEO/EVP</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="exec-check-confidential"
                      checked={execCanViewConfidential}
                      onChange={(e) => setExecCanViewConfidential(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">สิทธิ์ดูชื่อเคสลับเฉพาะ</span>
                      <span className="text-[10px] text-slate-500">ปลดล็อคข้อมูลตัวตนกรณีมีเหตุจำเป็น</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="exec-check-alerts"
                      checked={execReceiveAlerts}
                      onChange={(e) => setExecReceiveAlerts(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">รับแจ้งเตือนความเสี่ยงสูง</span>
                      <span className="text-[10px] text-slate-500">ส่ง Alert ทางอีเมลทันที</span>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingExec(false)}
                    className="px-3.5 py-1.5 bg-white text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium border border-slate-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    id="btn-save-exec"
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingExecId ? 'บันทึกการแก้ไข' : 'บันทึกผู้บริหาร'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Executive Roster Grid / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredExecutives.map((exec) => {
              const isActive = exec.status === 'active';
              return (
                <div
                  key={exec.id}
                  className={`bg-white rounded-2xl border transition shadow-xs p-5 flex flex-col justify-between ${
                    isActive ? 'border-slate-200 hover:border-purple-300' : 'border-slate-200 bg-slate-50/70 opacity-75'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                          exec.roleType === 'CEO' 
                            ? 'bg-gradient-to-br from-purple-700 to-indigo-800 text-white shadow-purple-200' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          <Crown className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{exec.name}</h4>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-purple-900 mt-0.5">{exec.position}</div>
                          <div className="text-[11px] text-slate-500">{exec.department}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditExecClick(exec)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExec(exec.id, exec.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="ลบรายชื่อ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Details & Contacts */}
                    <div className="py-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                          <Mail className="w-3.5 h-3.5" />
                          <span>อีเมลติดต่อ:</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-800">{exec.email}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                          <Phone className="w-3.5 h-3.5" />
                          <span>เบอร์โทรศัพท์:</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-800">{exec.phone || '-'}</span>
                      </div>

                      {/* Committees badges */}
                      {exec.assignedCommittees && exec.assignedCommittees.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1 font-semibold">
                            คณะกรรมการกำกับดูแล:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {exec.assignedCommittees.map((comm, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-md font-medium">
                                {comm}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Privileges Badges & Status Switch */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {exec.isPrimaryWhistleblowerReceiver && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                          <Shield className="w-3 h-3 text-purple-600" />
                          <span>สายตรง Whistleblower</span>
                        </span>
                      )}
                      {exec.canViewConfidentialIdentities && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold">
                          <Eye className="w-3 h-3 text-amber-600" />
                          <span>ปลดล็อคตัวตน</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleExecStatus(exec)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                        isActive 
                          ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {isActive ? 'พักสถานะ' : 'เปิดใช้งาน'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: HR ADMIN & GRC MANAGEMENT                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'hr_admins' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Actions & Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                id="search-admins"
                placeholder="ค้นหารายชื่อ, ตำแหน่ง, ฝ่าย หรืออีเมล HR Admin..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-reset-admins"
                onClick={handleResetAdminsToDefault}
                className="px-3 py-1.5 bg-white text-slate-600 hover:text-rose-600 rounded-lg text-xs font-medium border border-slate-200 transition flex items-center gap-1"
                title="รีเซ็ตเป็นค่าเริ่มต้น"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ตรายชื่อเริ่มต้น</span>
              </button>

              <button
                type="button"
                id="btn-add-admin-toggle"
                onClick={() => {
                  if (isAddingAdmin) {
                    setIsAddingAdmin(false);
                    setEditingAdminId(null);
                  } else {
                    setEditingAdminId(null);
                    setAdminName('');
                    setAdminPosition('');
                    setAdminDepartment('');
                    setAdminEmail('');
                    setAdminPhone('');
                    setIsAddingAdmin(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isAddingAdmin ? 'ปิดฟอร์ม' : 'เพิ่มเจ้าหน้าที่ HR Admin'}</span>
              </button>
            </div>
          </div>

          {/* Add / Edit HR Admin Form */}
          {isAddingAdmin && (
            <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 shadow-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-rose-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-rose-700" />
                  <h3 className="font-bold text-sm text-rose-950">
                    {editingAdminId ? 'แก้ไขข้อมูลเจ้าหน้าที่ HR Admin' : 'ลงทะเบียนเจ้าหน้าที่ HR Admin ท่านใหม่'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingAdmin(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveHrAdmin} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ชื่อ - นามสกุล *</label>
                    <input
                      type="text"
                      id="admin-name"
                      placeholder="เช่น คุณชิดชนก วงศ์ประเสริฐ"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ตำแหน่งงาน *</label>
                    <input
                      type="text"
                      id="admin-position"
                      placeholder="เช่น HR Director & Executive Representative"
                      value={adminPosition}
                      onChange={(e) => setAdminPosition(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ฝ่าย / แผนก</label>
                    <input
                      type="text"
                      id="admin-department"
                      placeholder="เช่น People & Organization Strategy Division"
                      value={adminDepartment}
                      onChange={(e) => setAdminDepartment(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">อีเมลทางการ *</label>
                    <input
                      type="email"
                      id="admin-email"
                      placeholder="เช่น chidchanok.w@enterprise.co.th"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">เบอร์ติดต่อภายใน</label>
                    <input
                      type="text"
                      id="admin-phone"
                      placeholder="เช่น 02-998-2001"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ระดับสิทธิ์ดูแลระบบ (Role Level)</label>
                    <select
                      id="admin-role-level"
                      value={adminRoleLevel}
                      onChange={(e) => setAdminRoleLevel(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="super_admin">Super Admin (สิทธิ์สูงสุดทุกส่วน)</option>
                      <option value="hr_manager">HR Manager (จัดการ Gatekeeper & เคส)</option>
                      <option value="compliance_auditor">Compliance & GRC Auditor (ตรวจสอบ)</option>
                    </select>
                  </div>
                </div>

                {/* Privileges Switches */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-rose-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="admin-check-rbac"
                      checked={adminCanManageRbac}
                      onChange={(e) => setAdminCanManageRbac(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">สิทธิ์ปรับแก้ RBAC Matrix</span>
                      <span className="text-[10px] text-slate-500">กำหนดแท็บและสิทธิ์ของแต่ละบทบาท</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="admin-check-gatekeeper"
                      checked={adminCanManageGatekeepers}
                      onChange={(e) => setAdminCanManageGatekeepers(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">สิทธิ์แต่งตั้ง Gatekeeper</span>
                      <span className="text-[10px] text-slate-500">กำหนด Lead ประจำ 9 ฝ่าย</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="admin-check-execs"
                      checked={adminCanManageExecutives}
                      onChange={(e) => setAdminCanManageExecutives(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">สิทธิ์จัดการรายชื่อผู้บริหาร</span>
                      <span className="text-[10px] text-slate-500">Maintain Executive Directory</span>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingAdmin(false)}
                    className="px-3.5 py-1.5 bg-white text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium border border-slate-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    id="btn-save-admin"
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingAdminId ? 'บันทึกการแก้ไข' : 'บันทึกเจ้าหน้าที่ HR Admin'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Admin Roster Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAdmins.map((admin) => {
              const isActive = admin.status === 'active';
              return (
                <div
                  key={admin.id}
                  className={`bg-white rounded-2xl border transition shadow-xs p-5 flex flex-col justify-between ${
                    isActive ? 'border-slate-200 hover:border-rose-300' : 'border-slate-200 bg-slate-50/70 opacity-75'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                          admin.roleLevel === 'super_admin'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          <SlidersHorizontal className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{admin.name}</h4>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              admin.roleLevel === 'super_admin'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {admin.roleLevel.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-rose-900 mt-0.5">{admin.position}</div>
                          <div className="text-[11px] text-slate-500">{admin.department}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditAdminClick(admin)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="ลบรายชื่อ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Contacts */}
                    <div className="py-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                          <Mail className="w-3.5 h-3.5" />
                          <span>อีเมลทางการ:</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-800">{admin.email}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                          <Phone className="w-3.5 h-3.5" />
                          <span>เบอร์โทรศัพท์:</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-800">{admin.phone || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Privileges Badges */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {admin.canManageRbac && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold">
                          <Lock className="w-3 h-3 text-rose-600" />
                          <span>จัดการ RBAC</span>
                        </span>
                      )}
                      {admin.canManageGatekeepers && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                          <Shield className="w-3 h-3 text-indigo-600" />
                          <span>แต่งตั้ง Gatekeeper</span>
                        </span>
                      )}
                      {admin.canManageExecutives && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                          <Crown className="w-3 h-3 text-purple-600" />
                          <span>จัดการผู้บริหาร</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleAdminStatus(admin)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                        isActive 
                          ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {isActive ? 'พักสถานะ' : 'เปิดใช้งาน'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Global Guidance Note */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800 block mb-0.5">
            หลักการกำกับดูแลความปลอดภัยและการคุ้มครองข้อมูล (Corporate Governance & Whistleblower Directory):
          </span>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            ข้อมูลรายชื่อคณะผู้บริหาร, HR Admin และ Gatekeeper ในหน้านี้เชื่อมโยงกับระบบแจ้งเตือนอัตโนมัติ (Automated Notification System) และระบบคัดกรองคำร้องสายตรง (CEO Direct Whistleblower Channel) โดยมีระบบสำรองข้อมูลในเครื่องแบบเรียลไทม์ และสามารถแก้ไขหรือเพิ่มบุคลากรได้ตลอดเวลา
          </p>
        </div>
      </div>

    </div>
  );
};