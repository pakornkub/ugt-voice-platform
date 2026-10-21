'use client';

import React from 'react';
import type { ComplaintTicket, EmployeeRecord } from '../types';
import { SubmitHeader } from './submit-form/SubmitHeader';
import { TypeCategorySection } from './submit-form/TypeCategorySection';
import { UrgencySection } from './submit-form/UrgencySection';
import { IdentitySection } from './submit-form/IdentitySection';
import { DetailsSection } from './submit-form/DetailsSection';
import { SubmitBar } from './submit-form/SubmitBar';
import { SuccessScreen } from './submit-form/SuccessScreen';
import { useSubmitForm } from './submit-form/useSubmitForm';

interface EmployeeSubmitFormProps {
  onTicketCreated: (ticket: ComplaintTicket) => void;
  onOpenTracking: (trackingCode: string) => void;
  /** The signed-in person (HR-view profile, or their SSO name/email when not in the HR view). */
  currentEmployee: EmployeeRecord;
  /**
   * No-login portal (/report, 2026-10-21): the person types everything, no sample chips, no AI,
   * and the success screen shows the one-time tracking secret.
   */
  portal?: boolean;
}

export const EmployeeSubmitForm: React.FC<Readonly<EmployeeSubmitFormProps>> = ({
  onTicketCreated,
  onOpenTracking,
  currentEmployee,
  portal = false,
}) => {
  const form = useSubmitForm(currentEmployee, onTicketCreated, portal);
  const { classification, content, submitter, attachments, ai, flow } = form;

  if (flow.createdTicket) {
    return (
      <SuccessScreen
        ticket={flow.createdTicket}
        accessKey={flow.accessKey}
        uploadFailures={flow.uploadFailures}
        isRetryingUploads={flow.isRetryingUploads}
        onRetryUploads={flow.handleRetryUploads}
        onOpenTracking={onOpenTracking}
        onSubmitAnother={form.startAnother}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <SubmitHeader onPreset={portal ? undefined : form.applyPreset} />

      <form onSubmit={flow.handleSubmit} className="space-y-4">
        <TypeCategorySection
          submissionType={classification.submissionType}
          category={classification.category}
          aiApplied={ai.applied}
          onSubmissionTypeChange={classification.setSubmissionType}
          onCategoryChange={classification.setCategory}
        />
        <UrgencySection urgency={classification.urgency} onSelect={classification.chooseUrgency} />
        <IdentitySection
          portal={portal}
          currentEmployee={currentEmployee}
          identityChoice={submitter.identityChoice}
          selectedEmployee={submitter.selectedEmployee}
          details={submitter.details}
          isDirectToExecutive={content.isDirectToExecutive}
          onIdentityChoiceChange={submitter.setIdentityChoice}
          onSelectEmployee={submitter.selectEmployeeRecord}
          onDetailChange={submitter.setDetail}
          onDirectToExecutiveChange={content.setIsDirectToExecutive}
        />
        <DetailsSection
          title={content.title}
          description={content.description}
          locationOrUnit={content.locationOrUnit}
          category={classification.category}
          ai={portal ? undefined : ai}
          pendingFiles={attachments.pendingFiles}
          isSubmitting={flow.isSubmitting}
          onTitleChange={content.setTitle}
          onDescriptionChange={content.setDescription}
          onLocationChange={content.setLocationOrUnit}
          onApplyCategory={form.applyAiCategory}
          onUseSample={form.applySampleText}
          onAddAttachments={attachments.addAttachments}
          onRemoveAttachment={attachments.removeAttachment}
        />
        <SubmitBar />
      </form>
    </div>
  );
};
