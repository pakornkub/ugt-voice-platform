import { beforeEach, describe, expect, it } from 'vitest';
import { saveDraft, takeDraft } from './draft';
import type { SubmitFormValues } from './formValues';

const values = {
  submissionType: 'complaint',
  category: 'Fraud',
  urgency: 'High',
  riskSeverity: 'Major',
  title: 'หัวข้อยาว',
  description: 'รายละเอียดยาวมาก',
  locationOrUnit: 'ระยอง',
  isDirectToExecutive: true,
  identityChoice: 'anonymous',
  submitterName: 'ไม่ถูกเก็บ',
  submitterEmployeeId: '01234',
  submitterDepartment: 'ไอที',
  submitterEmail: 'x@ube.com',
  submitterPhone: '081-000-0000',
  anonymousName: 'ผู้ยื่นเรื่อง (ไม่ระบุตัวตน)',
} as unknown as SubmitFormValues;

describe('submit draft (survives a version-change reload)', () => {
  beforeEach(() => sessionStorage.clear());

  it('keeps the typed fields but not the HR identity, and is read only once', () => {
    saveDraft(values);
    const draft = takeDraft();
    expect(draft).toEqual({
      submissionType: 'complaint',
      category: 'Fraud',
      urgency: 'High',
      title: 'หัวข้อยาว',
      description: 'รายละเอียดยาวมาก',
      locationOrUnit: 'ระยอง',
      isDirectToExecutive: true,
      identityChoice: 'anonymous',
      submitterPhone: '081-000-0000',
    });
    expect(JSON.stringify(draft)).not.toContain('ไม่ถูกเก็บ');
    expect(takeDraft()).toBeNull();
  });

  it('returns null for a damaged entry', () => {
    sessionStorage.setItem('voiceplatform_submit_draft_v1', '{not json');
    expect(takeDraft()).toBeNull();
  });
});
