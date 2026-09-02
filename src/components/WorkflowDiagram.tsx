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
  LifeBuoy,
  AlertTriangle,
  Star,
  Play,
  RotateCcw,
  Check,
  Zap,
  Info,
  ChevronRight,
  Layers,
  HelpCircle,
  Eye
} from 'lucide-react';
import { UserRole } from '../types';

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

export const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({
  onNavigateTab,
  onSwitchRole,
}) => {
  const [selectedStepId, setSelectedStepId] = useState<number>(1);
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [simulationCurrentStep, setSimulationCurrentStep] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationScenario, setSimulationScenario] = useState<'normal_quality' | 'urgent_pdpa'>('normal_quality');

  const workflowSteps: WorkflowStep[] = [
    {
      id: 1,
      stageCode: 'SUBMISSION',
      titleTh: '1. พนักงานยื่นข้อร้องเรียน / ข้อเสนอแนะ',
      titleEn: 'Employee Voice Submission',
      shortDesc: 'พนักงานบันทึกข้อมูล เลือกหมวดหมู่ ระดับความลับ และแนบหลักฐาน',
      actorRole: 'employee',
      actorTitleTh: 'พนักงานทุกคน (Employee)',
      actorColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      targetTab: 'submit',
      targetTabLabel: 'ยื่นข้อร้องเรียน / ข้อเสนอแนะ',
      durationEst: '1–3 นาที',
      keyActions: [
        'เลือกประเภท: "ข้อร้องเรียน (Complaint)" หรือ "ข้อเสนอแนะพัฒนา (Suggestion)"',
        'ระบุ 1 ใน 9 หมวดหมู่ที่เกี่ยวข้อง (HR, IT, Quality, Compliance, Safety ฯลฯ)',
        'เลือกระดับความเป็นส่วนตัว: ไม่เปิดเผยตัวตน (Anonymous) หรือ ระบุชื่อ',
        'แนบไฟล์หลักฐาน (รูปภาพ, เอกสาร PDF, Log file)',
        'เลือกส่งตรงถึงผู้บริหารระดับสูง (Executive Bypass) กรณีเคสเร่งด่วน/ร้ายแรง'
      ],
      systemAutomations: [
        'ออกรหัสติดตามเฉพาะ (Tracking ID เช่น TK-2026-XXXX)',
        'วิเคราะห์ความรู้สึกและจัดระดับความเสี่ยงเบื้องต้น (Sentiment & Urgency Tagging)',
        'ส่งการแจ้งเตือนแบบ Real-time เข้าคลังข้อความของผู้ยื่นเรื่อง'
      ],
      rulesAndSla: 'ข้อมูลแบบไม่เปิดเผยตัวตน (Anonymous) จะถูกเข้ารหัสและปกปิดชื่อผู้ส่ง 100% ตามมาตรฐานความปลอดภัย',
      icon: <FileText className="w-5 h-5 text-emerald-600" />
    },
    {
      id: 2,
      stageCode: 'ROUTING',
      titleTh: '2. ระบบคัดแยกและจ่ายงานอัตโนมัติ',
      titleEn: 'Smart Dispatch & Auto-Routing',
      shortDesc: 'ส่งคำร้องไปยังหน่วยงานที่ถูกต้อง และจัดสรรผู้รับผิดชอบตามเกณฑ์',
      actorRole: 'admin',
      actorTitleTh: 'ระบบอัตโนมัติ / Admin กำหนดเกณฑ์',
      actorColor: 'bg-slate-100 text-slate-700 border-slate-200',
      targetTab: 'admin_gatekeeper',
      targetTabLabel: 'กำหนด Gatekeeper แต่ละหน่วยงาน (Admin)',
      durationEst: 'ทันที (Real-time)',
      keyActions: [
        'คัดกรองหมวดหมู่และจับคู่กับทีม Gatekeeper ประจำหน่วยงาน',
        'กระจายงานตามโหมดที่ Admin ตั้งไว้: Round Robin (หมุนเวียน), Workload Balanced (ดูภาระงาน), หรือ Lead Manual (หัวหน้ามอบหมาย)',
        'เปิดใช้งานเวลานับถอยหลัง SLA (SLA Target Countdown)'
      ],
      systemAutomations: [
        'ส่ง Notification & Webhook แจ้งเตือนไปยัง Lead Officer ประจำหน่วยงาน',
        'คำนวณเป้าหมายกำหนดส่งตาม SLA ประจำหมวด (12h, 24h, 48h, 72h, 120h)',
        'หากเป็นเคส Executive Bypass ระบบจะแจ้งเตือน Dashboard ผู้บริหารทันที'
      ],
      rulesAndSla: 'เกณฑ์ SLA เริ่มนับทันทีตั้งแต่เคสถูกบันทึกเข้าระบบ',
      icon: <Users className="w-5 h-5 text-indigo-600" />
    },
    {
      id: 3,
      stageCode: 'TRIAGE_ACTION',
      titleTh: '3. Gatekeeper ตรวจสอบและดำเนินการแก้ไข',
      titleEn: 'Triage, Investigation & Action Plan',
      shortDesc: 'เจ้าหน้าที่รับเรื่อง ตรวจสอบข้อเท็จจริง ลงพื้นที่ และแก้ไขปัญหา',
      actorRole: 'gatekeeper',
      actorTitleTh: 'เจ้าหน้าที่ Gatekeeper ประจำหน่วยงาน',
      actorColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      targetTab: 'gatekeeper',
      targetTabLabel: 'Gatekeeper Triage Portal',
      durationEst: 'ภายในกำหนด SLA (12–72 ชม.)',
      keyActions: [
        'กดรับเรื่อง (Accept / Triage) และระบุเจ้าหน้าที่ผู้รับผิดชอบหลัก',
        'เปลี่ยนสถานะเป็น "กำลังดำเนินการ (In Progress)" และบันทึก Action Notes',
        'ประสานงานฝ่ายที่เกี่ยวข้อง และดำเนินมาตรการแก้ไขปัญหาหน้างาน',
        'บันทึกสรุปผลการแก้ไข (Resolution Summary) เมื่อแก้ไขเรียบร้อย'
      ],
      systemAutomations: [
        'บันทึก Audit Timeline Log ทุกครั้งที่มีการเปลี่ยนสถานะหรือเพิ่มบันทึก',
        'ระบบแจ้งเตือนสีเหลือง/แดงเมื่อเวลาเข้าใกล้หรือเกินกำหนด SLA (>75% Warning)',
        'ส่งการแจ้งเตือนผลการแก้ไขกลับไปยังพนักงานผู้ยื่นเรื่องทันที'
      ],
      rulesAndSla: 'เจ้าหน้าที่ต้องบันทึกแนวทางแก้ไขที่ชัดเจนก่อนกดยืนยันปิดเคส (Resolved)',
      icon: <Shield className="w-5 h-5 text-indigo-600" />
    },
    {
      id: 4,
      stageCode: 'FEEDBACK_LOOP',
      titleTh: '4. ติดตามผลและประเมินความพึงพอใจ (CSAT)',
      titleEn: 'Employee Tracking & CSAT Evaluation',
      shortDesc: 'พนักงานตรวจสอบผลการแก้ไข ให้คะแนนดาว และติชมการบริการ',
      actorRole: 'employee',
      actorTitleTh: 'พนักงานผู้ยื่นเรื่อง (Employee)',
      actorColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      targetTab: 'my_tickets',
      targetTabLabel: 'ติดตามสถานะเรียลไทม์ (Timeline)',
      durationEst: '1–2 วันหลังปิดเคส',
      keyActions: [
        'ตรวจสอบผลการแก้ไขและการดำเนินงานผ่าน Interactive Timeline',
        'ทำแบบประเมินความพึงพอใจ (CSAT Evaluation) ให้คะแนน 1–5 ดาวใน 4 มิติ (ความรวดเร็ว, คุณภาพ, มารยาท, ความชัดเจน)',
        'ระบุข้อคิดเห็นเพิ่มเติม หรือส่งคำขอเปิดเคสใหม่หากปัญหายังไม่คลี่คลาย'
      ],
      systemAutomations: [
        'คำนวณคะแนน CSAT รวมและอัปเดตสถิติเข้า Dashboard หน่วยงานทันที',
        'ปิดเคสสมบูรณ์ (Status: Closed) หลังได้รับการประเมินความพึงพอใจ'
      ],
      rulesAndSla: 'ผลคะแนน CSAT จะถูกนำไปคำนวณ KPI ประจำหน่วยงานเพื่อความโปร่งใส',
      icon: <Star className="w-5 h-5 text-amber-500" />
    },
    {
      id: 5,
      stageCode: 'EXECUTIVE_AI',
      titleTh: '5. ผู้บริหารวิเคราะห์ภาพรวม & AI จัดกลุ่มต้นตอ',
      titleEn: 'Executive Oversight & AI Root Cause Analytics',
      shortDesc: 'วิเคราะห์อัตรา SLA Compliance, CSAT และใช้ AI จัดกลุ่มป้องกันเชิงรุก',
      actorRole: 'executive',
      actorTitleTh: 'ผู้บริหารระดับสูง (CEO / EVP / GRC)',
      actorColor: 'bg-purple-50 text-purple-700 border-purple-200',
      targetTab: 'executive',
      targetTabLabel: 'Dashboard',
      durationEst: 'รายสัปดาห์ / รายเดือน / เรียลไทม์',
      keyActions: [
        'ติดตามมาตรวัดหลัก: Total Tickets, SLA Compliance Rate %, Average CSAT Score',
        'ดูสถิติแยกตามหน่วยงาน (HR, IT, Quality, Compliance, Safety ฯลฯ)',
        'ใช้ระบบ AI Clustering เพื่อจัดกลุ่มปัญหาที่เกิดซ้ำๆ (Root Cause Analysis)',
        'ออกนโยบายป้องกันเชิงรุกระดับองค์กรเพื่อไม่ให้ปัญหาเดิมเกิดขึ้นอีก'
      ],
      systemAutomations: [
        'AI สกัด Insights และวิเคราะห์สาเหตุเชิงโครงสร้าง (People, Process, Equipment, Governance)',
        'ระบบแจ้งเตือน Executive Alert เมื่อมีเคสความเสี่ยงร้ายแรง (Severe Risk)'
      ],
      rulesAndSla: 'รายงานสรุปภาพรวมพร้อม Export ข้อมูลสำหรับการประชุมบอร์ดบริหาร',
      icon: <Crown className="w-5 h-5 text-purple-600" />
    }
  ];

  const filteredSteps = roleFilter === 'all'
    ? workflowSteps
    : workflowSteps.filter(s => s.actorRole === roleFilter || (roleFilter === 'executive' && s.id === 5) || (roleFilter === 'admin' && s.id === 2));

  const currentActiveStepData = workflowSteps.find(s => s.id === selectedStepId) || workflowSteps[0];

  // Simulation handlers
  const handleStartSimulation = (scenario: 'normal_quality' | 'urgent_pdpa') => {
    setSimulationScenario(scenario);
    setSimulationCurrentStep(1);
    setSelectedStepId(1);
    setIsSimulating(true);
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

  const raciData = [
    {
      processTh: 'ยื่นคำร้อง / ข้อเสนอแนะ (Voice Submission)',
      employee: 'R (ผู้ทำ)',
      gatekeeper: 'I (รับทราบ)',
      executive: 'I (เคสด่วน)',
      admin: '-'
    },
    {
      processTh: 'กำหนดเกณฑ์และจ่ายงานอัตโนมัติ (Smart Dispatch)',
      employee: '-',
      gatekeeper: 'A (รับมอบ)',
      executive: 'I (ภาพรวม)',
      admin: 'R/A (ตั้งค่า)'
    },
    {
      processTh: 'ตรวจสอบ ลงพื้นที่ และแก้ไขปัญหา (Triage & Action)',
      employee: 'I (ติดตาม)',
      gatekeeper: 'R/A (แก้ไข)',
      executive: 'I (เคสสำคัญ)',
      admin: '-'
    },
    {
      processTh: 'ปิดเคส & ประเมินความพึงพอใจ (CSAT Feedback)',
      employee: 'R (ประเมิน)',
      gatekeeper: 'I (ดูคะแนน)',
      executive: 'I (ติดตาม)',
      admin: '-'
    },
    {
      processTh: 'วิเคราะห์ SLA, CSAT & AI ป้องกันเชิงรุก (Analytics)',
      employee: '-',
      gatekeeper: 'I (ปรับปรุง)',
      executive: 'R/A (วิเคราะห์)',
      admin: 'C (ดูแลระบบ)'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Business Workflow</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            คู่มือกรรมวิธีและกระบวนการทำงานระบบรับเรื่องร้องเรียน (Workflow Diagram)
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
            แผนผังวงจรกระบวนการจัดการข้อร้องเรียนและข้อเสนอแนะ ตั้งแต่พนักงานเริ่มยื่นเรื่อง การจ่ายงานอัตโนมัติ การตรวจสอบแก้ไขของ Gatekeeper จนถึงการประเมินความพึงพอใจและการวิเคราะห์เชิงลึกโดยผู้บริหาร
          </p>

          {/* Quick Simulation Bar */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">ทดลองจำลองวงจรเคส (Interactive Walkthrough):</span>
              <button
                type="button"
                onClick={() => handleStartSimulation('normal_quality')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  isSimulating && simulationScenario === 'normal_quality'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>จำลองเคส Quality (QC)</span>
              </button>
              <button
                type="button"
                onClick={() => handleStartSimulation('urgent_pdpa')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  isSimulating && simulationScenario === 'urgent_pdpa'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-300" />
                <span>จำลองเคสด่วน PDPA (Compliance)</span>
              </button>
            </div>

            {isSimulating && (
              <div className="flex items-center gap-2 bg-indigo-900/60 border border-indigo-500/40 px-3 py-1.5 rounded-lg">
                <span className="text-xs text-indigo-200 font-medium">
                  สถานะการจำลอง: <strong>ขั้นตอนที่ {simulationCurrentStep} จาก 5</strong>
                </span>
                {simulationCurrentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNextSimulationStep}
                    className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs font-bold transition flex items-center gap-1"
                  >
                    <span>ขั้นถัดไป</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-500 text-white text-[11px] font-bold rounded">
                    จบวงจรสมบูรณ์ 🎉
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="p-1 text-slate-400 hover:text-white transition"
                  title="รีเซ็ตการจำลอง"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Filter & Perspective Switcher */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>มุมมองตามบทบาท (Role Perspective):</span>
          </span>
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'all', label: 'ทั้งหมด (5 ขั้นตอน)' },
              { key: 'employee', label: 'พนักงาน (Employee)' },
              { key: 'gatekeeper', label: 'Gatekeeper ประจำฝ่าย' },
              { key: 'executive', label: 'ผู้บริหาร (Executive)' },
              { key: 'admin', label: 'ผู้ดูแลระบบ (Admin)' },
            ].map((rf) => (
              <button
                key={rf.key}
                type="button"
                onClick={() => setRoleFilter(rf.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  roleFilter === rf.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          <span>คลิกที่แต่ละขั้นตอนเพื่อดูรายละเอียดและปุ่มเปิดใช้งานจริง</span>
        </div>
      </div>

      {/* Interactive Workflow Visual Flowchart */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>ผังขั้นตอนการปฏิบัติงาน (End-to-End Workflow Diagram)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกขั้นตอนด้านล่างเพื่อตรวจสอบหน้าที่ ระบบอัตโนมัติ และข้อกำหนด SLA
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            5 ขั้นตอนหลัก (Stage 1-5)
          </span>
        </div>

        {/* Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {workflowSteps.map((step, idx) => {
            const isSelected = selectedStepId === step.id;
            const isSimCurrent = isSimulating && simulationCurrentStep === step.id;
            const isSimPassed = isSimulating && simulationCurrentStep > step.id;

            return (
              <div
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                className={`relative cursor-pointer rounded-xl p-4 transition-all duration-200 border text-left flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
                } ${isSimCurrent ? 'animate-pulse ring-4 ring-amber-400' : ''}`}
              >
                {/* Connector Arrow (Desktop) */}
                {idx < 4 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-300 items-center justify-center text-slate-400 shadow-xs">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {isSimPassed ? <Check className="w-4 h-4 text-emerald-600 font-black" /> : step.id}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {step.stageCode}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 line-clamp-2 mb-1">
                    {step.titleTh.replace(/^\d+\.\s*/, '')}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {step.shortDesc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${step.actorColor}`}>
                      {step.actorRole}
                    </span>
                    <span className="text-slate-500 text-[10px] flex items-center gap-1 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      {step.durationEst}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Step Detailed Inspection Panel */}
        <div className="mt-8 bg-slate-50 rounded-xl p-5 sm:p-6 border border-slate-200 relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                {currentActiveStepData.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                    ขั้นตอนที่ {currentActiveStepData.id} / 5
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    [{currentActiveStepData.titleEn}]
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  {currentActiveStepData.titleTh}
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-2"
              >
                <span>เปิดใช้งานหน้านี้: {currentActiveStepData.targetTabLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Details Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* 1. Key Operational Actions */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>การปฏิบัติงานหลัก (Key Actions):</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {currentActiveStepData.keyActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. System Automation */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>ระบบอัตโนมัติ (System Automations):</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {currentActiveStepData.systemAutomations.map((auto, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{auto}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. SLA & Governance Rules */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>เกณฑ์ SLA & ธรรมาภิบาล (Rules):</span>
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-200/50">
                  {currentActiveStepData.rulesAndSla}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">ผู้รับผิดชอบหลัก:</span>
                <span className="font-bold text-slate-800">{currentActiveStepData.actorTitleTh}</span>
              </div>
            </div>
          </div>

          {/* Simulation Scenario Box if active */}
          {isSimulating && (
            <div className="mt-6 p-4 rounded-xl bg-indigo-900 text-white border border-indigo-700 flex items-start gap-3 animate-fadeIn">
              <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-amber-300 mb-1">
                  ตัวอย่างสถานการณ์จำลอง: {simulationScenario === 'normal_quality' ? '🔍 ข้อร้องเรียนชิ้นงาน QC ผิดมาตรฐาน' : '📋 ฝ่าฝืน PDPA จัดเก็บเอกสารไม่จำกัดสิทธิ์'}
                </div>
                <div className="text-indigo-100 leading-relaxed">
                  {simulationCurrentStep === 1 && (
                    <span>พนักงานพบข้อบกพร่องในสายงาน จึงเปิดฟอร์มยื่นเรื่อง พร้อมแนบรูปถ่ายและเลือกระดับความสำคัญ ระบบออกรหัส Ticket ทันที</span>
                  )}
                  {simulationCurrentStep === 2 && (
                    <span>ระบบคัดแยกเข้าสู่หน่วยงาน {simulationScenario === 'normal_quality' ? 'Quality (QA/QC)' : 'Compliance & Legal'} โดยอัตโนมัติ พร้อมตั้งเวลานับถอยหลัง SLA</span>
                  )}
                  {simulationCurrentStep === 3 && (
                    <span>Gatekeeper ประจำฝ่ายกดรับเรื่อง ตรวจสอบหน้างาน แก้ไขข้อบกพร่อง และบันทึก Action Log สรุปการแก้ไขให้พนักงานรับทราบ</span>
                  )}
                  {simulationCurrentStep === 4 && (
                    <span>พนักงานได้รับแจ้งเตือน ตรวจสอบผลงานที่ได้รับการแก้ไข และให้คะแนน CSAT 5 ดาว พร้อมยืนยันปิดเคสอย่างสมบูรณ์</span>
                  )}
                  {simulationCurrentStep === 5 && (
                    <span>ข้อมูลถูกส่งเข้า Executive Dashboard และ AI ดำเนินการจัดกลุ่ม เพื่อวิเคราะห์แนวทางปรับปรุงเชิงป้องกันระดับโรงงานต่อไป</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SLA & Escalation Ladder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>ระดับ SLA และกลไกยกระดับเรื่อง (SLA Escalation Matrix)</span>
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
              กำหนดตามประเภท
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-5 leading-relaxed">
            ระบบมีกลไกตรวจสอบเวลาแบบ Real-time หากข้อร้องเรียนไม่มีความคืบหน้าเกิน 75% ของเวลา SLA ระบบจะส่งแจ้งเตือนสีเหลือง และหากเกินกำหนด (Overdue) จะส่งแจ้งเตือนด่วนไปยังหัวหน้าหน่วยงาน (Lead Gatekeeper)
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Standard IT / HR</span>
              <div className="text-lg font-black text-emerald-900">24 – 48 ชม.</div>
              <p className="text-[11px] text-emerald-700 mt-1">เคสทั่วไป คำถามสวัสดิการ ระบบไอทีติดขัด</p>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200">
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1">Quality & Safety</span>
              <div className="text-lg font-black text-sky-900">12 – 24 ชม.</div>
              <p className="text-[11px] text-sky-700 mt-1">มาตรฐานชิ้นงาน QC, ความปลอดภัยในการทำงาน</p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Compliance & PDPA</span>
              <div className="text-lg font-black text-amber-900">12 – 24 ชม.</div>
              <p className="text-[11px] text-amber-700 mt-1">กฎหมาย ข้อบังคับ และข้อมูลส่วนบุคคล</p>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200">
              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block mb-1">Investigation / Fraud</span>
              <div className="text-lg font-black text-purple-900">72 – 120 ชม.</div>
              <p className="text-[11px] text-purple-700 mt-1">การสอบสวนทุจริตและวินัยที่ต้องใช้พยานหลักฐาน</p>
            </div>
          </div>
        </div>

        {/* Confidentiality & Security Guarantee Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>Whistleblower & Privacy Shield</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              การคุ้มครองผู้ยื่นเรื่องและความลับ 100%
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              ระบบรองรับการยื่นเรื่องแบบ <strong>ไม่เปิดเผยตัวตน (Anonymous)</strong> โดยไม่มีการบันทึก IP หรือข้อมูลระบุตัวตนใดๆ เพื่อให้พนักงานกล้าสะท้อนปัญหาอย่างตรงไปตรงมา
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>เข้ารหัสความปลอดภัยระดับ Enterprise Encryption</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>มีระบบ Executive Bypass ข้ามสายบังคับบัญชา</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ติดตามสถานะได้ผ่านรหัส Tracking Code เท่านั้น</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            สอดคล้องตามมาตรฐาน ISO 37002 (Whistleblowing Management Systems)
          </div>
        </div>
      </div>

      {/* RACI Matrix Table */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>ตารางบทบาทหน้าที่และความรับผิดชอบ (RACI Matrix)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงความรับผิดชอบของแต่ละกลุ่มผู้ใช้ในแต่ละขั้นตอนอย่างชัดเจน
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
            <span><strong>R</strong> = Responsible</span>
            <span>•</span>
            <span><strong>A</strong> = Accountable</span>
            <span>•</span>
            <span><strong>I</strong> = Informed</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-700">
                <th className="py-3 px-4 font-bold">กระบวนการทำงาน (Workflow Process)</th>
                <th className="py-3 px-3 font-bold text-center">พนักงาน (Employee)</th>
                <th className="py-3 px-3 font-bold text-center">Gatekeeper ประจำฝ่าย</th>
                <th className="py-3 px-3 font-bold text-center">ผู้บริหาร (Executive)</th>
                <th className="py-3 px-3 font-bold text-center">ผู้ดูแลระบบ (Admin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {raciData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-medium text-slate-900">{row.processTh}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                      row.employee.includes('R') ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500'
                    }`}>
                      {row.employee}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                      row.gatekeeper.includes('R') || row.gatekeeper.includes('A') ? 'bg-indigo-100 text-indigo-800' : 'text-slate-500'
                    }`}>
                      {row.gatekeeper}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                      row.executive.includes('A') || row.executive.includes('R') ? 'bg-purple-100 text-purple-800' : 'text-slate-500'
                    }`}>
                      {row.executive}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                      row.admin.includes('R') || row.admin.includes('A') ? 'bg-slate-200 text-slate-800' : 'text-slate-500'
                    }`}>
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
  );
};