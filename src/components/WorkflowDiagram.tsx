'use client';

import React, { useState } from 'react';
import {
  FileText,
  Shield,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Crown,
  Users,
  Sparkles,
  AlertTriangle,
  Star,
  Play,
  RotateCcw,
  Check,
  Zap,
  ChevronRight,
  Layers,
  HelpCircle,
  BookOpen,
  ShieldCheck,
  Settings,
  FileCheck2,
  Laptop,
  Search,
} from 'lucide-react';
import { UserRole } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface WorkflowDiagramProps {
  onNavigateTab: (tab: string) => void;
  onSwitchRole?: (role: UserRole) => void;
}

interface WorkflowStep {
  id: number;
  stageCode: string;
  titleTh: string;
  titleEn: string;
  shortDesc: string;
  actorRole: UserRole;
  actorTitleTh: string;
  actorColor: string;
  targetTab: string;
  targetTabLabel: string;
  durationEst: string;
  keyActions: string[];
  systemAutomations: string[];
  rulesAndSla: string;
  icon: React.ReactNode;
}

type ManualSection = 'workflow' | 'role_guides' | 'sla_matrix' | 'pdpa_security' | 'faq';

export const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({
  onNavigateTab,
  onSwitchRole,
}) => {
  const { lang } = useLanguage();
  const [activeManualSection, setActiveManualSection] = useState<ManualSection>('workflow');
  const [selectedRoleGuide, setSelectedRoleGuide] = useState<UserRole>('employee');
  const [selectedStepId, setSelectedStepId] = useState<number>(1);
  const [simulationCurrentStep, setSimulationCurrentStep] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationScenario, setSimulationScenario] = useState<'normal_quality' | 'urgent_pdpa'>(
    'normal_quality'
  );
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);
  const [faqSearchQuery, setFaqSearchQuery] = useState<string>('');

  const workflowSteps: WorkflowStep[] = [
    {
      id: 1,
      stageCode: 'SUBMISSION',
      titleTh: '1. พนักงานยื่นข้อร้องเรียน / ข้อเสนอแนะ',
      titleEn: 'Employee Voice Submission',
      shortDesc: 'พนักงานระบุตัวตน เลือกประเภท หมวดหมู่ กรอกรายละเอียด และแนบหลักฐาน',
      actorRole: 'employee',
      actorTitleTh: 'พนักงานผู้ยื่นเรื่อง (Employee)',
      actorColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      targetTab: 'submit',
      targetTabLabel: 'ยื่นข้อร้องเรียน / ข้อเสนอแนะ',
      durationEst: '1–3 นาที',
      keyActions: [
        'เลือกประเภทคำร้อง: "ข้อร้องเรียน (Complaint)" หรือ "ข้อเสนอแนะพัฒนา (Suggestion)"',
        'ระบุ 1 ใน 6 หมวดหมู่ที่เกี่ยวข้อง (HR, Compliance, Ethics, Fraud, Human Right/Harassment, Quality Impropriety)',
        'ประเมินระดับความเร่งด่วนและผลกระทบ (Standard, Urgent, Critical)',
        'ตรวจสอบข้อมูลผู้ยื่นเรื่อง (ชื่อ-นามสกุล, รหัสพนักงาน, ฝ่าย, อีเมล) โดยส่งต่อเฉพาะ Gatekeeper ที่รับผิดชอบตามเกณฑ์ PDPA',
        'เลือกช่องทางส่งตรงถึงผู้บริหาร (CEO / EVP Direct Bypass) หากเป็นประเด็นอ่อนไหวหรือเร่งด่วนเป็นพิเศษ',
        'กรอกหัวข้อเรื่องใจความสำคัญ ระบุสถานที่/หน่วยงาน และรายละเอียดข้อเท็จจริงอย่างครบถ้วน',
      ],
      systemAutomations: [
        'ออกรหัสติดตามเฉพาะแบบถาวร (Tracking ID เช่น TK-2026-XXXX)',
        'วิเคราะห์ความรู้สึกและคัดกรองระดับความเร่งด่วนอัตโนมัติ (AI Sentiment & Priority Tagging)',
        'ส่งการแจ้งเตือน Real-time ยืนยันการรับเรื่องเข้ากล่องข้อความของผู้ยื่น',
        'ส่ง Email แจ้งเตือนหา Gatekeeper ประจำฝ่ายทันที (ตั้งค่าเปิด/ปิด และเทมเพลตได้ในระบบ Admin)',
      ],
      rulesAndSla:
        'ข้อมูลส่วนบุคคลของผู้ยื่นได้รับการคุ้มครองตามมาตรฐาน PDPA ส่งต่อเฉพาะ Gatekeeper ที่รับผิดชอบโดยตรงเท่านั้น',
      icon: <FileText className="h-5 w-5 text-emerald-600" />,
    },
    {
      id: 2,
      stageCode: 'ROUTING',
      titleTh: '2. ระบบคัดแยกและจ่ายงานอัตโนมัติ',
      titleEn: 'Smart Dispatch & Auto-Routing',
      shortDesc: 'ส่งคำร้องไปยังหน่วยงานที่ถูกต้อง และจัดสรรผู้รับผิดชอบตามเกณฑ์ที่กำหนด',
      actorRole: 'admin',
      actorTitleTh: 'ระบบอัตโนมัติ / ผู้ดูแลระบบ (Admin)',
      actorColor: 'bg-slate-100 text-slate-700 border-slate-200',
      targetTab: 'admin_gatekeeper',
      targetTabLabel: 'กำหนด Gatekeeper แต่ละหน่วยงาน (Admin)',
      durationEst: 'ทันที (Real-time)',
      keyActions: [
        'คัดกรองหมวดหมู่และจับคู่กับทีม Gatekeeper ประจำฝ่ายที่รับผิดชอบ',
        'กระจายงานตามโหมดที่ Admin ตั้งค่าไว้ (Round Robin หมุนเวียน หรือ Workload Balanced กระจายตามภาระงานคงค้าง)',
        'ส่งการแจ้งเตือนงานใหม่ไปยังเจ้าหน้าที่ประจำฝ่ายทันที',
      ],
      systemAutomations: [
        'ส่ง Webhook & Notification แจ้งเตือนไปยัง Lead Officer ประจำฝ่าย',
        'แจ้งเตือนระดับความสำคัญและความเร่งด่วนตามหมวดหมู่',
        'หากเลือก "CEO/EVP Direct Bypass" ระบบจะแจ้งเตือน Dashboard ผู้บริหารทันที',
      ],
      rulesAndSla: 'ระบบจัดสรรเคสอัตโนมัติทันทีตั้งแต่เคสถูกบันทึกสำเร็จเข้าระบบ',
      icon: <Users className="h-5 w-5 text-indigo-600" />,
    },
    {
      id: 3,
      stageCode: 'TRIAGE_ACTION',
      titleTh: '3. Gatekeeper ตรวจสอบและดำเนินการแก้ไข',
      titleEn: 'Triage, Investigation & Action Plan',
      shortDesc: 'เจ้าหน้าที่รับเรื่อง ตรวจสอบข้อเท็จจริง ดำเนินการแก้ไข และอัปเดตความคืบหน้า',
      actorRole: 'gatekeeper',
      actorTitleTh: 'เจ้าหน้าที่ Gatekeeper ประจำฝ่าย',
      actorColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      targetTab: 'gatekeeper',
      targetTabLabel: 'Gatekeeper Triage Portal',
      durationEst: 'ตามลำดับความเร่งด่วนของเรื่อง',
      keyActions: [
        'กดรับเรื่อง (Accept / Triage) และระบุเจ้าหน้าที่ผู้รับผิดชอบหลัก',
        'เปลี่ยนสถานะเป็น "กำลังดำเนินการ (In Progress)" หรือ "กำลังตรวจสอบ (Investigating)"',
        'สื่อสารสองทางแบบนิรนาม (Anonymous 2-Way Chat): ซักถามและขอหลักฐานเพิ่มเติมจากผู้ร้องเรียนโดยที่ระบบรักษาการไม่เปิดเผยตัวตน 100%',
        'ดำเนินการแก้ไขปัญหาหน้างานจริง และจัดทำรายงานสรุปผลการสอบสวนข้อเท็จจริง (Official Investigation & CAPA Report)',
        'บันทึกสรุปผลการแก้ไข (Resolution Notes) และแนบเอกสารแนวทางป้องกันเชิงรุก',
      ],
      systemAutomations: [
        'บันทึก Audit Timeline Log ทุกครั้งที่มีการเปลี่ยนสถานะหรือส่งข้อความ',
        'ระบบแจ้งเตือนเคสค้างหรือมีความเร่งด่วนสูงไปยังเจ้าหน้าที่ผู้รับผิดชอบ',
        'ระบบออกรายงานสรุปผลการสอบสวนข้อเท็จจริง (Investigation Summary Report) พิมพ์/ส่งออกได้ทันที',
        'ส่ง Email แจ้งผลการแก้ไขและข้อเสนอแนะกลับไปยังพนักงานผู้ยื่นเรื่องทันทีเมื่อสถานะเป็น Resolved',
      ],
      rulesAndSla:
        'เจ้าหน้าที่ต้องระบุแนวทางและผลการแก้ไขที่ชัดเจน พร้อมทั้งสามารถจัดทำรายงานสรุปผลการสอบสวนก่อนกดยืนยันปิดเคส (Resolved)',
      icon: <Shield className="h-5 w-5 text-indigo-600" />,
    },
    {
      id: 4,
      stageCode: 'FEEDBACK_LOOP',
      titleTh: '4. ติดตามผลและประเมินความพึงพอใจ (CSAT)',
      titleEn: 'Employee Tracking & CSAT Evaluation',
      shortDesc: 'พนักงานตรวจสอบผลการแก้ไข ให้คะแนนความพึงพอใจ ยืนยันการแก้ไขปัญหา และปิดเคส',
      actorRole: 'employee',
      actorTitleTh: 'พนักงานผู้ยื่นเรื่อง (Employee)',
      actorColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      targetTab: 'my_tickets',
      targetTabLabel: 'ติดตามสถานะเรียลไทม์ (Timeline)',
      durationEst: '1–2 วันหลังปิดเคส',
      keyActions: [
        'ตรวจสอบผลการแก้ไขและการดำเนินงานผ่าน Interactive Timeline และเปิดดูรายงานผลการสอบสวน (Official Report)',
        'โต้ตอบหรือส่งข้อคิดเห็นเพิ่มเติมผ่านระบบสื่อสารสองทางแบบนิรนาม (Anonymous 2-Way Chat)',
        'ทำแบบประเมิน CSAT ใหม่ 4 ข้อ: 1. ปัญหาได้รับการแก้ไข (ใช่ / ไม่ใช่) 2. ความคิดเห็นเพิ่มเติม 3. ข้อเสนอแนะเพื่อพัฒนาองค์กร และ 4. ความพึงพอใจภาพรวมทั้งหมด (1–5 ดาว)',
        'กดยืนยันปิดเคสสมบูรณ์ (Status: Closed) อย่างเป็นทางการ',
      ],
      systemAutomations: [
        'คำนวณคะแนน CSAT รวมและอัปเดตสถิติเข้า Dashboard หน่วยงานทันที',
        'ปิดเคสสมบูรณ์ (Status: Closed) หลังได้รับการประเมินความพึงพอใจ',
      ],
      rulesAndSla:
        'ผลคะแนน CSAT ถูกนำไปคำนวณ KPI ประจำหน่วยงานเพื่อความโปร่งใสและสร้างมาตรฐานบริการ',
      icon: <Star className="h-5 w-5 text-amber-500" />,
    },
    {
      id: 5,
      stageCode: 'EXECUTIVE_AI',
      titleTh: '5. ผู้บริหารวิเคราะห์ภาพรวม & AI จัดกลุ่มต้นตอ',
      titleEn: 'Executive Oversight & AI Root Cause Analytics',
      shortDesc: 'วิเคราะห์อัตราแก้ไขสำเร็จ, CSAT และใช้ AI จัดกลุ่มป้องกันเชิงรุก (CAPA)',
      actorRole: 'executive',
      actorTitleTh: 'ผู้บริหารระดับสูง (CEO / EVP / GRC)',
      actorColor: 'bg-purple-50 text-purple-700 border-purple-200',
      targetTab: 'executive',
      targetTabLabel: 'Dashboard & AI CAPA',
      durationEst: 'เรียลไทม์ / ประจำสัปดาห์ / ประจำเดือน',
      keyActions: [
        'ติดตามมาตรวัดหลัก: Total Tickets, Resolution Rate %, Average CSAT Score',
        'ดูสถิติแยกตาม 6 หน่วยงาน และตรวจสอบเคสด่วนพิเศษ (CEO/EVP Bypass)',
        'ใช้ระบบ AI Clustering เพื่อจัดกลุ่มปัญหาที่เกิดซ้ำๆ (Root Cause Analysis 4M)',
        'กำหนดนโยบายและมาตรการป้องกันเชิงรุกระดับองค์กร (CAPA Action Plan)',
      ],
      systemAutomations: [
        'AI สกัด Insights และวิเคราะห์สาเหตุเชิงโครงสร้าง (People, Process, Equipment, Governance)',
        'ระบบแจ้งเตือน Executive Alert เมื่อมีเคสความเสี่ยงสูงหรือข้อร้องเรียนคั่งค้าง',
      ],
      rulesAndSla:
        'ข้อมูลรายงานสรุปภาพรวมพร้อมสำหรับการส่งออก (Export Excel/PDF) สำหรับการประชุมบอร์ดบริหาร',
      icon: <Crown className="h-5 w-5 text-purple-600" />,
    },
  ];

  const currentActiveStepData =
    workflowSteps.find((s) => s.id === selectedStepId) || workflowSteps[0];

  // Simulation handlers
  const handleStartSimulation = (scenario: 'normal_quality' | 'urgent_pdpa') => {
    setSimulationScenario(scenario);
    setSimulationCurrentStep(1);
    setSelectedStepId(1);
    setIsSimulating(true);
    setActiveManualSection('workflow');
  };

  const handleNextSimulationStep = () => {
    if (simulationCurrentStep < 5) {
      const nextStep = simulationCurrentStep + 1;
      setSimulationCurrentStep(nextStep);
      setSelectedStepId(nextStep);
    } else {
      setIsSimulating(false);
    }
  };

  const handleResetSimulation = () => {
    setIsSimulating(false);
    setSimulationCurrentStep(1);
    setSelectedStepId(1);
  };

  const slaMatrixData = [
    {
      category: 'HR',
      nameTh: 'HR – ทรัพยากรบุคคลและสวัสดิการ',
      severity: 'Normal / Urgent',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      description:
        'สวัสดิการพนักงาน ค่าตอบแทน วันลา การปรับเงินเดือน สภาพแวดล้อมการทำงาน สุขอนามัย และความสัมพันธ์แรงงาน',
      responsible: 'People & Culture / HR Gatekeeper',
    },
    {
      category: 'Compliance',
      nameTh: 'Compliance – การไม่ปฏิบัติตามกฎหมายและกฎเกณฑ์',
      severity: 'High / Urgent',
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      description:
        'กฎหมายควบคุมการแข่งขันทางการค้า (Competition Laws), กฎหมายและข้อบังคับว่าด้วยการควบคุมการส่งออกเพื่อนโยบายความมั่นคง (National Security Export Controls), การคุ้มครองข้อมูลส่วนบุคคล (PDPA) และกฎเกณฑ์ทางกฎหมาย',
      responsible: 'Governance, Risk & Compliance Division',
    },
    {
      category: 'Ethics',
      nameTh: 'Ethics – จริยธรรม',
      severity: 'High / Critical',
      badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
      description:
        'การฟอกเงิน, การซื้อขายหลักทรัพย์โดยใช้ข้อมูลภายใน (Insider Trading), ข้องเกี่ยวกับกลุ่มผู้มีอิทธิพลซึ่งไม่ชอบด้วยกฎหมาย, การเปิดเผยข้อมูล, การรักษาความลับ, ทรัพย์สินทางปัญญา, การแสดงความคิดเห็นหรือโพสต์ข้อความบนสื่อสังคมออนไลน์หรืออินเทอร์เน็ตที่กระทบต่อกลุ่มบริษัท UBE, การจัดทำรายงานทางการเงินและการเปิดเผยข้อมูลทางการเงินที่ถูกต้อง',
      responsible: 'Internal Audit & Ethics Committee',
    },
    {
      category: 'Fraud',
      nameTh: 'Fraud – การทุจริต และการฉ้อโกง',
      severity: 'Critical / Urgent',
      badgeColor: 'bg-red-50 text-red-800 border-red-200',
      description:
        'การจัดซื้อจัดจ้าง, การติดสินบน, การจ่ายหรือรับเงินใต้โต๊ะ, การคอร์รัปชัน, การรับของขวัญ, การเลี้ยงรับรอง, ผลประโยชน์ทับซ้อน, การยักยอกเงิน หรือการปลอมแปลงเอกสารทางบัญชี',
      responsible: 'Forensic Audit & Special Investigation',
    },
    {
      category: 'Harassment',
      nameTh: 'Human Right, Harassment – สิทธิมนุษยชน, การล่วงละเมิด',
      severity: 'Critical / Sensitive',
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
      description:
        'สิทธิมนุษยชน, การล่วงละเมิดทางเพศ, การคุกคามทางวาจาหรือร่างกาย, การกลั่นแกล้ง (Bullying), การเลือกปฏิบัติ หรือการละเมิดศักดิ์ศรีความเป็นมนุษย์',
      responsible: 'Human Rights & Whistleblower Panel',
    },
    {
      category: 'Quality',
      nameTh: 'Quality Impropriety – การตรวจสอบคุณภาพอย่างไม่เหมาะสม',
      severity: 'Normal / Urgent',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      description:
        'การตรวจสอบคุณภาพอย่างไม่เหมาะสม, การบิดเบือนหรือปลอมแปลงผลการทดสอบ QC/QA, การละเลยมาตรฐานความปลอดภัยของผลิตภัณฑ์ หรือการส่งมอบสินค้าที่ไม่เป็นไปตามข้อตกลง',
      responsible: 'Quality Assurance & Quality Control Council',
    },
  ];

  const raciData = [
    {
      processTh: 'ยื่นคำร้อง / ข้อเสนอแนะ (Voice Submission)',
      employee: 'R (ผู้ทำ)',
      gatekeeper: 'I (รับทราบ)',
      executive: 'I (เคสด่วน)',
      admin: '-',
    },
    {
      processTh: 'กำหนดเกณฑ์และจ่ายงานอัตโนมัติ (Smart Dispatch)',
      employee: '-',
      gatekeeper: 'A (รับมอบ)',
      executive: 'I (ภาพรวม)',
      admin: 'R/A (ตั้งค่า)',
    },
    {
      processTh: 'ตรวจสอบ ลงพื้นที่ และแก้ไขปัญหา (Triage & Action)',
      employee: 'I (ติดตาม)',
      gatekeeper: 'R/A (แก้ไข)',
      executive: 'I (เคสสำคัญ)',
      admin: '-',
    },
    {
      processTh: 'ปิดเคส & ประเมินความพึงพอใจ (CSAT Feedback)',
      employee: 'R (ประเมิน)',
      gatekeeper: 'I (ดูคะแนน)',
      executive: 'I (ติดตาม)',
      admin: '-',
    },
    {
      processTh: 'วิเคราะห์สถิติ, CSAT & AI ป้องกันเชิงรุก (Analytics)',
      employee: '-',
      gatekeeper: 'I (ปรับปรุง)',
      executive: 'R/A (วิเคราะห์)',
      admin: 'C (ดูแลระบบ)',
    },
  ];

  const faqItems = [
    {
      q: '1. ข้อมูลชื่อและตัวตนของผู้ยื่นเรื่องถูกจัดเก็บและเปิดเผยอย่างไร?',
      a: 'ระบบจัดเก็บข้อมูลผู้ยื่นเรื่อง (ชื่อ, รหัสพนักงาน, ฝ่าย, อีเมล) อย่างปลอดภัยตามมาตรฐาน PDPA โดยจะส่งต่อและเปิดให้เฉพาะเจ้าหน้าที่ Gatekeeper ประจำฝ่ายที่รับผิดชอบโดยตรงตรวจสอบเท่านั้น และไม่อนุญาตให้บุคคลภายนอกหรือผู้ไม่มีส่วนเกี่ยวข้องเข้าถึงข้อมูลตัวตน',
    },
    {
      q: '2. ช่องทางส่งตรงถึงผู้บริหาร (CEO / EVP Direct Bypass) คืออะไร และควรใช้เมื่อใด?',
      a: 'เป็นช่องทางพิเศษสำหรับกรณีที่ประเด็นมีความอ่อนไหวสูงมาก มีความเสี่ยงต่อองค์กร หรือเกี่ยวข้องกับสายการบังคับบัญชาโดยตรง เมื่อเลือกตัวเลือกนี้ ระบบจะส่งการแจ้งเตือนและเชื่อมต่อเคสเข้าสู่แดชบอร์ดของผู้บริหารระดับสูงทันที ควบคู่กับการจ่ายงานให้ Gatekeeper ฝ่ายที่เกี่ยวข้อง',
    },
    {
      q: '3. รหัสติดตามคำร้อง (Tracking Code) ใช้อย่างไร?',
      a: 'เมื่อบันทึกคำร้องสำเร็จ ระบบจะออกรหัสเฉพาะ เช่น TK-2026-0881 ซึ่งพนักงานสามารถนำรหัสนี้ไปค้นหาได้ทันทีที่ช่อง "ค้นหาด้วยรหัสติดตาม" บนแถบเมนูด้านบน หรือเปิดดูได้ที่แท็บ "คำร้องของฉัน" เพื่อดูขั้นตอนการดำเนินงานแบบเรียลไทม์',
    },
    {
      q: '4. หากคำร้องยังไม่ได้รับการคัดกรองหรือมีความเร่งด่วนสูง ระบบจะดำเนินการอย่างไร?',
      a: 'ระบบจะส่งการแจ้งเตือนติดตามงานไปยังหัวหน้าฝ่าย (Lead Gatekeeper) โดยอัตโนมัติ และกรณีที่เป็นเคสเร่งด่วนหรือเลือกส่งตรงผู้บริหาร (Bypass) จะแสดงสัญลักษณ์เตือนบนหน้าแดชบอร์ดของผู้บริหารทันที',
    },
    {
      q: '5. แบบประเมินความพึงพอใจ (CSAT) มีผลอย่างไรต่องานบริการ?',
      a: 'เมื่อ Gatekeeper ดำเนินการแก้ไขเรียบร้อยแล้ว พนักงานจะได้รับแจ้งเตือนให้ประเมินคะแนนดาว 1–5 ใน 4 มิติ (ความรวดเร็ว, คุณภาพ, มารยาทการสื่อสาร, ความชัดเจน) คะแนนนี้จะนำไปประมวลผลเป็นดัชนีคุณภาพการบริการของแต่ละหน่วยงานอย่างโปร่งใส',
    },
    {
      q: '6. AI ผู้ช่วยวิเคราะห์ต้นตอ (Root Cause Analytics & CAPA) ทำงานอย่างไร?',
      a: 'AI จะประมวลผลข้อร้องเรียนและข้อเสนอแนะทั้งหมด โดยจัดกลุ่มตามหลักการ 4M (Man, Machine, Method, Material) และสกัดสาเหตุเชิงโครงสร้าง พร้อมเสนอแนะแนวทางป้องกันเชิงรุก (Preventive Actions) เพื่อช่วยให้ผู้บริหารและฝ่ายต่างๆ แก้ไขปัญหาได้ตรงจุดและยั่งยืน',
    },
    {
      q: '7. ระบบสื่อสารสองทางแบบนิรนาม (Anonymous 2-Way Chat) ทำงานอย่างไร และมั่นใจในความปลอดภัยได้อย่างไร?',
      a: 'ระบบใช้สถาปัตยกรรม End-to-End Anonymous Protection โดยผู้ร้องเรียนที่เลือกไม่เปิดเผยตัวตน สามารถส่งข้อความโต้ตอบ ชี้แจงข้อมูล และส่งพยานหลักฐานเพิ่มเติมกับเจ้าหน้าที่ Gatekeeper หรือคณะกรรมการสอบสวนได้ผ่านแท็บ "สื่อสารสองทางนิรนาม" ในหน้า Tracking Timeline เจ้าหน้าที่จะเห็นเพียง "พนักงาน (ไม่เปิดเผยตัวตน)" เท่านั้น ไม่มีการเปิดเผยชื่อ นามสกุล รหัสพนักงาน หรืออีเมลในทุกขั้นตอน สอดคล้องกับมาตรฐาน Whistleblower Protection และ PDPA',
    },
    {
      q: '8. การจัดทำและพิมพ์รายงานสรุปผลการสอบสวนข้อเท็จจริง (Official Investigation & CAPA Report) ใช้งานอย่างไร?',
      a: 'รายงานสรุปผลการสอบสวนข้อเท็จจริงเป็นเอกสารทางการมาตรฐานสากล (Formal Investigation Document) ที่รวบรวมข้อมูลเคส, ข้อเท็จจริง, ผลการสืบสวน, การวิเคราะห์หาสาเหตุที่แท้จริง (Root Cause 4M), มาตรการแก้ไขและป้องกันการเกิดซ้ำ (CAPA), ตลอดจนประวัติการดำเนินงาน (Audit Trail) และลายมือชื่อ สามารถเปิดดูได้จากปุ่ม "รายงานผล" (Report) บนแถบหัวข้อของหน้า Timeline เพื่อดูตัวอย่าง ดาวน์โหลด หรือสั่งพิมพ์ (Print-Ready) นำเสนอคณะกรรมการบริหารได้ทันที',
    },
  ];

  const filteredFaqs =
    faqSearchQuery.trim() === ''
      ? faqItems
      : faqItems.filter(
          (f) =>
            f.q.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
            f.a.toLowerCase().includes(faqSearchQuery.toLowerCase())
        );

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-200 uppercase">
              <BookOpen className="h-3.5 w-3.5 text-indigo-300" />
              <span>Official System Manual & Workflow Hub</span>
            </div>
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-xs text-slate-300">
              SOP Edition 2026.1 • Enterprise Ready
            </span>
          </div>

          <h1 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {lang === 'en'
              ? 'System Manual & End-to-End Workflow'
              : 'คู่มือและกระบวนการทำงานระบบรับเรื่องร้องเรียน (System Manual & Workflow)'}
          </h1>
          <p className="max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            {lang === 'en'
              ? 'Comprehensive operational manual, end-to-end 5-stage workflow, 6 enterprise categories & SLA matrix, PDPA data protection policies, and multi-role instructions.'
              : 'ศูนย์รวมคู่มือการใช้งานระบบครบวงจร แผนผังขั้นตอนการปฏิบัติงาน ขอบเขตความรับผิดชอบ 6 หมวดหมู่ การคุ้มครองข้อมูลส่วนบุคคล (PDPA) และแนวทางการจัดการข้อร้องเรียน/ข้อเสนอแนะสำหรับทุกบทบาท'}
          </p>

          {/* Quick Simulation Bar */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">
                {lang === 'en'
                  ? 'Interactive Walkthrough Simulation:'
                  : 'ทดลองจำลองวงจรเคส (Interactive Walkthrough):'}
              </span>
              <button
                type="button"
                id="btn-sim-quality"
                onClick={() => handleStartSimulation('normal_quality')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isSimulating && simulationScenario === 'normal_quality'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Play className="h-3 w-3" />
                <span>{lang === 'en' ? 'Simulate Quality (QC)' : 'จำลองเคส Quality (QC)'}</span>
              </button>
              <button
                type="button"
                id="btn-sim-pdpa"
                onClick={() => handleStartSimulation('urgent_pdpa')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isSimulating && simulationScenario === 'urgent_pdpa'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <AlertTriangle className="h-3 w-3 text-amber-300" />
                <span>
                  {lang === 'en' ? 'Simulate Urgent PDPA' : 'จำลองเคสด่วน PDPA (Compliance)'}
                </span>
              </button>
            </div>

            {isSimulating && (
              <div className="flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-900/70 px-3 py-1.5">
                <span className="text-xs font-medium text-indigo-200">
                  {lang === 'en' ? (
                    <>
                      Simulation Status: <strong>Stage {simulationCurrentStep} of 5</strong>
                    </>
                  ) : (
                    <>
                      สถานะการจำลอง: <strong>ขั้นตอนที่ {simulationCurrentStep} จาก 5</strong>
                    </>
                  )}
                </span>
                {simulationCurrentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNextSimulationStep}
                    className="flex items-center gap-1 rounded bg-indigo-500 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-indigo-600"
                  >
                    <span>{lang === 'en' ? 'Next Stage' : 'ขั้นถัดไป'}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ) : (
                  <span className="rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    {lang === 'en' ? 'Cycle Completed 🎉' : 'จบวงจรสมบูรณ์ 🎉'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="p-1 text-slate-400 transition hover:text-white"
                  title={lang === 'en' ? 'Reset simulation' : 'รีเซ็ตการจำลอง'}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Manual Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
        {(
          [
            {
              key: 'workflow',
              label:
                lang === 'en' ? '1. 5-Stage Workflow' : '1. ผังกระบวนการทำงาน 5 ขั้นตอน (Workflow)',
              icon: <Zap className="h-4 w-4" />,
            },
            {
              key: 'role_guides',
              label:
                lang === 'en' ? '2. Role Guides' : '2. คู่มือการใช้งานแยกตามบทบาท (Role Guides)',
              icon: <BookOpen className="h-4 w-4" />,
            },
            {
              key: 'sla_matrix',
              label:
                lang === 'en' ? '3. 6 Categories & SLA Matrix' : '3. มาตรฐานและขอบเขต 6 หมวดหมู่',
              icon: <Clock className="h-4 w-4" />,
            },
            {
              key: 'pdpa_security',
              label:
                lang === 'en' ? '4. PDPA & Security' : '4. ความปลอดภัย & คุ้มครองข้อมูล (PDPA)',
              icon: <ShieldCheck className="h-4 w-4" />,
            },
            {
              key: 'faq',
              label: lang === 'en' ? '5. FAQs' : '5. คำถามที่พบบ่อย (FAQ)',
              icon: <HelpCircle className="h-4 w-4" />,
            },
          ] as { key: ManualSection; label: string; icon: React.ReactNode }[]
        ).map((tab) => (
          <button
            key={tab.key}
            id={`manual-tab-${tab.key}`}
            type="button"
            onClick={() => setActiveManualSection(tab.key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
              activeManualSection === tab.key
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SECTION 1: WORKFLOW DIAGRAM */}
      {activeManualSection === 'workflow' && (
        <div className="space-y-6">
          {/* Interactive Workflow Flowchart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <span>
                    {lang === 'en'
                      ? 'End-to-End Workflow Flowchart'
                      : 'ผังขั้นตอนการปฏิบัติงานแบบครบวงจร (End-to-End Workflow)'}
                  </span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {lang === 'en'
                    ? 'Click each stage to inspect role responsibilities, automated triggers, and SLA policies.'
                    : 'คลิกที่แต่ละขั้นตอนเพื่อตรวจสอบรายละเอียด หน้าที่รับผิดชอบ ระบบอัตโนมัติ และแนวทางกำกับดูแล'}
                </p>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {lang === 'en' ? '5 Core Stages' : '5 ขั้นตอนหลัก (Stage 1-5)'}
              </span>
            </div>

            {/* Step Cards Grid */}
            <div className="relative grid grid-cols-1 gap-3 md:grid-cols-5">
              {workflowSteps.map((step, idx) => {
                const isSelected = selectedStepId === step.id;
                const isSimCurrent = isSimulating && simulationCurrentStep === step.id;
                const isSimPassed = isSimulating && simulationCurrentStep > step.id;

                return (
                  <div
                    key={step.id}
                    id={`workflow-step-card-${step.id}`}
                    onClick={() => setSelectedStepId(step.id)}
                    className={`relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/90 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/80'
                    } ${isSimCurrent ? 'animate-pulse ring-4 ring-amber-400' : ''}`}
                  >
                    {/* Connector Arrow (Desktop) */}
                    {idx < 4 && (
                      <div className="absolute top-1/2 -right-3 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400 shadow-xs md:flex">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    )}

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isSimPassed ? (
                            <Check className="h-4 w-4 font-black text-emerald-600" />
                          ) : (
                            step.id
                          )}
                        </span>
                        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                          {step.stageCode}
                        </span>
                      </div>

                      <h3 className="mb-1 line-clamp-2 text-xs font-bold text-slate-900">
                        {lang === 'en' ? step.titleEn : step.titleTh.replace(/^\d+\.\s*/, '')}
                      </h3>
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                        {step.shortDesc}
                      </p>
                    </div>

                    <div className="mt-3 border-t border-slate-200/60 pt-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${step.actorColor}`}
                        >
                          {step.actorRole}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                          <Clock className="h-2.5 w-2.5" />
                          {step.durationEst}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Step Detailed Inspection Panel */}
            <div className="relative mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center">
                <div className="flex items-start gap-3 sm:items-center">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                    {currentActiveStepData.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                        {lang === 'en'
                          ? `Stage ${currentActiveStepData.id} of 5`
                          : `ขั้นตอนที่ ${currentActiveStepData.id} / 5`}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        [{currentActiveStepData.titleEn}]
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
                      {lang === 'en'
                        ? `${currentActiveStepData.id}. ${currentActiveStepData.titleEn}`
                        : currentActiveStepData.titleTh}
                    </h3>
                  </div>
                </div>

                {/* Direct Link to Operational Tab */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSwitchRole) onSwitchRole(currentActiveStepData.actorRole);
                      onNavigateTab(currentActiveStepData.targetTab);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
                  >
                    <span>
                      {lang === 'en'
                        ? `Launch: ${currentActiveStepData.targetTabLabel}`
                        : `เปิดใช้งานหน้านี้: ${currentActiveStepData.targetTabLabel}`}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Details Breakdown */}
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* 1. Key Operational Actions */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>
                      {lang === 'en'
                        ? 'Key Operational Actions:'
                        : 'การปฏิบัติงานหลัก (Key Actions):'}
                    </span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {currentActiveStepData.keyActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span className="leading-relaxed">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. System Automation */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span>
                      {lang === 'en'
                        ? 'System Automations:'
                        : 'ระบบอัตโนมัติ (System Automations):'}
                    </span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {currentActiveStepData.systemAutomations.map((auto, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                        <span className="leading-relaxed">{auto}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. Governance & Policy Rules */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div>
                    <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      <span>
                        {lang === 'en'
                          ? 'Governance & Policies:'
                          : 'เกณฑ์การกำกับดูแล (Governance & Policy):'}
                      </span>
                    </h4>
                    <p className="rounded-lg border border-indigo-200/60 bg-indigo-50/60 p-3 text-xs leading-relaxed text-slate-700">
                      {currentActiveStepData.rulesAndSla}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">
                      {lang === 'en' ? 'Primary Role:' : 'ผู้รับผิดชอบหลัก:'}
                    </span>
                    <span className="font-bold text-slate-800">
                      {lang === 'en'
                        ? currentActiveStepData.actorRole
                        : currentActiveStepData.actorTitleTh}
                    </span>
                  </div>
                </div>
              </div>

              {/* Simulation Scenario Box if active */}
              {isSimulating && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-indigo-700 bg-indigo-900 p-4 text-white">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <div className="text-xs">
                    <div className="mb-1 font-bold text-amber-300">
                      ตัวอย่างสถานการณ์จำลอง:{' '}
                      {simulationScenario === 'normal_quality'
                        ? '🔍 ข้อร้องเรียนชิ้นงาน QC ผิดมาตรฐาน'
                        : '📋 ข้อร้องเรียนด่วน PDPA จัดเก็บเอกสารไม่จำกัดสิทธิ์'}
                    </div>
                    <div className="leading-relaxed text-indigo-100">
                      {simulationCurrentStep === 1 && (
                        <span>
                          พนักงานกรอกข้อมูลผู้ยื่นเรื่อง เลือกหมวดหมู่ ระบุความเร่งด่วน
                          พร้อมแนบหลักฐาน ระบบออกรหัส Ticket ทันที
                        </span>
                      )}
                      {simulationCurrentStep === 2 && (
                        <span>
                          ระบบคัดแยกเข้าสู่ทีม Gatekeeper ประจำฝ่าย{' '}
                          {simulationScenario === 'normal_quality'
                            ? 'Quality (QA/QC)'
                            : 'Compliance & Legal'}{' '}
                          โดยอัตโนมัติ พร้อมแจ้งเตือนเจ้าหน้าที่
                        </span>
                      )}
                      {simulationCurrentStep === 3 && (
                        <span>
                          Gatekeeper ประจำฝ่ายกดรับเรื่อง ตรวจสอบข้อเท็จจริง แก้ไขข้อบกพร่อง
                          และบันทึก Resolution Notes ให้ผู้ยื่นรับทราบ
                        </span>
                      )}
                      {simulationCurrentStep === 4 && (
                        <span>
                          พนักงานได้รับแจ้งเตือน ตรวจสอบผลการแก้ไข และทำแบบประเมินความพึงพอใจ CSAT 5
                          ดาว พร้อมยืนยันปิดเคสอย่างสมบูรณ์
                        </span>
                      )}
                      {simulationCurrentStep === 5 && (
                        <span>
                          ข้อมูลถูกส่งเข้า Executive Dashboard และ AI
                          ดำเนินการจัดกลุ่มเพื่อวิเคราะห์แนวทางปรับปรุงเชิงป้องกันระดับองค์กรต่อไป
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RACI Matrix Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <span>ตารางบทบาทหน้าที่และความรับผิดชอบ (RACI Matrix)</span>
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  แสดงความรับผิดชอบของแต่ละกลุ่มผู้ใช้ในแต่ละขั้นตอนอย่างเป็นระบบ
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
                <span>
                  <strong>R</strong> = Responsible (ผู้ทำ)
                </span>
                <span>•</span>
                <span>
                  <strong>A</strong> = Accountable (ผู้รับผิดชอบผล)
                </span>
                <span>•</span>
                <span>
                  <strong>I</strong> = Informed (ผู้รับทราบ)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-slate-700">
                    <th className="px-4 py-3 font-bold">กระบวนการทำงาน (Workflow Process)</th>
                    <th className="px-3 py-3 text-center font-bold">พนักงาน (Employee)</th>
                    <th className="px-3 py-3 text-center font-bold">Gatekeeper ประจำฝ่าย</th>
                    <th className="px-3 py-3 text-center font-bold">ผู้บริหาร (Executive)</th>
                    <th className="px-3 py-3 text-center font-bold">ผู้ดูแลระบบ (Admin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {raciData.map((row, idx) => (
                    <tr key={idx} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.processTh}</td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-bold ${
                            row.employee.includes('R')
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.employee}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-bold ${
                            row.gatekeeper.includes('R') || row.gatekeeper.includes('A')
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.gatekeeper}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-bold ${
                            row.executive.includes('A') || row.executive.includes('R')
                              ? 'bg-purple-100 text-purple-800'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.executive}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-bold ${
                            row.admin.includes('R') || row.admin.includes('A')
                              ? 'bg-slate-200 text-slate-800'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.admin}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: ROLE GUIDES */}
      {activeManualSection === 'role_guides' && (
        <div className="space-y-6">
          {/* Role Selector Tabs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                role: 'employee' as UserRole,
                titleTh: 'พนักงานทั่วไป (Employee)',
                subtitle: 'ยื่นเรื่อง & ติดตาม Timeline & CSAT',
                icon: <FileText className="h-5 w-5 text-emerald-600" />,
                activeClass:
                  'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 text-emerald-950',
              },
              {
                role: 'gatekeeper' as UserRole,
                titleTh: 'Gatekeeper ประจำฝ่าย',
                subtitle: 'รับเรื่อง ตรวจสอบ ลงพื้นที่ & แก้ไข',
                icon: <Shield className="h-5 w-5 text-indigo-600" />,
                activeClass:
                  'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20 text-indigo-950',
              },
              {
                role: 'executive' as UserRole,
                titleTh: 'ผู้บริหารระดับสูง (Executive)',
                subtitle: 'Dashboard, Insights & AI CAPA',
                icon: <Crown className="h-5 w-5 text-purple-600" />,
                activeClass:
                  'bg-purple-50 border-purple-400 ring-2 ring-purple-500/20 text-purple-950',
              },
              {
                role: 'admin' as UserRole,
                titleTh: 'ผู้ดูแลระบบ (Admin)',
                subtitle: 'จัดสรร Gatekeeper & สิทธิ์ RBAC',
                icon: <Settings className="h-5 w-5 text-slate-700" />,
                activeClass:
                  'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20 text-slate-950',
              },
            ].map((r) => (
              <button
                key={r.role}
                type="button"
                id={`guide-role-btn-${r.role}`}
                onClick={() => setSelectedRoleGuide(r.role)}
                className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                  selectedRoleGuide === r.role
                    ? r.activeClass
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <div className="rounded-lg border border-slate-100 bg-white p-1.5 shadow-2xs">
                    {r.icon}
                  </div>
                  <span className="text-xs font-bold">{r.titleTh}</span>
                </div>
                <p className="text-[11px] text-slate-500">{r.subtitle}</p>
              </button>
            ))}
          </div>

          {/* Guide Content for Employee */}
          {selectedRoleGuide === 'employee' && (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-600">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      คู่มือการใช้งานสำหรับพนักงาน (Employee User Guide)
                    </h2>
                    <p className="text-xs text-slate-500">
                      ขั้นตอนการยื่นข้อร้องเรียน/ข้อเสนอแนะ การติดตามสถานะ และการประเมินความพึงพอใจ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onSwitchRole) onSwitchRole('employee');
                    onNavigateTab('submit');
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  <span>ไปที่หน้ายื่นเรื่อง</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                      1
                    </span>
                    <span>การกรอกฟอร์มยื่นเรื่อง (5 ส่วนหลัก)</span>
                  </div>
                  <ul className="list-disc space-y-1.5 pl-8 text-xs text-slate-600">
                    <li>
                      <strong>ส่วนที่ 1:</strong> เลือกประเภท &quot;ข้อร้องเรียน&quot; หรือ
                      &quot;ข้อเสนอแนะพัฒนา&quot;
                    </li>
                    <li>
                      <strong>ส่วนที่ 2:</strong> เลือก 1 ใน 6 หมวดหมู่ที่ตรงกับปัญหา
                    </li>
                    <li>
                      <strong>ส่วนที่ 3:</strong> ระบุระดับความเร่งด่วนและผลกระทบ (Standard / Urgent
                      / Critical)
                    </li>
                    <li>
                      <strong>ส่วนที่ 4:</strong> ตรวจสอบข้อมูลพนักงาน (ชื่อ, รหัส, ฝ่าย, อีเมล)
                      และสามารถเลือก &quot;ส่งตรงถึง CEO/EVP&quot; ได้หากเป็นเรื่องอ่อนไหวสูง
                    </li>
                    <li>
                      <strong>ส่วนที่ 5:</strong> ระบุหัวข้อเรื่องใจความสำคัญ, สถานที่/หน่วยงาน
                      (เช่น อาคาร Admin หรือ สำนักงานกรุงเทพ) และรายละเอียดข้อเท็จจริง
                    </li>
                  </ul>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                      2
                    </span>
                    <span>การติดตามสถานะด้วย Tracking Code</span>
                  </div>
                  <ul className="list-disc space-y-1.5 pl-8 text-xs text-slate-600">
                    <li>
                      หลังจากส่งเรื่อง ระบบจะออกรหัสติดตาม เช่น <code>TK-2026-0881</code>
                    </li>
                    <li>
                      ค้นหาผ่านช่อง &quot;ค้นหาด้วยรหัสติดตาม&quot; ที่เมนูด้านบน หรือดูในแท็บ
                      &quot;คำร้องของฉัน&quot;
                    </li>
                    <li>
                      คลิกที่การ์ดเพื่อเปิดดู <strong>Interactive Timeline</strong>{' '}
                      ตรวจสอบสถานะและขั้นตอนแบบเรียลไทม์
                    </li>
                    <li>
                      <strong>สื่อสารสองทางนิรนาม (Anonymous 2-Way Chat):</strong>{' '}
                      พิมพ์ข้อความสอบถามหรือชี้แจงพยานหลักฐานเพิ่มเติมกับเจ้าหน้าที่ได้ตลอดเวลา
                      โดยระบบปิดบังชื่อตัวตน 100%
                    </li>
                    <li>
                      <strong>รายงานผลการสอบสวน (Official Report):</strong> กดปุ่ม
                      &quot;รายงานผล&quot; เพื่อดูสรุปผลการตรวจสอบข้อเท็จจริง
                      และแนวทางป้องกันเชิงรุก (CAPA)
                    </li>
                  </ul>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                      3
                    </span>
                    <span>การประเมินความพึงพอใจ (CSAT Evaluation)</span>
                  </div>
                  <ul className="list-disc space-y-1.5 pl-8 text-xs text-slate-600">
                    <li>
                      เมื่อเจ้าหน้าที่แก้ไขเสร็จ (Resolved) ระบบจะขึ้นแถบแจ้งเตือนให้ทำแบบประเมิน
                    </li>
                    <li>ตอบคำถามสำคัญ: 1. ปัญหาได้รับการแก้ไข (ใช่/ไม่ใช่)</li>
                    <li>ระบุความคิดเห็นเพิ่มเติม และข้อเสนอแนะเพื่อพัฒนาองค์กรอย่างต่อเนื่อง</li>
                    <li>
                      ให้คะแนนความพึงพอใจภาพรวมทั้งหมด (1–5 ดาว) และกดยืนยันปิดเคสอย่างสมบูรณ์
                    </li>
                  </ul>
                </div>

                <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>การคุ้มครองข้อมูลส่วนบุคคล (PDPA Protection)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-900/80">
                    ข้อมูลผู้ยื่นเรื่องจะถูกส่งต่อเฉพาะเจ้าหน้าที่ Gatekeeper
                    ประจำฝ่ายที่รับผิดชอบเพื่อการประสานงานแก้ไขปัญหาเท่านั้น
                    และได้รับการเข้ารหัสตามมาตรฐานความปลอดภัยข้อมูลองค์กร
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Guide Content for Gatekeeper */}
          {selectedRoleGuide === 'gatekeeper' && (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-600">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      คู่มือสำหรับ Gatekeeper ประจำฝ่าย (Gatekeeper Portal Guide)
                    </h2>
                    <p className="text-xs text-slate-500">
                      แนวทางการคัดกรองเคส (Triage) การสื่อสารนิรนาม การออกรายงานผลสอบสวน
                      และการบันทึกผลการแก้ไข
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onSwitchRole) onSwitchRole('gatekeeper');
                    onNavigateTab('gatekeeper');
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
                >
                  <span>ไปที่ Gatekeeper Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                      1
                    </span>
                    <span>การรับเรื่องและคัดกรอง (Triage)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    ตรวจสอบรายการคำร้องใหม่ในหน่วยงาน กดรับเรื่องเพื่อรับผิดชอบ
                    หรือโอนย้ายไปยังเจ้าหน้าที่ผู้เชี่ยวชาญเฉพาะทางในทีม
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                      2
                    </span>
                    <span>สื่อสารสองทางนิรนาม (Q&A)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    ส่งข้อความซักถามข้อเท็จจริง หรือขอหลักฐานเพิ่มเติมจากผู้ร้องเรียนนิรนามผ่านแถบ
                    &quot;สื่อสารสองทางนิรนาม&quot; โดยไม่ละเมิดความเป็นส่วนตัว
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                      3
                    </span>
                    <span>ออกรายงานผลสอบสวน (Report)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    กดปุ่ม &quot;รายงานผล&quot; ในหน้า Timeline เพื่อเปิดดู พิมพ์
                    หรือส่งออกรายงานสรุปผลการสอบสวนข้อเท็จจริงและมาตรการป้องกันเชิงรุก (CAPA)
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                      4
                    </span>
                    <span>บันทึกผลการแก้ไข (Resolution)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    เมื่อแก้ไขหน้างานเรียบร้อย ให้ระบุสรุปผลการแก้ไข (Resolution Summary)
                    ให้ชัดเจนก่อนกดยืนยันปิดเคส เพื่อให้พนักงานสามารถประเมิน CSAT ได้
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Guide Content for Executive */}
          {selectedRoleGuide === 'executive' && (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-purple-600">
                    <Crown className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      คู่มือสำหรับผู้บริหาร (Executive Overview & AI CAPA Guide)
                    </h2>
                    <p className="text-xs text-slate-500">
                      การติดตามดัชนีชี้วัดภาพรวม การจัดการเคส Bypass และการใช้ AI
                      วิเคราะห์สาเหตุต้นตอ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onSwitchRole) onSwitchRole('executive');
                    onNavigateTab('executive');
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-purple-700"
                >
                  <span>เปิดดู Dashboard ผู้บริหาร</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <span>ดัชนีชี้วัดหลัก (Key Metrics)</span>
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600">
                    ติดตามยอดคำร้องทั้งหมด, Resolution Rate %, คะแนนเฉลี่ยความพึงพอใจ (CSAT Score)
                    และสัดส่วนแยกตาม 6 หน่วยงาน
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>เคสด่วน Bypass & ความเสี่ยงสูง</span>
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600">
                    ตรวจสอบคำร้องที่ส่งตรงถึงผู้บริหาร (CEO/EVP Bypass) และเคสระดับ Critical
                    เพื่อสั่งการหรือมอบหมายนโยบายโดยตรง
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    <span>AI Root Cause & CAPA Plan</span>
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600">
                    ระบบ AI จัดกลุ่มปัญหาที่เกิดซ้ำตามหมวดหมู่ 4M และเสนอมาตรการป้องกันเชิงรุก
                    (Corrective & Preventive Actions)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Guide Content for Admin */}
          {selectedRoleGuide === 'admin' && (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-700">
                    <Settings className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      คู่มือสำหรับผู้ดูแลระบบ (Admin & RBAC Management Guide)
                    </h2>
                    <p className="text-xs text-slate-500">
                      การกำหนด Gatekeeper ประจำแต่ละหน่วยงาน การตั้งค่านโยบายจ่ายงาน
                      และการควบคุมสิทธิ์
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onSwitchRole) onSwitchRole('admin');
                    onNavigateTab('admin_gatekeeper');
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-900"
                >
                  <span>ไปที่หน้าตั้งค่า Admin</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-xs font-bold text-slate-900">
                    1. กำหนดรายชื่อ Gatekeeper ทั้ง 6 หน่วยงาน
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600">
                    ระบุ Lead Officer และรายชื่อเจ้าหน้าที่ผู้รับผิดชอบประจำแต่ละหมวด
                    พร้อมอีเมลและเบอร์ติดต่อสำหรับการแจ้งเตือน
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-xs font-bold text-slate-900">
                    2. ตั้งค่าโหมดการจ่ายงานอัตโนมัติ (Dispatch Policy)
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600">
                    เลือกระหว่าง Round Robin (จ่ายงานหมุนเวียนเท่าๆ กัน), Workload Balanced
                    (พิจารณาภาระงานคงค้าง), หรือ Lead Manual (หัวหน้าเป็นผู้จ่าย)
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <h4 className="text-xs font-bold text-slate-900">
                    3. ระบบแจ้งเตือน Email & ปรับแต่งเทมเพลต
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600">
                    เปิด/ปิดการส่งอีเมล, ปรับหัวข้อ (Subject) และเนื้อหา (Body) พร้อม Dynamic Tags
                    ส่งหา Gatekeeper เมื่อมีเคสใหม่ และส่งหาพนักงานเมื่อแก้ไขเสร็จ
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: CATEGORY RESPONSIBILITY MATRIX */}
      {activeManualSection === 'sla_matrix' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  <span>ตารางมาตรฐานและการจัดสรรผู้รับผิดชอบ 6 หมวดหมู่ (Category Matrix)</span>
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  มาตรฐานการจัดสรรงาน หน่วยงานรับผิดชอบหลัก และขอบเขตลักษณะปัญหาตามนโยบายองค์กร
                </p>
              </div>
              <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Enterprise Standards
              </span>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h4 className="mb-0.5 text-xs font-bold text-slate-900">เคสระดับปกติ (Normal)</h4>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    ข้อร้องเรียนทั่วไปหรือข้อเสนอแนะ ดำเนินการตามลำดับคิวและตรวจสอบข้อเท็จจริง
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h4 className="mb-0.5 text-xs font-bold text-amber-950">
                    เคสระดับเร่งด่วน (Urgent)
                  </h4>
                  <p className="text-[11px] leading-relaxed text-amber-900/80">
                    ปัญหาที่ส่งผลกระทบต่อการทำงานหรือความปลอดภัย
                    ประสานงานเจ้าหน้าที่เร่งตรวจสอบทันที
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50/60 p-4">
                <Crown className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
                <div>
                  <h4 className="mb-0.5 text-xs font-bold text-purple-950">
                    เคสสำคัญยิ่งยวด (Critical / Bypass)
                  </h4>
                  <p className="text-[11px] leading-relaxed text-purple-900/80">
                    ส่งตรงถึงผู้บริหารระดับสูง (CEO / EVP Bypass) และคณะกรรมการตรวจสอบเฉพาะกิจ
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-slate-700">
                    <th className="px-4 py-3 font-bold">หมวดหมู่คำร้อง</th>
                    <th className="px-3 py-3 font-bold">หน่วยงานรับผิดชอบหลัก</th>
                    <th className="px-3 py-3 text-center font-bold">ระดับความเร่งด่วนแนะนำ</th>
                    <th className="px-3 py-3 font-bold">ขอบเขตลักษณะปัญหา</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {slaMatrixData.map((row, idx) => (
                    <tr key={idx} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <span
                          className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${row.badgeColor}`}
                        >
                          {row.nameTh}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-700">{row.responsible}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          {row.severity}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: PDPA & DATA SECURITY */}
      {activeManualSection === 'pdpa_security' && (
        <div className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    นโยบายความปลอดภัยและการคุ้มครองข้อมูลส่วนบุคคล (PDPA & Data Governance)
                  </h2>
                  <p className="text-xs text-slate-500">
                    มาตรการรักษาความลับ การควบคุมสิทธิ์การเข้าถึง และธรรมาภิบาลข้อมูลองค์กร
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                PDPA Compliant
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span>1. การจำกัดสิทธิ์เข้าถึงตามหน้าที่ (Role-Based Access Control)</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  ข้อมูลคำร้องจะถูกเปิดให้เฉพาะเจ้าหน้าที่ Gatekeeper
                  ประจำฝ่ายที่รับผิดชอบและผู้บริหารตามลำดับสิทธิ์เท่านั้น
                  เพื่อป้องกันการรั่วไหลของข้อมูลและรักษาความเป็นธรรมในการตรวจสอบ
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <FileCheck2 className="h-4 w-4 text-emerald-600" />
                  <span>2. การบันทึกประวัติการดำเนินงาน (Audit Trail Logging)</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  ทุกการดำเนินการ เช่น การเปิดดู การเปลี่ยนสถานะ การมอบหมายงาน และการบันทึกข้อความ
                  จะถูกบันทึกประวัติ (Timeline Log) พร้อมระบุวันเวลาและผู้ดำเนินการอย่างโปร่งใส
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Crown className="h-4 w-4 text-purple-600" />
                  <span>3. มาตรการส่งตรงถึงผู้บริหาร (CEO / EVP Direct Bypass)</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  กรณีเคสที่มีความละเอียดอ่อนสูง หรือเกี่ยวข้องกับสายการบังคับบัญชา
                  ระบบมีช่องทางส่งตรงถึงผู้บริหารระดับสูงโดยตรงเพื่อคุ้มครองผู้ยื่นเรื่องและดำเนินการอย่างเป็นธรรม
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Laptop className="h-4 w-4 text-indigo-600" />
                  <span>4. การเข้ารหัสและความปลอดภัยระดับระบบ (Enterprise Encryption)</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  ระบบส่งและจัดเก็บข้อมูลด้วยมาตรฐานการเข้ารหัสความปลอดภัยระดับ Enterprise
                  ปกป้องเอกสารแนบและข้อความสนทนาทั้งหมดอย่างสมบูรณ์
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: FAQ & HELP CENTER */}
      {activeManualSection === 'faq' && (
        <div className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-600">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    คำถามที่พบบ่อย (Frequently Asked Questions - FAQ)
                  </h2>
                  <p className="text-xs text-slate-500">
                    รวบรวมข้อสงสัยและคำแนะนำในการใช้งานระบบรับเรื่องร้องเรียนและข้อเสนอแนะ
                  </p>
                </div>
              </div>

              {/* Search Box in FAQ */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={faqSearchQuery}
                  onChange={(e) => setFaqSearchQuery(e.target.value)}
                  placeholder="ค้นหาคำถาม / คีย์เวิร์ด..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pr-3 pl-9 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => {
                const isExpanded = expandedFaqIndex === index;
                return (
                  <div
                    key={index}
                    className={`rounded-xl border transition ${
                      isExpanded
                        ? 'border-indigo-300 bg-indigo-50/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaqIndex(isExpanded ? null : index)}
                      className="flex w-full items-center justify-between gap-3 p-4 text-left text-xs font-bold text-slate-900"
                    >
                      <span>{faq.q}</span>
                      <ChevronRight
                        className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="border-t border-indigo-100 px-4 pt-3 pb-4 text-xs leading-relaxed text-slate-600">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFaqs.length === 0 && (
                <div className="py-10 text-center text-slate-400">
                  <HelpCircle className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-xs">ไม่พบคำถามที่ตรงกับคำค้นหา &quot;{faqSearchQuery}&quot;</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
