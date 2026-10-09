'use client';

import React, { useEffect, useState } from 'react';
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
  Info,
  FileText,
  ListChecks,
  GitBranch,
  Layers,
  ChevronRight,
  Scale,
  Trash2,
  Mail,
  Phone,
  UserPlus,
  Building,
  Edit2,
  EyeOff,
  Database,
  KeyRound,
} from 'lucide-react';
import {
  UserRole,
  AppTabId,
  GrievanceCategory,
  RolePermissionConfig,
  ExecutiveMember,
  EmployeeRecord,
  CategoryInfo,
  TabDefinition,
} from '../types';
import { APP_TABS, INITIAL_ROLE_PERMISSIONS } from '../services/api';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { useShell } from '@/app/shell-context';
import { saveRoleAccessConfigs, resetRolePermissionsToDefault } from '@/lib/actions/role-access';
import {
  addExecutiveMember,
  updateExecutiveMember,
  deleteExecutiveMember,
} from '@/lib/actions/executives';
import { getDirectoryPage, searchHrEmployees } from '@/lib/actions/directory';
import { useConfirmDialog } from './ConfirmDialog';
import { ExecStatusSelect, ExecutiveStatus } from './executiveShared';
import HrNameField from './HrNameField';
import { normalizeEmail } from '@/lib/email-identity';
import { clickableProps } from './clickableProps';
import { useTr } from '../context/useTr';
import type { Language } from '../context/LanguageContext';

const rolesList: UserRole[] = ['employee', 'gatekeeper', 'executive', 'admin'];

const ROLE_SHORT_LABEL: Record<UserRole, Record<Language, string>> = {
  employee: { th: 'พนักงาน', en: 'Employee' },
  gatekeeper: { th: 'GK', en: 'GK' },
  executive: { th: 'ผู้บริหาร', en: 'Executive' },
  admin: { th: 'Admin', en: 'Admin' },
};

type Tr = (en: string, th: string) => string;

/** Role name for cards and matrix headers ("พนักงานทั่วไป " in Thai, the English title otherwise). */
const roleCardTitle = (config: RolePermissionConfig, lang: Language) =>
  lang === 'en' ? config.roleTitleEn : config.roleTitleTh.split('(')[0];

/** First word of the role title — used in toasts and the simulator. */
const roleShortName = (config: RolePermissionConfig, lang: Language) =>
  lang === 'en' ? config.roleTitleEn : config.roleTitleTh.split(' ')[0];

/** The stored role description is Thai; English comes from the default entry for that role. */
const roleDescription = (role: UserRole, config: RolePermissionConfig, lang: Language) =>
  lang === 'en'
    ? (config.descriptionEn ?? INITIAL_ROLE_PERMISSIONS[role].descriptionEn ?? config.descriptionTh)
    : config.descriptionTh;

const categoryName = (info: CategoryInfo, lang: Language) =>
  lang === 'en' ? info.nameEn : info.nameTh;

const categoryDescription = (info: CategoryInfo, lang: Language) =>
  lang === 'en' ? (info.descriptionEn ?? info.descriptionTh) : info.descriptionTh;

const tabDescription = (tab: TabDefinition, lang: Language) =>
  lang === 'en' ? (tab.descriptionEn ?? tab.descriptionTh) : tab.descriptionTh;

/** Th keeps the legacy "ชื่อไทย (English name)" cell; English shows the English name alone. */
const employeeDisplayName = (emp: EmployeeRecord, lang: Language) =>
  lang === 'en' ? emp.nameEn || emp.nameTh : `${emp.nameTh} (${emp.nameEn})`;

// Quick presets for who may see the login e-mail of an anonymous submitter.
const ANONYMOUS_PRESETS: {
  label: string;
  toast: string;
  textClass: string;
  visibleTo: Record<UserRole, boolean>;
  labelEn: string;
  toastEn: string;
}[] = [
  {
    label: '🔒 เฉพาะ HR Admin & ผู้บริหาร (แนะนำ)',
    toast: 'ตั้งค่า: ให้เฉพาะ HR Admin & ผู้บริหาร มองเห็นอีเมลล็อกอิน',
    labelEn: '🔒 HR Admin & Executives only (recommended)',
    toastEn: 'Set: only HR Admin & Executives can see the login e-mail',
    textClass: 'text-slate-700',
    visibleTo: { employee: false, gatekeeper: false, executive: true, admin: true },
  },
  {
    label: '🛡️ Gatekeeper + ผู้บริหาร + HR Admin',
    toast: 'ตั้งค่า: ให้ Gatekeeper, ผู้บริหาร และ HR Admin มองเห็นอีเมลล็อกอิน',
    labelEn: '🛡️ Gatekeeper + Executives + HR Admin',
    toastEn: 'Set: Gatekeeper, Executives and HR Admin can see the login e-mail',
    textClass: 'text-slate-700',
    visibleTo: { employee: false, gatekeeper: true, executive: true, admin: true },
  },
  {
    label: '🚫 ปกปิด 100% ทุก Role',
    toast: 'ตั้งค่า: ปกปิดอีเมลล็อกอิน 100% ทุก Role',
    labelEn: '🚫 Hide from every role (100%)',
    toastEn: 'Set: login e-mail hidden from every role (100%)',
    textClass: 'text-rose-700',
    visibleTo: { employee: false, gatekeeper: false, executive: false, admin: false },
  },
];

interface AnonymousSimulatorCardProps {
  readonly isSimAllowed: boolean;
  readonly roleName: string;
}

/** Read-only preview of what the anonymous-ticket submitter panel shows a given role. */
const AnonymousSimulatorCard: React.FC<AnonymousSimulatorCardProps> = ({
  isSimAllowed,
  roleName,
}) => {
  const { tr } = useTr();
  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <EyeOff className="h-4 w-4 text-slate-500" />
          <span>
            {tr(
              'Submitter details (Anonymous Ticket)',
              'ข้อมูลผู้ยื่นเรื่อง (กรณีไม่ระบุตัวตน / Anonymous Ticket)'
            )}
          </span>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          🕵️ {tr('Anonymous', 'ไม่ระบุตัวตน (Anonymous)')}
        </span>
      </div>

      {isSimAllowed ? (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
              <Mail className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                {tr(
                  'Login e-mail (mapped in the back office from the employee database):',
                  'อีเมลที่ใช้ในการ Login (Mapping หลังบ้านจากฐานข้อมูลพนักงาน):'
                )}
              </span>
            </div>
            <span className="py-0.2 rounded bg-emerald-200 px-2 text-[10px] font-bold text-emerald-900">
              ✓{' '}
              {tr(
                `Visible to this role (Role: ${roleName})`,
                `ได้รับสิทธิ์มองเห็น (Role: ${roleName})`
              )}
            </span>
          </div>
          <div className="flex items-center justify-between rounded border border-emerald-200 bg-white p-2">
            <span className="font-mono text-xs font-bold text-indigo-950">
              somchai.v@company.internal
            </span>
            <span className="text-[10px] text-slate-500">
              {tr('Mapped from Employee DB: EMP-4092', 'Mapping จาก Employee DB: EMP-4092')}
            </span>
          </div>
          <p className="text-[10.5px] leading-tight text-emerald-900/90">
            {tr(
              '* Note: HR Admin & the Executive Representative have allowed your role to see this login e-mail (name, surname and employee ID remain protected under the witness protection policy)',
              '* หมายเหตุ: HR Admin & ตัวแทนผู้บริหาร ได้ tick อนุญาตให้บทบาทของคุณมองเห็น email ที่ใช้ในการ login นี้ได้ (โดยชื่อ นามสกุล และรหัสพนักงาน ยังคงได้รับการปกป้องตามนโยบายคุ้มครองพยาน)'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              <span>{tr('Login e-mail:', 'อีเมลที่ใช้ในการ Login:')}</span>
            </div>
            <span className="py-0.2 rounded bg-slate-200 px-2 text-[10px] font-bold text-slate-700">
              🔒 {tr(`Hidden (Role: ${roleName})`, `ปกปิด (Role: ${roleName})`)}
            </span>
          </div>
          <div className="rounded border border-slate-200 bg-white p-2 font-mono text-xs text-slate-400 select-none">
            ••••••••••••••••@••••••••••••
          </div>
          <p className="text-[10.5px] leading-tight text-slate-500">
            {tr(
              `* Note: your role (${roleName}) has not been allowed by HR Admin & the Executive Representative to see the login e-mail of this anonymous submitter`,
              `* หมายเหตุ: บทบาทของคุณ (${roleName}) ไม่ได้รับอนุญาตจาก HR Admin & ตัวแทนผู้บริหาร ให้มองเห็นอีเมลล็อกอินของผู้ยื่นเรื่องนิรนามนี้`
            )}
          </p>
        </div>
      )}
    </div>
  );
};

const permissionSaveError = (tr: Tr) =>
  tr(
    '⚠️ Could not save the permissions. Please try again.',
    '⚠️ บันทึกสิทธิ์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
  );
const permissionLockoutError = (tr: Tr) =>
  tr(
    '⚠️ The RBAC page permission for HR Admin cannot be turned off, to prevent a system lock-out',
    '⚠️ ไม่สามารถปิดสิทธิ์หน้า RBAC สำหรับ HR Admin เพื่อป้องกันการล็อกระบบ'
  );
const executiveSaveError = (tr: Tr) =>
  tr('⚠️ Could not save. Please try again.', '⚠️ บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');

const permissionErrorMessage = (error: unknown, tr: Tr) =>
  error instanceof Error && error.message.includes('ADMIN_LOCKOUT')
    ? permissionLockoutError(tr)
    : permissionSaveError(tr);

type HrStatusMap = Record<string, 'active' | 'inactive'> | null;
type HrBadgeKind = 'missing' | 'inactive' | null;

/** Which HR badge (if any) a roster e-mail earns. `null` map = HR view unreachable → no badges. */
const hrBadgeFor = (email: string, hrStatus: HrStatusMap): HrBadgeKind => {
  if (!hrStatus) return null;
  const status = hrStatus[normalizeEmail(email)];
  if (status === undefined) return 'missing';
  return status === 'inactive' ? 'inactive' : null;
};

const HrBadge: React.FC<{ readonly kind: HrBadgeKind }> = ({ kind }) => {
  const { tr } = useTr();
  if (kind === 'missing') {
    return (
      <span
        title={tr(
          'Not found in the HR database — can receive notification e-mails but cannot sign in with SSO',
          'ไม่พบในฐานข้อมูล HR — รับอีเมลแจ้งเตือนได้ แต่เข้าสู่ระบบด้วย SSO ไม่ได้'
        )}
        className="rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
      >
        {tr('Not in HR', 'ไม่อยู่ใน HR')}
      </span>
    );
  }
  if (kind === 'inactive') {
    return (
      <span
        title={tr(
          'No longer an active employee in the HR database',
          'ไม่ใช่พนักงานที่ปฏิบัติงานอยู่ในฐานข้อมูล HR แล้ว'
        )}
        className="rounded-full border border-rose-200 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700"
      >
        {tr('Inactive in HR', 'พ้นสภาพใน HR')}
      </span>
    );
  }
  return null;
};

interface ExecForm {
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  roleType: ExecutiveMember['roleType'];
  isWhistleblower: boolean;
  canViewConfidential: boolean;
  status: ExecutiveStatus;
  /** Filled from an HR suggestion → the login e-mail is locked to the HR value. */
  picked: boolean;
}

const EMPTY_EXEC_FORM: ExecForm = {
  name: '',
  position: '',
  department: '',
  email: '',
  phone: '',
  roleType: 'CEO',
  isWhistleblower: true,
  canViewConfidential: true,
  status: 'active',
  picked: false,
};

const execFormFromMember = (exec: ExecutiveMember): ExecForm => ({
  name: exec.name,
  position: exec.position,
  department: exec.department,
  email: exec.email,
  phone: exec.phone || '',
  roleType: exec.roleType,
  isWhistleblower: exec.isPrimaryWhistleblowerReceiver,
  canViewConfidential: exec.canViewConfidentialIdentities,
  status: exec.status || 'active',
  picked: false,
});

const execFieldsFromForm = (form: ExecForm) => ({
  name: form.name.trim(),
  position: form.position.trim() || 'ผู้บริหารระดับสูง',
  department: form.department.trim() || 'Executive Committee',
  email: form.email.trim(),
  phone: form.phone.trim() || undefined,
  roleType: form.roleType,
  isPrimaryWhistleblowerReceiver: form.isWhistleblower,
  canViewConfidentialIdentities: form.canViewConfidential,
  status: form.status,
});

const EXEC_INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none';

interface ExecutiveFormPanelProps {
  readonly form: ExecForm;
  readonly setForm: React.Dispatch<React.SetStateAction<ExecForm>>;
  readonly isEditing: boolean;
  readonly onSubmit: (e: React.SubmitEvent) => void;
  readonly onCancel: () => void;
}

/** Add / edit form of the executive roster box. The name field suggests people from the HR view. */
const ExecutiveFormPanel: React.FC<ExecutiveFormPanelProps> = ({
  form,
  setForm,
  isEditing,
  onSubmit,
  onCancel,
}) => {
  const { tr } = useTr();
  const setField = <K extends keyof ExecForm>(key: K, value: ExecForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const pickEmployee = (emp: EmployeeRecord) =>
    setForm((prev) => ({
      ...prev,
      name: emp.nameTh,
      email: emp.loginEmail,
      position: emp.position,
      department: emp.department,
      picked: true,
    }));

  const emailClass = form.picked
    ? EXEC_INPUT_CLASS.replace('bg-white', 'bg-slate-50')
    : EXEC_INPUT_CLASS;

  return (
    <form
      onSubmit={onSubmit}
      className="animate-in fade-in space-y-4 rounded-xl border border-purple-200 bg-purple-50/50 p-4"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
          <Crown className="h-4 w-4 text-purple-600" />
          {isEditing
            ? tr('Edit executive details', 'แก้ไขข้อมูลผู้บริหาร')
            : tr('Add a new senior executive', 'เพิ่มรายชื่อผู้บริหารระดับสูงใหม่')}
        </span>
        <span className="text-[11px] font-medium text-purple-700">
          {tr(
            '* Enter the full name and e-mail to receive notifications',
            '* ระบุชื่อ-นามสกุล และอีเมลเพื่อรับการแจ้งเตือน'
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label
            htmlFor="exec-form-name"
            className="mb-1 block text-[11px] font-bold text-slate-700"
          >
            {tr('Full name', 'ชื่อ - นามสกุล')} <span className="text-rose-500">*</span>
          </label>
          <HrNameField
            id="exec-form-name"
            required
            value={form.name}
            onChange={(value) => setForm((prev) => ({ ...prev, name: value, picked: false }))}
            onPick={pickEmployee}
            search={searchHrEmployees}
            className={EXEC_INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="exec-form-position"
            className="mb-1 block text-[11px] font-bold text-slate-700"
          >
            {tr('Executive position', 'ตำแหน่งบริหาร')} <span className="text-rose-500">*</span>
          </label>
          <input
            id="exec-form-position"
            type="text"
            required
            placeholder={tr(
              'e.g. Chief Executive Officer (CEO)',
              'เช่น Chief Executive Officer (CEO)'
            )}
            value={form.position}
            onChange={(e) => setField('position', e.target.value)}
            className={EXEC_INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="exec-form-role-type"
            className="mb-1 block text-[11px] font-bold text-slate-700"
          >
            {tr('Role Level', 'ประเภทบทบาท (Role Level)')}
          </label>
          <select
            id="exec-form-role-type"
            value={form.roleType}
            onChange={(e) => setField('roleType', e.target.value as ExecutiveMember['roleType'])}
            className={EXEC_INPUT_CLASS}
          >
            <option value="CEO">
              {tr('CEO (Chief Executive Officer)', 'CEO (ประธานเจ้าหน้าที่บริหาร)')}
            </option>
            <option value="EVP">
              {tr('EVP (Executive Vice President)', 'EVP (รองกรรมการผู้จัดการใหญ่)')}
            </option>
            <option value="GRC_Chair">
              {tr('Corporate Governance Committee Chair', 'ประธานคณะกรรมการบรรษัทภิบาล')}
            </option>
            <option value="Audit_Committee">
              {tr('Audit Committee', 'คณะกรรมการตรวจสอบ (Audit Committee)')}
            </option>
            <option value="Board_Member">
              {tr('Board Member', 'กรรมการบริษัท (Board Member)')}
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="exec-form-department"
            className="mb-1 block text-[11px] font-bold text-slate-700"
          >
            {tr('Department / Division', 'สังกัด / ฝ่ายงาน')}
          </label>
          <input
            id="exec-form-department"
            type="text"
            placeholder={tr('e.g. Office of the CEO', 'เช่น สำนักประธานเจ้าหน้าที่บริหาร')}
            value={form.department}
            onChange={(e) => setField('department', e.target.value)}
            className={EXEC_INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="exec-form-email"
            className="mb-1 block text-[11px] font-bold text-slate-700"
          >
            {tr('Corporate e-mail', 'อีเมลองค์กร')} <span className="text-rose-500">*</span>
          </label>
          <input
            id="exec-form-email"
            type="email"
            required
            placeholder="executive@enterprise.co.th"
            value={form.email}
            readOnly={form.picked}
            onChange={(e) => setField('email', e.target.value)}
            className={emailClass}
          />
        </div>

        <div>
          <label
            htmlFor="exec-form-phone"
            className="mb-1 block text-[11px] font-bold text-slate-700"
          >
            {tr('Internal phone number', 'เบอร์โทรศัพท์ติดต่อภายใน')}
          </label>
          <input
            id="exec-form-phone"
            type="text"
            placeholder={tr('e.g. 02-998-1001 or ext. 101', 'เช่น 02-998-1001 หรือต่อ 101')}
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            className={EXEC_INPUT_CLASS}
          />
        </div>

        <ExecStatusSelect value={form.status} onChange={(status) => setField('status', status)} />
      </div>

      {/* Special Privileges Checkboxes */}
      <div className="flex flex-wrap gap-4 pt-1">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={form.isWhistleblower}
            onChange={(e) => setField('isWhistleblower', e.target.checked)}
            className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
          />
          <span>
            {tr(
              'Whistleblower Direct Receiver',
              'รับข้อร้องเรียนส่งตรง (Whistleblower Direct Receiver)'
            )}
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={form.canViewConfidential}
            onChange={(e) => setField('canViewConfidential', e.target.checked)}
            className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
          />
          <span>
            {tr(
              'Confidential Disclosure (can view identities in restricted cases)',
              'สิทธิ์เปิดดูตัวตนกรณีลับเฉพาะ (Confidential Disclosure)'
            )}
          </span>
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-purple-200/80 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {tr('Cancel', 'ยกเลิก')}
        </button>
        <button
          type="submit"
          id="btn-save-exec-in-box"
          className="flex items-center gap-1.5 rounded-lg bg-purple-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-purple-800"
        >
          <Save className="h-3.5 w-3.5" />
          <span>
            {isEditing
              ? tr('Save changes', 'บันทึกการแก้ไข')
              : tr('Save executive', 'บันทึกรายชื่อผู้บริหาร')}
          </span>
        </button>
      </div>
    </form>
  );
};

interface ExecutiveCardProps {
  readonly exec: ExecutiveMember;
  readonly hrBadge: HrBadgeKind;
  readonly onToggleStatus: (id: string) => void;
  readonly onEdit: (exec: ExecutiveMember) => void;
  readonly onDelete: (id: string, name: string) => void;
}

const ExecutiveCard: React.FC<ExecutiveCardProps> = ({
  exec,
  hrBadge,
  onToggleStatus,
  onEdit,
  onDelete,
}) => {
  const { tr } = useTr();
  const isActive = exec.status === 'active';

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
        isActive
          ? 'border-purple-200/90 bg-gradient-to-b from-white to-purple-50/20 shadow-2xs hover:shadow-xs'
          : 'border-slate-200 bg-slate-50 opacity-60'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-100 text-xs font-bold text-purple-700">
              <Crown className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h4 className="truncate text-xs font-bold text-slate-900">{exec.name}</h4>
              <span className="block truncate text-[10px] font-semibold text-purple-700">
                {exec.position}
              </span>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isActive
                ? 'border border-emerald-200 bg-emerald-100 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="space-y-1 pt-1 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 truncate text-slate-500">
            <Building className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{exec.department}</span>
          </div>

          <div className="flex items-center gap-1.5 truncate font-mono text-slate-600">
            <Mail className="h-3 w-3 shrink-0 text-indigo-500" />
            <span className="truncate">{exec.email}</span>
          </div>

          {exec.phone && (
            <div className="flex items-center gap-1.5 truncate text-slate-500">
              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{exec.phone}</span>
            </div>
          )}
        </div>

        {/* Badges for Whistleblower & Confidential Privileges + HR directory status */}
        <div className="flex flex-wrap gap-1 pt-1.5">
          {exec.isPrimaryWhistleblowerReceiver && (
            <span className="flex items-center gap-0.5 rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
              <Shield className="h-2.5 w-2.5 text-amber-600" />
              Whistleblower Receiver
            </span>
          )}

          {exec.canViewConfidentialIdentities && (
            <span className="flex items-center gap-0.5 rounded border border-purple-200 bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-800">
              <Lock className="h-2.5 w-2.5 text-purple-600" />
              Confidential Access
            </span>
          )}

          <HrBadge kind={hrBadge} />
        </div>
      </div>

      {/* Card Action Controls */}
      <div className="mt-3 flex items-center justify-between border-t border-purple-100/80 pt-2 text-xs">
        <button
          type="button"
          id={`btn-toggle-exec-${exec.id}`}
          onClick={() => onToggleStatus(exec.id)}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
            isActive
              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          {isActive ? tr('Suspend', 'พักสถานะ') : tr('Activate', 'เปิดใช้งาน')}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(exec)}
            className="rounded p-1 text-slate-500 transition hover:bg-purple-50 hover:text-purple-700"
            title={tr('Edit details', 'แก้ไขข้อมูล')}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(exec.id, exec.name)}
            className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            title={tr('Delete executive', 'ลบรายชื่อ')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const DIRECTORY_SEARCH_DEBOUNCE_MS = 300;

interface DirectoryCriteria {
  query: string;
  page: number;
}

interface DirectoryResult {
  /** The criteria object this answer belongs to (identity check → loading flag). */
  criteria: DirectoryCriteria;
  error: boolean;
  rows: EmployeeRecord[];
  total: number;
  pageSize: number;
}

const DirectoryRows: React.FC<{ readonly rows: EmployeeRecord[] }> = ({ rows }) => {
  const { tr, lang } = useTr();
  return (
    <div className="overflow-x-auto">
      <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-100 text-[11px] text-slate-700">
          <tr>
            <th className="px-3 py-2 font-bold">{tr('Employee ID', 'รหัสพนักงาน')}</th>
            <th className="px-3 py-2 font-bold">{tr('Full name', 'ชื่อ-นามสกุล')}</th>
            <th className="px-3 py-2 font-bold">{tr('Department', 'ฝ่าย/แผนก')}</th>
            <th className="px-3 py-2 font-bold text-indigo-700">
              {tr('Login e-mail (Mapping)', 'Email ที่ใช้ในการ Login (Mapping)')}
            </th>
            <th className="px-3 py-2 font-bold">{tr('Status', 'สถานะ')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((emp) => (
            <tr key={emp.employeeId} className="hover:bg-slate-50/60">
              <td className="px-3 py-2 font-mono font-bold text-slate-700">{emp.employeeId}</td>
              <td className="px-3 py-2 font-medium text-slate-900">
                {employeeDisplayName(emp, lang)}
              </td>
              <td className="px-3 py-2 text-slate-600">{emp.department || '-'}</td>
              <td className="px-3 py-2 font-mono font-semibold text-indigo-600">
                {emp.loginEmail || '-'}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    emp.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {emp.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                {tr('No employees found', 'ไม่พบข้อมูลพนักงาน')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

interface DirectoryPagerProps {
  readonly page: number;
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;
}

const DirectoryPager: React.FC<DirectoryPagerProps> = ({ page, pageCount, onPageChange }) => {
  const { tr } = useTr();
  return (
    <div className="flex items-center justify-end gap-2 text-[11px] text-slate-600">
      <button
        type="button"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {tr('Previous', 'ก่อนหน้า')}
      </button>
      <span className="font-mono">
        {tr(`Page ${page + 1} / ${pageCount}`, `หน้า ${page + 1} / ${pageCount}`)}
      </span>
      <button
        type="button"
        disabled={page + 1 >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {tr('Next', 'ถัดไป')}
      </button>
    </div>
  );
};

/** Read-only, server-paged view of the HR employee directory (opened on demand). */
const EmployeeDirectoryPanel: React.FC = () => {
  const { tr } = useTr();
  const [searchText, setSearchText] = useState('');
  const [criteria, setCriteria] = useState<DirectoryCriteria>({ query: '', page: 0 });
  const [result, setResult] = useState<DirectoryResult | null>(null);

  // Debounced search: a new query always restarts from the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setCriteria((prev) => (prev.query === searchText ? prev : { query: searchText, page: 0 }));
    }, DIRECTORY_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;
    getDirectoryPage(criteria.query, criteria.page)
      .then((data) => {
        if (!cancelled) setResult({ criteria, error: false, ...data });
      })
      .catch(() => {
        if (!cancelled) setResult({ criteria, error: true, rows: [], total: 0, pageSize: 1 });
      });
    return () => {
      cancelled = true;
    };
  }, [criteria]);

  // Only an answer for the current criteria counts; anything older is still "loading".
  const current = result?.criteria === criteria ? result : null;
  const total = result?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / (result?.pageSize || 1)));

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-900">
            {tr(
              'Employee database for back-office mapping (Corporate Employee Directory):',
              'ฐานข้อมูลพนักงานสำหรับการ Mapping หลังบ้าน (Corporate Employee Directory):'
            )}
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">Total {total} Records</span>
      </div>

      <input
        type="search"
        aria-label={tr('Search employees', 'ค้นหาพนักงาน')}
        placeholder={tr(
          'Search by name, employee ID, e-mail or department...',
          'ค้นหาชื่อ, รหัสพนักงาน, อีเมล หรือหน่วยงาน...'
        )}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      />

      {current === null && (
        <p className="py-4 text-center text-xs text-slate-500">
          {tr('Loading employee data from HR...', 'กำลังโหลดข้อมูลพนักงานจาก HR...')}
        </p>
      )}
      {current?.error && (
        <p className="py-4 text-center text-xs text-rose-600">
          {tr(
            'Cannot connect to the HR database right now',
            'ไม่สามารถเชื่อมต่อฐานข้อมูล HR ได้ในขณะนี้'
          )}
        </p>
      )}
      {current && !current.error && <DirectoryRows rows={current.rows} />}
      {current && !current.error && (
        <DirectoryPager
          page={criteria.page}
          pageCount={pageCount}
          onPageChange={(page) => setCriteria((prev) => ({ ...prev, page }))}
        />
      )}

      <p className="text-[10.5px] leading-snug text-slate-500">
        {tr(
          "Automatic linking: when an employee submits anonymously, the system maps the employee's login e-mail to the back-office ticket. Only roles ticked by HR Admin & the Executive Representative can see it.",
          'ระบบเชื่อมโยงอัตโนมัติ: เมื่อพนักงานทำการยื่นเรื่องแบบไม่ระบุตัวตน ระบบจะ mapping อีเมลล็อกอินของพนักงานเข้าระบบตั๋วหลังบ้าน โดยเปิดสิทธิ์ให้เฉพาะ Role ที่ถูก tick โดย HR Admin & ตัวแทนผู้บริหาร มองเห็นได้เท่านั้น'
        )}
      </p>
    </div>
  );
};

/** Name + description cell of one screen row in the visibility matrix. */
const MatrixScreenLabel: React.FC<{ readonly tab: TabDefinition }> = ({ tab }) => {
  const { lang } = useTr();
  const isEn = lang === 'en';
  return (
    <div className="min-w-0 space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-900 sm:text-sm">
          {isEn ? tab.nameEn : tab.nameTh}
        </span>
        {!isEn && (
          <span className="hidden font-mono text-[10px] text-slate-400 sm:inline">
            ({tab.nameEn})
          </span>
        )}
      </div>
      <p className="text-[11px] leading-normal text-slate-500">{tabDescription(tab, lang)}</p>
    </div>
  );
};

interface RoleBasedAccessManagementProps {
  readonly currentRole: UserRole;
  readonly onNavigateTab: (tab: AppTabId) => void;
  readonly onPermissionsUpdated?: () => void;
  /** Executive roster as loaded on the server (kept in sync with every action result). */
  readonly initialExecutives: ExecutiveMember[];
  /** Lowercase e-mail → HR status; `null` when the HR view is unreachable (no HR badges). */
  readonly hrStatus: HrStatusMap;
}

export const RoleBasedAccessManagement: React.FC<RoleBasedAccessManagementProps> = ({
  currentRole,
  onNavigateTab,
  onPermissionsUpdated,
  initialExecutives,
  hrStatus,
}) => {
  const { rolePermissions } = useShell();
  const { tr, lang } = useTr();
  const [permissions, setPermissions] = useState<Record<UserRole, RolePermissionConfig>>(
    () => rolePermissions
  );
  const [permissionsSource, setPermissionsSource] = useState(rolePermissions);
  if (permissionsSource !== rolePermissions) {
    // The server matrix changed (router.refresh) — adopt it.
    setPermissionsSource(rolePermissions);
    setPermissions(rolePermissions);
  }
  const [selectedRoleForDetail, setSelectedRoleForDetail] = useState<UserRole>('employee');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Executive Management Direct In-Box State
  const [executives, setExecutives] = useState<ExecutiveMember[]>(() => initialExecutives);
  const [executivesSource, setExecutivesSource] = useState(initialExecutives);
  if (executivesSource !== initialExecutives) {
    setExecutivesSource(initialExecutives);
    setExecutives(initialExecutives);
  }
  const [isAddingExec, setIsAddingExec] = useState(false);
  const [editingExecId, setEditingExecId] = useState<string | null>(null);
  const [execForm, setExecForm] = useState<ExecForm>(EMPTY_EXEC_FORM);

  // Anonymous Submitter Email Simulation & Directory Preview
  const [simulatedRoleForAnonymous, setSimulatedRoleForAnonymous] =
    useState<UserRole>('gatekeeper');
  const [showEmployeeDirectoryModal, setShowEmployeeDirectoryModal] = useState(false);

  // In-app confirmation dialog (replaces window.confirm — see ConfirmDialog.tsx)
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const notifyPermissionsUpdated = () => {
    if (onPermissionsUpdated) {
      // Deferred so the parent's refresh never runs while this component is still rendering/committing
      // (setState in the parent during our own update triggers a React warning).
      setTimeout(() => {
        onPermissionsUpdated();
      }, 0);
    }
  };

  const closeExecForm = () => {
    setIsAddingExec(false);
    setEditingExecId(null);
    setExecForm(EMPTY_EXEC_FORM);
  };

  /** Runs one roster write; on success adopts the returned roster, resolves `true`. */
  const applyExecutiveChange = (
    request: Promise<ExecutiveMember[]>,
    successMsg: string
  ): Promise<boolean> =>
    request
      .then((updated) => {
        setExecutives(updated);
        showToast(successMsg);
        notifyPermissionsUpdated();
        return true;
      })
      .catch(() => {
        showToast(executiveSaveError(tr));
        return false;
      });

  const handleSaveExecSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!execForm.name.trim() || !execForm.email.trim()) {
      showToast(
        tr(
          "⚠️ Please enter the executive's full name and e-mail",
          '⚠️ กรุณากรอกชื่อ-นามสกุล และอีเมลของผู้บริหาร'
        )
      );
      return;
    }

    const fields = execFieldsFromForm(execForm);
    const saved = editingExecId
      ? await applyExecutiveChange(
          updateExecutiveMember(editingExecId, fields),
          tr(
            `Executive "${execForm.name}" updated`,
            `อัปเดตข้อมูลผู้บริหาร "${execForm.name}" เรียบร้อยแล้ว`
          )
        )
      : await applyExecutiveChange(
          addExecutiveMember({
            ...fields,
            receiveAlertNotifications: true,
            assignedCommittees: ['คณะกรรมการบริหาร (ExCom)'],
          }),
          tr(
            `Executive "${execForm.name}" added to the system`,
            `เพิ่มรายชื่อผู้บริหาร "${execForm.name}" เข้าระบบเรียบร้อยแล้ว`
          )
        );

    if (saved) closeExecForm();
  };

  const handleStartEditExec = (exec: ExecutiveMember) => {
    setEditingExecId(exec.id);
    setExecForm(execFormFromMember(exec));
    setIsAddingExec(true);
  };

  const handleDeleteExec = (id: string, name: string) => {
    askConfirm({
      title: tr('Confirm executive removal', 'ยืนยันการลบรายชื่อผู้บริหาร'),
      message: tr(
        `Remove executive "${name}" from the system?`,
        `คุณต้องการลบรายชื่อผู้บริหาร "${name}" ออกจากระบบใช่หรือไม่?`
      ),
      confirmLabel: tr('Delete', 'ลบรายชื่อ'),
      isDestructive: true,
      onConfirm: () => {
        void applyExecutiveChange(
          deleteExecutiveMember(id),
          tr(`Executive "${name}" removed`, `ลบรายชื่อผู้บริหาร "${name}" เรียบร้อยแล้ว`)
        );
      },
    });
  };

  const handleToggleExecStatus = (id: string) => {
    const target = executives.find((e) => e.id === id);
    if (!target) return;
    const newStatus = target.status === 'active' ? 'inactive' : 'active';
    const successMsg =
      newStatus === 'active'
        ? tr('Status changed to Active', 'เปลี่ยนสถานะเป็น เปิดใช้งาน')
        : tr('Status changed to Suspended', 'เปลี่ยนสถานะเป็น ระงับชั่วคราว');
    void applyExecutiveChange(updateExecutiveMember(id, { status: newStatus }), successMsg);
  };

  const commitPermissions = (
    updated: Record<UserRole, RolePermissionConfig>,
    toastMsg?: string
  ) => {
    const previous = permissions;
    // Optimistic: the matrix reflects the click at once; the server answer (or a revert) follows.
    setPermissions(updated);
    if (toastMsg) {
      showToast(toastMsg);
    }
    saveRoleAccessConfigs(updated)
      .then((saved) => {
        setPermissions(saved);
        notifyPermissionsUpdated();
      })
      .catch((error: unknown) => {
        setPermissions(previous);
        showToast(permissionErrorMessage(error, tr));
      });
  };

  const handleToggleTabPermission = (role: UserRole, tabId: AppTabId) => {
    // Prevent removing RBAC tab from admin role to prevent lockout
    if (role === 'admin' && tabId === 'rbac_management') {
      showToast(permissionLockoutError(tr));
      return;
    }

    const roleConfig = permissions[role];
    const hasTab = roleConfig.allowedTabs.includes(tabId);
    const newAllowed = hasTab
      ? roleConfig.allowedTabs.filter((t) => t !== tabId)
      : [...roleConfig.allowedTabs, tabId];

    const updated = {
      ...permissions,
      [role]: {
        ...roleConfig,
        allowedTabs: newAllowed,
      },
    };

    commitPermissions(
      updated,
      tr(
        `Screen permissions updated for ${roleShortName(permissions[role], 'en')}`,
        `อัปเดตสิทธิ์แท็บสำหรับ ${roleShortName(permissions[role], 'th')} แล้ว`
      )
    );
  };

  const handleToggleSpecialPermission = (role: UserRole, key: keyof RolePermissionConfig) => {
    if (role === 'admin' && key === 'canManageRolePermissions') {
      showToast(
        tr(
          '⚠️ HR Admin must always keep the RBAC management permission',
          '⚠️ HR Admin จำเป็นต้องมีสิทธิ์จัดการ RBAC เสมอ'
        )
      );
      return;
    }

    const roleConfig = permissions[role];
    const currentValue = !!roleConfig[key];
    const updated = {
      ...permissions,
      [role]: {
        ...roleConfig,
        [key]: !currentValue,
      },
    };

    commitPermissions(
      updated,
      tr(
        `Security permissions updated for ${roleShortName(permissions[role], 'en')}`,
        `อัปเดตสิทธิ์ความปลอดภัยสำหรับ ${roleShortName(permissions[role], 'th')} แล้ว`
      )
    );
  };

  const handleGatekeeperDeptToggle = (cat: GrievanceCategory) => {
    const gkConfig = permissions.gatekeeper;
    const currentDepts = gkConfig.assignedDepartments || [];
    const hasDept = currentDepts.includes(cat);
    const newDepts = hasDept ? currentDepts.filter((d) => d !== cat) : [...currentDepts, cat];

    const finalDepts = newDepts.length > 0 ? newDepts : ['HR' as GrievanceCategory];
    const isAllDepts = finalDepts.length === Object.keys(CATEGORY_DEFINITIONS).length;

    const updated = {
      ...permissions,
      gatekeeper: {
        ...gkConfig,
        canViewAllDepartments: isAllDepts,
        assignedDepartments: finalDepts,
      },
    };

    commitPermissions(
      updated,
      tr('Gatekeeper category scope updated', 'อัปเดตขอบเขตหมวดหมู่ Gatekeeper แล้ว')
    );
  };

  // "Select all" and "reset" both end at the default scope: every category.
  const grantAllGatekeeperCategories = (toastMsg: string) => {
    const allCats = Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[];
    commitPermissions(
      {
        ...permissions,
        gatekeeper: {
          ...permissions.gatekeeper,
          canViewAllDepartments: true,
          assignedDepartments: allCats,
        },
      },
      toastMsg
    );
  };

  const applyAnonymousPreset = (visibleTo: Record<UserRole, boolean>, toastMsg: string) => {
    const updated = { ...permissions };
    for (const role of rolesList) {
      updated[role] = { ...permissions[role], canViewAnonymousSubmitterEmail: visibleTo[role] };
    }
    commitPermissions(updated, toastMsg);
  };

  const handleResetDefaults = () => {
    askConfirm({
      title: tr('Confirm RBAC permission reset', 'ยืนยันการรีเซ็ตสิทธิ์ RBAC'),
      message: tr(
        'Reset the permissions of every role to the default organization policy?',
        'คุณต้องการรีเซ็ตสิทธิ์ของทุก Role กลับเป็นค่าเริ่มต้นตามนโยบายองค์กรใช่หรือไม่?'
      ),
      confirmLabel: tr('Reset to defaults', 'รีเซ็ตค่าเริ่มต้น'),
      onConfirm: () => {
        resetRolePermissionsToDefault()
          .then((defaults) => {
            setPermissions(defaults);
            showToast(
              tr(
                'RBAC permissions reset to defaults',
                'รีเซ็ตสิทธิ์ RBAC กลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว'
              )
            );
            notifyPermissionsUpdated();
          })
          .catch((error: unknown) => showToast(permissionErrorMessage(error, tr)));
      },
    });
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'employee':
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case 'gatekeeper':
        return <Shield className="h-4 w-4 text-emerald-600" />;
      case 'executive':
        return <Crown className="h-4 w-4 text-purple-600" />;
      case 'admin':
        return <SlidersHorizontal className="h-4 w-4 text-rose-600" />;
    }
  };

  const getTabIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileText':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'ListChecks':
        return <ListChecks className="h-4 w-4 text-indigo-500" />;
      case 'GitBranch':
        return <GitBranch className="h-4 w-4 text-slate-500" />;
      case 'Shield':
        return <Shield className="h-4 w-4 text-emerald-500" />;
      case 'Crown':
        return <Crown className="h-4 w-4 text-purple-500" />;
      case 'Layers':
        return <Layers className="h-4 w-4 text-amber-500" />;
      case 'Users':
        return <Users className="h-4 w-4 text-teal-500" />;
      case 'SlidersHorizontal':
        return <SlidersHorizontal className="h-4 w-4 text-rose-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="animate-in fade-in fixed top-20 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner - Enterprise RBAC Control Center */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-rose-900/30 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-950 p-5 text-white shadow-md sm:p-6 xl:flex-row xl:items-center">
        <div className="max-w-3xl space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-xl border border-rose-400/30 bg-rose-500/20 p-2 text-rose-300 backdrop-blur-xs">
              <SlidersHorizontal className="h-5 w-5" />
            </span>
            <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">
              Role-Based Access Control (RBAC) & Governance Matrix
            </h1>
            <span className="rounded-full border border-rose-400/30 bg-rose-500/30 px-2.5 py-0.5 font-mono text-[11px] font-bold text-rose-200">
              HR ADMIN & EXECUTIVE PANEL
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            {tr(
              'Controls screen visibility and data access by role (General Employee / Department Gatekeeper / Senior Executive / HR Admin) to keep data secure in line with the Whistleblower Protection Act, PDPA and ISO 37002',
              'ระบบกำหนดสิทธิ์การมองเห็นหน้าจอและการเข้าถึงข้อมูลตามบทบาทหน้าที่ (พนักงานทั่วไป / Gatekeeper ประจำหน่วยงาน / ผู้บริหารระดับสูง / HR Admin) เพื่อความปลอดภัยของข้อมูลตามมาตรฐาน Whistleblower Protection Act, PDPA และ ISO 37002'
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5 self-start xl:self-center">
          <a
            href="#executive-management-box"
            className="flex items-center gap-1.5 rounded-xl border border-purple-400/40 bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:from-purple-500 hover:to-indigo-500"
          >
            <Crown className="h-3.5 w-3.5 text-yellow-300" />
            <span>
              {tr(
                `Add / edit executives (${executives.length})`,
                `กล่องใส่/แก้ไขรายชื่อผู้บริหาร (${executives.length})`
              )}
            </span>
          </a>

          <button
            type="button"
            id="btn-reset-rbac-defaults"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            title={tr(
              'Reset permissions to the default organization policy',
              'รีเซ็ตสิทธิ์เป็นค่าเริ่มต้นตามนโยบายองค์กร'
            )}
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-300" />
            <span>{tr('Reset to defaults', 'รีเซ็ตค่ามาตรฐาน')}</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>{tr('Live Synced (auto-save)', 'ระบบบันทึกอัตโนมัติ (Live Synced)')}</span>
          </div>
        </div>
      </div>

      {/* Role Quick Status Cards & Role Switcher Simulator */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {rolesList.map((roleKey) => {
          const config = permissions[roleKey];
          const isCurrent = currentRole === roleKey;
          const allowedCount = config.allowedTabs.length;

          return (
            <div
              key={roleKey}
              {...clickableProps(() => setSelectedRoleForDetail(roleKey))}
              className={`relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${
                selectedRoleForDetail === roleKey
                  ? 'border-rose-500 bg-white shadow-md ring-2 ring-rose-400/30'
                  : 'border-slate-200 bg-white shadow-xs hover:bg-slate-50/80'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className={`shrink-0 rounded-lg border p-1.5 ${config.badgeColor}`}>
                      {getRoleIcon(roleKey)}
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {roleCardTitle(config, lang)}
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="shrink-0 rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-indigo-800">
                      {tr('Current view', 'มุมมองปัจจุบัน')}
                    </span>
                  )}
                </div>

                <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                  {roleDescription(roleKey, config, lang)}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span className="text-[11px] font-medium text-slate-600">
                  {tr('Access to', 'สิทธิ์เข้าถึง')}{' '}
                  <strong className="font-bold text-slate-900">{allowedCount}</strong>{' '}
                  {tr('screens', 'หน้าจอ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main RBAC Permission Matrix Section */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Table Header / Sub-banner */}
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/60 p-4 sm:flex-row sm:items-center sm:p-5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
              <SlidersHorizontal className="h-4 w-4 text-rose-600" />
              <span>
                {tr(
                  'Screen Visibility Matrix',
                  'ตารางเมทริกซ์สิทธิ์การมองเห็นหน้าจอ (Screen Visibility Matrix)'
                )}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {tr(
                'Set which menu tabs each role can access and see in the system. Changes take effect immediately.',
                'กำหนดว่าแต่ละบทบาทสามารถเข้าถึงและมองเห็นแท็บเมนูใดได้บ้างในระบบ โดยการเปลี่ยนแปลงจะมีผลทันที'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-xs sm:self-auto">
            <Info className="h-3.5 w-3.5 text-blue-600" />
            <span>
              {tr(
                'Tick to grant access / untick to revoke it',
                'ติ๊กถูกเพื่อเปิดสิทธิ์ / ติ๊กออกเพื่อปิดสิทธิ์'
              )}
            </span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                <th className="w-2/5 px-4 py-3">
                  {tr('Module / Screen', 'หน้าจอ / ฟังก์ชันงาน (Module / Screen)')}
                </th>
                {rolesList.map((roleKey) => (
                  <th key={roleKey} className="w-[15%] px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-800">
                      {getRoleIcon(roleKey)}
                      <span className="truncate">{roleCardTitle(permissions[roleKey], lang)}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {APP_TABS.map((tab) => {
                return (
                  <tr key={tab.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
                          {getTabIcon(tab.iconName)}
                        </div>
                        <MatrixScreenLabel tab={tab} />
                      </div>
                    </td>

                    {rolesList.map((roleKey) => {
                      const isAllowed = permissions[roleKey].allowedTabs.includes(tab.id);
                      const isLockedAdmin = roleKey === 'admin' && tab.id === 'rbac_management';

                      return (
                        <td key={roleKey} className="px-3 py-3 text-center align-middle">
                          <button
                            type="button"
                            id={`toggle-${roleKey}-${tab.id}`}
                            onClick={() => handleToggleTabPermission(roleKey, tab.id)}
                            disabled={isLockedAdmin}
                            title={
                              isLockedAdmin
                                ? tr(
                                    'HR Admin permission is permanent, to prevent a system lock-out',
                                    'HR Admin มีสิทธิ์ถาวรเพื่อป้องกันการล็อกระบบ'
                                  )
                                : tr(
                                    `Click to toggle ${tab.nameEn} access for ${roleKey}`,
                                    `คลิกเพื่อเปิด/ปิดสิทธิ์ ${tab.nameTh} สำหรับ ${roleKey}`
                                  )
                            }
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl shadow-xs transition-all ${
                              isAllowed
                                ? 'bg-emerald-600 text-white hover:scale-105 hover:bg-emerald-700'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            } ${isLockedAdmin ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                          >
                            {isAllowed ? (
                              <Check className="h-4 w-4 stroke-[3]" />
                            ) : (
                              <X className="h-4 w-4 stroke-[2.5]" />
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
        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 sm:flex-row">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              {tr('Green = Visible & Permitted', 'เขียว = มีสิทธิ์เข้าถึง (Visible & Permitted)')}
            </span>
            <span className="mx-1">•</span>
            <X className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {tr('Grey = Hidden & Restricted', 'เทา = ไม่มีสิทธิ์เข้าถึง (Hidden & Restricted)')}
            </span>
          </div>

          <div className="font-mono text-[11px] text-slate-400">
            RBAC Protocol: Least Privilege Principle (PoLP)
          </div>
        </div>
      </div>

      {/* Special Security Rules & Gatekeeper Department Scoping */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Gatekeeper Department Scope Setting */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-700">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 sm:text-sm">
                  {tr(
                    'Gatekeeper Category Scoping',
                    'ขอบเขตหมวดหมู่คำร้องประจำตัว Gatekeeper (Category Scoping)'
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {tr(
                    'Choose which categories a Gatekeeper can view and handle (6 standard categories in total)',
                    'กำหนดว่าผู้ประสานงาน (Gatekeeper) สามารถมองเห็นและจัดการคำร้องในหมวดหมู่ใดบ้าง (ทั้งหมดมี 6 หมวดหมู่มาตรฐาน)'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Category Selection Cards */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700">
                {tr(
                  'Categories a Gatekeeper may access:',
                  'หมวดหมู่คำร้องที่อนุญาตให้ Gatekeeper เข้าถึงได้:'
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-emerald-700">
                  {tr(
                    `Selected ${(permissions.gatekeeper.assignedDepartments || []).length} / 6 categories`,
                    `เลือกแล้ว ${(permissions.gatekeeper.assignedDepartments || []).length} / 6 หมวดหมู่`
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      grantAllGatekeeperCategories(
                        tr(
                          'Gatekeeper now has access to all 6 categories',
                          'อนุญาตให้ Gatekeeper เข้าถึงครบทั้ง 6 หมวดหมู่แล้ว'
                        )
                      )
                    }
                    className="cursor-pointer rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 transition hover:bg-emerald-200"
                  >
                    {tr('Select all 6', 'เลือกทั้ง 6 หมวดหมู่')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      grantAllGatekeeperCategories(
                        tr(
                          'Gatekeeper category scope reset to the default (all 6 categories)',
                          'รีเซ็ตขอบเขตหมวดหมู่ Gatekeeper เป็นทั้ง 6 หมวดหมู่ตามค่าเริ่มต้น'
                        )
                      )
                    }
                    className="cursor-pointer rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-200"
                  >
                    {tr('Reset', 'รีเซ็ต')}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[]).map((cat) => {
                const info = CATEGORY_DEFINITIONS[cat];
                const isAssigned = (permissions.gatekeeper.assignedDepartments || []).includes(cat);

                return (
                  <div
                    key={cat}
                    {...clickableProps(() => handleGatekeeperDeptToggle(cat))}
                    className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border p-2.5 transition ${
                      isAssigned
                        ? 'border-emerald-300 bg-emerald-50/70 shadow-2xs ring-1 ring-emerald-400/20'
                        : 'border-slate-200 bg-slate-50/70 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs leading-snug font-bold text-slate-900">
                        {categoryName(info, lang)}
                      </div>
                      <span className="mt-0.5 block truncate text-[10.5px] text-slate-500">
                        {categoryDescription(info, lang)}
                      </span>
                    </div>

                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isAssigned
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isAssigned && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct Simulator for Gatekeeper Role (No Filter Needed) */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 to-teal-50/70 p-3.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <div className="shrink-0 rounded-lg bg-emerald-600 p-2 text-white shadow-2xs">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-900">
                  {tr('Gatekeeper Triage Hub', 'ศูนย์คัดกรองงาน Gatekeeper (Triage Hub)')}
                </span>
                <span className="text-[11px] text-slate-600">
                  {tr(
                    'Open the Gatekeeper Triage Portal — visible only to users who have actually been assigned the Gatekeeper role on the "User Management" page',
                    'เปิดดูหน้าจอ Gatekeeper Triage Portal — มองเห็นได้เฉพาะผู้ใช้ที่ได้รับมอบหมาย บทบาท Gatekeeper จริงจากหน้า "จัดการผู้ใช้"'
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              id="btn-simulate-gatekeeper-direct"
              onClick={() => onNavigateTab('gatekeeper')}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:bg-emerald-800"
            >
              <span>{tr('Open Gatekeeper Triage Portal', 'เปิด Gatekeeper Triage Portal')}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick link to Executive & HR Admin Management Directory */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-indigo-200/80 bg-gradient-to-r from-purple-50 via-indigo-50 to-rose-50 p-3.5 sm:flex-row sm:items-center">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Crown className="h-3.5 w-3.5 text-purple-600" />
                <span>
                  {tr(
                    'Maintain the executive roster and HR Admin / Gatekeepers',
                    'การ Maintain รายชื่อผู้บริหาร และ HR Admin / Gatekeeper'
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {tr(
                  'Add/edit the executive roster (CEO/EVP), direct Whistleblower complaint access, HR Admin accounts and the owners of the 6 departments',
                  'เพิ่ม/แก้ไขรายชื่อคณะผู้บริหาร (CEO/EVP), สิทธิ์รับข้อร้องเรียนสายตรง Whistleblower, บัญชี HR Admin และผู้รับผิดชอบ 6 ฝ่ายงาน'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-scroll-to-exec-roster"
                onClick={() => {
                  const el = document.getElementById('executive-management-box');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-800 transition hover:bg-purple-200"
              >
                <Crown className="h-3.5 w-3.5 text-purple-700" />
                <span>{tr('View the executive roster below', 'ดูทำเนียบผู้บริหารด้านล่าง')}</span>
              </button>
              <button
                type="button"
                id="btn-goto-personnel-directory"
                onClick={() => onNavigateTab('admin_gatekeeper')}
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-950"
              >
                <Users className="h-3.5 w-3.5 text-indigo-300" />
                <span>{tr('Open Personnel Directory', 'เปิดศูนย์จัดการรายชื่อบุคลากร')}</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Security & Confidentiality Privileges Table */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-1.5 text-purple-700">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 sm:text-sm">
                  {tr(
                    'Security & Compliance Privileges',
                    'สิทธิ์เชิงลึกด้านความมั่นคงปลอดภัย (Security & Compliance Privileges)'
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {tr(
                    'Controls who can view sensitive data (Confidentiality) and edit CAPA measures',
                    'การควบคุมสิทธิ์ดูข้อมูลอ่อนไหว (Confidentiality) และการแก้ไขมาตรการ CAPA'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Privilege 1: Direct CEO Whistleblower View */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-xs font-bold text-slate-900">
                    {tr(
                      'Direct CEO/EVP complaint inbox (Whistleblower Escalation)',
                      'เข้าถึงกล่องข้อร้องเรียนสายตรง CEO/EVP (Whistleblower Escalation)'
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {tr(
                    'See serious complaints filed directly to senior executives for independent review',
                    'เห็นข้อร้องเรียนร้ายแรงที่ยื่นส่งตรงถึงผู้บริหารระดับสูงเพื่อการตรวจสอบอิสระ'
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {rolesList.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleToggleSpecialPermission(r, 'canViewDirectCeoTickets')}
                    className={`rounded-md border px-2 py-1 text-[10px] font-bold transition ${
                      permissions[r].canViewDirectCeoTickets
                        ? 'border-purple-300 bg-purple-100 text-purple-800'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                    title={`${r}: ${permissions[r].canViewDirectCeoTickets ? tr('Allowed', 'มีสิทธิ์') : tr('Not allowed', 'ไม่มีสิทธิ์')}`}
                  >
                    {ROLE_SHORT_LABEL[r][lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Privilege 2: Confidential Identity Disclosure */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">
                    {tr(
                      'View complainant identity in restricted cases (Confidential Restricted)',
                      'ดูตัวตนผู้ร้องเรียนกรณีจำกัดสิทธิ์ (Confidential Restricted)'
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {tr(
                    "Unlocks the submitter's name and contact number to coordinate witness protection (HR Admin / GRC only)",
                    'สิทธิ์ปลดล็อกดูชื่อและเบอร์ติดต่อผู้ยื่นเพื่อประสานงานคุ้มครองพยาน (เฉพาะ HR Admin / GRC)'
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {rolesList.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() =>
                      handleToggleSpecialPermission(r, 'canViewConfidentialIdentities')
                    }
                    className={`rounded-md border px-2 py-1 text-[10px] font-bold transition ${
                      permissions[r].canViewConfidentialIdentities
                        ? 'border-blue-300 bg-blue-100 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                    title={`${r}: ${permissions[r].canViewConfidentialIdentities ? tr('Allowed', 'มีสิทธิ์') : tr('Not allowed', 'ไม่มีสิทธิ์')}`}
                  >
                    {ROLE_SHORT_LABEL[r][lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Privilege 3: Root Cause & CAPA Edit */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">
                    {tr(
                      'Record root causes & CAPA prevention plans',
                      'บันทึกสาเหตุเชิงลึก & แผนป้องกัน CAPA'
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {tr(
                    'Can set the Root Cause Category and record structural preventive measures',
                    'สามารถระบุ Root Cause Category และบันทึกมาตรการป้องกันเชิงโครงสร้าง'
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {rolesList.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleToggleSpecialPermission(r, 'canEditRootCauseAndCapa')}
                    className={`rounded-md border px-2 py-1 text-[10px] font-bold transition ${
                      permissions[r].canEditRootCauseAndCapa
                        ? 'border-amber-300 bg-amber-100 text-amber-800'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                    title={`${r}: ${permissions[r].canEditRootCauseAndCapa ? tr('Allowed', 'มีสิทธิ์') : tr('Not allowed', 'ไม่มีสิทธิ์')}`}
                  >
                    {ROLE_SHORT_LABEL[r][lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Privilege 4: Department Officers Setup */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-teal-600" />
                  <span className="text-xs font-bold text-slate-900">
                    {tr('Appoint department Gatekeepers', 'จัดการแต่งตั้ง Gatekeeper ประจำฝ่าย')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {tr(
                    'Can appoint Lead Officers and manage officers across the 6 categories',
                    'สิทธิ์แต่งตั้ง Lead Officer และจัดการเจ้าหน้าที่ใน 6 หมวดหมู่'
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {rolesList.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleToggleSpecialPermission(r, 'canManageGatekeeperOfficers')}
                    className={`rounded-md border px-2 py-1 text-[10px] font-bold transition ${
                      permissions[r].canManageGatekeeperOfficers
                        ? 'border-teal-300 bg-teal-100 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                    title={`${r}: ${permissions[r].canManageGatekeeperOfficers ? tr('Allowed', 'มีสิทธิ์') : tr('Not allowed', 'ไม่มีสิทธิ์')}`}
                  >
                    {ROLE_SHORT_LABEL[r][lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Privilege 5: Anonymous Submitter Login Email Visibility (HR Admin & Exec Rep tick control) */}
            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 p-3.5">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Mail className="h-4 w-4 shrink-0 text-indigo-700" />
                  <span className="text-xs font-bold text-indigo-950">
                    {tr(
                      'View the login e-mail of anonymous submitters (Anonymous Login Email Mapping)',
                      'ดูอีเมลที่ใช้ login กรณีไม่ระบุตัวตน (Anonymous Login Email Mapping)'
                    )}
                  </span>
                  <span className="py-0.2 rounded bg-indigo-200/80 px-1.5 text-[9px] font-bold text-indigo-900">
                    MAPPED FROM DB
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-slate-600">
                  {tr(
                    'For anonymous submissions, HR Admin & the Executive Representative can tick which roles may or may not see the e-mail used to log in (mapped in the back office from the employee database)',
                    'กรณีไม่ระบุตัวตน HR Admin & ตัวแทนผู้บริหาร สามารถ tick กำหนดในแต่ละ Role ได้ว่าจะให้เห็น หรือ ไม่ให้ใครเห็น โดยสิ่งที่สามารถเห็นได้คือ email ที่ใช้ในการ login (mapping หลังบ้านจากฐานข้อมูลพนักงาน)'
                  )}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {rolesList.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() =>
                      handleToggleSpecialPermission(r, 'canViewAnonymousSubmitterEmail')
                    }
                    className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-bold transition ${
                      permissions[r].canViewAnonymousSubmitterEmail
                        ? 'border-indigo-700 bg-indigo-600 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                    }`}
                    title={`${r}: ${permissions[r].canViewAnonymousSubmitterEmail ? tr('Allowed to see the login e-mail', 'อนุญาตให้มองเห็นอีเมลล็อกอิน') : tr('Not allowed to see the login e-mail', 'ไม่ให้เห็นอีเมลล็อกอิน')}`}
                  >
                    {permissions[r].canViewAnonymousSubmitterEmail ? '✓ ' : '✗ '}
                    {ROLE_SHORT_LABEL[r][lang]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Scale className="h-3.5 w-3.5 text-indigo-600" />
              {tr(
                'PDPA and Whistleblower Protection Act compliance',
                'มาตรฐาน PDPA และ Whistleblower Protection Act'
              )}
            </span>
            <span className="font-semibold text-emerald-700">Audit Logging Enabled</span>
          </div>
        </div>
      </div>

      {/* DEDICATED SECTION: ANONYMOUS SUBMITTER EMAIL VISIBILITY MATRIX & EMPLOYEE DB MAPPING */}
      <div
        className="space-y-5 rounded-2xl border-2 border-indigo-300/80 bg-white p-5 shadow-sm sm:p-6"
        id="anonymous-visibility-matrix-box"
      >
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-indigo-100 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 p-2.5 text-white shadow-xs">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                  {tr(
                    'Visibility of submitter information (anonymous submissions)',
                    'การกำหนดสิทธิ์การมองเห็นข้อมูลผู้ยื่นเรื่อง (กรณีไม่ระบุตัวตน)'
                  )}
                </h3>
                <span className="rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                  {tr('HR Admin & Executive Representative', 'HR Admin & ตัวแทนผู้บริหาร')}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {tr(
                  'For anonymous submissions, HR Admin & the Executive Representative can tick which roles may or may not see the submitter. What is visible is the e-mail used to log in, mapped in the back office from the employee database.',
                  'กรณีไม่ระบุตัวตน ให้ HR Admin & ตัวแทนผู้บริหาร สามารถ tick ได้ว่าจะให้เห็น หรือ ไม่ให้ใครเห็นในแต่ละ Role โดยสิ่งที่สามารถเห็นได้ คือ email ที่ใช้ในการ login โดยจะ mapping หลังบ้านจากฐานข้อมูลพนักงาน'
                )}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowEmployeeDirectoryModal(!showEmployeeDirectoryModal)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-100"
            >
              <Database className="h-3.5 w-3.5 text-indigo-600" />
              <span>
                {showEmployeeDirectoryModal
                  ? tr('Hide employee database', 'ซ่อนฐานข้อมูลพนักงาน')
                  : tr('View employee database (Employee DB)', 'ดูฐานข้อมูลพนักงาน (Employee DB)')}
              </span>
            </button>
          </div>
        </div>

        {/* 4 Roles Tick Matrix Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-700">
            <span>
              {tr(
                'Tick to allow visibility of the login e-mail:',
                'ตาราง Tick กำหนดสิทธิ์การมองเห็นอีเมลล็อกอิน (Tick to allow visibility of login email):'
              )}
            </span>
            <span className="text-[11px] font-normal text-slate-500">
              {tr('Click a card to toggle access', 'คลิกที่การ์ดเพื่อ Toggle สิทธิ์')}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rolesList.map((r) => {
              const isAllowed = !!permissions[r].canViewAnonymousSubmitterEmail;
              const roleInfo = permissions[r];
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={isAllowed}
                  onClick={() => handleToggleSpecialPermission(r, 'canViewAnonymousSubmitterEmail')}
                  className={`relative block w-full cursor-pointer rounded-xl border-2 p-3.5 text-left transition select-none ${
                    isAllowed
                      ? 'border-indigo-400 bg-indigo-50/60 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded-lg p-1.5 ${isAllowed ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                      >
                        {getRoleIcon(r)}
                      </div>
                      <div>
                        <div className="text-xs leading-tight font-bold text-slate-900">
                          {roleShortName(roleInfo, lang)}
                        </div>
                        <div className="text-[10px] font-medium text-slate-500">Role: {r}</div>
                      </div>
                    </div>

                    {/* Checkbox Tick */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        isAllowed
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isAllowed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="mt-2.5 border-t border-slate-200/80 pt-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{tr('Visibility:', 'การมองเห็น:')}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          isAllowed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isAllowed
                          ? tr('✓ Visible', '✓ ให้มองเห็นได้')
                          : tr('✗ Hidden', '✗ ไม่ให้เห็น (ปกปิด)')}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] leading-tight text-slate-500">
                      {isAllowed
                        ? tr(
                            'Can see the login e-mail mapped from the DB',
                            'สามารถเห็น email ที่ใช้ในการ login ซึ่ง mapping มาจาก DB'
                          )
                        : tr(
                            'Name, ID and login e-mail are fully blocked',
                            'ชื่อ, รหัส และอีเมลล็อกอินจะถูกปิดกั้นทั้งหมด'
                          )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick presets for HR Admin & Exec */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs">
            <span className="shrink-0 text-[11px] font-bold text-slate-700">
              {tr('Presets:', 'ชุดค่าด่วน (Presets):')}
            </span>
            {ANONYMOUS_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  applyAnonymousPreset(preset.visibleTo, tr(preset.toastEn, preset.toast))
                }
                className={`rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium transition hover:bg-slate-100 ${preset.textClass}`}
              >
                {tr(preset.labelEn, preset.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Live Simulator of Submitter Details Card */}
        <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-700" />
              <span className="text-xs font-bold text-slate-900">
                {tr(
                  'Live Role Simulator (submitter details):',
                  'จำลองการแสดงผลข้อมูลผู้ยื่นเรื่อง (Live Role Simulator):'
                )}
              </span>
            </div>
            {/* Role switcher for simulator */}
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[11px] text-slate-500">
                {tr('View as:', 'มุมมองของ:')}
              </span>
              {rolesList.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSimulatedRoleForAnonymous(r)}
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold transition ${
                    simulatedRoleForAnonymous === r
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {ROLE_SHORT_LABEL[r][lang]}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Anonymous Card Simulation */}
          <AnonymousSimulatorCard
            isSimAllowed={!!permissions[simulatedRoleForAnonymous].canViewAnonymousSubmitterEmail}
            roleName={roleShortName(permissions[simulatedRoleForAnonymous], lang)}
          />
        </div>

        {/* Corporate Employee Directory Collapsible */}
        {showEmployeeDirectoryModal && <EmployeeDirectoryPanel />}
      </div>

      {/* DEDICATED EXECUTIVE MANAGEMENT DIRECTORY BOX (กล่องใส่/แก้ไขรายชื่อคณะผู้บริหารโดยตรง) */}
      <div
        className="space-y-5 rounded-2xl border-2 border-purple-300/80 bg-white p-5 shadow-sm sm:p-6"
        id="executive-management-box"
      >
        {/* Box Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-purple-100 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 p-2.5 text-white shadow-xs">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                  {tr(
                    'Executive Roster & Whistleblower Direct Channel',
                    'ทำเนียบและศูนย์จัดการรายชื่อคณะผู้บริหาร (Executive Roster & Whistleblower Direct Channel)'
                  )}
                </h3>
                <span className="rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                  {tr(`${executives.length} executives`, `${executives.length} ท่าน`)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {tr(
                  'Add/edit senior executives (CEO/EVP/Chair) who receive direct complaints or have access to restricted facts',
                  'เพิ่ม/แก้ไขรายชื่อผู้บริหารระดับสูง (CEO/EVP/ประธานกรรมการ) เพื่อรับเรื่องร้องเรียนสายตรง หรือสิทธิ์เข้าถึงข้อเท็จจริงลับเฉพาะ'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-toggle-add-exec-form"
              onClick={() => {
                if (isAddingExec) {
                  closeExecForm();
                } else {
                  setEditingExecId(null);
                  setExecForm(EMPTY_EXEC_FORM);
                  setIsAddingExec(true);
                }
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap shadow-xs transition ${
                isAddingExec
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isAddingExec ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  <span>{tr('Close form', 'ปิดฟอร์ม')}</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{tr('+ Add executive', '+ เพิ่มผู้บริหารใหม่')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('admin_gatekeeper')}
              className="flex items-center gap-1 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold whitespace-nowrap text-purple-700 transition hover:bg-purple-100"
            >
              <span>{tr('Open full Personnel Directory', 'เปิดศูนย์บุคลากรเต็มรูปแบบ')}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Add / Edit Form Panel */}
        {isAddingExec && (
          <ExecutiveFormPanel
            form={execForm}
            setForm={setExecForm}
            isEditing={editingExecId !== null}
            onSubmit={handleSaveExecSubmit}
            onCancel={closeExecForm}
          />
        )}

        {/* Executive Cards Grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {executives.map((exec) => (
            <ExecutiveCard
              key={exec.id}
              exec={exec}
              hrBadge={hrBadgeFor(exec.email, hrStatus)}
              onToggleStatus={handleToggleExecStatus}
              onEdit={handleStartEditExec}
              onDelete={handleDeleteExec}
            />
          ))}
        </div>
      </div>

      {confirmDialog}
    </div>
  );
};
