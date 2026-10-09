'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Shield,
  Users,
  UserPlus,
  Crown,
  Trash2,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  Zap,
  Info,
  ChevronRight,
  SlidersHorizontal,
  Lock,
  Eye,
  Check,
  X,
  Edit2,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  ComplaintTicket,
  DepartmentGatekeeperConfig,
  EmployeeRecord,
  GatekeeperOfficer,
  ExecutiveMember,
  HrAdminMember,
  GrievanceCategory,
} from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { ConfirmOptions, useConfirmDialog } from './ConfirmDialog';
import {
  updateDepartmentGatekeeperConfig,
  resetGatekeeperConfigsToDefault,
} from '@/lib/actions/gatekeeper';
import {
  addExecutiveMember,
  updateExecutiveMember,
  deleteExecutiveMember,
  resetExecutivesToDefault,
} from '@/lib/actions/executives';
import {
  addHrAdminMember,
  updateHrAdminMember,
  deleteHrAdminMember,
  resetHrAdminsToDefault,
} from '@/lib/actions/hr-admins';
import { searchHrEmployees } from '@/lib/actions/directory';
import { useShell } from '../app/shell-context';
import { gatekeeperDepartments } from '@/lib/ticket-scope';
import HrNameField from './HrNameField';
import { AdminEmailNotificationSettings } from './AdminEmailNotificationSettings';
import { ExecStatusSelect, ExecutiveStatus } from './executiveShared';
import { useTr } from '../context/useTr';

/** lowercase email → state in the HR view; null = HR view unreachable (no badges at all). */
type HrStatusMap = Record<string, 'active' | 'inactive'> | null;

interface AdminGatekeeperManagementProps {
  readonly tickets?: ComplaintTicket[];
  readonly initialExecutives: ExecutiveMember[];
  readonly initialHrAdmins: HrAdminMember[];
  readonly hrStatus: HrStatusMap;
}

type ManagementSubTab = 'gatekeepers' | 'executives' | 'hr_admins' | 'email_notifications';
type GatekeeperConfigs = Record<GrievanceCategory, DepartmentGatekeeperConfig>;

// --- Shared helpers ---------------------------------------------------------------------------

/** Inline bilingual picker: `tr(english, thai)` (see `useTr`). */
type Tr = (en: string, th: string) => string;
const thaiOnly: Tr = (...[, th]) => th;

/** "3 people" / "3 ท่าน". */
const countPeople = (n: number, tr: Tr) => tr(`${n} ${n === 1 ? 'person' : 'people'}`, `${n} ท่าน`);

/** "4 cases (2 pending)" / "4 เคส (2 รอดำเนินการ)". */
const countCases = (total: number, pending: number, tr: Tr) =>
  tr(
    `${total} ${total === 1 ? 'case' : 'cases'} (${pending} pending)`,
    `${total} เคส (${pending} รอดำเนินการ)`
  );

const failedToast = (tr: Tr) =>
  tr('⚠️ Could not save. Please try again.', '⚠️ บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
const selfToast = (tr: Tr) =>
  tr(
    '⚠️ You cannot delete or deactivate your own account',
    '⚠️ ไม่สามารถลบหรือปิดสถานะบัญชีของตัวเองได้'
  );
const lastAdminToast = (tr: Tr) =>
  tr(
    '⚠️ At least 1 active HR Admin is required',
    '⚠️ ต้องมี HR Admin ที่ใช้งานอยู่อย่างน้อย 1 ท่าน'
  );
const ERROR_TOASTS: ReadonlyArray<readonly [string, (tr: Tr) => string]> = [
  ['CANNOT_REMOVE_SELF', selfToast],
  ['LAST_ADMIN', lastAdminToast],
];

const normEmail = (email: string) => email.trim().toLowerCase();

/**
 * Client-side mirror of the server's guards (production Next.js masks Server Action error
 * messages, so the server's codes would never reach the toast): returns the toast text when
 * deleting / deactivating / re-emailing `targetId` must be refused, else null.
 */
export function hrAdminRemovalBlock(
  admins: readonly HrAdminMember[],
  targetId: string,
  myEmail: string,
  tr: Tr = thaiOnly
): string | null {
  const target = admins.find((a) => a.id === targetId);
  if (!target) return null;
  if (normEmail(target.email) === normEmail(myEmail)) return selfToast(tr);
  const othersActive = admins.some((a) => a.id !== targetId && a.status === 'active');
  return othersActive ? null : lastAdminToast(tr);
}

/** Maps an error thrown by a Server Action to the toast text shown to the admin. */
function errorToast(err: unknown, tr: Tr): string {
  const message = err instanceof Error ? err.message : String(err);
  return (ERROR_TOASTS.find(([code]) => message.includes(code))?.[1] ?? failedToast)(tr);
}

const inputClass = (ring: string, locked = false) =>
  `w-full rounded-lg border border-slate-200 ${locked ? 'bg-slate-50' : 'bg-white'} px-3 py-1.5 text-xs focus:ring-2 ${ring} focus:outline-none`;

const hrPills = (tr: Tr) =>
  ({
    missing: {
      label: tr('Not in HR', 'ไม่อยู่ใน HR'),
      title: tr(
        'Not found in the HR database — can receive notification emails but cannot sign in with SSO',
        'ไม่พบในฐานข้อมูล HR — รับอีเมลแจ้งเตือนได้ แต่เข้าสู่ระบบด้วย SSO ไม่ได้'
      ),
      className: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    inactive: {
      label: tr('Left HR', 'พ้นสภาพใน HR'),
      title: tr(
        'No longer an active employee in the HR database',
        'ไม่ใช่พนักงานที่ปฏิบัติงานอยู่ในฐานข้อมูล HR แล้ว'
      ),
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    },
  }) as const;

/** Small pill beside a roster email when the person is not an active employee in the HR view. */
const HrStatusPill: React.FC<{ readonly email: string; readonly hrStatus: HrStatusMap }> = ({
  email,
  hrStatus,
}) => {
  const { tr } = useTr();
  if (!hrStatus) return null;
  const state = hrStatus[email.trim().toLowerCase()];
  if (state === 'active') return null;
  const pill = hrPills(tr)[state === 'inactive' ? 'inactive' : 'missing'];
  return (
    <span
      title={pill.title}
      className={`ml-1.5 inline-flex items-center rounded-full border px-1.5 py-0.5 align-middle font-sans text-[10px] font-bold whitespace-nowrap ${pill.className}`}
    >
      {pill.label}
    </span>
  );
};

/** Local copy of a server-provided value; follows the source whenever the server sends a new one. */
function useSyncedState<T>(source: T) {
  const [value, setValue] = useState(source);
  const [previous, setPrevious] = useState(source);
  if (previous !== source) {
    setPrevious(source);
    setValue(source);
  }
  return [value, setValue] as const;
}

function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const showToast = (msg: string) => {
    clearTimeout(timer.current);
    setToastMessage(msg);
    timer.current = setTimeout(() => setToastMessage(null), 4000);
  };

  return { toastMessage, showToast };
}

type Run = <T>(
  op: () => Promise<T>,
  apply: (result: T) => void,
  successMessage?: string
) => Promise<boolean>;

interface PanelDeps {
  readonly run: Run;
  readonly showToast: (msg: string) => void;
  readonly askConfirm: (options: ConfirmOptions) => void;
}

/**
 * Runs one Server Action: applies its result to local state, refreshes the shell (so other
 * screens see the change) and toasts. Failures become a toast — never an unhandled rejection.
 */
function useRosterRunner(showToast: (msg: string) => void): Run {
  const { refreshData } = useShell();
  const { tr } = useTr();
  const busy = useRef(false);

  return async (op, apply, successMessage) => {
    if (busy.current) return false;
    busy.current = true;
    try {
      apply(await op());
      refreshData();
      if (successMessage) showToast(successMessage);
      return true;
    } catch (err) {
      showToast(errorToast(err, tr));
      return false;
    } finally {
      busy.current = false;
    }
  };
}

// --- Gatekeeper panel state -------------------------------------------------------------------

function useGatekeeperPanel(
  { run, showToast, askConfirm }: PanelDeps,
  configs: GatekeeperConfigs,
  setConfigs: (configs: GatekeeperConfigs) => void
) {
  const { tr } = useTr();
  const [selectedCategory, setSelectedCategory] = useState<GrievanceCategory>('HR');
  const [isAddingOfficer, setIsAddingOfficer] = useState(false);
  const [newOfficerName, setNewOfficerName] = useState('');
  const [newOfficerEmail, setNewOfficerEmail] = useState('');
  const [newOfficerRole, setNewOfficerRole] = useState('');
  const [newOfficerPhone, setNewOfficerPhone] = useState('');
  const [newOfficerPicked, setNewOfficerPicked] = useState(false);

  const currentConfig = configs[selectedCategory];

  const saveConfig = (updates: Partial<DepartmentGatekeeperConfig>, message: string) =>
    run(() => updateDepartmentGatekeeperConfig(selectedCategory, updates), setConfigs, message);

  const handleUpdateConfig = (updates: Partial<DepartmentGatekeeperConfig>) =>
    saveConfig(
      updates,
      tr(
        `Saved Gatekeeper settings for the ${selectedCategory} department`,
        `บันทึกการตั้งค่า Gatekeeper หน่วยงาน ${selectedCategory} เรียบร้อยแล้ว`
      )
    );

  const handleSetLeadOfficer = (officer: GatekeeperOfficer) => {
    const updatedOfficers = currentConfig.officers.map((o) => ({
      ...o,
      isLead: o.id === officer.id,
    }));
    return saveConfig(
      { leadOfficer: { ...officer, isLead: true }, officers: updatedOfficers },
      tr(
        `"${officer.name}" is now the Lead Gatekeeper of this department`,
        `แต่งตั้งให้คุณ "${officer.name}" เป็น Lead Gatekeeper ของหน่วยงาน`
      )
    );
  };

  const handleRemoveOfficer = (officerId: string) => {
    if (currentConfig.officers.length <= 1) {
      showToast(
        tr(
          '⚠️ Cannot remove: each department needs at least 1 active Gatekeeper officer',
          '⚠️ ไม่สามารถลบได้: แต่ละฝ่ายต้องมีเจ้าหน้าที่ Gatekeeper ประจำการอย่างน้อย 1 ท่าน'
        )
      );
      return;
    }
    const target = currentConfig.officers.find((o) => o.id === officerId);
    if (!target) return;
    if (target.isLead) {
      showToast(
        tr(
          '⚠️ Cannot remove the Lead Gatekeeper: please click "Set as Lead" on another officer before removing',
          '⚠️ ไม่สามารถลบ Lead Gatekeeper ได้: กรุณากด "ตั้งเป็น Lead" ให้เจ้าหน้าที่ท่านอื่นก่อนทำการลบ'
        )
      );
      return;
    }

    askConfirm({
      title: tr('Confirm Gatekeeper removal', 'ยืนยันการลบรายชื่อ Gatekeeper'),
      message: tr(
        `Remove "${target.name}" (${target.roleTitle}) as a Gatekeeper of the ${selectedCategory} department?`,
        `คุณต้องการลบคุณ "${target.name}" (${target.roleTitle}) ออกจากการเป็น Gatekeeper ประจำฝ่าย ${selectedCategory} ใช่หรือไม่?`
      ),
      confirmLabel: tr('Remove', 'ลบรายชื่อ'),
      isDestructive: true,
      onConfirm: () => {
        saveConfig(
          { officers: currentConfig.officers.filter((o) => o.id !== officerId) },
          tr(
            `Removed "${target.name}" from the Gatekeeper list`,
            `ลบคุณ "${target.name}" ออกจากรายชื่อ Gatekeeper เรียบร้อยแล้ว`
          )
        );
      },
    });
  };

  const clearOfficerForm = () => {
    setNewOfficerName('');
    setNewOfficerEmail('');
    setNewOfficerRole('');
    setNewOfficerPhone('');
    setNewOfficerPicked(false);
  };

  const handleAddOfficerSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!newOfficerName.trim() || !newOfficerEmail.trim()) {
      showToast(
        tr('⚠️ Please enter the officer name and email', '⚠️ กรุณากรอกชื่อและอีเมลของเจ้าหน้าที่')
      );
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

    const saved = await saveConfig(
      { officers: [...currentConfig.officers, newOfficer] },
      tr(
        `Added "${newOfficer.name}" as a department Gatekeeper`,
        `เพิ่มคุณ "${newOfficer.name}" เป็น Gatekeeper ประจำหน่วยงานเรียบร้อยแล้ว`
      )
    );
    if (saved) {
      clearOfficerForm();
      setIsAddingOfficer(false);
    }
  };

  const handleOfficerNameChange = (value: string) => {
    setNewOfficerName(value);
    setNewOfficerPicked(false);
  };

  const handlePickOfficer = (employee: EmployeeRecord) => {
    setNewOfficerName(employee.nameTh);
    setNewOfficerEmail(employee.loginEmail);
    setNewOfficerRole(employee.position);
    setNewOfficerPicked(true);
  };

  const handleResetGatekeepersToDefaults = () => {
    askConfirm({
      title: tr('Confirm Gatekeeper reset', 'ยืนยันการรีเซ็ต Gatekeeper'),
      message: tr(
        'Reset the Gatekeeper roster of every department to the organization defaults?',
        'คุณต้องการรีเซ็ตรายชื่อ Gatekeeper ของทุกหน่วยงานกลับเป็นค่าเริ่มต้นขององค์กรใช่หรือไม่?'
      ),
      confirmLabel: tr('Reset to defaults', 'รีเซ็ตค่าเริ่มต้น'),
      onConfirm: () => {
        run(
          resetGatekeeperConfigsToDefault,
          setConfigs,
          tr(
            'Gatekeeper rosters for all departments were reset to defaults',
            'รีเซ็ตรายชื่อ Gatekeeper ทุกหน่วยงานเป็นค่าเริ่มต้นแล้ว'
          )
        );
      },
    });
  };

  return {
    configs,
    selectedCategory,
    setSelectedCategory,
    isAddingOfficer,
    setIsAddingOfficer,
    newOfficerName,
    newOfficerEmail,
    setNewOfficerEmail,
    newOfficerRole,
    setNewOfficerRole,
    newOfficerPhone,
    setNewOfficerPhone,
    newOfficerPicked,
    currentConfig,
    handleUpdateConfig,
    handleSetLeadOfficer,
    handleRemoveOfficer,
    handleAddOfficerSubmit,
    handleOfficerNameChange,
    handlePickOfficer,
    handleResetGatekeepersToDefaults,
  };
}

// --- Executive panel state --------------------------------------------------------------------

function useExecutivePanel(
  { run, showToast, askConfirm }: PanelDeps,
  setExecutives: (executives: ExecutiveMember[]) => void
) {
  const { tr } = useTr();
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
  const [execStatus, setExecStatus] = useState<ExecutiveStatus>('active');
  const [execPicked, setExecPicked] = useState(false);

  const clearExecForm = () => {
    setEditingExecId(null);
    setExecName('');
    setExecPosition('');
    setExecDepartment('');
    setExecEmail('');
    setExecPhone('');
    setExecCommittees('');
    setExecStatus('active');
    setExecPicked(false);
  };

  const buildExecPayload = (): Omit<ExecutiveMember, 'id' | 'updatedAt'> => {
    const committeeArray = execCommittees
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    return {
      name: execName.trim(),
      position: execPosition.trim(),
      department: execDepartment.trim() || 'Executive Committee',
      email: execEmail.trim(),
      phone: execPhone.trim() || '02-998-1000',
      roleType: execRoleType,
      isPrimaryWhistleblowerReceiver: execIsWhistleblower,
      canViewConfidentialIdentities: execCanViewConfidential,
      receiveAlertNotifications: execReceiveAlerts,
      assignedCommittees:
        committeeArray.length > 0 ? committeeArray : ['คณะกรรมการบริหารระดับสูง (ExCom)'],
      status: execStatus,
    };
  };

  const handleSaveExecutive = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!execName.trim() || !execEmail.trim() || !execPosition.trim()) {
      showToast(
        tr(
          '⚠️ Please enter the executive full name, position and email',
          '⚠️ กรุณากรอกชื่อ-นามสกุล, ตำแหน่ง และอีเมลของผู้บริหาร'
        )
      );
      return;
    }

    const payload = buildExecPayload();
    const saved = editingExecId
      ? await run(
          () => updateExecutiveMember(editingExecId, payload),
          setExecutives,
          tr(`Updated executive "${execName}"`, `อัปเดตข้อมูลผู้บริหาร "${execName}" เรียบร้อยแล้ว`)
        )
      : await run(
          () => addExecutiveMember(payload),
          setExecutives,
          tr(
            `Added executive "${execName}" to the roster`,
            `เพิ่มผู้บริหาร "${execName}" ในบัญชีรายชื่อเรียบร้อยแล้ว`
          )
        );
    if (saved) {
      setIsAddingExec(false);
      clearExecForm();
    }
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
    setExecStatus(exec.status || 'active');
    setExecPicked(false);
    setIsAddingExec(true);
  };

  const handleToggleExecForm = () => {
    if (isAddingExec) {
      setIsAddingExec(false);
      setEditingExecId(null);
      return;
    }
    clearExecForm();
    setIsAddingExec(true);
  };

  const handleToggleExecStatus = (exec: ExecutiveMember) => {
    const newStatus = exec.status === 'active' ? 'inactive' : 'active';
    const statusLabel =
      newStatus === 'active'
        ? tr('Active', 'พร้อมปฏิบัติงาน (Active)')
        : tr('Inactive', 'พักสถานะ (Inactive)');
    return run(
      () => updateExecutiveMember(exec.id, { status: newStatus }),
      setExecutives,
      tr(`Executive status changed to ${statusLabel}`, `เปลี่ยนสถานะผู้บริหารเป็น ${statusLabel}`)
    );
  };

  const handleDeleteExec = (id: string, name: string) => {
    askConfirm({
      title: tr('Confirm executive removal', 'ยืนยันการลบรายชื่อผู้บริหาร'),
      message: tr(
        `Permanently remove executive "${name}" from the system? Assignments and permissions will be revoked immediately.`,
        `คุณต้องการลบรายชื่อผู้บริหาร "${name}" ออกจากระบบถาวรใช่หรือไม่? ข้อมูลการมอบหมายและสิทธิ์จะถูกถอดถอนทันที`
      ),
      confirmLabel: tr('Remove', 'ลบรายชื่อ'),
      isDestructive: true,
      onConfirm: () => {
        run(
          () => deleteExecutiveMember(id),
          setExecutives,
          tr(`Removed executive "${name}"`, `ลบรายชื่อผู้บริหาร "${name}" เรียบร้อยแล้ว`)
        );
      },
    });
  };

  const handleResetExecsToDefault = () => {
    askConfirm({
      title: tr('Confirm executive roster reset', 'ยืนยันการรีเซ็ตคณะผู้บริหาร'),
      message: tr(
        'Reset the executive roster to the default organization structure?',
        'คุณต้องการรีเซ็ตรายชื่อคณะผู้บริหารกลับเป็นค่าเริ่มต้นตามโครงสร้างองค์กรใช่หรือไม่?'
      ),
      confirmLabel: tr('Reset to defaults', 'รีเซ็ตค่าเริ่มต้น'),
      onConfirm: () => {
        run(
          resetExecutivesToDefault,
          setExecutives,
          tr(
            'Executive roster was reset to defaults',
            'รีเซ็ตรายชื่อคณะผู้บริหารเป็นค่าเริ่มต้นเรียบร้อยแล้ว'
          )
        );
      },
    });
  };

  const handleExecNameChange = (value: string) => {
    setExecName(value);
    setExecPicked(false);
  };

  const handlePickExec = (employee: EmployeeRecord) => {
    setExecName(employee.nameTh);
    setExecEmail(employee.loginEmail);
    setExecPosition(employee.position);
    setExecDepartment(employee.department);
    setExecPicked(true);
  };

  return {
    execSearch,
    setExecSearch,
    isAddingExec,
    setIsAddingExec,
    editingExecId,
    execName,
    execPosition,
    setExecPosition,
    execDepartment,
    setExecDepartment,
    execEmail,
    setExecEmail,
    execPhone,
    setExecPhone,
    execRoleType,
    setExecRoleType,
    execIsWhistleblower,
    setExecIsWhistleblower,
    execCanViewConfidential,
    setExecCanViewConfidential,
    execReceiveAlerts,
    setExecReceiveAlerts,
    execCommittees,
    setExecCommittees,
    execStatus,
    setExecStatus,
    execPicked,
    handleSaveExecutive,
    handleEditExecClick,
    handleToggleExecForm,
    handleToggleExecStatus,
    handleDeleteExec,
    handleResetExecsToDefault,
    handleExecNameChange,
    handlePickExec,
  };
}

// --- HR Admin panel state ---------------------------------------------------------------------

function useHrAdminPanel(
  { run, showToast, askConfirm }: PanelDeps,
  hrAdmins: HrAdminMember[],
  setHrAdmins: (admins: HrAdminMember[]) => void,
  myEmail: string
) {
  const { tr } = useTr();
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
  const [adminPicked, setAdminPicked] = useState(false);

  const clearAdminForm = () => {
    setEditingAdminId(null);
    setAdminName('');
    setAdminPosition('');
    setAdminDepartment('');
    setAdminEmail('');
    setAdminPhone('');
    setAdminPicked(false);
  };

  const buildAdminPayload = (): Omit<HrAdminMember, 'id' | 'updatedAt' | 'status'> => ({
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

  const handleSaveHrAdmin = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminPosition.trim()) {
      showToast(
        tr(
          '⚠️ Please enter the HR Admin full name, position and email',
          '⚠️ กรุณากรอกชื่อ-นามสกุล, ตำแหน่ง และอีเมลของ HR Admin'
        )
      );
      return;
    }

    const payload = buildAdminPayload();
    const current = hrAdmins.find((a) => a.id === editingAdminId);
    const emailChanged = current && normEmail(current.email) !== normEmail(payload.email);
    const block = emailChanged ? hrAdminRemovalBlock(hrAdmins, current.id, myEmail, tr) : null;
    if (block) {
      showToast(block);
      return;
    }
    const saved = editingAdminId
      ? await run(
          () => updateHrAdminMember(editingAdminId, payload),
          setHrAdmins,
          tr(
            `Updated HR Admin "${adminName}"`,
            `อัปเดตข้อมูล HR Admin "${adminName}" เรียบร้อยแล้ว`
          )
        )
      : await run(
          () => addHrAdminMember({ ...payload, status: 'active' }),
          setHrAdmins,
          tr(
            `Added HR Admin "${adminName}"`,
            `เพิ่มเจ้าหน้าที่ HR Admin "${adminName}" เรียบร้อยแล้ว`
          )
        );
    if (saved) {
      setIsAddingAdmin(false);
      clearAdminForm();
    }
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
    setAdminPicked(false);
    setIsAddingAdmin(true);
  };

  const handleToggleAdminForm = () => {
    if (isAddingAdmin) {
      setIsAddingAdmin(false);
      setEditingAdminId(null);
      return;
    }
    clearAdminForm();
    setIsAddingAdmin(true);
  };

  const handleToggleAdminStatus = (admin: HrAdminMember) => {
    const newStatus = admin.status === 'active' ? 'inactive' : 'active';
    const block =
      newStatus === 'inactive' ? hrAdminRemovalBlock(hrAdmins, admin.id, myEmail, tr) : null;
    if (block) {
      showToast(block);
      return;
    }
    const statusLabel =
      newStatus === 'active'
        ? tr('Active', 'พร้อมปฏิบัติงาน (Active)')
        : tr('Inactive', 'พักสถานะ (Inactive)');
    run(
      () => updateHrAdminMember(admin.id, { status: newStatus }),
      setHrAdmins,
      tr(`Officer status changed to ${statusLabel}`, `เปลี่ยนสถานะเจ้าหน้าที่เป็น ${statusLabel}`)
    );
  };

  const handleDeleteAdmin = (id: string, name: string) => {
    const block = hrAdminRemovalBlock(hrAdmins, id, myEmail, tr);
    if (block) {
      showToast(block);
      return;
    }
    askConfirm({
      title: tr('Confirm HR Admin removal', 'ยืนยันการลบรายชื่อ HR Admin'),
      message: tr(
        `Remove HR Admin "${name}" from the system?`,
        `คุณต้องการลบรายชื่อเจ้าหน้าที่ HR Admin "${name}" ออกจากระบบใช่หรือไม่?`
      ),
      confirmLabel: tr('Remove', 'ลบรายชื่อ'),
      isDestructive: true,
      onConfirm: () => {
        run(
          () => deleteHrAdminMember(id),
          setHrAdmins,
          tr(`Removed HR Admin "${name}"`, `ลบรายชื่อเจ้าหน้าที่ HR Admin "${name}" เรียบร้อยแล้ว`)
        );
      },
    });
  };

  const handleResetAdminsToDefault = () => {
    askConfirm({
      title: tr('Confirm HR Admin reset', 'ยืนยันการรีเซ็ต HR Admin'),
      message: tr(
        'Reset the HR Admin roster to the defaults?',
        'คุณต้องการรีเซ็ตรายชื่อเจ้าหน้าที่ HR Admin กลับเป็นค่าเริ่มต้นใช่หรือไม่?'
      ),
      confirmLabel: tr('Reset to defaults', 'รีเซ็ตค่าเริ่มต้น'),
      onConfirm: () => {
        run(
          resetHrAdminsToDefault,
          setHrAdmins,
          tr(
            'HR Admin roster was reset to defaults',
            'รีเซ็ตรายชื่อ HR Admin เป็นค่าเริ่มต้นเรียบร้อยแล้ว'
          )
        );
      },
    });
  };

  const handleAdminNameChange = (value: string) => {
    setAdminName(value);
    setAdminPicked(false);
  };

  const handlePickAdmin = (employee: EmployeeRecord) => {
    setAdminName(employee.nameTh);
    setAdminEmail(employee.loginEmail);
    setAdminPosition(employee.position);
    setAdminDepartment(employee.department);
    setAdminPicked(true);
  };

  return {
    adminSearch,
    setAdminSearch,
    isAddingAdmin,
    setIsAddingAdmin,
    editingAdminId,
    adminName,
    adminPosition,
    setAdminPosition,
    adminDepartment,
    setAdminDepartment,
    adminEmail,
    setAdminEmail,
    adminPhone,
    setAdminPhone,
    adminRoleLevel,
    setAdminRoleLevel,
    adminCanManageRbac,
    setAdminCanManageRbac,
    adminCanManageGatekeepers,
    setAdminCanManageGatekeepers,
    adminCanManageExecutives,
    setAdminCanManageExecutives,
    adminPicked,
    handleSaveHrAdmin,
    handleEditAdminClick,
    handleToggleAdminForm,
    handleToggleAdminStatus,
    handleDeleteAdmin,
    handleResetAdminsToDefault,
    handleAdminNameChange,
    handlePickAdmin,
  };
}

// --- Gatekeepers sub-tab ----------------------------------------------------------------------

interface OfficerRowProps {
  readonly officer: GatekeeperOfficer;
  readonly leadId?: string;
  readonly hrStatus: HrStatusMap;
  /** The officer's category is not enabled for gatekeepers on the RBAC page. */
  readonly categoryDisabled: boolean;
  readonly onSetLead: (officer: GatekeeperOfficer) => void;
  readonly onRemove: (officerId: string) => void;
  readonly notify: (msg: string) => void;
}

const OfficerRow: React.FC<OfficerRowProps> = ({
  officer,
  leadId,
  hrStatus,
  categoryDisabled,
  onSetLead,
  onRemove,
  notify,
}) => {
  const { tr } = useTr();
  const isLead = officer.isLead || leadId === officer.id;
  return (
    <tr className="transition hover:bg-slate-50/60">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
              isLead
                ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {officer.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span>{officer.name}</span>
              {isLead && (
                <span className="py-0.2 inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">
                  <Crown className="h-3 w-3 text-amber-600" />
                  <span>LEAD</span>
                </span>
              )}
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              {officer.email}
              <HrStatusPill email={officer.email} hrStatus={hrStatus} />
              {categoryDisabled && (
                <span
                  title={tr(
                    'This category is not enabled for Gatekeepers on the Access Control (RBAC) page — officers will not see cases in this category yet',
                    'หมวดนี้ไม่ได้เปิดให้ Gatekeeper ในหน้ากำหนดสิทธิ์ (RBAC) — เจ้าหน้าที่จะยังไม่เห็นเรื่องของหมวดนี้'
                  )}
                  className="ml-1.5 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 align-middle font-sans text-[10px] font-bold whitespace-nowrap text-amber-700"
                >
                  {tr('Category off on RBAC page', 'หมวดนี้ปิดในหน้า RBAC')}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="hidden px-4 py-3 sm:table-cell">
        <div className="font-medium text-slate-700">{officer.roleTitle}</div>
      </td>

      <td className="hidden px-4 py-3 md:table-cell">
        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
          <Phone className="h-3 w-3 text-slate-400" />
          <span>{officer.phone || '-'}</span>
        </div>
      </td>

      <td className="px-4 py-3 text-center">
        {isLead ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-indigo-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
            <span>{tr('Primary owner', 'ผู้รับผิดชอบหลัก')}</span>
          </span>
        ) : (
          <button
            type="button"
            id={`btn-set-lead-${officer.id}`}
            onClick={() => onSetLead(officer)}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            {tr('Set as Lead', 'ตั้งเป็น Lead')}
          </button>
        )}
      </td>

      <td className="px-4 py-3 text-right">
        {isLead ? (
          <button
            type="button"
            onClick={() =>
              notify(
                tr(
                  '⚠️ Cannot remove the Lead Gatekeeper: please click "Set as Lead" on another officer first',
                  '⚠️ ไม่สามารถลบ Lead Gatekeeper ได้: กรุณากด "ตั้งเป็น Lead" ให้เจ้าหน้าที่ท่านอื่นก่อน'
                )
              )
            }
            className="cursor-pointer rounded-lg p-1.5 text-slate-300 transition hover:bg-amber-50 hover:text-amber-600"
            title={tr(
              'Cannot remove the Lead Gatekeeper (appoint another officer as Lead first)',
              'ไม่สามารถลบ Lead Gatekeeper ได้ (ต้องแต่งตั้งเจ้าหน้าที่ท่านอื่นเป็น Lead ก่อน)'
            )}
          >
            <Trash2 className="h-4 w-4 opacity-35" />
          </button>
        ) : (
          <button
            type="button"
            id={`btn-remove-officer-${officer.id}`}
            onClick={() => onRemove(officer.id)}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            title={tr('Remove from Gatekeeper list', 'ลบออกจากรายชื่อ Gatekeeper')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
};

type GatekeeperPanel = ReturnType<typeof useGatekeeperPanel>;

interface GatekeepersTabProps {
  readonly panel: GatekeeperPanel;
  readonly tickets: ComplaintTicket[];
  readonly hrStatus: HrStatusMap;
  readonly notify: (msg: string) => void;
}

const GatekeepersTab: React.FC<GatekeepersTabProps> = ({ panel, tickets, hrStatus, notify }) => {
  const { tr } = useTr();
  // Officers of a category the RBAC page has not ticked for gatekeepers see none of its tickets
  // (scope = officer categories ∩ RBAC ceiling, decisions.md 2026-10-09) — flag them.
  const { rolePermissions } = useShell();
  const enabledCategories = gatekeeperDepartments(rolePermissions.gatekeeper);
  const {
    configs,
    selectedCategory,
    setSelectedCategory,
    isAddingOfficer,
    setIsAddingOfficer,
    newOfficerName,
    newOfficerEmail,
    setNewOfficerEmail,
    newOfficerRole,
    setNewOfficerRole,
    newOfficerPhone,
    setNewOfficerPhone,
    newOfficerPicked,
    currentConfig,
    handleUpdateConfig,
    handleSetLeadOfficer,
    handleRemoveOfficer,
    handleAddOfficerSubmit,
    handleOfficerNameChange,
    handlePickOfficer,
    handleResetGatekeepersToDefaults,
  } = panel;

  const categoryKeys = Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[];
  const currentDeptTicketsCount = tickets.filter((t) => t.category === selectedCategory).length;
  const currentDeptPendingCount = tickets.filter(
    (t) => t.category === selectedCategory && t.status === 'submitted'
  ).length;

  return (
    <div className="animate-in fade-in grid grid-cols-1 gap-6 duration-200 lg:grid-cols-12">
      {/* Left Column: 6 Categories List */}
      <div className="space-y-4 lg:col-span-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Building className="h-4 w-4 text-indigo-600" />
              <span>{tr('Select Department (6 categories)', 'เลือกหน่วยงาน (6 หมวดหมู่)')}</span>
            </h3>
            <button
              type="button"
              id="btn-reset-gatekeepers"
              onClick={handleResetGatekeepersToDefaults}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 transition hover:text-rose-600"
              title={tr('Reset to defaults', 'รีเซ็ตเป็นค่าเริ่มต้น')}
            >
              <RotateCcw className="h-3 w-3" />
              <span>{tr('Reset', 'รีเซ็ตค่าเดิม')}</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {categoryKeys.map((catKey) => {
              const catDef = CATEGORY_DEFINITIONS[catKey];
              const cfg = configs[catKey];
              const isSelected = selectedCategory === catKey;
              const officerCount = cfg?.officers?.length || 1;

              return (
                <button
                  key={catKey}
                  type="button"
                  id={`btn-select-dept-${catKey.toLowerCase()}`}
                  onClick={() => {
                    setSelectedCategory(catKey);
                    setIsAddingOfficer(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {catKey.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <span>{tr(catDef.nameEn, catDef.nameTh)}</span>
                      </div>
                      <div className="max-w-[170px] truncate text-[11px] text-slate-500 sm:max-w-[200px]">
                        {cfg?.leadOfficer?.name
                          ? `Lead: ${cfg.leadOfficer.name}`
                          : catDef.responsibleDept}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-slate-700">
                      {countPeople(officerCount, tr)}
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 transition ${isSelected ? 'translate-x-0.5 text-indigo-600' : 'text-slate-400'}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Selected Department Details & Officers List */}
      <div className="space-y-6 lg:col-span-8">
        {/* Department Summary & Configuration Card */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-indigo-200 bg-indigo-100 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-indigo-800">
                  {tr(`Category ${selectedCategory}`, `หมวด ${selectedCategory}`)}
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {tr(
                    CATEGORY_DEFINITIONS[selectedCategory].nameEn,
                    CATEGORY_DEFINITIONS[selectedCategory].nameTh
                  )}
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {tr('Primary responsible department:', 'หน่วยงานผู้รับผิดชอบหลัก:')}{' '}
                <span className="font-medium text-slate-700">{currentConfig.departmentName}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs text-slate-500">
                  {tr('Total cases in department', 'เคสทั้งหมดในฝ่าย')}
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {countCases(currentDeptTicketsCount, currentDeptPendingCount, tr)}
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Assign Settings Form */}
          <div className="pt-1">
            <div>
              <label
                htmlFor="select-auto-assign-mode"
                className="mb-1.5 block flex items-center gap-1.5 text-xs font-semibold text-slate-700"
              >
                <Zap className="h-3.5 w-3.5 text-amber-600" />
                <span>
                  {tr('Auto-Assign Mode', 'รูปแบบการจ่ายงานอัตโนมัติ (Auto-Assign Mode)')}
                </span>
              </label>
              <select
                id="select-auto-assign-mode"
                value={currentConfig.autoAssignMode}
                onChange={(e) =>
                  handleUpdateConfig({
                    autoAssignMode: e.target.value as DepartmentGatekeeperConfig['autoAssignMode'],
                  })
                }
                className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="off">
                  {tr(
                    'Off — triage and assign manually',
                    'ปิดการจ่ายงานอัตโนมัติ (คัดกรองและมอบหมายเอง)'
                  )}
                </option>
                <option value="lead_manual">
                  {tr(
                    'Always route to the Lead for triage first (recommended)',
                    'จ่ายให้ Lead คัดกรองก่อนเสมอ (แนะนำ)'
                  )}
                </option>
                <option value="round_robin">
                  {tr(
                    'Round-Robin (rotate through officers)',
                    'จ่ายวนตามลำดับเจ้าหน้าที่ (Round-Robin)'
                  )}
                </option>
                <option value="workload_balanced">
                  {tr(
                    'Workload Balanced (by open workload)',
                    'จ่ายตามภาระงานคงค้าง (Workload Balanced)'
                  )}
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Officers Roster Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 p-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-4 w-4 text-indigo-600" />
                <span>
                  {tr(
                    `Active Gatekeepers (${countPeople(currentConfig.officers.length, tr)})`,
                    `รายชื่อ Gatekeeper ผู้ปฏิบัติงาน (${countPeople(currentConfig.officers.length, tr)})`
                  )}
                </span>
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {tr(
                  `Officers who receive alerts and can view cases of the ${selectedCategory} department`,
                  `เจ้าหน้าที่ที่มีสิทธิ์รับแจ้งเตือน และเปิดดูข้อมูลเคสของฝ่าย ${selectedCategory}`
                )}
              </p>
            </div>

            <button
              type="button"
              id="btn-add-gatekeeper-toggle"
              onClick={() => setIsAddingOfficer(!isAddingOfficer)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-xs transition hover:bg-indigo-700"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>
                {isAddingOfficer
                  ? tr('Cancel', 'ยกเลิก')
                  : tr('Add Gatekeeper', 'เพิ่ม Gatekeeper')}
              </span>
            </button>
          </div>

          {/* Add Officer Inline Form */}
          {isAddingOfficer && (
            <form
              onSubmit={handleAddOfficerSubmit}
              className="animate-in fade-in space-y-3 border-b border-indigo-100 bg-indigo-50/50 p-4"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                <span>
                  {tr('Enter new Gatekeeper details', 'กรอกข้อมูลเจ้าหน้าที่ Gatekeeper ท่านใหม่')}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="input-new-officer-name"
                    className="mb-1 block text-[11px] font-semibold text-slate-700"
                  >
                    {tr('Full name *', 'ชื่อ - นามสกุล *')}
                  </label>
                  <HrNameField
                    id="input-new-officer-name"
                    placeholder={tr('e.g. Kittisak Chaichana', 'เช่น คุณกิตติศักดิ์ ชัยชนะ')}
                    value={newOfficerName}
                    onChange={handleOfficerNameChange}
                    onPick={handlePickOfficer}
                    search={searchHrEmployees}
                    className={inputClass('focus:ring-indigo-500')}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="input-new-officer-email"
                    className="mb-1 block text-[11px] font-semibold text-slate-700"
                  >
                    {tr('Corporate email *', 'อีเมลทางการองค์กร *')}
                  </label>
                  <input
                    type="email"
                    id="input-new-officer-email"
                    placeholder={tr(
                      'e.g. kittisak.c@company.internal',
                      'เช่น kittisak.c@company.internal'
                    )}
                    value={newOfficerEmail}
                    onChange={(e) => setNewOfficerEmail(e.target.value)}
                    readOnly={newOfficerPicked}
                    className={inputClass('focus:ring-indigo-500', newOfficerPicked)}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="input-new-officer-role"
                    className="mb-1 block text-[11px] font-semibold text-slate-700"
                  >
                    {tr('Job title / expertise', 'ตำแหน่งงาน / ความเชี่ยวชาญ')}
                  </label>
                  <input
                    type="text"
                    id="input-new-officer-role"
                    placeholder={tr('e.g. Senior Network Engineer', 'เช่น Senior Network Engineer')}
                    value={newOfficerRole}
                    onChange={(e) => setNewOfficerRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="input-new-officer-phone"
                    className="mb-1 block text-[11px] font-semibold text-slate-700"
                  >
                    {tr('Internal phone number', 'เบอร์โทรศัพท์ติดต่อภายใน')}
                  </label>
                  <input
                    type="text"
                    id="input-new-officer-phone"
                    placeholder={tr(
                      'e.g. 02-555-4011 or ext. 1804',
                      'เช่น 02-555-4011 หรือ ต่อ 1804'
                    )}
                    value={newOfficerPhone}
                    onChange={(e) => setNewOfficerPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingOfficer(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  {tr('Cancel', 'ยกเลิก')}
                </button>
                <button
                  type="submit"
                  id="btn-submit-new-officer"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  {tr('Save Gatekeeper', 'บันทึก Gatekeeper')}
                </button>
              </div>
            </form>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                  <th className="px-4 py-2.5">{tr('Officer / Email', 'เจ้าหน้าที่ / อีเมล')}</th>
                  <th className="hidden px-4 py-2.5 sm:table-cell">{tr('Position', 'ตำแหน่ง')}</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">{tr('Phone', 'เบอร์ติดต่อ')}</th>
                  <th className="px-4 py-2.5 text-center">{tr('Role (Lead)', 'บทบาท (Lead)')}</th>
                  <th className="px-4 py-2.5 text-right">{tr('Actions', 'การจัดการ')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentConfig.officers.map((officer) => (
                  <OfficerRow
                    key={officer.id}
                    officer={officer}
                    leadId={currentConfig.leadOfficer?.id}
                    hrStatus={hrStatus}
                    categoryDisabled={!enabledCategories.includes(selectedCategory)}
                    onSetLead={handleSetLeadOfficer}
                    onRemove={handleRemoveOfficer}
                    notify={notify}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Executives sub-tab -----------------------------------------------------------------------

interface ExecutiveCardProps {
  readonly exec: ExecutiveMember;
  readonly hrStatus: HrStatusMap;
  readonly onEdit: (exec: ExecutiveMember) => void;
  readonly onDelete: (id: string, name: string) => void;
  readonly onToggleStatus: (exec: ExecutiveMember) => void;
}

const ExecutiveCard: React.FC<ExecutiveCardProps> = ({
  exec,
  hrStatus,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const { tr } = useTr();
  const isActive = exec.status === 'active';
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition ${
        isActive
          ? 'border-slate-200 hover:border-purple-300'
          : 'border-slate-200 bg-slate-50/70 opacity-75'
      }`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold shadow-xs ${
                exec.roleType === 'CEO'
                  ? 'bg-gradient-to-br from-purple-700 to-indigo-800 text-white shadow-purple-200'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{exec.name}</h4>
                <span
                  className={`py-0.2 rounded-full px-2 text-[10px] font-bold tracking-wider uppercase ${
                    isActive
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-0.5 text-xs font-semibold text-purple-900">{exec.position}</div>
              <div className="text-[11px] text-slate-500">{exec.department}</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(exec)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-purple-50 hover:text-purple-600"
              title={tr('Edit details', 'แก้ไขข้อมูล')}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(exec.id, exec.name)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              title={tr('Remove', 'ลบรายชื่อ')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Details & Contacts */}
        <div className="space-y-2 py-3 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Mail className="h-3.5 w-3.5" />
              <span>{tr('Contact email:', 'อีเมลติดต่อ:')}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-800">
              {exec.email}
              <HrStatusPill email={exec.email} hrStatus={hrStatus} />
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Phone className="h-3.5 w-3.5" />
              <span>{tr('Phone:', 'เบอร์โทรศัพท์:')}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-800">{exec.phone || '-'}</span>
          </div>

          {/* Committees badges */}
          {exec.assignedCommittees && exec.assignedCommittees.length > 0 && (
            <div className="pt-2">
              <span className="mb-1 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {tr('Oversight committees:', 'คณะกรรมการกำกับดูแล:')}
              </span>
              <div className="flex flex-wrap gap-1">
                {exec.assignedCommittees.map((comm) => (
                  <span
                    key={comm}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                  >
                    {comm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Privileges Badges & Status Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {exec.isPrimaryWhistleblowerReceiver && (
            <span className="inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
              <Shield className="h-3 w-3 text-purple-600" />
              <span>{tr('Whistleblower Direct Line', 'สายตรง Whistleblower')}</span>
            </span>
          )}
          {exec.canViewConfidentialIdentities && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              <Eye className="h-3 w-3 text-amber-600" />
              <span>{tr('Identity Unlock', 'ปลดล็อคตัวตน')}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggleStatus(exec)}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
            isActive
              ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {isActive ? tr('Set inactive', 'พักสถานะ') : tr('Activate', 'เปิดใช้งาน')}
        </button>
      </div>
    </div>
  );
};

type ExecutivePanel = ReturnType<typeof useExecutivePanel>;

interface ExecutivesTabProps {
  readonly panel: ExecutivePanel;
  readonly executives: ExecutiveMember[];
  readonly hrStatus: HrStatusMap;
}

const ExecutivesTab: React.FC<ExecutivesTabProps> = ({ panel, executives, hrStatus }) => {
  const { tr } = useTr();
  const {
    execSearch,
    setExecSearch,
    isAddingExec,
    setIsAddingExec,
    editingExecId,
    execName,
    execPosition,
    setExecPosition,
    execDepartment,
    setExecDepartment,
    execEmail,
    setExecEmail,
    execPhone,
    setExecPhone,
    execRoleType,
    setExecRoleType,
    execIsWhistleblower,
    setExecIsWhistleblower,
    execCanViewConfidential,
    setExecCanViewConfidential,
    execReceiveAlerts,
    setExecReceiveAlerts,
    execCommittees,
    setExecCommittees,
    execStatus,
    setExecStatus,
    execPicked,
    handleSaveExecutive,
    handleEditExecClick,
    handleToggleExecForm,
    handleToggleExecStatus,
    handleDeleteExec,
    handleResetExecsToDefault,
    handleExecNameChange,
    handlePickExec,
  } = panel;

  const query = execSearch.toLowerCase();
  const filteredExecutives = executives.filter(
    (ex) =>
      ex.name.toLowerCase().includes(query) ||
      ex.position.toLowerCase().includes(query) ||
      ex.department.toLowerCase().includes(query) ||
      ex.email.toLowerCase().includes(query)
  );

  return (
    <div className="animate-in fade-in space-y-6 duration-200">
      {/* Top Actions & Filters */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex max-w-md flex-1 items-center gap-2">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            id="search-executives"
            placeholder={tr(
              'Search name, position, department or executive email...',
              'ค้นหารายชื่อ, ตำแหน่ง, ฝ่าย หรืออีเมลผู้บริหาร...'
            )}
            value={execSearch}
            onChange={(e) => setExecSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-9 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-reset-execs"
            onClick={handleResetExecsToDefault}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-rose-600"
            title={tr('Reset to defaults', 'รีเซ็ตเป็นค่าเริ่มต้น')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{tr('Reset default roster', 'รีเซ็ตรายชื่อเริ่มต้น')}</span>
          </button>

          <button
            type="button"
            id="btn-add-executive-toggle"
            onClick={handleToggleExecForm}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-purple-700"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>
              {isAddingExec
                ? tr('Close form', 'ปิดฟอร์ม')
                : tr('Add Executive', 'เพิ่มรายชื่อผู้บริหาร')}
            </span>
          </button>
        </div>
      </div>

      {/* Add / Edit Executive Form Modal / Inline Box */}
      {isAddingExec && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-purple-200 bg-purple-50/60 p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between border-b border-purple-100 pb-2">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-700" />
              <h3 className="text-sm font-bold text-purple-950">
                {editingExecId
                  ? tr('Edit Senior Executive', 'แก้ไขข้อมูลผู้บริหารระดับสูง')
                  : tr('Register New Senior Executive', 'ลงทะเบียนผู้บริหารระดับสูงท่านใหม่')}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingExec(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSaveExecutive} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label
                  htmlFor="exec-name"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Full name *', 'ชื่อ - นามสกุล *')}
                </label>
                <HrNameField
                  id="exec-name"
                  placeholder={tr('e.g. Prasert Akkaradechanon', 'เช่น คุณประเสริฐ อัครเดชานนท์')}
                  value={execName}
                  onChange={handleExecNameChange}
                  onPick={handlePickExec}
                  search={searchHrEmployees}
                  className={inputClass('focus:ring-purple-500')}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="exec-position"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Executive position *', 'ตำแหน่งทางการบริหาร *')}
                </label>
                <input
                  type="text"
                  id="exec-position"
                  placeholder={tr(
                    'e.g. Chief Executive Officer (CEO)',
                    'เช่น ประธานเจ้าหน้าที่บริหาร (CEO)'
                  )}
                  value={execPosition}
                  onChange={(e) => setExecPosition(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="exec-department"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Division / affiliation', 'สายงาน / สังกัด')}
                </label>
                <input
                  type="text"
                  id="exec-department"
                  placeholder={tr('e.g. Office of the CEO', 'เช่น Office of the CEO')}
                  value={execDepartment}
                  onChange={(e) => setExecDepartment(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="exec-email"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Executive email *', 'อีเมลผู้บริหาร *')}
                </label>
                <input
                  type="email"
                  id="exec-email"
                  placeholder={tr(
                    'e.g. prasert.ceo@enterprise.co.th',
                    'เช่น prasert.ceo@enterprise.co.th'
                  )}
                  value={execEmail}
                  onChange={(e) => setExecEmail(e.target.value)}
                  readOnly={execPicked}
                  className={inputClass('focus:ring-purple-500', execPicked)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="exec-phone"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Direct phone', 'เบอร์ติดต่อด่วน')}
                </label>
                <input
                  type="text"
                  id="exec-phone"
                  placeholder={tr('e.g. 02-998-1001', 'เช่น 02-998-1001')}
                  value={execPhone}
                  onChange={(e) => setExecPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="exec-role-type"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Role Classification', 'ประเภทบทบาท (Role Classification)')}
                </label>
                <select
                  id="exec-role-type"
                  value={execRoleType}
                  onChange={(e) => setExecRoleType(e.target.value as ExecutiveMember['roleType'])}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="CEO">
                    {tr('CEO (Chief Executive Officer)', 'CEO (ประธานเจ้าหน้าที่บริหาร)')}
                  </option>
                  <option value="EVP">
                    {tr(
                      'EVP (Senior Executive Vice President)',
                      'EVP (รองกรรมการผู้จัดการใหญ่อาวุโส)'
                    )}
                  </option>
                  <option value="GRC_Chair">
                    {tr('GRC Chair', 'ประธานกำกับดูแลบรรษัทภิบาล (GRC Chair)')}
                  </option>
                  <option value="Audit_Committee">
                    {tr(
                      'Audit Committee Chair / Member',
                      'ประธาน/กรรมการตรวจสอบ (Audit Committee)'
                    )}
                  </option>
                  <option value="Board_Member">
                    {tr('Board Member', 'กรรมการบริษัท (Board Member)')}
                  </option>
                </select>
              </div>

              <ExecStatusSelect
                id="exec-status"
                value={execStatus}
                onChange={setExecStatus}
                dense
              />
            </div>

            <div>
              <label
                htmlFor="exec-committees"
                className="mb-1 block text-[11px] font-semibold text-slate-700"
              >
                {tr('Committees (comma-separated)', 'คณะกรรมการที่สังกัด (คั่นด้วยจุลภาค ,)')}
              </label>
              <input
                type="text"
                id="exec-committees"
                placeholder={tr(
                  'e.g. Executive Committee (ExCom), Corporate Ethics Committee',
                  'เช่น คณะกรรมการบริหารระดับสูง (ExCom), คณะกรรมการจริยธรรมองค์กร'
                )}
                value={execCommittees}
                onChange={(e) => setExecCommittees(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Privileges Switches */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-purple-100 bg-white p-3 sm:grid-cols-3">
              <label
                htmlFor="exec-check-whistleblower"
                aria-labelledby="exec-check-whistleblower-title exec-check-whistleblower-desc"
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  id="exec-check-whistleblower"
                  checked={execIsWhistleblower}
                  onChange={(e) => setExecIsWhistleblower(e.target.checked)}
                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span
                    id="exec-check-whistleblower-title"
                    className="block text-xs font-semibold text-slate-900"
                  >
                    {tr('Receive Whistleblower direct cases', 'รับเคสสายตรง Whistleblower')}
                  </span>
                  <span id="exec-check-whistleblower-desc" className="text-[10px] text-slate-500">
                    {tr('Enables Direct CEO/EVP cases', 'เปิดสิทธิ์รับเคส Direct CEO/EVP')}
                  </span>
                </div>
              </label>

              <label
                htmlFor="exec-check-confidential"
                aria-labelledby="exec-check-confidential-title exec-check-confidential-desc"
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  id="exec-check-confidential"
                  checked={execCanViewConfidential}
                  onChange={(e) => setExecCanViewConfidential(e.target.checked)}
                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span
                    id="exec-check-confidential-title"
                    className="block text-xs font-semibold text-slate-900"
                  >
                    {tr('Confidential case identity access', 'สิทธิ์ดูชื่อเคสลับเฉพาะ')}
                  </span>
                  <span id="exec-check-confidential-desc" className="text-[10px] text-slate-500">
                    {tr(
                      'Unlock identity details when necessary',
                      'ปลดล็อคข้อมูลตัวตนกรณีมีเหตุจำเป็น'
                    )}
                  </span>
                </div>
              </label>

              <label
                htmlFor="exec-check-alerts"
                aria-labelledby="exec-check-alerts-title exec-check-alerts-desc"
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  id="exec-check-alerts"
                  checked={execReceiveAlerts}
                  onChange={(e) => setExecReceiveAlerts(e.target.checked)}
                  className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span
                    id="exec-check-alerts-title"
                    className="block text-xs font-semibold text-slate-900"
                  >
                    {tr('High-risk alerts', 'รับแจ้งเตือนความเสี่ยงสูง')}
                  </span>
                  <span id="exec-check-alerts-desc" className="text-[10px] text-slate-500">
                    {tr('Send email alerts immediately', 'ส่ง Alert ทางอีเมลทันที')}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingExec(false)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                {tr('Cancel', 'ยกเลิก')}
              </button>
              <button
                type="submit"
                id="btn-save-exec"
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
              >
                <Check className="h-3.5 w-3.5" />
                <span>
                  {editingExecId
                    ? tr('Save changes', 'บันทึกการแก้ไข')
                    : tr('Save executive', 'บันทึกผู้บริหาร')}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Executive Roster Grid / Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredExecutives.map((exec) => (
          <ExecutiveCard
            key={exec.id}
            exec={exec}
            hrStatus={hrStatus}
            onEdit={handleEditExecClick}
            onDelete={handleDeleteExec}
            onToggleStatus={handleToggleExecStatus}
          />
        ))}
      </div>
    </div>
  );
};

// --- HR Admins sub-tab ------------------------------------------------------------------------

interface HrAdminCardProps {
  readonly admin: HrAdminMember;
  readonly hrStatus: HrStatusMap;
  readonly onEdit: (admin: HrAdminMember) => void;
  readonly onDelete: (id: string, name: string) => void;
  readonly onToggleStatus: (admin: HrAdminMember) => void;
}

const HrAdminCard: React.FC<HrAdminCardProps> = ({
  admin,
  hrStatus,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const { tr } = useTr();
  const isActive = admin.status === 'active';
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition ${
        isActive
          ? 'border-slate-200 hover:border-rose-300'
          : 'border-slate-200 bg-slate-50/70 opacity-75'
      }`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold shadow-xs ${
                admin.roleLevel === 'super_admin'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{admin.name}</h4>
                <span
                  className={`py-0.2 rounded-full px-2 text-[10px] font-bold tracking-wider uppercase ${
                    admin.roleLevel === 'super_admin'
                      ? 'border border-rose-200 bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {admin.roleLevel.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-0.5 text-xs font-semibold text-rose-900">{admin.position}</div>
              <div className="text-[11px] text-slate-500">{admin.department}</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(admin)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              title={tr('Edit details', 'แก้ไขข้อมูล')}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(admin.id, admin.name)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              title={tr('Remove', 'ลบรายชื่อ')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Contacts */}
        <div className="space-y-2 py-3 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Mail className="h-3.5 w-3.5" />
              <span>{tr('Official email:', 'อีเมลทางการ:')}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-800">
              {admin.email}
              <HrStatusPill email={admin.email} hrStatus={hrStatus} />
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Phone className="h-3.5 w-3.5" />
              <span>{tr('Phone:', 'เบอร์โทรศัพท์:')}</span>
            </span>
            <span className="font-mono text-[11px] text-slate-800">{admin.phone || '-'}</span>
          </div>
        </div>
      </div>

      {/* Privileges Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {admin.canManageRbac && (
            <span className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
              <Lock className="h-3 w-3 text-rose-600" />
              <span>{tr('Manage RBAC', 'จัดการ RBAC')}</span>
            </span>
          )}
          {admin.canManageGatekeepers && (
            <span className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              <Shield className="h-3 w-3 text-indigo-600" />
              <span>{tr('Appoint Gatekeepers', 'แต่งตั้ง Gatekeeper')}</span>
            </span>
          )}
          {admin.canManageExecutives && (
            <span className="inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
              <Crown className="h-3 w-3 text-purple-600" />
              <span>{tr('Manage Executives', 'จัดการผู้บริหาร')}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggleStatus(admin)}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
            isActive
              ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {isActive ? tr('Set inactive', 'พักสถานะ') : tr('Activate', 'เปิดใช้งาน')}
        </button>
      </div>
    </div>
  );
};

type HrAdminPanel = ReturnType<typeof useHrAdminPanel>;

interface HrAdminsTabProps {
  readonly panel: HrAdminPanel;
  readonly hrAdmins: HrAdminMember[];
  readonly hrStatus: HrStatusMap;
}

const HrAdminsTab: React.FC<HrAdminsTabProps> = ({ panel, hrAdmins, hrStatus }) => {
  const { tr } = useTr();
  const {
    adminSearch,
    setAdminSearch,
    isAddingAdmin,
    setIsAddingAdmin,
    editingAdminId,
    adminName,
    adminPosition,
    setAdminPosition,
    adminDepartment,
    setAdminDepartment,
    adminEmail,
    setAdminEmail,
    adminPhone,
    setAdminPhone,
    adminRoleLevel,
    setAdminRoleLevel,
    adminCanManageRbac,
    setAdminCanManageRbac,
    adminCanManageGatekeepers,
    setAdminCanManageGatekeepers,
    adminCanManageExecutives,
    setAdminCanManageExecutives,
    adminPicked,
    handleSaveHrAdmin,
    handleEditAdminClick,
    handleToggleAdminForm,
    handleToggleAdminStatus,
    handleDeleteAdmin,
    handleResetAdminsToDefault,
    handleAdminNameChange,
    handlePickAdmin,
  } = panel;

  const query = adminSearch.toLowerCase();
  const filteredAdmins = hrAdmins.filter(
    (ad) =>
      ad.name.toLowerCase().includes(query) ||
      ad.position.toLowerCase().includes(query) ||
      ad.department.toLowerCase().includes(query) ||
      ad.email.toLowerCase().includes(query)
  );

  return (
    <div className="animate-in fade-in space-y-6 duration-200">
      {/* Top Actions & Filters */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex max-w-md flex-1 items-center gap-2">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            id="search-admins"
            placeholder={tr(
              'Search name, position, department or HR Admin email...',
              'ค้นหารายชื่อ, ตำแหน่ง, ฝ่าย หรืออีเมล HR Admin...'
            )}
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-9 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-reset-admins"
            onClick={handleResetAdminsToDefault}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:text-rose-600"
            title={tr('Reset to defaults', 'รีเซ็ตเป็นค่าเริ่มต้น')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{tr('Reset default roster', 'รีเซ็ตรายชื่อเริ่มต้น')}</span>
          </button>

          <button
            type="button"
            id="btn-add-admin-toggle"
            onClick={handleToggleAdminForm}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>
              {isAddingAdmin
                ? tr('Close form', 'ปิดฟอร์ม')
                : tr('Add HR Admin', 'เพิ่มเจ้าหน้าที่ HR Admin')}
            </span>
          </button>
        </div>
      </div>

      {/* Add / Edit HR Admin Form */}
      {isAddingAdmin && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between border-b border-rose-100 pb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-rose-700" />
              <h3 className="text-sm font-bold text-rose-950">
                {editingAdminId
                  ? tr('Edit HR Admin', 'แก้ไขข้อมูลเจ้าหน้าที่ HR Admin')
                  : tr('Register New HR Admin', 'ลงทะเบียนเจ้าหน้าที่ HR Admin ท่านใหม่')}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingAdmin(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSaveHrAdmin} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label
                  htmlFor="admin-name"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Full name *', 'ชื่อ - นามสกุล *')}
                </label>
                <HrNameField
                  id="admin-name"
                  placeholder={tr('e.g. Chidchanok Wongprasert', 'เช่น คุณชิดชนก วงศ์ประเสริฐ')}
                  value={adminName}
                  onChange={handleAdminNameChange}
                  onPick={handlePickAdmin}
                  search={searchHrEmployees}
                  className={inputClass('focus:ring-rose-500')}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="admin-position"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Job title *', 'ตำแหน่งงาน *')}
                </label>
                <input
                  type="text"
                  id="admin-position"
                  placeholder={tr(
                    'e.g. HR Director & Executive Representative',
                    'เช่น HR Director & Executive Representative'
                  )}
                  value={adminPosition}
                  onChange={(e) => setAdminPosition(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="admin-department"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Division / department', 'ฝ่าย / แผนก')}
                </label>
                <input
                  type="text"
                  id="admin-department"
                  placeholder={tr(
                    'e.g. People & Organization Strategy Division',
                    'เช่น People & Organization Strategy Division'
                  )}
                  value={adminDepartment}
                  onChange={(e) => setAdminDepartment(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Official email *', 'อีเมลทางการ *')}
                </label>
                <input
                  type="email"
                  id="admin-email"
                  placeholder={tr(
                    'e.g. chidchanok.w@enterprise.co.th',
                    'เช่น chidchanok.w@enterprise.co.th'
                  )}
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  readOnly={adminPicked}
                  className={inputClass('focus:ring-rose-500', adminPicked)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="admin-phone"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Internal phone', 'เบอร์ติดต่อภายใน')}
                </label>
                <input
                  type="text"
                  id="admin-phone"
                  placeholder={tr('e.g. 02-998-2001', 'เช่น 02-998-2001')}
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-role-level"
                  className="mb-1 block text-[11px] font-semibold text-slate-700"
                >
                  {tr('Role Level', 'ระดับสิทธิ์ดูแลระบบ (Role Level)')}
                </label>
                <select
                  id="admin-role-level"
                  value={adminRoleLevel}
                  onChange={(e) => setAdminRoleLevel(e.target.value as HrAdminMember['roleLevel'])}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="super_admin">
                    {tr('Super Admin (full access)', 'Super Admin (สิทธิ์สูงสุดทุกส่วน)')}
                  </option>
                  <option value="hr_manager">
                    {tr(
                      'HR Manager (manages Gatekeepers & cases)',
                      'HR Manager (จัดการ Gatekeeper & เคส)'
                    )}
                  </option>
                  <option value="compliance_auditor">
                    {tr('Compliance & GRC Auditor (audit)', 'Compliance & GRC Auditor (ตรวจสอบ)')}
                  </option>
                </select>
              </div>
            </div>

            {/* Privileges Switches */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-rose-100 bg-white p-3 sm:grid-cols-3">
              <label
                htmlFor="admin-check-rbac"
                aria-labelledby="admin-check-rbac-title admin-check-rbac-desc"
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  id="admin-check-rbac"
                  checked={adminCanManageRbac}
                  onChange={(e) => setAdminCanManageRbac(e.target.checked)}
                  className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span
                    id="admin-check-rbac-title"
                    className="block text-xs font-semibold text-slate-900"
                  >
                    {tr('Edit RBAC Matrix', 'สิทธิ์ปรับแก้ RBAC Matrix')}
                  </span>
                  <span id="admin-check-rbac-desc" className="text-[10px] text-slate-500">
                    {tr(
                      'Set tabs and permissions for each role',
                      'กำหนดแท็บและสิทธิ์ของแต่ละบทบาท'
                    )}
                  </span>
                </div>
              </label>

              <label
                htmlFor="admin-check-gatekeeper"
                aria-labelledby="admin-check-gatekeeper-title admin-check-gatekeeper-desc"
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  id="admin-check-gatekeeper"
                  checked={adminCanManageGatekeepers}
                  onChange={(e) => setAdminCanManageGatekeepers(e.target.checked)}
                  className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span
                    id="admin-check-gatekeeper-title"
                    className="block text-xs font-semibold text-slate-900"
                  >
                    {tr('Appoint Gatekeepers', 'สิทธิ์แต่งตั้ง Gatekeeper')}
                  </span>
                  <span id="admin-check-gatekeeper-desc" className="text-[10px] text-slate-500">
                    {tr('Assign the Lead of each of the 6 departments', 'กำหนด Lead ประจำ 6 ฝ่าย')}
                  </span>
                </div>
              </label>

              <label
                htmlFor="admin-check-execs"
                aria-labelledby="admin-check-execs-title admin-check-execs-desc"
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  id="admin-check-execs"
                  checked={adminCanManageExecutives}
                  onChange={(e) => setAdminCanManageExecutives(e.target.checked)}
                  className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span
                    id="admin-check-execs-title"
                    className="block text-xs font-semibold text-slate-900"
                  >
                    {tr('Manage executive roster', 'สิทธิ์จัดการรายชื่อผู้บริหาร')}
                  </span>
                  <span id="admin-check-execs-desc" className="text-[10px] text-slate-500">
                    Maintain Executive Directory
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingAdmin(false)}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                {tr('Cancel', 'ยกเลิก')}
              </button>
              <button
                type="submit"
                id="btn-save-admin"
                className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
              >
                <Check className="h-3.5 w-3.5" />
                <span>
                  {editingAdminId
                    ? tr('Save changes', 'บันทึกการแก้ไข')
                    : tr('Save HR Admin', 'บันทึกเจ้าหน้าที่ HR Admin')}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Roster Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredAdmins.map((admin) => (
          <HrAdminCard
            key={admin.id}
            admin={admin}
            hrStatus={hrStatus}
            onEdit={handleEditAdminClick}
            onDelete={handleDeleteAdmin}
            onToggleStatus={handleToggleAdminStatus}
          />
        ))}
      </div>
    </div>
  );
};

// --- Screen -----------------------------------------------------------------------------------

export const AdminGatekeeperManagement: React.FC<AdminGatekeeperManagementProps> = ({
  tickets = [],
  initialExecutives,
  initialHrAdmins,
  hrStatus,
}) => {
  const { tr } = useTr();
  const { gatekeeperConfigs, identity } = useShell();
  const [activeSubTab, setActiveSubTab] = useState<ManagementSubTab>('gatekeepers');
  const [configs, setConfigs] = useSyncedState(gatekeeperConfigs);
  const [executives, setExecutives] = useSyncedState(initialExecutives);
  const [hrAdmins, setHrAdmins] = useSyncedState(initialHrAdmins);

  // In-app confirmation dialog (replaces window.confirm — see ConfirmDialog.tsx)
  const { askConfirm, confirmDialog } = useConfirmDialog();
  const { toastMessage, showToast } = useToast();
  const run = useRosterRunner(showToast);
  const deps: PanelDeps = { run, showToast, askConfirm };

  const gatekeeperPanel = useGatekeeperPanel(deps, configs, setConfigs);
  const executivePanel = useExecutivePanel(deps, setExecutives);
  const hrAdminPanel = useHrAdminPanel(deps, hrAdmins, setHrAdmins, identity.email);

  const categoryKeys = Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[];
  const totalOfficersCount = categoryKeys.reduce(
    (acc, cat) => acc + (configs[cat]?.officers?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="animate-in fade-in slide-in-from-bottom-2 fixed right-5 bottom-5 z-50 flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs text-white shadow-2xl">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2.5 text-xs font-semibold tracking-wider text-indigo-300 uppercase">
              <Shield className="h-4 w-4 text-indigo-400" />
              <span>
                {tr(
                  'Personnel & Governance Directory',
                  'ศูนย์บริหารจัดการโครงสร้างบุคลากรและสิทธิ์ (Personnel & Governance Directory)'
                )}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {tr(
                'Manage Executives, HR Admins & Department Gatekeepers',
                'จัดการผู้บริหารระดับสูง, HR Admin & Gatekeeper ประจำฝ่าย'
              )}
            </h1>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              {tr(
                'A central place for HR Admins and executive representatives to maintain the executive roster (CEO/EVP Whistleblower Channel), HR Admin & GRC officers, the Gatekeepers of all 6 departments, and email notifications.',
                'จุดศูนย์กลางสำหรับ HR Admin และตัวแทนผู้บริหารในการ Maintain รายชื่อคณะผู้บริหาร (CEO/EVP Whistleblower Channel), เจ้าหน้าที่ HR Admin & GRC, ผู้รับผิดชอบ Gatekeeper ทั้ง 6 หน่วยงาน และระบบแจ้งเตือน Email'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-center backdrop-blur">
              <span className="block text-[11px] text-slate-300">
                {tr('Executives', 'ผู้บริหาร (Executives)')}
              </span>
              <span className="text-lg font-bold text-purple-300">
                {countPeople(executives.length, tr)}
              </span>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-center backdrop-blur">
              <span className="block text-[11px] text-slate-300">HR Admins</span>
              <span className="text-lg font-bold text-rose-300">
                {countPeople(hrAdmins.length, tr)}
              </span>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-center backdrop-blur">
              <span className="block text-[11px] text-slate-300">
                {tr('Gatekeepers (6 departments)', 'Gatekeepers (6 ฝ่าย)')}
              </span>
              <span className="text-lg font-bold text-indigo-300">
                {countPeople(totalOfficersCount, tr)}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Switcher */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
          <button
            type="button"
            id="subtab-gatekeepers"
            onClick={() => setActiveSubTab('gatekeepers')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeSubTab === 'gatekeepers'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>
              {tr(
                `1. Gatekeepers of 6 Departments (${totalOfficersCount})`,
                `1. Gatekeeper ประจำ 6 ฝ่ายงาน (${totalOfficersCount})`
              )}
            </span>
          </button>

          <button
            type="button"
            id="subtab-executives"
            onClick={() => setActiveSubTab('executives')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeSubTab === 'executives'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Crown className="h-4 w-4" />
            <span>
              {tr(
                `2. Senior Executives & CEO Direct (${executives.length})`,
                `2. คณะผู้บริหารระดับสูง & CEO Direct (${executives.length})`
              )}
            </span>
          </button>

          <button
            type="button"
            id="subtab-hr-admins"
            onClick={() => setActiveSubTab('hr_admins')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeSubTab === 'hr_admins'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>
              {tr(
                `3. HR Admin & GRC Operator Team (${hrAdmins.length})`,
                `3. ทีมงาน HR Admin & GRC Operator (${hrAdmins.length})`
              )}
            </span>
          </button>

          <button
            type="button"
            id="subtab-email-notifications"
            onClick={() => setActiveSubTab('email_notifications')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeSubTab === 'email_notifications'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>
              {tr(
                '4. Email Notifications & Templates',
                '4. ระบบแจ้งเตือน Email & เทมเพลต (Email Settings)'
              )}
            </span>
          </button>
        </div>
      </div>

      {activeSubTab === 'gatekeepers' && (
        <GatekeepersTab
          panel={gatekeeperPanel}
          tickets={tickets}
          hrStatus={hrStatus}
          notify={showToast}
        />
      )}

      {activeSubTab === 'executives' && (
        <ExecutivesTab panel={executivePanel} executives={executives} hrStatus={hrStatus} />
      )}

      {activeSubTab === 'hr_admins' && (
        <HrAdminsTab panel={hrAdminPanel} hrAdmins={hrAdmins} hrStatus={hrStatus} />
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: EMAIL NOTIFICATIONS SETTINGS & TEMPLATES                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'email_notifications' && (
        <div className="animate-in fade-in duration-200">
          <AdminEmailNotificationSettings />
        </div>
      )}

      {/* Global Guidance Note */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
        <div>
          <span className="mb-0.5 block font-bold text-slate-800">
            {tr(
              'Corporate Governance & Whistleblower Directory:',
              'หลักการกำกับดูแลความปลอดภัยและการคุ้มครองข้อมูล (Corporate Governance & Whistleblower Directory):'
            )}
          </span>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {tr(
              'The executive, HR Admin and Gatekeeper rosters on this page are linked to the Automated Notification System and the CEO Direct Whistleblower Channel triage. Data is backed up in real time, and personnel can be edited or added at any time.',
              'ข้อมูลรายชื่อคณะผู้บริหาร, HR Admin และ Gatekeeper ในหน้านี้เชื่อมโยงกับระบบแจ้งเตือนอัตโนมัติ (Automated Notification System) และระบบคัดกรองคำร้องสายตรง (CEO Direct Whistleblower Channel) โดยมีระบบสำรองข้อมูลในเครื่องแบบเรียลไทม์ และสามารถแก้ไขหรือเพิ่มบุคลากรได้ตลอดเวลา'
            )}
          </p>
        </div>
      </div>

      {confirmDialog}
    </div>
  );
};
