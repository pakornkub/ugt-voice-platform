import { useState, type SubmitEvent } from 'react';
import type {
  ComplaintTicket,
  EmployeeRecord,
  GrievanceCategory,
  SubmissionType,
  UrgencyLevel,
} from '../../types';
import { suggestCategoryWithAI, type AICategorySuggestionResult } from '../../services/api';
import { submitTicket } from '@/lib/actions/tickets';
import { uploadTicketFiles, type UploadFailure } from '@/lib/upload-client';
import type { PendingFile } from '../AttachmentPicker';
import {
  PRESETS,
  RISK_BY_URGENCY,
  type Bilingual,
  type IdentityChoice,
  type PresetType,
  type RiskSeverity,
} from './constants';
import { buildSubmitPayload, getSubmitValidationError, type SubmitFormValues } from './formValues';
import { useTr } from './useTr';

const AI_EMPTY_NOTICE: Bilingual = {
  en: 'Please enter a Subject/Title or Details first so AI can analyze the content.',
  th: 'กรุณากรอกหัวข้อเรื่องหรือรายละเอียดข้อเท็จจริงก่อน เพื่อให้ AI นำข้อความมาวิเคราะห์หมวดหมู่',
};
const AI_FALLBACK_NOTICE: Bilingual = {
  en: 'Unable to connect to AI server. Fallback rule applied.',
  th: 'ไม่สามารถติดต่อ AI Server ได้ ระบบใช้เกณฑ์วิเคราะห์คำสำคัญสำรองแทน',
};
const SUBMIT_FAILED_ALERT: Bilingual = {
  en: 'Could not submit your ticket. Please try again.',
  th: 'ไม่สามารถบันทึกคำร้องได้ กรุณาลองใหม่อีกครั้ง',
};

const AI_APPLIED_FLASH_MS = 4500;

const isBlank = (text: string) => !text.trim();

/** Step 1-3: submission type, category and urgency (with the risk severity that goes with it). */
function useClassification() {
  const [submissionType, setSubmissionType] = useState<SubmissionType>('complaint');
  const [category, setCategory] = useState<GrievanceCategory>('HR');
  const [urgency, setUrgency] = useState<UrgencyLevel>('Medium');
  const [riskSeverity, setRiskSeverity] = useState<RiskSeverity>('Moderate');

  const chooseUrgency = (level: UrgencyLevel) => {
    setUrgency(level);
    setRiskSeverity(RISK_BY_URGENCY[level]);
  };

  return {
    submissionType,
    setSubmissionType,
    category,
    setCategory,
    urgency,
    riskSeverity,
    chooseUrgency,
  };
}

/** Step 5: the written content of the record. */
function useContentFields() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationOrUnit, setLocationOrUnit] = useState('');
  const [isDirectToExecutive, setIsDirectToExecutive] = useState(false);

  const clearContent = () => {
    setTitle('');
    setDescription('');
    setLocationOrUnit('');
    setIsDirectToExecutive(false);
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    locationOrUnit,
    setLocationOrUnit,
    isDirectToExecutive,
    setIsDirectToExecutive,
    clearContent,
  };
}

export type SubmitterField = 'name' | 'employeeId' | 'department' | 'email' | 'phone';

/** Step 4: identified / anonymous choice and the submitter's details. */
function useSubmitter(currentEmployee: EmployeeRecord) {
  const [identityChoice, setIdentityChoice] = useState<IdentityChoice>('identified');
  // Selected employee from internal directory for mapping
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord>(currentEmployee);
  const [details, setDetails] = useState<Record<SubmitterField, string>>({
    name: currentEmployee.nameTh,
    employeeId: currentEmployee.employeeId,
    department: currentEmployee.department,
    email: currentEmployee.loginEmail,
    phone: currentEmployee.phone,
  });

  const setDetail = (field: SubmitterField, value: string) =>
    setDetails((prev) => ({ ...prev, [field]: value }));

  const selectEmployeeRecord = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp);
    setDetails((prev) => ({
      name: emp.nameTh,
      employeeId: emp.employeeId,
      department: emp.department,
      email: emp.loginEmail,
      phone: emp.phone || prev.phone,
    }));
  };

  return {
    identityChoice,
    setIdentityChoice,
    selectedEmployee,
    details,
    setDetail,
    selectEmployeeRecord,
  };
}

/** Attachments: the chosen files wait here until the ticket exists, then go to /api/files. */
function useAttachments() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const addAttachments = (added: PendingFile[]) => setPendingFiles((prev) => [...prev, ...added]);
  const removeAttachment = (id: string) =>
    setPendingFiles((prev) => prev.filter((pending) => pending.id !== id));
  const clearAttachments = () => setPendingFiles([]);

  return { pendingFiles, addAttachments, removeAttachment, clearAttachments };
}

/** AI Smart Category Assistant (Section 5). */
function useAiAssistant(title: string, description: string) {
  const { lang } = useTr();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AICategorySuggestionResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const suggest = async (customTitle?: string, customDesc?: string) => {
    const textTitle = customTitle ?? title;
    const textDesc = customDesc ?? description;

    if (isBlank(textTitle) && isBlank(textDesc)) {
      setNotice(AI_EMPTY_NOTICE[lang]);
      return;
    }

    setNotice(null);
    setIsAnalyzing(true);
    setApplied(false);

    try {
      setResult(await suggestCategoryWithAI({ title: textTitle, description: textDesc, lang }));
    } catch (err) {
      console.warn('AI category suggestion fallback used:', err);
      setNotice(AI_FALLBACK_NOTICE[lang]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const flashApplied = () => {
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
    }, AI_APPLIED_FLASH_MS);
  };

  const dismissResult = () => setResult(null);
  const dismissNotice = () => setNotice(null);

  return {
    isAnalyzing,
    result,
    applied,
    notice,
    suggest,
    flashApplied,
    dismissResult,
    dismissNotice,
  };
}

interface SubmitFlowOptions {
  values: SubmitFormValues;
  pendingFiles: PendingFile[];
  onTicketCreated: (ticket: ComplaintTicket) => void;
}

/** Submit -> upload attachments -> success screen, plus retrying the failed uploads. */
function useSubmitFlow({ values, pendingFiles, onTicketCreated }: SubmitFlowOptions) {
  const { lang } = useTr();
  const [createdTicket, setCreatedTicket] = useState<ComplaintTicket | null>(null);
  const [uploadFailures, setUploadFailures] = useState<UploadFailure[]>([]);
  const [isRetryingUploads, setIsRetryingUploads] = useState(false);
  // Guards double-submit while the Server Action runs (upstream saved synchronously).
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationError = getSubmitValidationError(values, lang);
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsSubmitting(true);
    submitTicket(buildSubmitPayload(values))
      .then(async (newTicket) => {
        // The ticket exists now, so the chosen files can be uploaded to it. A failed upload never
        // undoes the ticket — it is reported on the success screen instead.
        setUploadFailures(
          await uploadTicketFiles(
            newTicket.id,
            pendingFiles.map((pending) => pending.file)
          )
        );
        setCreatedTicket(newTicket);
        onTicketCreated(newTicket);
      })
      .catch((error) => {
        console.error('submitTicket failed', error);
        alert(SUBMIT_FAILED_ALERT[lang]);
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleRetryUploads = () => {
    if (!createdTicket) return;
    setIsRetryingUploads(true);
    uploadTicketFiles(
      createdTicket.id,
      uploadFailures.map((failure) => failure.file)
    )
      .then(setUploadFailures)
      .finally(() => setIsRetryingUploads(false));
  };

  const clearResult = () => {
    setCreatedTicket(null);
    setUploadFailures([]);
  };

  return {
    createdTicket,
    uploadFailures,
    isRetryingUploads,
    isSubmitting,
    handleSubmit,
    handleRetryUploads,
    clearResult,
  };
}

// Stored data is Thai whatever the UI language (lib/ticket-scope.ts ANONYMOUS_SUBMITTER_NAME); the
// tracking screens show it through localizeServerText.
const ANONYMOUS_SUBMITTER_LABEL = 'ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)';

/** All state and handlers of the submit form; the section components only render slices of it. */
export function useSubmitForm(
  currentEmployee: EmployeeRecord,
  onTicketCreated: (ticket: ComplaintTicket) => void
) {
  const { lang } = useTr();
  const classification = useClassification();
  const content = useContentFields();
  const submitter = useSubmitter(currentEmployee);
  const attachments = useAttachments();
  const ai = useAiAssistant(content.title, content.description);

  const values: SubmitFormValues = {
    submissionType: classification.submissionType,
    category: classification.category,
    urgency: classification.urgency,
    riskSeverity: classification.riskSeverity,
    title: content.title,
    description: content.description,
    locationOrUnit: content.locationOrUnit,
    isDirectToExecutive: content.isDirectToExecutive,
    identityChoice: submitter.identityChoice,
    submitterName: submitter.details.name,
    submitterEmployeeId: submitter.details.employeeId,
    submitterDepartment: submitter.details.department,
    submitterEmail: submitter.details.email,
    submitterPhone: submitter.details.phone,
    selectedEmployee: submitter.selectedEmployee,
    anonymousName: ANONYMOUS_SUBMITTER_LABEL,
  };
  const flow = useSubmitFlow({ values, pendingFiles: attachments.pendingFiles, onTicketCreated });

  const applyAiCategory = (catKey: GrievanceCategory) => {
    classification.setCategory(catKey);
    const suggestedUrgency = ai.result?.suggestedUrgency;
    if (suggestedUrgency) classification.chooseUrgency(suggestedUrgency);
    ai.flashApplied();
  };

  // Quick preset templates for rapid testing
  const applyPreset = (presetType: PresetType) => {
    const preset = PRESETS[presetType];
    classification.setSubmissionType(preset.type);
    classification.setCategory(preset.category);
    classification.chooseUrgency(preset.urgency);
    content.setTitle(preset.title[lang]);
    content.setDescription(preset.description[lang]);
    content.setLocationOrUnit(preset.location[lang]);
    content.setIsDirectToExecutive(preset.isDirectToExecutive);
  };

  // A sample text from the AI notice: fill the form with it and let the AI read it straight away.
  const applySampleText = (sampleTitle: string, sampleDescription: string) => {
    content.setTitle(sampleTitle);
    content.setDescription(sampleDescription);
    ai.suggest(sampleTitle, sampleDescription);
  };

  // "Submit another record": back to an empty form (identity and classification stay as they were).
  const startAnother = () => {
    flow.clearResult();
    content.clearContent();
    attachments.clearAttachments();
  };

  return {
    classification,
    content,
    submitter,
    attachments,
    ai,
    flow,
    applyAiCategory,
    applyPreset,
    applySampleText,
    startAnother,
  };
}
