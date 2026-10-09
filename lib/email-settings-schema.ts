// lib/email-settings-schema.ts — validation of the admin's email notification settings (rewiring
// slice 3). Pure; shared by the Server Actions (input) and lib/email-notifications.ts (stored row).
import { z } from 'zod';

export const SUBJECT_MAX = 300;
export const BODY_MAX = 20000;

const template = z.object({
  enabled: z.boolean(),
  subject: z
    .string()
    .max(SUBJECT_MAX)
    .refine((v) => v.trim().length > 0),
  body: z
    .string()
    .max(BODY_MAX)
    .refine((v) => v.trim().length > 0),
});

/** What a client may send; unknown keys (a forged updatedAt) are stripped. */
export const emailSettingsInputSchema = z.object({
  masterEnabled: z.boolean(),
  onTicketSubmitted: template,
  onTicketResolved: template,
});

export const emailTriggerSchema = z.enum(['ticket_submitted', 'ticket_resolved']);
