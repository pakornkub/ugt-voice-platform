# Handoff

Last updated: 2026-10-09

## In progress

- Nothing in progress. `main` = `develop` = prod (`2f1e450`, pushed 2026-10-09; Jenkins
  `ugt-voice-platform` deploys it). Dev build #20 green, Quality Gate OK (`new_violations` 0).
- Migrations applied on DEV, and run on prod by the deploy: `account_issuer`, `roster_roles_data`,
  `email_dispatch_logs`, `drop_user_app_role`, `notification_reads`, `auto_assign_default_off`,
  `auto_assign_default_lead` (all `20261009*`).

## Next

- **Owner QA on prod** (SSO login needs the owner; Claude can't enter passwords — the auto-mode
  classifier also blocks Claude from starting SSO on prod): first login → `/admin/setup`, then
  roster pickers, RBAC, a test ticket. Prod mail goes to real people (no dev mode).
- **Clean up QA data on DEV**: tickets TK-2026-5377 and TK-2026-1184 (+ attachment, email log rows).
- **Platform PRs** pakornkub/ugt-claude-platform #16–#20 — merge one at a time in that order and
  renumber the later versions (all bump from 4.73.0); `/plugin update` only after merge + tag.
- **Gemini / PDPA**: complaint text (incl. anonymous) goes to Google Gemini when `GEMINI_API_KEY` is
  set — Compliance/DPO to confirm, or remove the key. `/api/ai/*` only checks cookie presence (no
  real session, no rate limit) — small hardening task if wanted.
- OWASP: two reviewed suppressions (`braces`, `sprintf-js`) — remove when fixed versions ship.
- `/setup-matt-pocock-skills` has not been run; run it before the first `/grill-with-docs`.

## Open Questions

- **`DATABASE_URL` uses the `sa` login** (dev and prod) and its password was printed in Jenkins logs
  of dev builds ≤ #14 and prod build #2 (fixed since `36db572`) — DBA/owner: rotate it now and switch
  to an app login per `docs/admin-handoff.md` §1.1.
- Prod Keycloak client `ugt-voice-platform` and prod SMTP values in `env-ugt-voice-platform` —
  unverified by Claude; owner to confirm with a real login / test send.
- `.claude/settings.json` (empties `enabledPlugins`) and `.claude/launch.json` local edits — not
  committed; owner: commit or `git checkout --` them.
- Retention for soft-deleted attachments: no cleanup job yet. Owner: Admin/Compliance.
- Approval chain (`HR_SC_AuthorizeEmployee_ms`) is not used. Revisit if a workflow needs it.

## Done (newest first — older chunks condensed; full detail in git log + docs/project-context/)

- 2026-10-09 **Prod deploy**: `main` pushed (`9713263..2f1e450`, 42 commits).
- 2026-10-09 **Every screen bilingual TH/EN** (`87929b7`, Sonar fix `2f1e450`): admin pages,
  manual, inbox, report, export/SQL Studio, login/setup language switch; stored Thai server text
  mapped by `src/services/serverText.ts`; AI routes answer in the UI language. Thai output unchanged.
- 2026-10-09 **Auto-assign real** (`88af630`, `beda23d`): `lib/auto-assign.ts` per category mode
  (off / lead_manual default / round_robin / workload_balanced); new-ticket mail → assignee, CC Lead.
  Verified live on DEV (TK-2026-1184 → HR Lead, System timeline row, mail Sent).
- 2026-10-09 **Platform PRs** #16–#20 opened (login loop, Account.Issuer, no concurrent deploys,
  upload verify without scan, OWASP dev-chain suppressions); entries removed from troubleshooting.md.
- 2026-10-09 **Tech debt + docs** (`672b2a7`, `744232d`, `9bbce0e`): HR badge AD-login match,
  `EmployeeSubmitForm` split, Sonar fixes, manual + admin-handoff updated. Jenkins:
  `disableConcurrentBuilds`, migrate step no longer prints `DATABASE_URL` (`36db572`).
- 2026-10-09 **Rewiring slices 1–5** (`20f0c7b`, `a495462`, `211b19c`, `53bf56a`, `805975d`):
  tickets/notifications, roster roles, email + dispatch log, attachments, preset reports in SQL Server.
- 2026-10-09 Single permission system (`ba61cc2`), SSO issuer fix (`c255456`), dev deploy green.
- 2026-10-08 Upstream port phase 1/2, Next.js 16. Earlier: harness, CI/CD, setup chunks (2026-09).
