'use client';

import React, { useState } from 'react';
import {
  Send,
  Paperclip,
  ShieldAlert,
  CheckCircle2,
  Crown,
  UserCheck,
  FileText,
  Lightbulb,
  Users,
  Scale,
  AlertOctagon,
  FileWarning,
  FileCheck2,
  X,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  EyeOff,
  AlertTriangle,
  Database,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  GrievanceCategory,
  SubmissionType,
  ComplaintTicket,
  UrgencyLevel,
  EmployeeRecord,
} from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import {
  submitTicket,
  getUrgencyBadgeText,
  suggestCategoryWithAI,
  AICategorySuggestionResult,
} from '../services/api';
import { EMPLOYEE_DATABASE, getCurrentLoginEmployee } from '../services/employeeDirectory';
import { useLanguage } from '../context/LanguageContext';

interface EmployeeSubmitFormProps {
  onTicketCreated: (ticket: ComplaintTicket) => void;
  onOpenTracking: (trackingCode: string) => void;
}

export const EmployeeSubmitForm: React.FC<Readonly<EmployeeSubmitFormProps>> = ({
  onTicketCreated,
  onOpenTracking,
}) => {
  const { lang } = useLanguage();
  const [submissionType, setSubmissionType] = useState<SubmissionType>('complaint');
  const [category, setCategory] = useState<GrievanceCategory>('HR');
  const [urgency, setUrgency] = useState<UrgencyLevel>('Medium');
  const [riskSeverity, setRiskSeverity] = useState<'Low' | 'Moderate' | 'High' | 'Severe'>(
    'Moderate'
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationOrUnit, setLocationOrUnit] = useState('');
  const [isDirectToExecutive, setIsDirectToExecutive] = useState(false);
  const [identityChoice, setIdentityChoice] = useState<'identified' | 'anonymous'>('identified');

  // Selected employee from internal directory for mapping
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord>(() =>
    getCurrentLoginEmployee()
  );

  // Submitter details
  const [submitterName, setSubmitterName] = useState(() => getCurrentLoginEmployee().nameTh);
  const [submitterEmployeeId, setSubmitterEmployeeId] = useState(
    () => getCurrentLoginEmployee().employeeId
  );
  const [submitterDepartment, setSubmitterDepartment] = useState(
    () => getCurrentLoginEmployee().department
  );
  const [submitterEmail, setSubmitterEmail] = useState(() => getCurrentLoginEmployee().loginEmail);
  const [submitterPhone, setSubmitterPhone] = useState('089-123-4567');

  const handleSelectEmployeeRecord = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp);
    setSubmitterName(emp.nameTh);
    setSubmitterEmployeeId(emp.employeeId);
    setSubmitterDepartment(emp.department);
    setSubmitterEmail(emp.loginEmail);
    if (emp.phone) setSubmitterPhone(emp.phone);
  };

  const handleToggleIdentityChoice = (choice: 'identified' | 'anonymous') => {
    setIdentityChoice(choice);
  };

  // Attachments
  const [attachments, setAttachments] = useState<
    { id: string; name: string; size: string; type: string }[]
  >([]);

  // Created result
  const [createdTicket, setCreatedTicket] = useState<ComplaintTicket | null>(null);

  // AI Smart Category Assistant State (Section 5)
  const [isAnalyzingCategoryAI, setIsAnalyzingCategoryAI] = useState(false);
  const [aiCategoryResult, setAiCategoryResult] = useState<AICategorySuggestionResult | null>(null);
  const [aiCategoryApplied, setAiCategoryApplied] = useState(false);
  const [aiHelperNotice, setAiHelperNotice] = useState<string | null>(null);

  const handleSuggestCategoryWithAI = async (customTitle?: string, customDesc?: string) => {
    const textTitle = customTitle !== undefined ? customTitle : title;
    const textDesc = customDesc !== undefined ? customDesc : description;

    if (!textTitle.trim() && !textDesc.trim()) {
      setAiHelperNotice(
        lang === 'en'
          ? 'Please enter a Subject/Title or Details first so AI can analyze the content.'
          : 'กรุณากรอกหัวข้อเรื่องหรือรายละเอียดข้อเท็จจริงก่อน เพื่อให้ AI นำข้อความมาวิเคราะห์หมวดหมู่'
      );
      return;
    }

    setAiHelperNotice(null);
    setIsAnalyzingCategoryAI(true);
    setAiCategoryApplied(false);

    try {
      const result = await suggestCategoryWithAI({
        title: textTitle,
        description: textDesc,
      });
      setAiCategoryResult(result);
    } catch (err) {
      console.warn('AI category suggestion fallback used:', err);
      setAiHelperNotice(
        lang === 'en'
          ? 'Unable to connect to AI server. Fallback rule applied.'
          : 'ไม่สามารถติดต่อ AI Server ได้ ระบบใช้เกณฑ์วิเคราะห์คำสำคัญสำรองแทน'
      );
    } finally {
      setIsAnalyzingCategoryAI(false);
    }
  };

  const handleApplyAICategory = (catKey: GrievanceCategory) => {
    setCategory(catKey);
    if (aiCategoryResult?.suggestedUrgency) {
      setUrgency(aiCategoryResult.suggestedUrgency);
      if (aiCategoryResult.suggestedUrgency === 'Critical') setRiskSeverity('Severe');
      else if (aiCategoryResult.suggestedUrgency === 'High') setRiskSeverity('High');
      else if (aiCategoryResult.suggestedUrgency === 'Medium') setRiskSeverity('Moderate');
      else setRiskSeverity('Low');
    }
    setAiCategoryApplied(true);
    setTimeout(() => {
      setAiCategoryApplied(false);
    }, 4500);
  };

  // Quick preset templates for rapid testing
  const handleApplyPreset = (
    presetType: 'quality_issue' | 'compliance_alert' | 'welfare_idea' | 'fraud_alert'
  ) => {
    if (presetType === 'quality_issue') {
      setSubmissionType('complaint');
      setCategory('Quality');
      setUrgency('Medium');
      setRiskSeverity('Moderate');
      setTitle(
        lang === 'en'
          ? 'Discrepancy in batch LOT-2026-Q3 exceeds QC tolerances'
          : 'พบชิ้นงานล็อต LOT-2026-Q3 มีค่าความคลาดเคลื่อนเกินเกณฑ์มาตรฐาน QC'
      );
      setDescription(
        lang === 'en'
          ? 'Daily QA/QC inspection detected thickness and sealing defects violating ISO 9001. Risk of leakage and customer rejection. Request urgent batch quarantine and calibration of gauges.'
          : 'จากการสุ่มตรวจชิ้นงานประกอบและแพ็กเกจสินค้าในกระบวนการ QA/QC ประจำวัน พบว่าค่าความหนาและการผนึกบรรจุภัณฑ์ไม่ผ่านเกณฑ์มาตรฐาน ISO 9001 เสี่ยงต่อการรั่วซึมและการปฏิเสธสินค้าจากลูกค้าปลายทาง เสนอให้ระงับการปล่อยล็อตและสอบเทียบเครื่องมือวัดด่วน'
      );
      setLocationOrUnit(
        lang === 'en'
          ? 'Production Plant Line 2, QA/QC Division'
          : 'โรงงานผลิต สายการผลิตที่ 2 ฝ่ายควบคุมคุณภาพ (QA/QC)'
      );
      setIsDirectToExecutive(false);
    } else if (presetType === 'compliance_alert') {
      setSubmissionType('complaint');
      setCategory('Compliance');
      setUrgency('High');
      setRiskSeverity('High');
      setTitle(
        lang === 'en'
          ? 'Unrestricted access to customer contracts and PII in shared folder (PDPA Risk)'
          : 'ตรวจพบการจัดเก็บเอกสารสัญญาและข้อมูลส่วนบุคคลลูกค้าในโฟลเดอร์ที่ไม่จำกัดสิทธิ์ตาม PDPA'
      );
      setDescription(
        lang === 'en'
          ? 'Department Shared Drive folder has public access without encryption to customer ID copies and PII. Violates security policy and PDPA regulations. Urgent compliance review requested.'
          : 'พบว่าโฟลเดอร์ Shared Drive ส่วนกลางของหน่วยงานมีการเปิด Public Access ให้เข้าถึงเอกสารสำเนาบัตรประชาชนและข้อมูลส่วนบุคคล (PII) ของลูกค้าโดยไม่มีการเข้ารหัสผ่าน ซึ่งขัดต่อนโยบายความปลอดภัยและกฎหมาย PDPA จึงขอให้ฝ่ายกำกับดูแลเข้าตรวจสอบและแก้ไขด่วน'
      );
      setLocationOrUnit(
        lang === 'en'
          ? 'Customer Care Center & Central Records'
          : 'ศูนย์บริการลูกค้าและคลังเอกสารสัญญาส่วนกลาง'
      );
      setIsDirectToExecutive(true);
    } else if (presetType === 'welfare_idea') {
      setSubmissionType('suggestion');
      setCategory('HR');
      setUrgency('Low');
      setRiskSeverity('Low');
      setTitle(
        lang === 'en'
          ? 'Proposal: Green Relaxation Corner & Eye Wellness Zone for workstation staff'
          : 'เสนอจัดตั้งพื้นที่ Green Relaxation Corner & โซนพักสายตาสำหรับสายงานคอมพิวเตอร์'
      );
      setDescription(
        lang === 'en'
          ? 'To promote ergonomic employee wellbeing and alleviate Office Syndrome, propose air-purifying greenery and massage recliners in common rest areas.'
          : 'เพื่อส่งเสริมสุขภาวะพนักงานตามหลัก Ergonomics เสนอให้จัดพื้นที่สีเขียวพร้อมต้นไม้ฟอกอากาศและเก้าอี้นวดผ่อนคลายกล้ามเนื้อสายตา เพื่อลดภาวะ Office Syndrome'
      );
      setLocationOrUnit(
        lang === 'en' ? 'Floor 10 Common Area, All Towers' : 'พื้นที่ส่วนกลาง ชั้น 10 ทุกอาคาร'
      );
      setIsDirectToExecutive(false);
    } else if (presetType === 'fraud_alert') {
      setSubmissionType('complaint');
      setCategory('Fraud');
      setUrgency('Critical');
      setRiskSeverity('Severe');
      setTitle(
        lang === 'en'
          ? 'Suspected procurement overpricing of conveyor maintenance parts by 300%'
          : 'ข้อสงสัยเกี่ยวกับการจัดซื้ออะไหล่ซ่อมบำรุงที่ราคาสูงกว่าท้องตลาด 300%'
      );
      setDescription(
        lang === 'en'
          ? 'Conveyor belt invoice INV-8890 shows abnormally inflated prices from a supplier incorporated only 1 month ago. Related-party conflict of interest concern.'
          : 'พบการเบิกจ่ายค่าอะไหล่สายพานลำเลียงในใบแจ้งหนี้เลขที่ INV-8890 ราคาสูงผิดปกติและบริษัทคู่ค้าเพิ่งจดทะเบียนได้เพียง 1 เดือน โดยผู้มีอำนาจอนุมัติมีความเกี่ยวข้องทางเครือญาติ'
      );
      setLocationOrUnit(
        lang === 'en' ? 'Eastern Regional Distribution Center' : 'ศูนย์กระจายสินค้าภาคตะวันออก'
      );
      setIsDirectToExecutive(true);
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
      alert(
        lang === 'en'
          ? 'Please fill in both the subject and the detailed description.'
          : 'กรุณากรอกหัวข้อเรื่องและรายละเอียดข้อร้องเรียน/ข้อเสนอแนะ'
      );
      return;
    }

    if (identityChoice === 'identified') {
      if (!submitterName.trim() || !submitterEmployeeId.trim()) {
        alert(
          lang === 'en'
            ? 'Please provide your name and employee ID.'
            : 'กรุณาระบุชื่อ-นามสกุลและรหัสพนักงานผู้ยื่นเรื่อง'
        );
        return;
      }
    }

    const deptInfo = CATEGORY_DEFINITIONS[category];
    const isAnonymous = identityChoice === 'anonymous';

    const newTicket = submitTicket({
      type: submissionType,
      category,
      title,
      description,
      locationOrUnit,
      isDirectToExecutive,
      confidentiality: isAnonymous ? 'anonymous' : 'standard_named',
      submitterName: isAnonymous
        ? lang === 'en'
          ? 'Anonymous Submitter'
          : 'ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)'
        : submitterName.trim(),
      submitterEmployeeId: isAnonymous ? selectedEmployee.employeeId : submitterEmployeeId.trim(),
      submitterDepartment: isAnonymous ? selectedEmployee.department : submitterDepartment.trim(),
      submitterEmail: isAnonymous
        ? selectedEmployee.loginEmail
        : submitterEmail.trim() || selectedEmployee.loginEmail,
      loginEmail: selectedEmployee.loginEmail,
      isAnonymousMapped: isAnonymous,
      submitterPhone: isAnonymous ? undefined : submitterPhone.trim(),
      gatekeeperDepartment: deptInfo.responsibleDept,
      urgency,
      riskSeverity,
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
      case 'Compliance':
        return <FileCheck2 className="h-4 w-4" />;
      case 'Ethics':
        return <Scale className="h-4 w-4" />;
      case 'Fraud':
        return <FileWarning className="h-4 w-4" />;
      case 'Harassment':
        return <AlertOctagon className="h-4 w-4" />;
      case 'Quality':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
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
            {createdTicket.type === 'complaint'
              ? lang === 'en'
                ? 'Grievance Recorded Successfully'
                : 'บันทึกข้อร้องเรียนเรียบร้อยแล้ว'
              : lang === 'en'
                ? 'Suggestion Recorded Successfully'
                : 'บันทึกข้อเสนอแนะเรียบร้อยแล้ว'}
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-slate-600">
            {lang === 'en'
              ? `The system has routed your submission to the ${createdTicket.gatekeeperDepartment} unit for screening and standard processing.`
              : `ระบบได้ส่งข้อมูลไปยังหน่วยงาน ${createdTicket.gatekeeperDepartment} เพื่อคัดกรองและดำเนินการตามขั้นตอน`}
          </p>

          {/* Tracking Code Highlight Card */}
          <div className="mx-auto mb-6 max-w-lg rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  {lang === 'en' ? 'Tracking Code' : 'รหัสติดตามความคืบหน้า (Tracking Code)'}
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
                <span className="text-slate-500">
                  {lang === 'en' ? 'Current Status:' : 'สถานะปัจจุบัน:'}
                </span>
                <div className="mt-0.5 flex items-center gap-1 font-medium text-blue-700">
                  <span className="h-2 w-2 animate-ping rounded-full bg-blue-600" />
                  {lang === 'en' ? 'Submitted' : 'ยื่นเรื่องแล้ว (Submitted)'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">
                  {lang === 'en' ? 'Urgency Level:' : 'ระดับความเร่งด่วน:'}
                </span>
                <div className="mt-0.5 flex items-center gap-1 font-medium text-slate-800">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  {getUrgencyBadgeText(createdTicket.urgency, lang)}
                </div>
              </div>
              {createdTicket.isDirectToExecutive && (
                <div className="col-span-2 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-2 text-xs text-purple-800">
                  <Crown className="h-4 w-4 shrink-0 text-purple-600" />
                  <span>
                    {lang === 'en'
                      ? 'Special Route: Direct priority notification sent to executive management (CEO/EVP)'
                      : 'บันทึกในช่องทางพิเศษ: ส่งแจ้งเตือนตรงถึงฝ่ายบริหารระดับสูง (CEO/EVP)'}
                  </span>
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
              <span>
                {lang === 'en' ? 'View Real-time Timeline' : 'เปิดดูไทม์ไลน์สถานะเรียลไทม์'}
              </span>
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
                setIsDirectToExecutive(false);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              {lang === 'en' ? 'Submit Another Record' : 'ยื่นเรื่องใหม่อีกครั้ง'}
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
            {lang === 'en'
              ? 'Submit Grievance / Suggestion'
              : 'ยื่นข้อร้องเรียน / ข้อเสนอแนะพนักงาน'}
          </h1>

          {/* Quick preset chips */}
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[11px] font-medium whitespace-nowrap text-slate-500">
              {lang === 'en' ? 'Quick Samples:' : 'ตัวอย่างด่วน:'}
            </span>
            <button
              type="button"
              id="preset-quality-issue"
              onClick={() => handleApplyPreset('quality_issue')}
              className="flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-sky-800 transition hover:bg-sky-100"
            >
              <span>
                {lang === 'en' ? '🔍 QC Standard (Quality)' : '🔍 มาตรฐานชิ้นงาน QC (Quality)'}
              </span>
            </button>
            <button
              type="button"
              id="preset-compliance-alert"
              onClick={() => handleApplyPreset('compliance_alert')}
              className="flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-indigo-800 transition hover:bg-indigo-100"
            >
              <span>
                {lang === 'en' ? '📋 PDPA Breach (Compliance)' : '📋 ฝ่าฝืน PDPA (Compliance)'}
              </span>
            </button>
            <button
              type="button"
              id="preset-welfare-idea"
              onClick={() => handleApplyPreset('welfare_idea')}
              className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-emerald-800 transition hover:bg-emerald-100"
            >
              <span>{lang === 'en' ? '💡 Welfare Idea (HR)' : '💡 เสนอสวัสดิการ (HR)'}</span>
            </button>
            <button
              type="button"
              id="preset-fraud-alert"
              onClick={() => handleApplyPreset('fraud_alert')}
              className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-red-800 transition hover:bg-red-100"
            >
              <span>{lang === 'en' ? '🚨 Fraud Alert (Fraud)' : '🚨 แจ้งทุจริต (Fraud)'}</span>
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-600 sm:text-sm">
          {lang === 'en'
            ? 'Centralized whistleblowing & grievance management portal for fair, transparent employee voices with confidential protection and real-time tracking.'
            : 'ช่องทางกลางสำหรับรับฟังเสียงพนักงานอย่างเป็นธรรม โปร่งใส พร้อมระบบรักษาความลับและติดตามสถานะแบบเรียลไทม์'}
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
                  {lang === 'en' ? '1. Submission Type' : '1. ประเภทข้อมูล (Type)'}
                </label>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {submissionType === 'complaint'
                    ? lang === 'en'
                      ? 'Grievance'
                      : 'ข้อร้องเรียน'
                    : lang === 'en'
                      ? 'Suggestion'
                      : 'ข้อเสนอแนะ'}
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
                    <div className="truncate text-xs font-bold">
                      {lang === 'en' ? 'Grievance' : 'ข้อร้องเรียน'}
                    </div>
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
                    <div className="truncate text-xs font-bold">
                      {lang === 'en' ? 'Suggestion' : 'ข้อเสนอแนะ'}
                    </div>
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
                <div className="flex items-center gap-1.5">
                  <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                    {lang === 'en' ? '2. Select Category' : '2. เลือกหมวดหมู่ (Select Category)'}
                  </label>
                  {aiCategoryApplied && (
                    <span className="flex animate-pulse items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      {lang === 'en' ? 'AI Applied' : 'AI เลือกให้แล้ว'}
                    </span>
                  )}
                </div>
                <span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {lang === 'en' ? '6 Standard Categories' : '6 หมวดหมู่มาตรฐาน'}
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
                  className="w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-8 pl-9 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-100/80 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {(Object.keys(CATEGORY_DEFINITIONS) as GrievanceCategory[]).map((catKey) => {
                    const info = CATEGORY_DEFINITIONS[catKey];
                    return (
                      <option key={catKey} value={catKey}>
                        {lang === 'en' ? info.nameEn : info.nameTh}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Selected Category Details & Scope Info */}
            <div className="mt-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs">
              <p className="text-[11.5px] leading-relaxed text-slate-600">
                <strong className="font-medium text-slate-800">
                  {lang === 'en' ? 'Scope / Examples: ' : 'ขอบเขตและตัวอย่าง: '}
                </strong>
                {CATEGORY_DEFINITIONS[category]?.descriptionTh}
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Urgency Level Selection (4 Standard Levels) */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
                {lang === 'en'
                  ? '3. Select Urgency Level'
                  : '3. เลือกระดับความเร่งด่วน (Urgency Level)'}
              </label>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {lang === 'en' ? '4 Standard Levels (ISO 10002)' : '4 ระดับมาตรฐาน ISO 10002'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {/* Level 1: Low */}
            <button
              type="button"
              id="urgency-btn-low"
              onClick={() => {
                setUrgency('Low');
                setRiskSeverity('Low');
              }}
              className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition ${
                urgency === 'Low'
                  ? 'border-slate-400 bg-slate-100 text-slate-900 shadow-xs ring-2 ring-slate-400/30'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                    {lang === 'en' ? '🟢 Low / General' : '🟢 ต่ำ / ทั่วไป'}
                  </span>
                  <span className="rounded bg-slate-200/80 px-1 font-mono text-[9px] text-slate-600">
                    Low
                  </span>
                </div>
                <p className="text-[10.5px] leading-snug text-slate-500">
                  {lang === 'en'
                    ? 'General inquiry or suggestion; does not affect daily operations'
                    : 'ข้อเสนอแนะ / สอบถามทั่วไป ไม่กระทบงานประจำวัน'}
                </p>
              </div>
            </button>

            {/* Level 2: Medium */}
            <button
              type="button"
              id="urgency-btn-medium"
              onClick={() => {
                setUrgency('Medium');
                setRiskSeverity('Moderate');
              }}
              className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition ${
                urgency === 'Medium'
                  ? 'border-amber-400 bg-amber-50 text-amber-950 shadow-xs ring-2 ring-amber-400/40'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-800">
                    {lang === 'en' ? '🟡 Medium' : '🟡 ปานกลาง'}
                  </span>
                  <span className="rounded bg-amber-100 px-1 font-mono text-[9px] text-amber-800">
                    Medium
                  </span>
                </div>
                <p className="text-[10.5px] leading-snug text-slate-500">
                  {lang === 'en'
                    ? 'Begins to affect workflow, processes, or minor equipment fault'
                    : 'เริ่มกระทบขั้นตอนการทำงาน หรืออุปกรณ์ขัดข้อง'}
                </p>
              </div>
            </button>

            {/* Level 3: High */}
            <button
              type="button"
              id="urgency-btn-high"
              onClick={() => {
                setUrgency('High');
                setRiskSeverity('High');
              }}
              className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition ${
                urgency === 'High'
                  ? 'border-rose-400 bg-rose-50 text-rose-950 shadow-xs ring-2 ring-rose-400/40'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-800">
                    {lang === 'en' ? '🔴 High / Urgent' : '🔴 เร่งด่วน'}
                  </span>
                  <span className="rounded bg-rose-100 px-1 font-mono text-[9px] text-rose-800">
                    High
                  </span>
                </div>
                <p className="text-[10.5px] leading-snug text-slate-500">
                  {lang === 'en'
                    ? 'Affects safety, employee wellness, or causes operational halt'
                    : 'กระทบความปลอดภัย สุขภาพพนักงาน หรือหยุดชะงัก'}
                </p>
              </div>
            </button>

            {/* Level 4: Critical */}
            <button
              type="button"
              id="urgency-btn-critical"
              onClick={() => {
                setUrgency('Critical');
                setRiskSeverity('Severe');
              }}
              className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3 text-left transition ${
                urgency === 'Critical'
                  ? 'border-red-500 bg-red-100 text-red-950 shadow-xs ring-2 ring-red-500/50'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold text-red-800">
                    {lang === 'en' ? '🔥 Critical / Emergency' : '🔥 วิกฤติ / ฉุกเฉิน'}
                  </span>
                  <span className="rounded bg-red-200 px-1 font-mono text-[9px] font-bold text-red-900">
                    Critical
                  </span>
                </div>
                <p className="text-[10.5px] leading-snug text-slate-500">
                  {lang === 'en'
                    ? 'Severe crisis, corruption, legal liability or human safety threat'
                    : 'เหตุฉุกเฉินร้ายแรง ทุจริต หรือความเสี่ยงกฎหมาย'}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Step 4: Submitter Details: Identified or Anonymous */}
        <div className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
          <div className="flex flex-col justify-between gap-1.5 border-b border-slate-100 pb-1 sm:flex-row sm:items-center">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-800 uppercase">
                {lang === 'en'
                  ? '4. Submitter Details (Identified or Anonymous)'
                  : '4. ข้อมูลผู้ยื่นเรื่อง (ระบุตัวตนพนักงาน หรือ ไม่ระบุตัวตน)'}
              </label>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {lang === 'en'
                  ? 'Choose whether to submit with your identified employee profile or anonymously'
                  : 'เลือกว่าต้องการระบุตัวตนพนักงาน หรือ ยื่นแบบไม่ระบุตัวตน'}
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 self-start rounded-full border px-2.5 py-1 text-[10px] font-bold sm:self-auto ${
                identityChoice === 'identified'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {identityChoice === 'identified' ? (
                <>
                  <UserCheck className="h-3 w-3 text-blue-600" />
                  <span>{lang === 'en' ? 'Identified Employee' : 'ระบุตัวตนพนักงาน'}</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 text-emerald-600" />
                  <span>{lang === 'en' ? 'Anonymous Mode' : 'ไม่ระบุตัวตน (Anonymous)'}</span>
                </>
              )}
            </span>
          </div>

          {/* Toggle Buttons: Identified vs Anonymous */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              id="btn-choice-identified"
              onClick={() => handleToggleIdentityChoice('identified')}
              className={`relative cursor-pointer rounded-xl border p-3 text-left transition ${
                identityChoice === 'identified'
                  ? 'border-blue-400 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    identityChoice === 'identified'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {lang === 'en' ? 'Identified Employee' : 'ระบุตัวตนพนักงาน'}
                    </span>
                    <span className="py-0.2 rounded bg-blue-100/70 px-1.5 text-[10px] font-medium text-blue-700">
                      Standard
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {lang === 'en'
                      ? 'Submit under official employee name and department for direct follow-up'
                      : 'เปิดเผยชื่อ-นามสกุล และสังกัดอย่างเป็นทางการ เพื่อความสะดวกในการติดต่อกลับและประสานงานโดยตรง'}
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              id="btn-choice-anonymous"
              onClick={() => handleToggleIdentityChoice('anonymous')}
              className={`relative cursor-pointer rounded-xl border p-3 text-left transition ${
                identityChoice === 'anonymous'
                  ? 'border-emerald-400 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    identityChoice === 'anonymous'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <EyeOff className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {lang === 'en' ? 'Anonymous Submitter' : 'ไม่ระบุตัวตน (Anonymous)'}
                    </span>
                    <span className="py-0.2 rounded bg-emerald-100/70 px-1.5 text-[10px] font-medium text-emerald-700">
                      Whistleblower
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {lang === 'en'
                      ? 'Conceal name and employee ID of the submitter'
                      : 'ปกปิดชื่อและรหัสพนักงานของผู้ยื่นเรื่อง'}
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Conditional View: Identified Mode Form */}
          {identityChoice === 'identified' && (
            <div className="space-y-3 pt-1">
              {/* Quick Select Employee from Corporate Directory */}
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-600">
                  <Database className="h-3.5 w-3.5 text-blue-600" />
                  {lang === 'en'
                    ? 'Select Profile from Directory:'
                    : 'เลือกข้อมูลจากฐานข้อมูลพนักงาน:'}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {EMPLOYEE_DATABASE.slice(0, 4).map((emp) => (
                    <button
                      key={emp.employeeId}
                      type="button"
                      onClick={() => handleSelectEmployeeRecord(emp)}
                      className={`rounded border px-2 py-0.5 text-[11px] font-medium transition ${
                        selectedEmployee.employeeId === emp.employeeId
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {emp.nameTh.split(' ')[0]} ({emp.department.split(' ')[0]})
                    </button>
                  ))}
                </div>
              </div>

              {/* Submitter Info Inputs */}
              <div className="grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-700">
                    {lang === 'en' ? 'Submitter Full Name:' : 'ชื่อ-นามสกุล ผู้ยื่นเรื่อง:'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-submitter-name"
                    required={identityChoice === 'identified'}
                    value={submitterName}
                    onChange={(e) => setSubmitterName(e.target.value)}
                    placeholder={lang === 'en' ? 'Full name' : 'ระบุชื่อ-นามสกุล'}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-700">
                    {lang === 'en' ? 'Employee ID:' : 'รหัสพนักงาน:'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-submitter-id"
                    required={identityChoice === 'identified'}
                    value={submitterEmployeeId}
                    onChange={(e) => setSubmitterEmployeeId(e.target.value)}
                    placeholder="EMP-XXXX"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-700">
                    {lang === 'en' ? 'Division / Dept:' : 'ฝ่าย / แผนก:'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-submitter-dept"
                    required={identityChoice === 'identified'}
                    value={submitterDepartment}
                    onChange={(e) => setSubmitterDepartment(e.target.value)}
                    placeholder={lang === 'en' ? 'Department' : 'ฝ่าย/แผนก'}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-700">
                    {lang === 'en' ? 'Contact Email:' : 'อีเมลติดต่อ:'}{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="input-submitter-email"
                    required={identityChoice === 'identified'}
                    value={submitterEmail}
                    onChange={(e) => setSubmitterEmail(e.target.value)}
                    placeholder="name@company.internal"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CEO / EVP Direct Box & Notice in 2 columns */}
          <div className="grid grid-cols-1 gap-2.5 pt-1 md:grid-cols-2">
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
                      {lang === 'en'
                        ? 'Direct to Executive (CEO / EVP)'
                        : 'ส่งให้ผู้บริหารโดยตรง CEO / EVP'}
                    </span>
                    <span className="py-0.2 rounded bg-purple-100 px-1.5 text-[9px] font-bold text-purple-800">
                      PRIORITY
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-purple-900/80">
                    {lang === 'en'
                      ? 'Send instant priority notification straight to senior management desk, bypassing initial triage'
                      : 'ส่งการแจ้งเตือนด่วนไปยังโต๊ะทำงานของผู้บริหารระดับสูงโดยตรง ข้ามขั้นตอนปกติ'}
                  </p>
                </div>
              </label>
            </div>

            {/* Identity Notice */}
            <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <div className="mb-0.5 text-[11px] font-bold text-blue-950">
                  {lang === 'en'
                    ? 'Security & Personal Data Protection (PDPA)'
                    : 'ความปลอดภัย & คุ้มครองข้อมูลส่วนบุคคล (PDPA)'}
                </div>
                <p className="text-[10.5px] leading-snug text-blue-800">
                  {lang === 'en'
                    ? 'Dispatched exclusively to the assigned Gatekeeper for impartial investigation and remediation.'
                    : 'ส่งต่อเฉพาะ Gatekeeper ที่รับผิดชอบโดยตรง เพื่อตรวจสอบและแก้ไขปัญหาอย่างเป็นธรรม'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Grievance Content */}
        <div className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-1.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-bold tracking-wider text-slate-800 uppercase">
                {lang === 'en' ? '5. Grievance Details' : '5. รายละเอียดเรื่อง (Details)'}
              </label>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {lang === 'en' ? 'Facts & Evidence' : 'ข้อเท็จจริง & พยานหลักฐาน'}
              </span>
            </div>

            {/* AI Category Assistant Action Button */}
            <button
              type="button"
              id="btn-ai-category-suggest"
              onClick={() => handleSuggestCategoryWithAI()}
              disabled={isAnalyzingCategoryAI}
              className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:from-indigo-700 hover:to-purple-800 hover:shadow active:scale-95 disabled:opacity-50 sm:self-auto"
            >
              {isAnalyzingCategoryAI ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>
                    {lang === 'en' ? 'AI Analyzing Details...' : 'AI กำลังวิเคราะห์เนื้อหา...'}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-300" />
                  <span>
                    {lang === 'en' ? 'AI Category Assistant' : '✨ ให้ AI ช่วยเลือกหมวดหมู่'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Title & Location Side by Side */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Subject / Title' : 'หัวข้อเรื่อง'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-ticket-title"
                required
                placeholder={
                  lang === 'en'
                    ? 'Specify main issue e.g., Request improvement for medical expense claim & employee benefits'
                    : 'ระบุใจความสำคัญ เช่น ขอปรับปรุงขั้นตอนการเบิกจ่ายค่ารักษาพยาบาลและสวัสดิการพนักงาน'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Location / Unit' : 'สถานที่ / หน่วยงาน'}
              </label>
              <input
                type="text"
                id="input-ticket-location"
                placeholder={
                  lang === 'en'
                    ? 'e.g., Admin Building or Bangkok Office'
                    : 'เช่น อาคาร Admin หรือ สำนักงานกรุงเทพ'
                }
                value={locationOrUnit}
                onChange={(e) => setLocationOrUnit(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Details and Facts' : 'รายละเอียดและข้อเท็จจริง'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              {description.length > 0 && (
                <span className="text-[10.5px] text-slate-400">
                  {description.length} {lang === 'en' ? 'characters' : 'ตัวอักษร'}
                </span>
              )}
            </div>
            <textarea
              id="input-ticket-description"
              required
              rows={3}
              placeholder={
                lang === 'en'
                  ? 'Describe the incident, date/time, impact, or proposed corrective actions clearly...'
                  : 'อธิบายเหตุการณ์ วันเวลา ผลกระทบ หรือข้อเสนอแนะที่ต้องการให้องค์กรปรับปรุงแก้ไขอย่างชัดเจน...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
            />
          </div>

          {/* Quick Helper Pill when user has entered description and hasn't used AI yet */}
          {!aiCategoryResult && !isAnalyzingCategoryAI && description.length >= 20 && (
            <div className="flex items-center justify-between rounded-xl border border-indigo-200/90 bg-indigo-50/80 p-2.5 text-xs text-indigo-900 shadow-2xs">
              <div className="flex min-w-0 items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 animate-pulse text-indigo-600" />
                <span className="truncate text-[11px] font-medium">
                  {lang === 'en'
                    ? 'Have details written? Let AI evaluate the best category for this grievance.'
                    : 'พิมพ์ข้อเท็จจริงแล้ว: ต้องการให้ AI ช่วยอ่านข้อความและเลือกหมวดหมู่ที่ตรงที่สุดให้หรือไม่?'}
                </span>
              </div>
              <button
                type="button"
                id="btn-trigger-ai-pill"
                onClick={() => handleSuggestCategoryWithAI()}
                className="ml-2 flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs transition hover:bg-indigo-700 active:scale-95"
              >
                <Sparkles className="h-3 w-3 text-amber-200" />
                <span>{lang === 'en' ? 'Analyze Now' : 'ให้ AI ช่วยเลือก'}</span>
              </button>
            </div>
          )}

          {/* AI Category Assistant Recommendation Box */}
          {aiCategoryResult && (
            <div className="space-y-2.5 rounded-xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-white p-3.5 shadow-xs transition-all">
              <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-indigo-600 p-1.5 text-white shadow-xs">
                    <Sparkles className="h-4 w-4 text-amber-200" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-indigo-950">
                      <span>
                        {lang === 'en'
                          ? 'AI Recommended Category'
                          : 'AI วิเคราะห์ & แนะนำหมวดหมู่ที่เหมาะสม'}
                      </span>
                      <span className="rounded-full border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                        {lang === 'en'
                          ? `Confidence ${aiCategoryResult.confidence}%`
                          : `ความมั่นใจ ${aiCategoryResult.confidence}%`}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-800/80">
                      {lang === 'en'
                        ? 'Evaluated from your Subject & Details'
                        : 'ประเมินจากเนื้อหาและบริบทข้อเท็จจริงในข้อ 5'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAiCategoryResult(null)}
                  className="cursor-pointer rounded-md p-1 text-slate-400 transition hover:bg-white/80 hover:text-slate-600"
                  title={lang === 'en' ? 'Dismiss' : 'ปิดกล่องแนะนำ'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Recommended Category Card & Action */}
              <div className="space-y-2.5 rounded-xl border border-indigo-200 bg-white p-3 shadow-2xs">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700">
                      {getCategoryIcon(aiCategoryResult.suggestedCategory)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {lang === 'en'
                            ? CATEGORY_DEFINITIONS[aiCategoryResult.suggestedCategory]?.nameEn
                            : CATEGORY_DEFINITIONS[aiCategoryResult.suggestedCategory]?.nameTh}
                        </span>
                      </div>
                      <p className="mt-1 text-[11.5px] leading-snug text-slate-700">
                        {aiCategoryResult.reasoning}
                      </p>
                    </div>
                  </div>

                  {/* Apply Category Button */}
                  <div className="flex shrink-0 flex-col gap-1 sm:items-end">
                    <button
                      type="button"
                      id="btn-apply-ai-category"
                      onClick={() => handleApplyAICategory(aiCategoryResult.suggestedCategory)}
                      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs transition ${
                        category === aiCategoryResult.suggestedCategory
                          ? 'bg-emerald-600 text-white shadow-emerald-200'
                          : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 active:scale-95'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>
                        {category === aiCategoryResult.suggestedCategory
                          ? lang === 'en'
                            ? '✓ Applied (Step 2 Selected)'
                            : '✓ เลือกหมวดหมู่นี้ในข้อ 2 แล้ว'
                          : lang === 'en'
                            ? 'Apply This Category (Step 2)'
                            : `นำหมวดหมู่นี้ไปใช้ (เลือกเป็น ${CATEGORY_DEFINITIONS[aiCategoryResult.suggestedCategory]?.nameTh})`}
                      </span>
                    </button>
                    {aiCategoryResult.suggestedUrgency && (
                      <span className="text-[10px] text-slate-500">
                        {lang === 'en'
                          ? `Urgency suggestion: ${aiCategoryResult.suggestedUrgency}`
                          : `ระดับเร่งด่วนแนะนำ: ${aiCategoryResult.suggestedUrgency}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Keywords Detected Chips & Secondary Category */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                  {aiCategoryResult.keywords && aiCategoryResult.keywords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10.5px] font-medium text-slate-500">
                        {lang === 'en' ? 'Key terms detected:' : 'คำสำคัญที่พบ:'}
                      </span>
                      {aiCategoryResult.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="rounded-md border border-slate-200/50 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {aiCategoryResult.secondaryCategory &&
                    aiCategoryResult.secondaryCategory !== aiCategoryResult.suggestedCategory && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <span>
                          {lang === 'en' ? 'Alternative category:' : 'หรือเลือกหมวดหมู่ใกล้เคียง:'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApplyAICategory(aiCategoryResult.secondaryCategory!)}
                          className="cursor-pointer rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          {CATEGORY_DEFINITIONS[aiCategoryResult.secondaryCategory]?.nameTh}
                        </button>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* AI Helper Notice if empty */}
          {aiHelperNotice && (
            <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>{aiHelperNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiHelperNotice(null)}
                  className="cursor-pointer text-amber-600 hover:text-amber-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-amber-800">
                {lang === 'en'
                  ? 'Tip: You can type a brief issue or click one of the quick test presets below:'
                  : 'เคล็ดลับ: คุณสามารถพิมพ์ข้อความหรือคลิกทดลองใส่ข้อความตัวอย่างด้านล่างนี้ได้เลย:'}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const sampleT =
                      'ขอปรับปรุงขั้นตอนการเบิกจ่ายค่ารักษาพยาบาลและสิทธิประโยชน์พนักงาน';
                    const sampleD =
                      'ต้องการให้มีระบบเบิกจ่ายค่ารักษาพยาบาลออนไลน์และอัปเดตสิทธิประโยชน์ทันเวลา เจ้าหน้าที่เบิกจ่ายล่าช้า';
                    setTitle(sampleT);
                    setDescription(sampleD);
                    handleSuggestCategoryWithAI(sampleT, sampleD);
                  }}
                  className="cursor-pointer rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[10.5px] font-medium text-amber-900 shadow-2xs transition hover:bg-amber-100"
                >
                  💡 ตัวอย่าง: เบิกจ่ายสวัสดิการ (HR)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sampleT =
                      'เครื่องจักรสายการผลิตที่ 2 ชำรุดและอุปกรณ์ป้องกันความปลอดภัยเสียหาย';
                    const sampleD =
                      'เซนเซอร์ตัดการทำงานชำรุดเสียหาย เสี่ยงต่ออุบัติเหตุพนักงานฝ่ายปฏิบัติการ ขอให้ซ่อมแซมด่วน';
                    setTitle(sampleT);
                    setDescription(sampleD);
                    handleSuggestCategoryWithAI(sampleT, sampleD);
                  }}
                  className="cursor-pointer rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[10.5px] font-medium text-amber-900 shadow-2xs transition hover:bg-amber-100"
                >
                  💡 ตัวอย่าง: อุปกรณ์ชำรุดและความปลอดภัย (Quality)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sampleT = 'พบพฤติกรรมส่อไปในทางทุจริตและการปลอมแปลงเอกสารจัดซื้อ';
                    const sampleD =
                      'มีการแก้ตัวเลขใบเสนอราคาและมีการจ่ายเงินทอนให้ผู้ตรวจรับงานในโครงการจัดซื้อคอมพิวเตอร์';
                    setTitle(sampleT);
                    setDescription(sampleD);
                    handleSuggestCategoryWithAI(sampleT, sampleD);
                  }}
                  className="cursor-pointer rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[10.5px] font-medium text-amber-900 shadow-2xs transition hover:bg-amber-100"
                >
                  💡 ตัวอย่าง: ตรวจสอบการทุจริต (Fraud)
                </button>
              </div>
            </div>
          )}

          {/* Attachment Upload Simulation - Compact */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Attach Evidence / Documents' : 'แนบไฟล์หลักฐาน / เอกสารประกอบ'}
              </label>
              <button
                type="button"
                onClick={handleAddMockAttachment}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                <Paperclip className="h-3 w-3" />
                {lang === 'en' ? '+ Simulate mock file' : '+ จำลองแนบไฟล์ตัวอย่าง'}
              </button>
            </div>

            {attachments.length === 0 ? (
              <div
                onClick={handleAddMockAttachment}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 p-2.5 text-center text-xs text-slate-500 transition hover:border-indigo-400 hover:bg-slate-50/50"
              >
                <Paperclip className="h-4 w-4 text-slate-400" />
                <span>
                  {lang === 'en'
                    ? 'Click to attach evidence (PNG, JPG, PDF, DOCX up to 25 MB)'
                    : 'คลิกเพื่อแนบไฟล์หลักฐาน (PNG, JPG, PDF, DOCX ขนาดไม่เกิน 25 MB)'}
                </span>
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
              {lang === 'en'
                ? 'Data protected under ISO 10002, PDPA and Whistleblower policy'
                : 'ข้อมูลได้รับการปกป้องตามมาตรฐาน PDPA และนโยบาย Whistleblower'}
            </span>
          </div>

          <button
            type="submit"
            id="btn-submit-ticket-final"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow sm:w-auto sm:text-sm"
          >
            <Send className="h-4 w-4" />
            <span>{lang === 'en' ? 'Submit Record' : 'ส่งข้อมูลเข้าระบบ (Submit Record)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
