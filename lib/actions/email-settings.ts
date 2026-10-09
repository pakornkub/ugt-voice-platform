'use server';

// lib/actions/email-settings.ts — the "Email Notifications" sub-tab of the Gatekeeper-management
// page (rewiring slice 3, 2026-10-09): settings in AppSettings, the dispatch log in
// EmailDispatchLogs, test sends through SMTP. The sub-tab lives on the `admin_gatekeeper` screen,
// so — like the rosters — every action needs a tab of ROSTER_TABS in the caller's RBAC role.
// Order per the org contract: session → permission (requireTab) → action → audit (writeAudit).
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import {
  clearDispatchLogs,
  listDispatchLogs,
  loadEmailSettings,
  mailActorFor,
  sendTestNotification,
  storeEmailSettings,
} from '@/lib/email-notifications';
import { emailSettingsInputSchema, emailTriggerSchema } from '@/lib/email-settings-schema';
import { requireTab, ROSTER_TABS, writeAudit } from '@/lib/tab-guard';
import { DEFAULT_EMAIL_SETTINGS } from '@/services/emailDefaults';
import type { EmailDispatchLog, EmailNotificationSettings } from '@/types';

export async function getEmailNotificationSettings(): Promise<EmailNotificationSettings> {
  await requireTab(ROSTER_TABS);
  return loadEmailSettings();
}

export async function getEmailDispatchLogs(): Promise<EmailDispatchLog[]> {
  await requireTab(ROSTER_TABS);
  return listDispatchLogs();
}

/** Upstream's "Save All Settings". `updatedAt` is the server's — a client-sent one is dropped. */
export async function saveEmailNotificationSettings(
  settings: unknown
): Promise<EmailNotificationSettings> {
  const viewer = await requireTab(ROSTER_TABS);
  const input = emailSettingsInputSchema.parse(settings);
  const saved = await storeEmailSettings(input, viewer.userId);
  // Switch states only — never the subject/body text.
  writeAudit(viewer, AUDIT_ACTIONS.EMAIL_SETTINGS_UPDATE, {
    masterEnabled: saved.masterEnabled,
    onTicketSubmitted: saved.onTicketSubmitted.enabled,
    onTicketResolved: saved.onTicketResolved.enabled,
  });
  return saved;
}

export async function resetEmailNotificationSettings(): Promise<EmailNotificationSettings> {
  const viewer = await requireTab(ROSTER_TABS);
  const saved = await storeEmailSettings(
    {
      masterEnabled: DEFAULT_EMAIL_SETTINGS.masterEnabled,
      onTicketSubmitted: DEFAULT_EMAIL_SETTINGS.onTicketSubmitted,
      onTicketResolved: DEFAULT_EMAIL_SETTINGS.onTicketResolved,
    },
    viewer.userId
  );
  writeAudit(viewer, AUDIT_ACTIONS.EMAIL_SETTINGS_RESET, {});
  return saved;
}

/** Soft-deletes every dispatch-log row ("Clear Logs"). */
export async function clearEmailDispatchLogs(): Promise<void> {
  const viewer = await requireTab(ROSTER_TABS);
  await clearDispatchLogs(viewer.userId);
  writeAudit(viewer, AUDIT_ACTIONS.EMAIL_LOGS_CLEAR, {});
}

/** "Send Test Dispatch": a real mail to the signed-in admin only; the result is the log row. */
export async function sendTestEmailNotification(trigger: unknown): Promise<EmailDispatchLog> {
  const viewer = await requireTab(ROSTER_TABS);
  const type = emailTriggerSchema.parse(trigger);
  const log = await sendTestNotification(type, {
    actor: mailActorFor(viewer),
    userId: viewer.userId,
    email: viewer.email,
  });
  writeAudit(viewer, AUDIT_ACTIONS.EMAIL_TEST_SEND, { trigger: type, status: log.status });
  return log;
}
