'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  GrievanceCategory,
  TicketStatus,
  UrgencyLevel,
  UserRole,
  ConfidentialityLevel,
  SubmissionType,
  AppTabId,
} from '../types';

export type Language = 'th' | 'en';

export interface Translations {
  [key: string]: {
    th: string;
    en: string;
  };
}

export const DICTIONARY: Translations = {
  // Brand & Header
  'brand.name': { th: 'UGT VoiceCare', en: 'UGT VoiceCare' },
  'brand.subtitle': { th: 'Grievance & Whistleblower', en: 'Grievance & Whistleblower' },
  'brand.desc': {
    th: 'ระบบบันทึกข้อร้องเรียน ข้อเสนอแนะ และติดตามผลเรียลไทม์',
    en: 'Enterprise Grievance, Whistleblower & Real-time Tracking System',
  },

  // Navigation Tabs
  'tab.submit': { th: 'ยื่นข้อร้องเรียน / ข้อเสนอแนะ', en: 'Submit Grievance / Suggestion' },
  'tab.my_tickets': { th: 'ติดตามสถานะ (Timeline)', en: 'Track Status (Timeline)' },
  'tab.gatekeeper': { th: 'Gatekeeper Triage Portal', en: 'Gatekeeper Triage Portal' },
  'tab.executive': { th: 'Dashboard ภาพรวม', en: 'Executive Dashboard' },
  'tab.clustering': { th: 'วิเคราะห์สาเหตุ CAPA', en: 'Root Cause & CAPA' },
  'tab.admin_gatekeeper': { th: 'จัดการผู้บริหาร & Gatekeeper', en: 'Personnel & Gatekeepers' },
  'tab.rbac_management': { th: 'กำหนดสิทธิ์เข้าถึง (RBAC)', en: 'Access Control (RBAC)' },
  'tab.workflow': { th: 'คู่มือ & ผังขั้นตอน (SOP)', en: 'Manual & Workflow (SOP)' },

  // Navbar Buttons
  'nav.quick_dashboard': { th: 'Dashboard', en: 'Dashboard' },
  'nav.quick_manual': { th: 'คู่มือ', en: 'Manual' },
  'nav.quick_export': { th: 'ส่งออกข้อมูล', en: 'Export Data' },
  'nav.search_placeholder': {
    th: 'ค้นหารหัสติดตาม เช่น TK-2026...',
    en: 'Search tracking ID e.g. TK-2026...',
  },
  'nav.recent_searches_tooltip': {
    th: 'ดูประวัติการค้นหารหัสติดตาม',
    en: 'View recent tracking searches',
  },
  'nav.notifications': { th: 'การแจ้งเตือน', en: 'Notifications' },
  'nav.role_switch': { th: 'สลับบทบาท', en: 'Switch Role' },

  // Common Actions
  'common.close': { th: 'X', en: 'X' },
  'action.submit': { th: 'ส่งคำร้องเข้าระบบ', en: 'Submit Ticket' },
  'action.cancel': { th: 'ยกเลิก', en: 'Cancel' },
  'action.close': { th: 'ปิด', en: 'Close' },
  'action.save': { th: 'บันทึก', en: 'Save' },
  'action.edit': { th: 'แก้ไข', en: 'Edit' },
  'action.delete': { th: 'ลบ', en: 'Delete' },
  'action.copy': { th: 'คัดลอก', en: 'Copy' },
  'action.copied': { th: 'คัดลอกแล้ว', en: 'Copied' },
  'action.filter': { th: 'กรองข้อมูล', en: 'Filter' },
  'action.search': { th: 'ค้นหา', en: 'Search' },
  'action.clear': { th: 'ล้างข้อมูล', en: 'Clear' },
  'action.confirm': { th: 'ยืนยัน', en: 'Confirm' },
  'action.back': { th: 'ย้อนกลับ', en: 'Back' },
  'action.view_details': { th: 'ดูรายละเอียด', en: 'View Details' },
  'action.view_timeline': { th: 'เปิดดูไทม์ไลน์', en: 'View Timeline' },
  'action.export': { th: 'ส่งออกข้อมูล', en: 'Export' },
  'action.reset': { th: 'รีเซ็ต', en: 'Reset' },

  // Roles
  'role.employee': { th: 'พนักงานทั่วไป (Employee)', en: 'General Employee' },
  'role.employee.sub': {
    th: 'ยื่นข้อร้องเรียน และติดตามสถานะ',
    en: 'Submit grievances & track progress',
  },
  'role.gatekeeper': { th: 'Gatekeeper ประจำหน่วยงาน', en: 'Department Gatekeeper' },
  'role.gatekeeper.sub': {
    th: 'เห็นเฉพาะหน่วยงานที่ตนรับผิดชอบ',
    en: 'Triages specific department complaints',
  },
  'role.executive': { th: 'ผู้บริหารระดับสูง (CEO/EVP)', en: 'Executive (CEO/EVP)' },
  'role.executive.sub': {
    th: 'Dashboard ภาพรวม & ข้อร้องเรียนลับ',
    en: 'Executive dashboard & whistleblower',
  },
  'role.admin': { th: 'HR Admin & ตัวแทนผู้บริหาร', en: 'HR Admin & Governance Rep' },
  'role.admin.sub': {
    th: 'กำหนดสิทธิ์ RBAC & Gatekeeper',
    en: 'RBAC configuration & personnel management',
  },

  // Ticket Status
  'status.submitted': { th: 'รอรับเรื่อง', en: 'Submitted' },
  'status.gatekeeper_triaged': { th: 'คัดกรองแล้ว', en: 'Gatekeeper Triaged' },
  'status.in_progress': { th: 'กำลังดำเนินการ', en: 'In Progress' },
  'status.resolved': { th: 'แก้ไขเสร็จสิ้น', en: 'Resolved' },
  'status.closed': { th: 'ปิดเคสแล้ว', en: 'Closed' },
  'status.all': { th: 'ทุกสถานะ', en: 'All Statuses' },

  // Urgency
  'urgency.Low': { th: 'ปกติ (Low)', en: 'Low' },
  'urgency.Medium': { th: 'ปานกลาง (Medium)', en: 'Medium' },
  'urgency.High': { th: 'เร่งด่วน (High)', en: 'High' },
  'urgency.Critical': { th: 'วิกฤต / ฉุกเฉิน (Critical)', en: 'Critical' },

  // Confidentiality
  'conf.anonymous': { th: 'ไม่ระบุตัวตน (Anonymous)', en: 'Anonymous' },
  'conf.confidential_restricted': {
    th: 'ปกปิดตัวตน (เห็นเฉพาะ Gatekeeper)',
    en: 'Confidential (Gatekeeper Only)',
  },
  'conf.standard_named': { th: 'ระบุตัวตนปกติ (เปิดเผยชื่อ)', en: 'Standard Named' },

  // Submission Type
  'type.complaint': { th: 'ข้อร้องเรียน (Complaint)', en: 'Complaint' },
  'type.suggestion': { th: 'ข้อเสนอแนะปรับปรุง (Suggestion)', en: 'Suggestion' },

  // Recent Searches Panel
  'recent.title': { th: 'ประวัติการค้นหาคำร้อง', en: 'Recent Tracking Searches' },
  'recent.subtitle': {
    th: 'รายการรหัสติดตามคำร้องที่คุณเคยค้นหาผ่านแถบค้นหา Navbar',
    en: 'Tickets previously searched via the Navbar tracking search',
  },
  'recent.filter_placeholder': { th: 'กรองประวัติการค้นหา...', en: 'Filter search history...' },
  'recent.hint': {
    th: 'คลิกที่รายการเพื่อเปิดติดตามสถานะคำร้องทันที',
    en: 'Click an item to view tracking timeline immediately',
  },
  'recent.clear_all': { th: 'ล้างประวัติทั้งหมด', en: 'Clear All History' },
  'recent.empty_title': { th: 'ยังไม่มีประวัติการค้นหาคำร้อง', en: 'No search history yet' },
  'recent.empty_desc': {
    th: 'เมื่อคุณพิมพ์ค้นหารหัสติดตาม (เช่น TK-2026-0001) ที่แถบค้นหา Navbar ระบบจะบันทึกรายการไว้ที่นี่',
    en: 'When you search for a tracking ID in the Navbar, it will be remembered here for fast access.',
  },
  'recent.sample_prompt': {
    th: 'คลิกทดสอบค้นหารหัสตัวอย่างในระบบ:',
    en: 'Click a sample ticket to test search:',
  },
  'recent.not_found': { th: 'ไม่พบในระบบ', en: 'Not Found' },
  'recent.local_storage_note': {
    th: 'บันทึกประวัติอัตโนมัติบนอุปกรณ์นี้ (Local Storage)',
    en: 'Stored locally on this device (Local Storage)',
  },

  // Tracking Timeline Modal
  'timeline.modal_title': {
    th: 'ติดตามสถานะ & ความคืบหน้าคำร้อง',
    en: 'Ticket Progress & Tracking Timeline',
  },
  'timeline.tracking_code': { th: 'รหัสติดตาม:', en: 'Tracking ID:' },
  'timeline.submitted_at': { th: 'ยื่นเรื่องเมื่อ:', en: 'Submitted:' },
  'timeline.category': { th: 'หมวดหมู่:', en: 'Category:' },
  'timeline.urgency': { th: 'ความเร่งด่วน:', en: 'Urgency:' },
  'timeline.department': { th: 'หน่วยงานรับผิดชอบ:', en: 'Responsible Dept:' },
  'timeline.current_status': { th: 'สถานะปัจจุบัน:', en: 'Current Status:' },
  'timeline.evaluation_btn': { th: 'ประเมินความพึงพอใจ (CSAT)', en: 'Submit Satisfaction (CSAT)' },
  'timeline.add_action_btn': {
    th: 'บันทึกความคืบหน้า (Gatekeeper Action)',
    en: 'Update Progress (Gatekeeper)',
  },
  'timeline.audit_trail': {
    th: 'บันทึกประวัติการดำเนินงาน (Audit Trail)',
    en: 'Operational Audit Trail',
  },

  // Employee Submit Form
  'form.title': {
    th: 'แบบฟอร์มยื่นข้อร้องเรียนและข้อเสนอแนะ',
    en: 'Employee Grievance & Suggestion Form',
  },
  'form.subtitle': {
    th: 'ระบบคุ้มครองความปลอดภัยตามมาตรฐาน PDPA & Whistleblower Protection',
    en: 'Safe, protected reporting aligned with PDPA & Whistleblower Protection',
  },
  'form.step1_title': { th: '1. รูปแบบการส่งเรื่อง', en: '1. Submission Type' },
  'form.step2_title': { th: '2. ระดับการรักษาความลับ', en: '2. Confidentiality Level' },
  'form.step3_title': { th: '3. หมวดหมู่ข้อร้องเรียน / เสนอแนะ', en: '3. Grievance Category' },
  'form.step4_title': { th: '4. ระดับความเร่งด่วน', en: '4. Urgency Level' },
  'form.step5_title': { th: '5. รายละเอียดข้อเท็จจริง', en: '5. Incident Details' },
  'form.direct_ceo_title': {
    th: 'ส่งตรงถึงผู้บริหารระดับสูง (CEO / EVP Direct Bypass)',
    en: 'Direct Executive Whistleblower (CEO/EVP Bypass)',
  },
  'form.direct_ceo_desc': {
    th: 'กรณีเรื่องที่เกี่ยวข้องกับผู้บริหาร หรือมีความเสี่ยงสูงมาก',
    en: 'Use when the issue involves senior leadership or severe enterprise risk',
  },
  'form.input_title': { th: 'หัวข้อเรื่องใจความสำคัญ', en: 'Subject / Incident Summary' },
  'form.input_location': { th: 'สถานที่ / หน่วยงาน', en: 'Location / Department' },
  'form.input_desc': {
    th: 'รายละเอียดข้อเท็จจริงและลำดับเหตุการณ์',
    en: 'Detailed Description & Timeline of Events',
  },
  'form.attachments': {
    th: 'ไฟล์หลักฐานประกอบ (รูปถ่าย, เอกสาร, ภาพหน้าจอ)',
    en: 'Supporting Attachments (Photos, Documents, Logs)',
  },
  'form.submit_btn': { th: 'ส่งคำร้องเข้าระบบอย่างเป็นทางการ', en: 'Submit Official Ticket' },

  // My Tickets List
  'mytickets.title': {
    th: 'รายการคำร้องและข้อเสนอแนะของคุณ',
    en: 'My Submitted Grievances & Suggestions',
  },
  'mytickets.subtitle': {
    th: 'ติดตามผลการดำเนินงานแบบเรียลไทม์ และประเมินความพึงพอใจหลังปิดเคส',
    en: 'Track live progress and evaluate resolution quality upon case closure',
  },
  'mytickets.search_placeholder': {
    th: 'ค้นหาด้วยรหัสติดตาม, หัวข้อเรื่อง, หรือสถานที่...',
    en: 'Search by tracking ID, subject, or location...',
  },
  'mytickets.new_ticket_btn': { th: '+ ยื่นคำร้องใหม่', en: '+ New Grievance' },
  'mytickets.empty': { th: 'ไม่พบรายการคำร้องที่ตรงกับเงื่อนไข', en: 'No matching tickets found' },

  // Satisfaction Modal
  'csat.title': {
    th: 'แบบประเมินความพึงพอใจการแก้ไขปัญหา (CSAT)',
    en: 'Resolution Satisfaction Survey (CSAT)',
  },
  'csat.subtitle': {
    th: 'ความคิดเห็นของท่านมีคุณค่าอย่างยิ่งในการพัฒนาคุณภาพการทำงานขององค์กร',
    en: 'Your feedback directly drives organizational development and service quality',
  },
  'csat.overall': {
    th: '1. ความพึงพอใจในภาพรวมต่อการแก้ไขปัญหา',
    en: '1. Overall Satisfaction with Resolution',
  },
  'csat.speed': {
    th: '2. ความรวดเร็วในการติดต่อกลับและแก้ไขปัญหา',
    en: '2. Speed of Response & Lead Time',
  },
  'csat.quality': {
    th: '3. คุณภาพและความรอบคอบของแนวทางแก้ไข',
    en: '3. Quality & Thoroughness of Solution',
  },
  'csat.fairness': {
    th: '4. ความเป็นธรรมและความเป็นมืออาชีพของเจ้าหน้าที่',
    en: '4. Fairness & Professionalism of Officers',
  },
  'csat.comments': {
    th: 'ความคิดเห็นและข้อเสนอแนะเพิ่มเติม',
    en: 'Additional Comments & Suggestions',
  },
  'csat.submit_btn': {
    th: 'ส่งแบบประเมินและปิดเคสอย่างสมบูรณ์',
    en: 'Submit Survey & Complete Case',
  },

  // Gatekeeper Inbox
  'gatekeeper.title': {
    th: 'ศูนย์รับเรื่องและคัดกรองคำร้อง (Gatekeeper Triage Portal)',
    en: 'Gatekeeper Triage Portal',
  },
  'gatekeeper.subtitle': {
    th: 'สำหรับเจ้าหน้าที่ผู้รับผิดชอบกลั่นกรอง ตรวจสอบข้อเท็จจริง และบันทึกมาตรการแก้ไข',
    en: 'For designated officers to triage, investigate, and record corrective actions',
  },

  // Executive Dashboard
  'exec.title': {
    th: 'ศูนย์กำกับดูแลและวิเคราะห์ระดับผู้บริหาร (Executive Dashboard)',
    en: 'Executive Governance & Risk Dashboard',
  },
  'exec.subtitle': {
    th: 'สรุปภาพรวมดัชนีชี้วัดความพึงพอใจ (CSAT), สถิติเรื่องร้องเรียน และสายตรง Whistleblower',
    en: 'Executive summary of CSAT metrics, grievance trends, and whistleblower hotline',
  },

  // Language switch
  'lang.label': { th: 'ภาษา', en: 'Language' },
  'lang.th': { th: 'TH', en: 'TH' },
  'lang.en': { th: 'EN', en: 'EN' },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string, defaultText?: string) => string;
  getCategoryName: (cat: GrievanceCategory) => string;
  getStatusName: (status?: TicketStatus) => string;
  getUrgencyName: (urgency?: UrgencyLevel) => string;
  getRoleTitle: (role: UserRole) => string;
  getConfidentialityName: (conf: ConfidentialityLevel) => string;
  getSubmissionTypeName: (type: SubmissionType) => string;
  getTabName: (tabId: AppTabId) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY_LANG = 'voicecare_lang_preference_v2';

export const LanguageProvider: React.FC<Readonly<{ children: ReactNode }>> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('th');

  // Initialize from localStorage with strict default in 'th'. Read after mount
  // (not in useState) so SSR and hydration markup stay identical.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LANG);
      if (stored === 'th' || stored === 'en') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLangState(stored);
      } else {
        localStorage.setItem(STORAGE_KEY_LANG, 'th');
      }
    } catch {
      // Ignore storage quota or security errors
    }
  }, []);

  // Memoised so consumers only re-render when the language actually changes.
  const value = useMemo<LanguageContextType>(() => {
    const setLang = (newLang: Language) => {
      setLangState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY_LANG, newLang);
      } catch {
        // Ignore storage quota or security errors
      }
    };

    const toggleLang = () => {
      setLang(lang === 'th' ? 'en' : 'th');
    };

    const t = (key: string, defaultText?: string): string => {
      const item = DICTIONARY[key];
      if (item && item[lang]) {
        return item[lang];
      }
      return defaultText || key;
    };

    const getCategoryName = (cat: GrievanceCategory): string => {
      const map: Record<GrievanceCategory, { th: string; en: string }> = {
        HR: {
          th: 'HR – ทรัพยากรบุคคลและสวัสดิการ',
          en: 'HR – Human Resources & Employee Benefits',
        },
        Compliance: {
          th: 'Compliance – การไม่ปฏิบัติตามกฎหมายและกฎเกณฑ์',
          en: 'Compliance – Regulatory & Legal Rules',
        },
        Ethics: { th: 'Ethics – จริยธรรม', en: 'Ethics – Corporate Ethics & Business Conduct' },
        Fraud: { th: 'Fraud – การทุจริต และการฉ้อโกง', en: 'Fraud – Anti-Fraud & Anti-Corruption' },
        Harassment: {
          th: 'Human Right , Harassment – สิทธิมนุษยชน , การล่วงละเมิด',
          en: 'Human Right , Harassment – Human Rights & Anti-Harassment',
        },
        Quality: {
          th: 'Quality Impropriety – การตรวจสอบคุณภาพอย่างไม่เหมาะสม',
          en: 'Quality Impropriety – Quality Assurance & Standards',
        },
      };
      return map[cat] ? map[cat][lang] : cat;
    };

    const getStatusName = (status?: TicketStatus): string => {
      if (!status) return '';
      const map: Record<TicketStatus, { th: string; en: string }> = {
        submitted: { th: 'รอรับเรื่อง', en: 'Submitted' },
        gatekeeper_triaged: { th: 'คัดกรองแล้ว', en: 'Triaged' },
        in_progress: { th: 'กำลังดำเนินการ', en: 'In Progress' },
        resolved: { th: 'แก้ไขเสร็จสิ้น', en: 'Resolved' },
        closed: { th: 'ปิดเคสแล้ว', en: 'Closed' },
      };
      return map[status] ? map[status][lang] : status;
    };

    const getUrgencyName = (urgency?: UrgencyLevel): string => {
      if (!urgency) return '';
      const map: Record<UrgencyLevel, { th: string; en: string }> = {
        Low: { th: 'ปกติ (Low)', en: 'Low' },
        Medium: { th: 'ปานกลาง (Medium)', en: 'Medium' },
        High: { th: 'เร่งด่วน (High)', en: 'High' },
        Critical: { th: 'วิกฤต (Critical)', en: 'Critical' },
      };
      return map[urgency] ? map[urgency][lang] : urgency;
    };

    const getRoleTitle = (role: UserRole): string => {
      const map: Record<UserRole, { th: string; en: string }> = {
        employee: { th: 'พนักงานทั่วไป (Employee)', en: 'General Employee' },
        gatekeeper: { th: 'Gatekeeper ประจำหน่วยงาน', en: 'Department Gatekeeper' },
        executive: { th: 'ผู้บริหารระดับสูง (CEO/EVP)', en: 'Executive (CEO/EVP)' },
        admin: { th: 'HR Admin & ตัวแทนผู้บริหาร', en: 'HR Admin & Governance Rep' },
      };
      return map[role] ? map[role][lang] : role;
    };

    const getConfidentialityName = (conf: ConfidentialityLevel): string => {
      const map: Record<ConfidentialityLevel, { th: string; en: string }> = {
        anonymous: { th: 'ไม่ระบุตัวตน (Anonymous)', en: 'Anonymous' },
        confidential_restricted: {
          th: 'ปกปิดตัวตน (เฉพาะ Gatekeeper)',
          en: 'Confidential (Gatekeeper Only)',
        },
        standard_named: { th: 'ระบุตัวตนปกติ', en: 'Standard Named' },
      };
      return map[conf] ? map[conf][lang] : conf;
    };

    const getSubmissionTypeName = (type: SubmissionType): string => {
      const map: Record<SubmissionType, { th: string; en: string }> = {
        complaint: { th: 'ข้อร้องเรียน (Complaint)', en: 'Complaint' },
        suggestion: { th: 'ข้อเสนอแนะปรับปรุง (Suggestion)', en: 'Suggestion' },
      };
      return map[type] ? map[type][lang] : type;
    };

    const getTabName = (tabId: AppTabId): string => {
      const map: Record<AppTabId, { th: string; en: string }> = {
        submit: { th: 'ยื่นข้อร้องเรียน / ข้อเสนอแนะ', en: 'Submit Grievance / Suggestion' },
        my_tickets: { th: 'ติดตามสถานะ (Timeline)', en: 'Track Status (Timeline)' },
        gatekeeper: { th: 'Gatekeeper Triage Portal', en: 'Gatekeeper Triage Portal' },
        executive: { th: 'Dashboard ภาพรวม', en: 'Executive Dashboard' },
        clustering: { th: 'วิเคราะห์สาเหตุ CAPA', en: 'Root Cause & CAPA' },
        admin_gatekeeper: { th: 'จัดการผู้บริหาร & Gatekeeper', en: 'Personnel & Gatekeepers' },
        rbac_management: { th: 'กำหนดสิทธิ์เข้าถึง (RBAC)', en: 'Access Control (RBAC)' },
        workflow: { th: 'คู่มือ & ผังขั้นตอน (SOP)', en: 'Manual & Workflow (SOP)' },
        // Tabs added by our SSO/RBAC setup (not in upstream)
        admin_users: { th: 'จัดการผู้ใช้', en: 'User Management' },
        admin_roles: { th: 'บทบาทและสิทธิ์', en: 'Roles & Permissions' },
        admin_audit_logs: { th: 'บันทึกการใช้งาน', en: 'Audit Logs' },
        admin_mail_templates: { th: 'เทมเพลตอีเมล', en: 'Email Templates' },
      };
      return map[tabId] ? map[tabId][lang] : tabId;
    };

    return {
      lang,
      setLang,
      toggleLang,
      t,
      getCategoryName,
      getStatusName,
      getUrgencyName,
      getRoleTitle,
      getConfidentialityName,
      getSubmissionTypeName,
      getTabName,
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
