---
paths:
  - 'lib/email.ts'
  - 'lib/email-notifications.ts'
  - 'lib/email-settings-schema.ts'
  - 'lib/actions/email-settings.ts'
  - 'lib/actions/tickets.ts'
  - 'src/services/emailDefaults.ts'
  - 'src/components/AdminEmailNotificationSettings.tsx'
---

# Email notifications — upstream settings model, delivered server-side (project rule)

Decisions 2026-10-08 / 2026-10-09 (`docs/project-context/decisions.md`): email follows upstream's
`AdminEmailNotificationSettings` model, which supersedes parts of `ugt-nextjs-mail.md` here:

- Two triggers only — `onTicketSubmitted` (→ the category's Lead Gatekeeper, else the
  department `escalationEmail`) and `onTicketResolved` (→ the submitter, on the transition into
  `resolved` only) — each `{ enabled, subject, body }` plus `masterEnabled`. Tokens are
  single-brace `{ticketId}` (`interpolateEmailTemplate` in `src/services/emailDefaults.ts`).
- Settings live in one `AppSettings` row (`email.notification-settings`, zod schema in
  `lib/email-settings-schema.ts`); every attempt writes an `EmailDispatchLogs` row
  (`sent` / `failed` / `disabled`). Actions in `lib/actions/email-settings.ts` are guarded with
  `requireTab(ROSTER_TABS)`.
- Delivery: `lib/email-notifications.ts` (`notifyTicketSubmitted` / `notifyTicketResolved`,
  fired by `lib/actions/tickets.ts` after the transaction, never awaited, never throws) →
  `lib/email.ts` `sendRenderedMail` (the admin writes the whole message, so no fixed chrome;
  dev-mode redirect still applies). The whole text is HTML-escaped; links use `APP_URL` +
  basePath, never `window.location`.
- Dev mode (`dev-mode:enable`) exists only on the dev environment (basePath ending `-dev`), never in
  production — see `permissionsFor` in `lib/get-user-permissions.ts`.
- Privacy: anonymous / confidential_restricted tickets get neutral sender labels in gatekeeper
  mail; logs and the dev banner never show an anonymous submitter's address; direct-to-executive
  tickets are not mailed to gatekeepers whose role lacks `canViewDirectCeoTickets`. Never put
  anonymous-chat message bodies into email or audit logs.
- `ticket.sla_warning` no longer exists (SLA removed 2026-10-08) — don't re-add it.
