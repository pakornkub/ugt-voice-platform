// A draft of the submit form, kept only across the reload that fixes a version change (owner report
// 2026-10-09: a page left open across a redeploy failed with "Server Action … was not found"; the
// reload must not cost the person their complaint text). sessionStorage = this tab only; it is
// read once and removed on the next load. Names/IDs are not kept — the HR prefill fills them again;
// attachments cannot be kept (File objects) and must be chosen again.
import type { SubmitFormValues } from './formValues';

const KEY = 'voiceplatform_submit_draft_v1';

export type SubmitDraft = Pick<
  SubmitFormValues,
  | 'submissionType'
  | 'category'
  | 'urgency'
  | 'title'
  | 'description'
  | 'locationOrUnit'
  | 'isDirectToExecutive'
  | 'identityChoice'
  | 'submitterPhone'
>;

export function saveDraft(values: SubmitFormValues): void {
  const draft: SubmitDraft = {
    submissionType: values.submissionType,
    category: values.category,
    urgency: values.urgency,
    title: values.title,
    description: values.description,
    locationOrUnit: values.locationOrUnit,
    isDirectToExecutive: values.isDirectToExecutive,
    identityChoice: values.identityChoice,
    submitterPhone: values.submitterPhone,
  };
  try {
    globalThis.sessionStorage?.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Storage blocked (private mode / policy) — the reload simply starts from an empty form.
  }
}

/** The saved draft, removed as it is read; null when there is none or it cannot be read. */
export function takeDraft(): SubmitDraft | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(KEY);
    globalThis.sessionStorage?.removeItem(KEY);
    return raw ? (JSON.parse(raw) as SubmitDraft) : null;
  } catch {
    return null;
  }
}
