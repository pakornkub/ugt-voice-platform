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
  Eye,
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
  const [simulationScenario, setSimulationScenario] = useState<'normal_quality' | 'urgent_pdpa'>(
    'normal_quality'
  );

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
        'เลือกส่งตรงถึงผู้บริหารระดับสูง (Executive Bypass) กรณีเคสเร่งด่วน/ร้ายแรง',
      ],
      systemAutomations: [
        'ออกรหัสติดตามเฉพาะ (Tracking ID เช่น TK-2026-XXXX)',
        'วิเคราะห์ความรู้สึกและจัดระดับความเสี่ยงเบื้องต้น (Sentiment & Urgency Tagging)',
        'ส่งการแจ้งเตือนแบบ Real-time เข้าคลังข้อความของผู้ยื่นเรื่อง',
      ],
      rulesAndSla:
        'ข้อมูลแบบไม่เปิดเผยตัวตน (Anonymous) จะถูกเข้ารหัสและปกปิดชื่อผู้ส่ง 100% ตามมาตรฐานความปลอดภัย',
      icon: <FileText className="h-5 w-5 text-emerald-600" />,
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
        'เปิดใช้งานเวลานับถอยหลัง SLA (SLA Target Countdown)',
      ],
      systemAutomations: [
        'ส่ง Notification & Webhook แจ้งเตือนไปยัง Lead Officer ประจำหน่วยงาน',
        'คำนวณเป้าหมายกำหนดส่งตาม SLA ประจำหมวด (12h, 24h, 48h, 72h, 120h)',
        'หากเป็นเคส Executive Bypass ระบบจะแจ้งเตือน Dashboard ผู้บริหารทันที',
      ],
      rulesAndSla: 'เกณฑ์ SLA เริ่มนับทันทีตั้งแต่เคสถูกบันทึกเข้าระบบ',
      icon: <Users className="h-5 w-5 text-indigo-600" />,
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
        'บันทึกสรุปผลการแก้ไข (Resolution Summary) เมื่อแก้ไขเรียบร้อย',
      ],
      systemAutomations: [
        'บันทึก Audit Timeline Log ทุกครั้งที่มีการเปลี่ยนสถานะหรือเพิ่มบันทึก',
        'ระบบแจ้งเตือนสีเหลือง/แดงเมื่อเวลาเข้าใกล้หรือเกินกำหนด SLA (>75% Warning)',
        'ส่งการแจ้งเตือนผลการแก้ไขกลับไปยังพนักงานผู้ยื่นเรื่องทันที',
      ],
      rulesAndSla: 'เจ้าหน้าที่ต้องบันทึกแนวทางแก้ไขที่ชัดเจนก่อนกดยืนยันปิดเคส (Resolved)',
      icon: <Shield className="h-5 w-5 text-indigo-600" />,
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
        'ระบุข้อคิดเห็นเพิ่มเติม หรือส่งคำขอเปิดเคสใหม่หากปัญหายังไม่คลี่คลาย',
      ],
      systemAutomations: [
        'คำนวณคะแนน CSAT รวมและอัปเดตสถิติเข้า Dashboard หน่วยงานทันที',
        'ปิดเคสสมบูรณ์ (Status: Closed) หลังได้รับการประเมินความพึงพอใจ',
      ],
      rulesAndSla: 'ผลคะแนน CSAT จะถูกนำไปคำนวณ KPI ประจำหน่วยงานเพื่อความโปร่งใส',
      icon: <Star className="h-5 w-5 text-amber-500" />,
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
        'ออกนโยบายป้องกันเชิงรุกระดับองค์กรเพื่อไม่ให้ปัญหาเดิมเกิดขึ้นอีก',
      ],
      systemAutomations: [
        'AI สกัด Insights และวิเคราะห์สาเหตุเชิงโครงสร้าง (People, Process, Equipment, Governance)',
        'ระบบแจ้งเตือน Executive Alert เมื่อมีเคสความเสี่ยงร้ายแรง (Severe Risk)',
      ],
      rulesAndSla: 'รายงานสรุปภาพรวมพร้อม Export ข้อมูลสำหรับการประชุมบอร์ดบริหาร',
      icon: <Crown className="h-5 w-5 text-purple-600" />,
    },
  ];

  const filteredSteps =
    roleFilter === 'all'
      ? workflowSteps
      : workflowSteps.filter(
          (s) =>
            s.actorRole === roleFilter ||
            (roleFilter === 'executive' && s.id === 5) ||
            (roleFilter === 'admin' && s.id === 2)
        );

  const currentActiveStepData =
    workflowSteps.find((s) => s.id === selectedStepId) || workflowSteps[0];

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
      processTh: 'วิเคราะห์ SLA, CSAT & AI ป้องกันเชิงรุก (Analytics)',
      employee: '-',
      gatekeeper: 'I (ปรับปรุง)',
      executive: 'R/A (วิเคราะห์)',
      admin: 'C (ดูแลระบบ)',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-200 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Business Workflow</span>
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            คู่มือกรรมวิธีและกระบวนการทำงานระบบรับเรื่องร้องเรียน (Workflow Diagram)
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            แผนผังวงจรกระบวนการจัดการข้อร้องเรียนและข้อเสนอแนะ ตั้งแต่พนักงานเริ่มยื่นเรื่อง
            การจ่ายงานอัตโนมัติ การตรวจสอบแก้ไขของ Gatekeeper
            จนถึงการประเมินความพึงพอใจและการวิเคราะห์เชิงลึกโดยผู้บริหาร
          </p>

          {/* Quick Simulation Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">
                ทดลองจำลองวงจรเคส (Interactive Walkthrough):
              </span>
              <button
                type="button"
                onClick={() => handleStartSimulation('normal_quality')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isSimulating && simulationScenario === 'normal_quality'
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Play className="h-3 w-3" />
                <span>จำลองเคส Quality (QC)</span>
              </button>
              <button
                type="button"
                onClick={() => handleStartSimulation('urgent_pdpa')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isSimulating && simulationScenario === 'urgent_pdpa'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <AlertTriangle className="h-3 w-3 text-amber-300" />
                <span>จำลองเคสด่วน PDPA (Compliance)</span>
              </button>
            </div>

            {isSimulating && (
              <div className="flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-900/60 px-3 py-1.5">
                <span className="text-xs font-medium text-indigo-200">
                  สถานะการจำลอง: <strong>ขั้นตอนที่ {simulationCurrentStep} จาก 5</strong>
                </span>
                {simulationCurrentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNextSimulationStep}
                    className="flex items-center gap-1 rounded bg-indigo-500 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-indigo-600"
                  >
                    <span>ขั้นถัดไป</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ) : (
                  <span className="rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    จบวงจรสมบูรณ์ 🎉
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetSimulation}
                  className="p-1 text-slate-400 transition hover:text-white"
                  title="รีเซ็ตการจำลอง"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Filter & Perspective Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Eye className="h-4 w-4 text-indigo-600" />
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
                onClick={() => setRoleFilter(rf.key as 'all' | UserRole)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
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

        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Info className="h-3.5 w-3.5 text-indigo-500" />
          <span>คลิกที่แต่ละขั้นตอนเพื่อดูรายละเอียดและปุ่มเปิดใช้งานจริง</span>
        </div>
      </div>

      {/* Interactive Workflow Visual Flowchart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Zap className="h-5 w-5 text-amber-500" />
              <span>ผังขั้นตอนการปฏิบัติงาน (End-to-End Workflow Diagram)</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              คลิกขั้นตอนด้านล่างเพื่อตรวจสอบหน้าที่ ระบบอัตโนมัติ และข้อกำหนด SLA
            </p>
          </div>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            5 ขั้นตอนหลัก (Stage 1-5)
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
                onClick={() => setSelectedStepId(step.id)}
                className={`relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/80 shadow-md ring-2 ring-indigo-500/20'
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
                    {step.titleTh.replace(/^\d+\.\s*/, '')}
                  </h3>
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                    {step.shortDesc}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-200/60 pt-3">
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
        <div className="relative mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                {currentActiveStepData.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                    ขั้นตอนที่ {currentActiveStepData.id} / 5
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    [{currentActiveStepData.titleEn}]
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
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
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <span>เปิดใช้งานหน้านี้: {currentActiveStepData.targetTabLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Details Breakdown */}
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* 1. Key Operational Actions */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>การปฏิบัติงานหลัก (Key Actions):</span>
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
                <span>ระบบอัตโนมัติ (System Automations):</span>
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

            {/* 3. SLA & Governance Rules */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div>
                <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>เกณฑ์ SLA & ธรรมาภิบาล (Rules):</span>
                </h4>
                <p className="rounded-lg border border-amber-200/50 bg-amber-50/50 p-3 text-xs leading-relaxed text-slate-700">
                  {currentActiveStepData.rulesAndSla}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-500">ผู้รับผิดชอบหลัก:</span>
                <span className="font-bold text-slate-800">
                  {currentActiveStepData.actorTitleTh}
                </span>
              </div>
            </div>
          </div>

          {/* Simulation Scenario Box if active */}
          {isSimulating && (
            <div className="animate-fadeIn mt-6 flex items-start gap-3 rounded-xl border border-indigo-700 bg-indigo-900 p-4 text-white">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div className="text-xs">
                <div className="mb-1 font-bold text-amber-300">
                  ตัวอย่างสถานการณ์จำลอง:{' '}
                  {simulationScenario === 'normal_quality'
                    ? '🔍 ข้อร้องเรียนชิ้นงาน QC ผิดมาตรฐาน'
                    : '📋 ฝ่าฝืน PDPA จัดเก็บเอกสารไม่จำกัดสิทธิ์'}
                </div>
                <div className="leading-relaxed text-indigo-100">
                  {simulationCurrentStep === 1 && (
                    <span>
                      พนักงานพบข้อบกพร่องในสายงาน จึงเปิดฟอร์มยื่นเรื่อง
                      พร้อมแนบรูปถ่ายและเลือกระดับความสำคัญ ระบบออกรหัส Ticket ทันที
                    </span>
                  )}
                  {simulationCurrentStep === 2 && (
                    <span>
                      ระบบคัดแยกเข้าสู่หน่วยงาน{' '}
                      {simulationScenario === 'normal_quality'
                        ? 'Quality (QA/QC)'
                        : 'Compliance & Legal'}{' '}
                      โดยอัตโนมัติ พร้อมตั้งเวลานับถอยหลัง SLA
                    </span>
                  )}
                  {simulationCurrentStep === 3 && (
                    <span>
                      Gatekeeper ประจำฝ่ายกดรับเรื่อง ตรวจสอบหน้างาน แก้ไขข้อบกพร่อง และบันทึก
                      Action Log สรุปการแก้ไขให้พนักงานรับทราบ
                    </span>
                  )}
                  {simulationCurrentStep === 4 && (
                    <span>
                      พนักงานได้รับแจ้งเตือน ตรวจสอบผลงานที่ได้รับการแก้ไข และให้คะแนน CSAT 5 ดาว
                      พร้อมยืนยันปิดเคสอย่างสมบูรณ์
                    </span>
                  )}
                  {simulationCurrentStep === 5 && (
                    <span>
                      ข้อมูลถูกส่งเข้า Executive Dashboard และ AI ดำเนินการจัดกลุ่ม
                      เพื่อวิเคราะห์แนวทางปรับปรุงเชิงป้องกันระดับโรงงานต่อไป
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SLA & Escalation Ladder */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Clock className="h-5 w-5 text-indigo-600" />
              <span>ระดับ SLA และกลไกยกระดับเรื่อง (SLA Escalation Matrix)</span>
            </h3>
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              กำหนดตามประเภท
            </span>
          </div>
          <p className="mb-5 text-xs leading-relaxed text-slate-600">
            ระบบมีกลไกตรวจสอบเวลาแบบ Real-time หากข้อร้องเรียนไม่มีความคืบหน้าเกิน 75% ของเวลา SLA
            ระบบจะส่งแจ้งเตือนสีเหลือง และหากเกินกำหนด (Overdue)
            จะส่งแจ้งเตือนด่วนไปยังหัวหน้าหน่วยงาน (Lead Gatekeeper)
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <span className="mb-1 block text-[10px] font-bold tracking-wider text-emerald-800 uppercase">
                Standard IT / HR
              </span>
              <div className="text-lg font-black text-emerald-900">24 – 48 ชม.</div>
              <p className="mt-1 text-[11px] text-emerald-700">
                เคสทั่วไป คำถามสวัสดิการ ระบบไอทีติดขัด
              </p>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5">
              <span className="mb-1 block text-[10px] font-bold tracking-wider text-sky-800 uppercase">
                Quality & Safety
              </span>
              <div className="text-lg font-black text-sky-900">12 – 24 ชม.</div>
              <p className="mt-1 text-[11px] text-sky-700">
                มาตรฐานชิ้นงาน QC, ความปลอดภัยในการทำงาน
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
              <span className="mb-1 block text-[10px] font-bold tracking-wider text-amber-800 uppercase">
                Compliance & PDPA
              </span>
              <div className="text-lg font-black text-amber-900">12 – 24 ชม.</div>
              <p className="mt-1 text-[11px] text-amber-700">กฎหมาย ข้อบังคับ และข้อมูลส่วนบุคคล</p>
            </div>

            <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3.5">
              <span className="mb-1 block text-[10px] font-bold tracking-wider text-purple-800 uppercase">
                Investigation / Fraud
              </span>
              <div className="text-lg font-black text-purple-900">72 – 120 ชม.</div>
              <p className="mt-1 text-[11px] text-purple-700">
                การสอบสวนทุจริตและวินัยที่ต้องใช้พยานหลักฐาน
              </p>
            </div>
          </div>
        </div>

        {/* Confidentiality & Security Guarantee Card */}
        <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white shadow-sm">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              <Shield className="h-3.5 w-3.5" />
              <span>Whistleblower & Privacy Shield</span>
            </div>
            <h3 className="mb-2 text-base font-bold text-white">
              การคุ้มครองผู้ยื่นเรื่องและความลับ 100%
            </h3>
            <p className="mb-4 text-xs leading-relaxed text-slate-300">
              ระบบรองรับการยื่นเรื่องแบบ <strong>ไม่เปิดเผยตัวตน (Anonymous)</strong>{' '}
              โดยไม่มีการบันทึก IP หรือข้อมูลระบุตัวตนใดๆ
              เพื่อให้พนักงานกล้าสะท้อนปัญหาอย่างตรงไปตรงมา
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>เข้ารหัสความปลอดภัยระดับ Enterprise Encryption</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>มีระบบ Executive Bypass ข้ามสายบังคับบัญชา</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>ติดตามสถานะได้ผ่านรหัส Tracking Code เท่านั้น</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-4 text-[11px] text-slate-400">
            สอดคล้องตามมาตรฐาน ISO 37002 (Whistleblowing Management Systems)
          </div>
        </div>
      </div>

      {/* RACI Matrix Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Users className="h-5 w-5 text-indigo-600" />
              <span>ตารางบทบาทหน้าที่และความรับผิดชอบ (RACI Matrix)</span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              แสดงความรับผิดชอบของแต่ละกลุ่มผู้ใช้ในแต่ละขั้นตอนอย่างชัดเจน
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
            <span>
              <strong>R</strong> = Responsible
            </span>
            <span>•</span>
            <span>
              <strong>A</strong> = Accountable
            </span>
            <span>•</span>
            <span>
              <strong>I</strong> = Informed
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
  );
};
