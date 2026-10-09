---
paths:
  - 'src/services/api.ts'
  - 'lib/types/mail-templates.ts'
  - 'lib/actions/tickets.ts'
  - 'lib/actions/admin-mail-templates.ts'
---

# Email notifications — upstream settings model (project rule, not plugin-owned)

Decision 2026-10-08 (`docs/project-context/decisions.md`): email notifications follow
upstream's `AdminEmailNotificationSettings` model, which supersedes parts of
`ugt-nextjs-mail.md` for this project:

- Two triggers only — `onTicketSubmitted` (→ category Lead Gatekeeper) and `onTicketResolved`
  (→ submitter) — each `{ enabled, subject, body }` plus a `masterEnabled` switch
  (`EmailNotificationSettings` in `src/types.ts`). Tokens are single-brace `{ticketId}`,
  substituted by `interpolateEmailTemplate()`.
- **Today** it is localStorage + a simulated dispatch log (`dispatchEmailOn*` in
  `src/services/api.ts`), written client-side by `logTicketSubmittedEmail` /
  `logTicketResolvedEmail` after the ticket Server Action returns — tickets themselves are in the
  DB since slice 1 (2026-10-09), and `lib/actions/tickets.ts` sends **no** mail. In slice 3 the settings move to `AppSettings`, delivery goes
  through `lib/email.ts` `sendTemplatedMail()` from `lib/actions/tickets.ts`, and the old
  `NotificationItem['type']`-keyed templates (`ticket.new_ticket` …, editable at
  `/admin/mail-templates`) are retired.
- `ticket.sla_warning` no longer exists (SLA was removed system-wide, 2026-10-08) — don't
  re-add a template key for it.
- Never put message bodies of anonymous chat (`anonymousMessages`) into email or audit logs.
