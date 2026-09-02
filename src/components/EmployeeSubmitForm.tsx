'use client';

import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Paperclip,
  ShieldAlert,
  CheckCircle2,
  Crown,
  User,
  UserCheck,
  FileText,
  Lightbulb,
  HelpCircle,
  Laptop,
  Users,
  Scale,
  AlertOctagon,
  FileWarning,
  Leaf,
  FileCheck2,
  X,
  ArrowRight,
  Clock,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import {
  GrievanceCategory,
  SubmissionType,
  ConfidentialityLevel,
  ComplaintTicket,
  AiTriageSuggestion,
} from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { analyzeGrievanceWithAI, submitTicket } from '../services/api';

interface EmployeeSubmitFormProps {
  onTicketCreated: (ticket: ComplaintTicket) => void;
  onOpenTracking: (trackingCode: string) => void;
}

export const EmployeeSubmitForm: React.FC<EmployeeSubmitFormProps> = ({
  onTicketCreated,
  onOpenTracking,
}) => {
  const [submissionType, setSubmissionType] = useState<SubmissionType>('complaint');
  const [category, setCategory] = useState<GrievanceCategory>('HR');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationOrUnit, setLocationOrUnit] = useState('');
  const [isDirectToExecutive, setIsDirectToExecutive] = useState(false);
  const confidentiality: ConfidentialityLevel = 'standard_named';

  // Submitter details (Mandatory Identified)
  const [submitterName, setSubmitterName] = useState('สมชาย วิจิตรศิลป์');
  const [submitterEmployeeId, setSubmitterEmployeeId] = useState('EMP-4092');
  const [submitterDepartment, setSubmitterDepartment] = useState(
    'Digital Innovation & Engineering'
  );
  const [submitterEmail, setSubmitterEmail] = useState('somchai.v@company.internal');
  const [submitterPhone, setSubmitterPhone] = useState('089-123-4567');

  // Attachments
  const [attachments, setAttachments] = useState<
    { id: string; name: string; size: string; type: string }[]
  >([]);

  // AI assistance
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiTriageSuggestion | null>(null);

  // Created result
  const [createdTicket, setCreatedTicket] = useState<ComplaintTicket | null>(null);

  // Quick preset templates for rapid testing
  const handleApplyPreset = (
    presetType: 'quality_issue' | 'compliance_alert' | 'welfare_idea' | 'fraud_alert'
  ) => {
    if (presetType === 'quality_issue') {
      setSubmissionType('complaint');
      setCategory('Quality');
      setTitle('พบชิ้นงานล็อต LOT-2026-Q3 มีค่าความคลาดเคลื่อนเกินเกณฑ์มาตรฐาน QC');
      setDescription(
        'จากการสุ่มตรวจชิ้นงานประกอบและแพ็กเกจสินค้าในกระบวนการ QA/QC ประจำวัน พบว่าค่าความหนาและการผนึกบรรจุภัณฑ์ไม่ผ่านเกณฑ์มาตรฐาน ISO 9001 เสี่ยงต่อการรั่วซึมและการปฏิเสธสินค้าจากลูกค้าปลายทาง เสนอให้ระงับการปล่อยล็อตและสอบเทียบเครื่องมือวัดด่วน'
      );
      setLocationOrUnit('โรงงานผลิต สายการผลิตที่ 2 ฝ่ายควบคุมคุณภาพ (QA/QC)');
      setIsDirectToExecutive(false);
    } else if (presetType === 'compliance_alert') {
      setSubmissionType('complaint');
      setCategory('Compliance');
      setTitle(
        'ตรวจพบการจัดเก็บเอกสารสัญญาและข้อมูลส่วนบุคคลลูกค้าในโฟลเดอร์ที่ไม่จำกัดสิทธิ์ตาม PDPA'
      );
      setDescription(
        'พบว่าโฟลเดอร์ Shared Drive ส่วนกลางของหน่วยงานมีการเปิด Public Access ให้เข้าถึงเอกสารสำเนาบัตรประชาชนและข้อมูลส่วนบุคคล (PII) ของลูกค้าโดยไม่มีการเข้ารหัสผ่าน ซึ่งขัดต่อนโยบายความปลอดภัยและกฎหมาย PDPA จึงขอให้ฝ่ายกำกับดูแลเข้าตรวจสอบและแก้ไขด่วน'
      );
      setLocationOrUnit('ศูนย์บริการลูกค้าและคลังเอกสารสัญญาส่วนกลาง');
      setIsDirectToExecutive(true);
    } else if (presetType === 'welfare_idea') {
      setSubmissionType('suggestion');
      setCategory('HR');
      setTitle('เสนอจัดตั้งพื้นที่ Green Relaxation Corner & โซนพักสายตาสำหรับสายงานคอมพิวเตอร์');
      setDescription(
        'เพื่อส่งเสริมสุขภาวะพนักงานตามหลัก Ergonomics เสนอให้จัดพื้นที่สีเขียวพร้อมต้นไม้ฟอกอากาศและเก้าอี้นวดผ่อนคลายกล้ามเนื้อสายตา เพื่อลดภาวะ Office Syndrome'
      );
      setLocationOrUnit('พื้นที่ส่วนกลาง ชั้น 10 ทุกอาคาร');
      setIsDirectToExecutive(false);
    } else if (presetType === 'fraud_alert') {
      setSubmissionType('complaint');
      setCategory('Fraud');
      setTitle('ข้อสงสัยเกี่ยวกับการจัดซื้ออะไหล่ซ่อมบำรุงที่ราคาสูงกว่าท้องตลาด 300%');
      setDescription(
        'พบการเบิกจ่ายค่าอะไหล่สายพานลำเลียงในใบแจ้งหนี้เลขที่ INV-8890 ราคาสูงผิดปกติและบริษัทคู่ค้าเพิ่งจดทะเบียนได้เพียง 1 เดือน โดยผู้มีอำนาจอนุมัติมีความเกี่ยวข้องทางเครือญาติ'
      );
      setLocationOrUnit('ศูนย์กระจายสินค้าภาคตะวันออก');
      setIsDirectToExecutive(true);
    }
  };

  const handleAIAnalyze = async () => {
    if (!description.trim() && !title.trim()) return;
    setIsAnalyzingAI(true);
    try {
      const result = await analyzeGrievanceWithAI({
        title,
        description,
        category,
      });
      setAiSuggestions(result);
      if (result.suggestedCategory && result.suggestedCategory !== category) {
        setCategory(result.suggestedCategory);
      }
      if (result.isDirectExecutiveWorthy) {
        setIsDirectToExecutive(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const handleAddMockAttachment = () => {
    const mockFiles = [
      {
        id: `att-${Date.now()}-1`,
        name: 'evidence_screenshot_log.png',
        size: '1.4 MB',
        type: 'image/png',
      },
      {
        id: `att-${Date.now()}-2`,
        name: 'investigation_memo_doc.pdf',
        size: '2.8 MB',
        type: 'application/pdf',
      },
      {
        id: `att-${Date.now()}-3`,
        name: 'inspection_photo_现场.jpg',
        size: '3.2 MB',
        type: 'image/jpeg',
      },
    ];
    const picked = mockFiles[Math.floor(Math.random() * mockFiles.length)];
    setAttachments((prev) => [...prev, picked]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('กรุณากรอกหัวข้อเรื่องและรายละเอียดข้อร้องเรียน/ข้อเสนอแนะ');
      return;
    }

    if (!submitterName.trim() || !submitterEmployeeId.trim()) {
      alert('กรุณาระบุชื่อ-นามสกุลและรหัสพนักงานผู้ยื่นเรื่อง (ระบบบังคับระบุตัวตน)');
      return;
    }

    const deptInfo = CATEGORY_DEFINITIONS[category];
    const slaHours = isDirectToExecutive
      ? 12
      : category === 'Safety' || category === 'Fraud' || category === 'Harassment'
        ? 24
        : 48;

    const newTicket = submitTicket({
      type: submissionType,
      category,
      title,
      description,
      locationOrUnit,
      isDirectToExecutive,
      confidentiality: 'standard_named',
      submitterName,
      submitterEmployeeId,
      submitterDepartment,
      submitterEmail,
      submitterPhone,
      gatekeeperDepartment: deptInfo.responsibleDept,
      slaTargetHours: slaHours,
      urgency: isDirectToExecutive
        ? 'High'
        : category === 'Safety' || category === 'Harassment'
          ? 'High'
          : 'Medium',
      riskSeverity: isDirectToExecutive ? 'High' : 'Moderate',
      sentiment: submissionType === 'suggestion' ? 'Constructive' : 'Concerned',
      attachments,
    });

    setCreatedTicket(newTicket);
    onTicketCreated(newTicket);
  };

  const getCategoryIcon = (catKey: GrievanceCategory) => {
    switch (catKey) {
      case 'HR':
        return <Users className="h-4 w-4" />;
      case 'IT':
        return <Laptop className="h-4 w-4" />;
      case 'Safety':
        return <ShieldAlert className="h-4 w-4" />;
      case 'Compliance':
        return <FileCheck2 className="h-4 w-4" />;
      case 'Ethics':
        return <Scale className="h-4 w-4" />;
      case 'Harassment':
        return <AlertOctagon className="h-4 w-4" />;
      case 'Fraud':
        return <FileWarning className="h-4 w-4" />;
      case 'Quality':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'Environment':
        return <Leaf className="h-4 w-4" />;
    }
  };

  if (createdTicket) {
    return (
      <div className="animate-in fade-in zoom-in-95 mx-auto max-w-3xl px-4 py-8 duration-200">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-xs">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h2 className="mb-2 text-xl font-bold text-slate-900 sm:text-2xl">
            บันทึก{createdTicket.type === 'complaint' ? 'ข้อร้องเรียน' : 'ข้อเสนอแนะ'}เรียบร้อยแล้ว
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-slate-600">
            ระบบได้ส่งข้อมูลไปยังหน่วยงาน{' '}
            <span className="font-semibold text-slate-800">
              {createdTicket.gatekeeperDepartment}
            </span>{' '}
            เพื่อคัดกรองและดำเนินการตามขั้นตอน
          </p>

          {/* Tracking Code Highlight Card */}
          <div className="mx-auto mb-6 max-w-lg rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  รหัสติดตามความคืบหน้า (Tracking Code)
                </span>
                <div className="mt-0.5 text-2xl font-black tracking-wider text-indigo-700">
                  {createdTicket.trackingCode}
                </div>
              </div>
              <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {CATEGORY_DEFINITIONS[createdTicket.category]?.nameEn}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">สถานะปัจจุบัน:</span>
                <div className="mt-0.5 flex items-center gap-1 font-medium text-blue-700">
                  <span className="h-2 w-2 animate-ping rounded-full bg-blue-600" />
                  ยื่นเรื่องแล้ว (Submitted)
                </div>
              </div>
              <div>
                <span className="text-slate-500">เป้าหมายเวลา SLA:</span>
                <div className="mt-0.5 flex items-center gap-1 font-medium text-slate-800">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  ภายใน {createdTicket.slaTargetHours} ชั่วโมง
                </div>
              </div>
              {createdTicket.isDirectToExecutive && (
                <div className="col-span-2 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-2 text-xs text-purple-800">
                  <Crown className="h-4 w-4 shrink-0 text-purple-600" />
                  <span>บันทึกในช่องทางพิเศษ: ส่งแจ้งเตือนตรงถึงฝ่ายบริหารระดับสูง (CEO/EVP)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              id="btn-view-timeline-now"
              type="button"
              onClick={() => onOpenTracking(createdTicket.trackingCode)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:w-auto"
            >
              <span>เปิดดูไทม์ไลน์สถานะเรียลไทม์</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              id="btn-submit-another"
              type="button"
              onClick={() => {
                setCreatedTicket(null);
                setTitle('');
                setDescription('');
                setLocationOrUnit('');
                setAttachments([]);
                setAiSuggestions(null);
                setIsDirectToExecutive(false);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              ยื่นเรื่องใหม่อีกครั้ง
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header & Intro */}
      <div className="mb-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            ยื่นข้อร้องเรียน / ข้อเสนอแนะพนักงาน
          </h1>

          {/* Quick preset chips */}
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[11px] font-medium whitespace-nowrap text-slate-500">
              ตัวอย่างด่วน:
            </span>
            <button
              type="button"
              id="preset-quality-issue"
              onClick={() => handleApplyPreset('quality_issue')}
              className="flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-sky-800 transition hover:bg-sky-100"
            >
              <span>🔍 มาตรฐานชิ้นงาน QC (Quality)</span>
            </button>
            <button
              type="button"
              id="preset-compliance-alert"
              onClick={() => handleApplyPreset('compliance_alert')}
              className="flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-indigo-800 transition hover:bg-indigo-100"
            >
              <span>📋 ฝ่าฝืน PDPA (Compliance)</span>
            </button>
            <button
              type="button"
              id="preset-welfare-idea"
              onClick={() => handleApplyPreset('welfare_idea')}
              className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-emerald-800 transition hover:bg-emerald-100"
            >
              <span>💡 เสนอสวัสดิการ (HR)</span>
            </button>
            <button
              type="button"
              id="preset-fraud-alert"
              onClick={() => handleApplyPreset('fraud_alert')}
              className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-red-800 transition hover:bg-red-100"
            >
              <span>🚨 แจ้งทุจริต (Fraud)</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-600 sm:text-sm">
          ช่องทางกลางสำหรับรับฟังเสียงพนักงานอย่างเป็นธรรม โปร่งใส
          พร้อมระบบรักษาความลับและติดตามสถานะแบบเรียลไทม์
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1 & 2: Submission Type & Category Selector (Compact 2-Column Grid) */}
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {/* Step 1: Submission Type */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  1. ประเภทข้อมูล (Type)
                </label>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {submissionType === 'complaint' ? 'ข้อร้องเรียน' : 'ข้อเสนอแนะ'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="type-complaint"
                  onClick={() => setSubmissionType('complaint')}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                    submissionType === 'complaint'
                      ? 'border-rose-300 bg-rose-50 text-rose-950 shadow-xs ring-2 ring-rose-500/20'
                      : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`shrink-0 rounded-lg p-1.5 ${submissionType === 'complaint' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-600'}`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">ข้อร้องเรียน</div>
                    <div className="truncate text-[10px] text-slate-500">Grievance & Issue</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="type-suggestion"
                  onClick={() => setSubmissionType('suggestion')}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                    submissionType === 'suggestion'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`shrink-0 rounded-lg p-1.5 ${submissionType === 'suggestion' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                  >
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">ข้อเสนอแนะ</div>
                    <div className="truncate text-[10px] text-slate-500">Suggestion & Idea</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Select Category (Dropdown Selector) */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                  2. เลือกหมวดหมู่ (Select Category)
                </label>
                <span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  9 หมวดหมู่มาตรฐาน
                </span>
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-indigo-600">
                  {getCategoryIcon(category)}
                </div>
                <select
                  id="select-grievance-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GrievanceCategory)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-slate-50 py-2 pr-8 pl-9 text-xs font-semibold text-slate-800 transition hover:bg-slate-100/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {(Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[]).map((catKey) => {
                    const info = CATEGORY_DEFINITIONS[catKey];
                    return (
                      <option key={catKey} value={catKey}>
                        {info.key} - {info.nameTh}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Selected Category Compact Info */}
            <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50 p-1.5 px-2.5 text-[11px]">
              <span className="truncate text-slate-600">
                ส่งตรงถึง:{' '}
                <strong className="font-semibold text-indigo-900">
                  {CATEGORY_DEFINITIONS[category]?.responsibleDept}
                </strong>
              </span>
              <span className="ml-2 shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                SLA: ~{category === 'Safety' || category === 'Compliance' ? '12-24' : '24-48'}h
              </span>
            </div>
          </div>
        </div>

        {/* Step 3: Submitter Identification & Direct Executive Routing */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
              3. ข้อมูลผู้ยื่นเรื่อง (ระบุตัวตนพนักงาน) & ช่องทางพิเศษ
            </label>
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              <UserCheck className="h-3 w-3" />
              <span>ระบุตัวตนพนักงาน (Identified)</span>
            </span>
          </div>

          {/* CEO / EVP Direct Box & Notice in 2 columns */}
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {/* CEO / EVP Direct Box */}
            <div
              className={`rounded-xl border p-3 transition ${
                isDirectToExecutive
                  ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 ring-2 ring-purple-500/20'
                  : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100/60'
              }`}
            >
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  id="checkbox-direct-ceo"
                  checked={isDirectToExecutive}
                  onChange={(e) => setIsDirectToExecutive(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                    <span className="text-xs font-bold text-purple-950">
                      ส่งให้ผู้บริหารโดยตรง CEO / EVP
                    </span>
                    <span className="py-0.2 rounded bg-purple-100 px-1.5 text-[9px] font-bold text-purple-800">
                      PRIORITY
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-purple-900/80">
                    ส่งการแจ้งเตือนด่วนไปยังโต๊ะทำงานของผู้บริหารระดับสูงโดยตรง ข้ามขั้นตอนปกติ
                  </p>
                </div>
              </label>
            </div>

            {/* Identity Notice */}
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <div className="mb-0.5 text-[11px] font-bold text-blue-950">
                  ความปลอดภัย & คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                </div>
                <p className="text-[10.5px] leading-snug text-blue-800">
                  ส่งต่อเฉพาะ Gatekeeper ที่รับผิดชอบโดยตรง เพื่อตรวจสอบและแก้ไขปัญหาอย่างเป็นธรรม
                </p>
              </div>
            </div>
          </div>

          {/* Submitter Info Inputs */}
          <div className="grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-2 text-xs sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                ชื่อ-นามสกุล ผู้ยื่นเรื่อง: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-submitter-name"
                required
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="ระบุชื่อ-นามสกุล"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                รหัสพนักงาน: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-submitter-id"
                required
                value={submitterEmployeeId}
                onChange={(e) => setSubmitterEmployeeId(e.target.value)}
                placeholder="EMP-XXXX"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                ฝ่าย / แผนก: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-submitter-dept"
                required
                value={submitterDepartment}
                onChange={(e) => setSubmitterDepartment(e.target.value)}
                placeholder="ฝ่าย/แผนก"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                อีเมลติดต่อ: <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                id="input-submitter-email"
                required
                value={submitterEmail}
                onChange={(e) => setSubmitterEmail(e.target.value)}
                placeholder="name@company.internal"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Grievance Content & AI Assistant */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
              4. รายละเอียดเรื่อง (Details)
            </label>

            {/* AI Assistant Button */}
            <button
              type="button"
              id="btn-ai-analyze-assist"
              onClick={handleAIAnalyze}
              disabled={isAnalyzingAI || (!title && !description)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs transition hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isAnalyzingAI ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ด้วย Gemini AI'}</span>
            </button>
          </div>

          {/* AI Suggestions Box if generated */}
          {aiSuggestions && (
            <div className="animate-in fade-in rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-950">
              <div className="mb-1 flex items-center justify-between font-bold">
                <span className="flex items-center gap-1 text-indigo-800">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  AI Triage Assistant:
                </span>
                <span className="text-[11px] font-normal text-indigo-600">
                  ความเร่งด่วน:{' '}
                  <strong className="text-indigo-900">{aiSuggestions.urgencyScore}</strong> |
                  ความเสี่ยง: <strong className="text-indigo-900">{aiSuggestions.riskLevel}</strong>
                </span>
              </div>
              <p className="mb-1.5 text-xs text-slate-700">{aiSuggestions.summary}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-slate-500">หมวดหมู่แนะนำ:</span>
                <span className="rounded border border-indigo-200 bg-white px-2 py-0.5 font-semibold text-indigo-700">
                  {aiSuggestions.suggestedCategory}
                </span>
                <span className="text-slate-500">หน่วยงานรับเรื่อง:</span>
                <span className="rounded border border-indigo-200 bg-white px-2 py-0.5 font-medium text-slate-800">
                  {aiSuggestions.suggestedDepartment}
                </span>
              </div>
            </div>
          )}

          {/* Title & Location Side by Side */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                หัวข้อเรื่อง <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-ticket-title"
                required
                placeholder="ระบุใจความสำคัญ เช่น ตรวจพบชิ้นส่วนล็อต #QC-8849 มีรอยร้าวในขั้นตอนประกอบ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                สถานที่ / หน่วยงาน / อาคาร
              </label>
              <input
                type="text"
                id="input-ticket-location"
                placeholder="เช่น โรงงานประกอบ 2 หรือ อาคาร A"
                value={locationOrUnit}
                onChange={(e) => setLocationOrUnit(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              รายละเอียดและข้อเท็จจริง <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="input-ticket-description"
              required
              rows={3}
              placeholder="อธิบายเหตุการณ์ วันเวลา ผลกระทบ หรือข้อเสนอแนะที่ต้องการให้องค์กรปรับปรุงแก้ไขอย่างชัดเจน..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
            />
          </div>

          {/* Attachment Upload Simulation - Compact */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                แนบไฟล์หลักฐาน / เอกสารประกอบ
              </label>
              <button
                type="button"
                onClick={handleAddMockAttachment}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                <Paperclip className="h-3 w-3" />+ จำลองแนบไฟล์ตัวอย่าง
              </button>
            </div>

            {attachments.length === 0 ? (
              <div
                onClick={handleAddMockAttachment}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 p-2.5 text-center text-xs text-slate-500 transition hover:border-indigo-400 hover:bg-slate-50/50"
              >
                <Paperclip className="h-4 w-4 text-slate-400" />
                <span>คลิกเพื่อแนบไฟล์หลักฐาน (PNG, JPG, PDF, DOCX ขนาดไม่เกิน 25 MB)</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                      <span className="truncate text-[11px] font-medium text-slate-800">
                        {att.name}
                      </span>
                      <span className="text-[10px] text-slate-400">({att.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Action Bar */}
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-100/80 p-3 sm:flex-row sm:p-3.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="text-[11px]">
              ข้อมูลได้รับการปกป้องตามมาตรฐาน PDPA และนโยบาย Whistleblower
            </span>
          </div>

          <button
            type="submit"
            id="btn-submit-ticket-final"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow sm:w-auto sm:text-sm"
          >
            <Send className="h-4 w-4" />
            <span>ส่งข้อมูลเข้าระบบ (Submit Record)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
