import type { EmployeeRecord, GrievanceCategory, SubmissionType, UrgencyLevel } from '../../types';
import { CATEGORY_DEFINITIONS } from '../../mockData';
import type { submitTicket } from '@/lib/actions/tickets';
import type { IdentityChoice, RiskSeverity } from './constants';

export interface SubmitFormValues {
  submissionType: SubmissionType;
  category: GrievanceCategory;
  urgency: UrgencyLevel;
  riskSeverity: RiskSeverity;
  title: string;
  description: string;
  locationOrUnit: string;
  isDirectToExecutive: boolean;
  identityChoice: IdentityChoice;
  submitterName: string;
  submitterEmployeeId: string;
  submitterDepartment: string;
  submitterEmail: string;
  submitterPhone: string;
  /** Directory record the anonymous mapping keys on. */
  selectedEmployee: EmployeeRecord;
  /** Display name used for anonymous submissions (language-dependent). */
  anonymousName: string;
}

/** The alert text for the first missing required field, or null when the form can be submitted. */
export function getSubmitValidationError(
  values: SubmitFormValues,
  lang: 'th' | 'en'
): string | null {
  if (!values.title.trim() || !values.description.trim()) {
    return lang === 'en'
      ? 'Please fill in both the subject and the detailed description.'
      : 'กรุณากรอกหัวข้อเรื่องและรายละเอียดข้อร้องเรียน/ข้อเสนอแนะ';
  }
  const missingIdentity = !values.submitterName.trim() || !values.submitterEmployeeId.trim();
  if (values.identityChoice === 'identified' && missingIdentity) {
    return lang === 'en'
      ? 'Please provide your name and employee ID.'
      : 'กรุณาระบุชื่อ-นามสกุลและรหัสพนักงานผู้ยื่นเรื่อง';
  }
  return null;
}

/**
 * submitTicket's payload. `attachments` is always empty: the real files are uploaded to /api/files
 * once the ticket (and so its id) exists, never sent as metadata.
 */
export function buildSubmitPayload(values: SubmitFormValues): Parameters<typeof submitTicket>[0] {
  const isAnonymous = values.identityChoice === 'anonymous';
  const { selectedEmployee } = values;
  return {
    type: values.submissionType,
    category: values.category,
    title: values.title,
    description: values.description,
    locationOrUnit: values.locationOrUnit,
    isDirectToExecutive: values.isDirectToExecutive,
    confidentiality: isAnonymous ? 'anonymous' : 'standard_named',
    submitterName: isAnonymous ? values.anonymousName : values.submitterName.trim(),
    submitterEmployeeId: isAnonymous
      ? selectedEmployee.employeeId
      : values.submitterEmployeeId.trim(),
    submitterDepartment: isAnonymous
      ? selectedEmployee.department
      : values.submitterDepartment.trim(),
    submitterEmail: isAnonymous
      ? selectedEmployee.loginEmail
      : values.submitterEmail.trim() || selectedEmployee.loginEmail,
    loginEmail: selectedEmployee.loginEmail,
    isAnonymousMapped: isAnonymous,
    submitterPhone: isAnonymous ? undefined : values.submitterPhone.trim(),
    gatekeeperDepartment: CATEGORY_DEFINITIONS[values.category].responsibleDept,
    urgency: values.urgency,
    riskSeverity: values.riskSeverity,
    sentiment: values.submissionType === 'suggestion' ? 'Constructive' : 'Concerned',
  };
}
