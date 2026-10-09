import type { ComplaintTicket, GrievanceCategory, SubmissionType, UrgencyLevel } from '../../types';

export type RiskSeverity = ComplaintTicket['riskSeverity'];
export type PresetType = 'quality_issue' | 'compliance_alert' | 'welfare_idea' | 'fraud_alert';
export type IdentityChoice = 'identified' | 'anonymous';
export interface Bilingual {
  en: string;
  th: string;
}

// Risk severity that goes with each urgency level (used by the urgency buttons,
// the quick presets and "apply AI category").
export const RISK_BY_URGENCY: Record<UrgencyLevel, RiskSeverity> = {
  Low: 'Low',
  Medium: 'Moderate',
  High: 'High',
  Critical: 'Severe',
};

export const PRESETS: Record<
  PresetType,
  {
    type: SubmissionType;
    category: GrievanceCategory;
    urgency: UrgencyLevel;
    isDirectToExecutive: boolean;
    title: Bilingual;
    description: Bilingual;
    location: Bilingual;
  }
> = {
  quality_issue: {
    type: 'complaint',
    category: 'Quality',
    urgency: 'Medium',
    isDirectToExecutive: false,
    title: {
      en: 'Discrepancy in batch LOT-2026-Q3 exceeds QC tolerances',
      th: 'พบชิ้นงานล็อต LOT-2026-Q3 มีค่าความคลาดเคลื่อนเกินเกณฑ์มาตรฐาน QC',
    },
    description: {
      en: 'Daily QA/QC inspection detected thickness and sealing defects violating ISO 9001. Risk of leakage and customer rejection. Request urgent batch quarantine and calibration of gauges.',
      th: 'จากการสุ่มตรวจชิ้นงานประกอบและแพ็กเกจสินค้าในกระบวนการ QA/QC ประจำวัน พบว่าค่าความหนาและการผนึกบรรจุภัณฑ์ไม่ผ่านเกณฑ์มาตรฐาน ISO 9001 เสี่ยงต่อการรั่วซึมและการปฏิเสธสินค้าจากลูกค้าปลายทาง เสนอให้ระงับการปล่อยล็อตและสอบเทียบเครื่องมือวัดด่วน',
    },
    location: {
      en: 'Production Plant Line 2, QA/QC Division',
      th: 'โรงงานผลิต สายการผลิตที่ 2 ฝ่ายควบคุมคุณภาพ (QA/QC)',
    },
  },
  compliance_alert: {
    type: 'complaint',
    category: 'Compliance',
    urgency: 'High',
    isDirectToExecutive: true,
    title: {
      en: 'Unrestricted access to customer contracts and PII in shared folder (PDPA Risk)',
      th: 'ตรวจพบการจัดเก็บเอกสารสัญญาและข้อมูลส่วนบุคคลลูกค้าในโฟลเดอร์ที่ไม่จำกัดสิทธิ์ตาม PDPA',
    },
    description: {
      en: 'Department Shared Drive folder has public access without encryption to customer ID copies and PII. Violates security policy and PDPA regulations. Urgent compliance review requested.',
      th: 'พบว่าโฟลเดอร์ Shared Drive ส่วนกลางของหน่วยงานมีการเปิด Public Access ให้เข้าถึงเอกสารสำเนาบัตรประชาชนและข้อมูลส่วนบุคคล (PII) ของลูกค้าโดยไม่มีการเข้ารหัสผ่าน ซึ่งขัดต่อนโยบายความปลอดภัยและกฎหมาย PDPA จึงขอให้ฝ่ายกำกับดูแลเข้าตรวจสอบและแก้ไขด่วน',
    },
    location: {
      en: 'Customer Care Center & Central Records',
      th: 'ศูนย์บริการลูกค้าและคลังเอกสารสัญญาส่วนกลาง',
    },
  },
  welfare_idea: {
    type: 'suggestion',
    category: 'HR',
    urgency: 'Low',
    isDirectToExecutive: false,
    title: {
      en: 'Proposal: Green Relaxation Corner & Eye Wellness Zone for workstation staff',
      th: 'เสนอจัดตั้งพื้นที่ Green Relaxation Corner & โซนพักสายตาสำหรับสายงานคอมพิวเตอร์',
    },
    description: {
      en: 'To promote ergonomic employee wellbeing and alleviate Office Syndrome, propose air-purifying greenery and massage recliners in common rest areas.',
      th: 'เพื่อส่งเสริมสุขภาวะพนักงานตามหลัก Ergonomics เสนอให้จัดพื้นที่สีเขียวพร้อมต้นไม้ฟอกอากาศและเก้าอี้นวดผ่อนคลายกล้ามเนื้อสายตา เพื่อลดภาวะ Office Syndrome',
    },
    location: {
      en: 'Floor 10 Common Area, All Towers',
      th: 'พื้นที่ส่วนกลาง ชั้น 10 ทุกอาคาร',
    },
  },
  fraud_alert: {
    type: 'complaint',
    category: 'Fraud',
    urgency: 'Critical',
    isDirectToExecutive: true,
    title: {
      en: 'Suspected procurement overpricing of conveyor maintenance parts by 300%',
      th: 'ข้อสงสัยเกี่ยวกับการจัดซื้ออะไหล่ซ่อมบำรุงที่ราคาสูงกว่าท้องตลาด 300%',
    },
    description: {
      en: 'Conveyor belt invoice INV-8890 shows abnormally inflated prices from a supplier incorporated only 1 month ago. Related-party conflict of interest concern.',
      th: 'พบการเบิกจ่ายค่าอะไหล่สายพานลำเลียงในใบแจ้งหนี้เลขที่ INV-8890 ราคาสูงผิดปกติและบริษัทคู่ค้าเพิ่งจดทะเบียนได้เพียง 1 เดือน โดยผู้มีอำนาจอนุมัติมีความเกี่ยวข้องทางเครือญาติ',
    },
    location: {
      en: 'Eastern Regional Distribution Center',
      th: 'ศูนย์กระจายสินค้าภาคตะวันออก',
    },
  },
};

export const URGENCY_OPTIONS: {
  level: UrgencyLevel;
  id: string;
  selectedClass: string;
  titleClass: string;
  badgeClass: string;
  title: Bilingual;
  description: Bilingual;
}[] = [
  {
    level: 'Low',
    id: 'urgency-btn-low',
    selectedClass:
      'border-slate-400 bg-slate-100 text-slate-900 shadow-xs ring-2 ring-slate-400/30',
    titleClass: 'text-slate-700',
    badgeClass: 'bg-slate-200/80 text-slate-600',
    title: { en: '🟢 Low / General', th: '🟢 ต่ำ / ทั่วไป' },
    description: {
      en: 'General inquiry or suggestion; does not affect daily operations',
      th: 'ข้อเสนอแนะ / สอบถามทั่วไป ไม่กระทบงานประจำวัน',
    },
  },
  {
    level: 'Medium',
    id: 'urgency-btn-medium',
    selectedClass: 'border-amber-400 bg-amber-50 text-amber-950 shadow-xs ring-2 ring-amber-400/40',
    titleClass: 'text-amber-800',
    badgeClass: 'bg-amber-100 text-amber-800',
    title: { en: '🟡 Medium', th: '🟡 ปานกลาง' },
    description: {
      en: 'Begins to affect workflow, processes, or minor equipment fault',
      th: 'เริ่มกระทบขั้นตอนการทำงาน หรืออุปกรณ์ขัดข้อง',
    },
  },
  {
    level: 'High',
    id: 'urgency-btn-high',
    selectedClass: 'border-rose-400 bg-rose-50 text-rose-950 shadow-xs ring-2 ring-rose-400/40',
    titleClass: 'text-rose-800',
    badgeClass: 'bg-rose-100 text-rose-800',
    title: { en: '🔴 High / Urgent', th: '🔴 เร่งด่วน' },
    description: {
      en: 'Affects safety, employee wellness, or causes operational halt',
      th: 'กระทบความปลอดภัย สุขภาพพนักงาน หรือหยุดชะงัก',
    },
  },
  {
    level: 'Critical',
    id: 'urgency-btn-critical',
    selectedClass: 'border-red-500 bg-red-100 text-red-950 shadow-xs ring-2 ring-red-500/50',
    titleClass: 'text-red-800',
    badgeClass: 'bg-red-200 font-bold text-red-900',
    title: { en: '🔥 Critical / Emergency', th: '🔥 วิกฤติ / ฉุกเฉิน' },
    description: {
      en: 'Severe crisis, corruption, legal liability or human safety threat',
      th: 'เหตุฉุกเฉินร้ายแรง ทุจริต หรือความเสี่ยงกฎหมาย',
    },
  },
];

export type UrgencyOption = (typeof URGENCY_OPTIONS)[number];
