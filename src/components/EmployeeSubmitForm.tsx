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
  ChevronDown
} from 'lucide-react';
import { GrievanceCategory, SubmissionType, ConfidentialityLevel, ComplaintTicket } from '../types';
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
  const [submitterDepartment, setSubmitterDepartment] = useState('Digital Innovation & Engineering');
  const [submitterEmail, setSubmitterEmail] = useState('somchai.v@company.internal');
  const [submitterPhone, setSubmitterPhone] = useState('089-123-4567');
  
  // Attachments
  const [attachments, setAttachments] = useState<{ id: string; name: string; size: string; type: string }[]>([]);
  
  // AI assistance
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any | null>(null);
  
  // Created result
  const [createdTicket, setCreatedTicket] = useState<ComplaintTicket | null>(null);

  // Quick preset templates for rapid testing
  const handleApplyPreset = (presetType: 'quality_issue' | 'compliance_alert' | 'welfare_idea' | 'fraud_alert') => {
    if (presetType === 'quality_issue') {
      setSubmissionType('complaint');
      setCategory('Quality');
      setTitle('พบชิ้นงานล็อต LOT-2026-Q3 มีค่าความคลาดเคลื่อนเกินเกณฑ์มาตรฐาน QC');
      setDescription('จากการสุ่มตรวจชิ้นงานประกอบและแพ็กเกจสินค้าในกระบวนการ QA/QC ประจำวัน พบว่าค่าความหนาและการผนึกบรรจุภัณฑ์ไม่ผ่านเกณฑ์มาตรฐาน ISO 9001 เสี่ยงต่อการรั่วซึมและการปฏิเสธสินค้าจากลูกค้าปลายทาง เสนอให้ระงับการปล่อยล็อตและสอบเทียบเครื่องมือวัดด่วน');
      setLocationOrUnit('โรงงานผลิต สายการผลิตที่ 2 ฝ่ายควบคุมคุณภาพ (QA/QC)');
      setIsDirectToExecutive(false);
    } else if (presetType === 'compliance_alert') {
      setSubmissionType('complaint');
      setCategory('Compliance');
      setTitle('ตรวจพบการจัดเก็บเอกสารสัญญาและข้อมูลส่วนบุคคลลูกค้าในโฟลเดอร์ที่ไม่จำกัดสิทธิ์ตาม PDPA');
      setDescription('พบว่าโฟลเดอร์ Shared Drive ส่วนกลางของหน่วยงานมีการเปิด Public Access ให้เข้าถึงเอกสารสำเนาบัตรประชาชนและข้อมูลส่วนบุคคล (PII) ของลูกค้าโดยไม่มีการเข้ารหัสผ่าน ซึ่งขัดต่อนโยบายความปลอดภัยและกฎหมาย PDPA จึงขอให้ฝ่ายกำกับดูแลเข้าตรวจสอบและแก้ไขด่วน');
      setLocationOrUnit('ศูนย์บริการลูกค้าและคลังเอกสารสัญญาส่วนกลาง');
      setIsDirectToExecutive(true);
    } else if (presetType === 'welfare_idea') {
      setSubmissionType('suggestion');
      setCategory('HR');
      setTitle('เสนอจัดตั้งพื้นที่ Green Relaxation Corner & โซนพักสายตาสำหรับสายงานคอมพิวเตอร์');
      setDescription('เพื่อส่งเสริมสุขภาวะพนักงานตามหลัก Ergonomics เสนอให้จัดพื้นที่สีเขียวพร้อมต้นไม้ฟอกอากาศและเก้าอี้นวดผ่อนคลายกล้ามเนื้อสายตา เพื่อลดภาวะ Office Syndrome');
      setLocationOrUnit('พื้นที่ส่วนกลาง ชั้น 10 ทุกอาคาร');
      setIsDirectToExecutive(false);
    } else if (presetType === 'fraud_alert') {
      setSubmissionType('complaint');
      setCategory('Fraud');
      setTitle('ข้อสงสัยเกี่ยวกับการจัดซื้ออะไหล่ซ่อมบำรุงที่ราคาสูงกว่าท้องตลาด 300%');
      setDescription('พบการเบิกจ่ายค่าอะไหล่สายพานลำเลียงในใบแจ้งหนี้เลขที่ INV-8890 ราคาสูงผิดปกติและบริษัทคู่ค้าเพิ่งจดทะเบียนได้เพียง 1 เดือน โดยผู้มีอำนาจอนุมัติมีความเกี่ยวข้องทางเครือญาติ');
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
      { id: `att-${Date.now()}-1`, name: 'evidence_screenshot_log.png', size: '1.4 MB', type: 'image/png' },
      { id: `att-${Date.now()}-2`, name: 'investigation_memo_doc.pdf', size: '2.8 MB', type: 'application/pdf' },
      { id: `att-${Date.now()}-3`, name: 'inspection_photo_现场.jpg', size: '3.2 MB', type: 'image/jpeg' },
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
    const slaHours = isDirectToExecutive ? 12 : (category === 'Safety' || category === 'Fraud' || category === 'Harassment' ? 24 : 48);

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
      urgency: isDirectToExecutive ? 'High' : (category === 'Safety' || category === 'Harassment' ? 'High' : 'Medium'),
      riskSeverity: isDirectToExecutive ? 'High' : 'Moderate',
      sentiment: submissionType === 'suggestion' ? 'Constructive' : 'Concerned',
      attachments,
    });

    setCreatedTicket(newTicket);
    onTicketCreated(newTicket);
  };

  const getCategoryIcon = (catKey: GrievanceCategory) => {
    switch (catKey) {
      case 'HR': return <Users className="w-4 h-4" />;
      case 'IT': return <Laptop className="w-4 h-4" />;
      case 'Safety': return <ShieldAlert className="w-4 h-4" />;
      case 'Compliance': return <FileCheck2 className="w-4 h-4" />;
      case 'Ethics': return <Scale className="w-4 h-4" />;
      case 'Harassment': return <AlertOctagon className="w-4 h-4" />;
      case 'Fraud': return <FileWarning className="w-4 h-4" />;
      case 'Quality': return <CheckCircle2 className="w-4 h-4" />;
      case 'Environment': return <Leaf className="w-4 h-4" />;
    }
  };

  if (createdTicket) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            บันทึก{createdTicket.type === 'complaint' ? 'ข้อร้องเรียน' : 'ข้อเสนอแนะ'}เรียบร้อยแล้ว
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            ระบบได้ส่งข้อมูลไปยังหน่วยงาน <span className="font-semibold text-slate-800">{createdTicket.gatekeeperDepartment}</span> เพื่อคัดกรองและดำเนินการตามขั้นตอน
          </p>

          {/* Tracking Code Highlight Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 max-w-lg mx-auto text-left">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  รหัสติดตามความคืบหน้า (Tracking Code)
                </span>
                <div className="text-2xl font-black text-indigo-700 tracking-wider mt-0.5">
                  {createdTicket.trackingCode}
                </div>
              </div>
              <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg">
                {CATEGORY_DEFINITIONS[createdTicket.category]?.nameEn}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">สถานะปัจจุบัน:</span>
                <div className="font-medium text-blue-700 mt-0.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  ยื่นเรื่องแล้ว (Submitted)
                </div>
              </div>
              <div>
                <span className="text-slate-500">เป้าหมายเวลา SLA:</span>
                <div className="font-medium text-slate-800 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  ภายใน {createdTicket.slaTargetHours} ชั่วโมง
                </div>
              </div>
              {createdTicket.isDirectToExecutive && (
                <div className="col-span-2 bg-purple-50 border border-purple-200 text-purple-800 p-2 rounded-lg text-xs flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>บันทึกในช่องทางพิเศษ: ส่งแจ้งเตือนตรงถึงฝ่ายบริหารระดับสูง (CEO/EVP)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="btn-view-timeline-now"
              type="button"
              onClick={() => onOpenTracking(createdTicket.trackingCode)}
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
            >
              <span>เปิดดูไทม์ไลน์สถานะเรียลไทม์</span>
              <ArrowRight className="w-4 h-4" />
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
              className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition"
            >
              ยื่นเรื่องใหม่อีกครั้ง
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      
      {/* Header & Intro */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            ยื่นข้อร้องเรียน / ข้อเสนอแนะพนักงาน
          </h1>
          
          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">ตัวอย่างด่วน:</span>
            <button
              type="button"
              id="preset-quality-issue"
              onClick={() => handleApplyPreset('quality_issue')}
              className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-medium rounded-md whitespace-nowrap transition flex items-center gap-1"
            >
              <span>🔍 มาตรฐานชิ้นงาน QC (Quality)</span>
            </button>
            <button
              type="button"
              id="preset-compliance-alert"
              onClick={() => handleApplyPreset('compliance_alert')}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-medium rounded-md whitespace-nowrap transition flex items-center gap-1"
            >
              <span>📋 ฝ่าฝืน PDPA (Compliance)</span>
            </button>
            <button
              type="button"
              id="preset-welfare-idea"
              onClick={() => handleApplyPreset('welfare_idea')}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-medium rounded-md whitespace-nowrap transition flex items-center gap-1"
            >
              <span>💡 เสนอสวัสดิการ (HR)</span>
            </button>
            <button
              type="button"
              id="preset-fraud-alert"
              onClick={() => handleApplyPreset('fraud_alert')}
              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-[11px] font-medium rounded-md whitespace-nowrap transition flex items-center gap-1"
            >
              <span>🚨 แจ้งทุจริต (Fraud)</span>
            </button>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-600">
          ช่องทางกลางสำหรับรับฟังเสียงพนักงานอย่างเป็นธรรม โปร่งใส พร้อมระบบรักษาความลับและติดตามสถานะแบบเรียลไทม์
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Step 1 & 2: Submission Type & Category Selector (Compact 2-Column Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          
          {/* Step 1: Submission Type */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. ประเภทข้อมูล (Type)
                </label>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {submissionType === 'complaint' ? 'ข้อร้องเรียน' : 'ข้อเสนอแนะ'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="type-complaint"
                  onClick={() => setSubmissionType('complaint')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                    submissionType === 'complaint'
                      ? 'bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${submissionType === 'complaint' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">ข้อร้องเรียน</div>
                    <div className="text-[10px] text-slate-500 truncate">Grievance & Issue</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="type-suggestion"
                  onClick={() => setSubmissionType('suggestion')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                    submissionType === 'suggestion'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${submissionType === 'suggestion' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">ข้อเสนอแนะ</div>
                    <div className="text-[10px] text-slate-500 truncate">Suggestion & Idea</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Select Category (Dropdown Selector) */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. เลือกหมวดหมู่ (Select Category)
                </label>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  9 หมวดหมู่มาตรฐาน
                </span>
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                  {getCategoryIcon(category)}
                </div>
                <select
                  id="select-grievance-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as GrievanceCategory)}
                  className="w-full appearance-none pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer transition"
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Selected Category Compact Info */}
            <div className="mt-2 p-1.5 px-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-600 truncate">
                ส่งตรงถึง: <strong className="text-indigo-900 font-semibold">{CATEGORY_DEFINITIONS[category]?.responsibleDept}</strong>
              </span>
              <span className="text-slate-500 shrink-0 font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 ml-2">
                SLA: ~{category === 'Safety' || category === 'Compliance' ? '12-24' : '24-48'}h
              </span>
            </div>
          </div>

        </div>

        {/* Step 3: Submitter Identification & Direct Executive Routing */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              3. ข้อมูลผู้ยื่นเรื่อง (ระบุตัวตนพนักงาน) & ช่องทางพิเศษ
            </label>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              <UserCheck className="w-3 h-3" />
              <span>ระบุตัวตนพนักงาน (Identified)</span>
            </span>
          </div>

          {/* CEO / EVP Direct Box & Notice in 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* CEO / EVP Direct Box */}
            <div className={`p-3 rounded-xl border transition ${
              isDirectToExecutive
                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-300 ring-2 ring-purple-500/20'
                : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/60'
            }`}>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  id="checkbox-direct-ceo"
                  checked={isDirectToExecutive}
                  onChange={(e) => setIsDirectToExecutive(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Crown className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="text-xs font-bold text-purple-950">
                      ส่งให้ผู้บริหารโดยตรง CEO / EVP
                    </span>
                    <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[9px] font-bold rounded">
                      PRIORITY
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-900/80 mt-0.5 leading-snug">
                    ส่งการแจ้งเตือนด่วนไปยังโต๊ะทำงานของผู้บริหารระดับสูงโดยตรง ข้ามขั้นตอนปกติ
                  </p>
                </div>
              </label>
            </div>

            {/* Identity Notice */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-bold text-blue-950 text-[11px] mb-0.5">
                  ความปลอดภัย & คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                </div>
                <p className="text-[10.5px] text-blue-800 leading-snug">
                  ส่งต่อเฉพาะ Gatekeeper ที่รับผิดชอบโดยตรง เพื่อตรวจสอบและแก้ไขปัญหาอย่างเป็นธรรม
                </p>
              </div>
            </div>
          </div>

          {/* Submitter Info Inputs */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1 text-[11px]">
                ชื่อ-นามสกุล ผู้ยื่นเรื่อง: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-submitter-name"
                required
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                placeholder="ระบุชื่อ-นามสกุล"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1 text-[11px]">
                รหัสพนักงาน: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-submitter-id"
                required
                value={submitterEmployeeId}
                onChange={(e) => setSubmitterEmployeeId(e.target.value)}
                placeholder="EMP-XXXX"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1 text-[11px]">
                ฝ่าย / แผนก: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-submitter-dept"
                required
                value={submitterDepartment}
                onChange={(e) => setSubmitterDepartment(e.target.value)}
                placeholder="ฝ่าย/แผนก"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1 text-[11px]">
                อีเมลติดต่อ: <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                id="input-submitter-email"
                required
                value={submitterEmail}
                onChange={(e) => setSubmitterEmail(e.target.value)}
                placeholder="name@company.internal"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Grievance Content & AI Assistant */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              4. รายละเอียดเรื่อง (Details)
            </label>

            {/* AI Assistant Button */}
            <button
              type="button"
              id="btn-ai-analyze-assist"
              onClick={handleAIAnalyze}
              disabled={isAnalyzingAI || (!title && !description)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition disabled:opacity-50 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAnalyzingAI ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ด้วย Gemini AI'}</span>
            </button>
          </div>

          {/* AI Suggestions Box if generated */}
          {aiSuggestions && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-950 animate-in fade-in">
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center gap-1 text-indigo-800">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  AI Triage Assistant:
                </span>
                <span className="text-[11px] font-normal text-indigo-600">
                  ความเร่งด่วน: <strong className="text-indigo-900">{aiSuggestions.urgencyScore}</strong> | ความเสี่ยง: <strong className="text-indigo-900">{aiSuggestions.riskLevel}</strong>
                </span>
              </div>
              <p className="text-slate-700 text-xs mb-1.5">{aiSuggestions.summary}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-slate-500">หมวดหมู่แนะนำ:</span>
                <span className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-semibold text-indigo-700">
                  {aiSuggestions.suggestedCategory}
                </span>
                <span className="text-slate-500">หน่วยงานรับเรื่อง:</span>
                <span className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-medium text-slate-800">
                  {aiSuggestions.suggestedDepartment}
                </span>
              </div>
            </div>
          )}

          {/* Title & Location Side by Side */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หัวข้อเรื่อง <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-ticket-title"
                required
                placeholder="ระบุใจความสำคัญ เช่น ตรวจพบชิ้นส่วนล็อต #QC-8849 มีรอยร้าวในขั้นตอนประกอบ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สถานที่ / หน่วยงาน / อาคาร
              </label>
              <input
                type="text"
                id="input-ticket-location"
                placeholder="เช่น โรงงานประกอบ 2 หรือ อาคาร A"
                value={locationOrUnit}
                onChange={(e) => setLocationOrUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รายละเอียดและข้อเท็จจริง <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="input-ticket-description"
              required
              rows={3}
              placeholder="อธิบายเหตุการณ์ วันเวลา ผลกระทบ หรือข้อเสนอแนะที่ต้องการให้องค์กรปรับปรุงแก้ไขอย่างชัดเจน..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Attachment Upload Simulation - Compact */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                แนบไฟล์หลักฐาน / เอกสารประกอบ
              </label>
              <button
                type="button"
                onClick={handleAddMockAttachment}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Paperclip className="w-3 h-3" />
                + จำลองแนบไฟล์ตัวอย่าง
              </button>
            </div>

            {attachments.length === 0 ? (
              <div
                onClick={handleAddMockAttachment}
                className="border border-dashed border-slate-200 rounded-lg p-2.5 text-center cursor-pointer hover:border-indigo-400 hover:bg-slate-50/50 transition flex items-center justify-center gap-2 text-xs text-slate-500"
              >
                <Paperclip className="w-4 h-4 text-slate-400" />
                <span>คลิกเพื่อแนบไฟล์หลักฐาน (PNG, JPG, PDF, DOCX ขนาดไม่เกิน 25 MB)</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="font-medium text-slate-800 truncate text-[11px]">{att.name}</span>
                      <span className="text-slate-400 text-[10px]">({att.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Submit Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-100/80 p-3 sm:p-3.5 rounded-xl border border-slate-200">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px]">ข้อมูลได้รับการปกป้องตามมาตรฐาน PDPA และนโยบาย Whistleblower</span>
          </div>

          <button
            type="submit"
            id="btn-submit-ticket-final"
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm hover:shadow transition flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>ส่งข้อมูลเข้าระบบ (Submit Record)</span>
          </button>
        </div>

      </form>
    </div>
  );
};