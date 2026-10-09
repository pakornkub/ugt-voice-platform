# Handoff

Last updated: 2026-10-09

## In progress

- Nothing in progress. The localStorage → SQL Server rewiring is complete (slices 1–5). Everything
  is on `main` and pushed to `develop` (dev deploy).
- Dev deploy runs four migrations in order:
  - `20261009120000_roster_roles_data`
  - `20261009130000_email_dispatch_logs`
  - `20261009140000_drop_user_app_role`
  - `20261009150000_notification_reads`

## Next

- **Owner QA on dev** (needs a real SSO login; Claude can't enter passwords) at
  `https://ugtweb.ube.co.th/ugt-voice-platform-dev`:
  - roster pickers and HR badges, and the `/admin/users` source column
  - submit with real attachments, then download them from the tracking modal
  - email settings, a test send, and the dispatch log
  - SQL Query Studio preset reports
  - per-person notification badges
  - Dev mode is on for every role on dev, so all workflow mail comes back to the actor.
- **Prod deploy** = push `main` to `origin` (Jenkins `ugt-voice-platform`). This is the owner's
  call; auto mode blocks Claude from deploying prod. Before the deploy:
  - The prod Keycloak client `ugt-voice-platform` must exist.
  - The app DB login must not be `sa`.
  - SMTP settings must be set in `env-ugt-voice-platform`.
  - In prod, dev mode is off, so mail goes to real people.
- **OWASP UNSTABLE:** high findings left in the `eslint-config-next` dev-tool chain (`braces` has no
  fix yet).
- **`/ugt-contribute`** (needs the owner's OK, opens PRs on the platform repo):
  - auth-setup schema lacks `Account.Issuer` (Better Auth 1.7)
  - upload-setup `verify.mjs` requires ClamAV although scanning is opt-in
  - proxy `/login` redirect on cookie presence loops on a stale cookie
- **Remaining Sonar debt** (pre-existing, outside the gate): `EmployeeSubmitForm` component
  complexity, plus a few upstream a11y items.
- **`/setup-matt-pocock-skills`** has not been run; run it before the first `/grill-with-docs`.

## Open Questions

- **`DATABASE_URL` uses the `sa` login** (dev and prod `.env`). DBA/owner: create an app login per
  `docs/admin-handoff.md` §1.1 before prod.
- `.claude/settings.json` has an uncommitted change that empties `enabledPlugins`. Owner: commit
  it, or run `git checkout -- .claude/settings.json`.
- `.claude/launch.json` has local edits (`node --use-system-ca` dev server); not committed.
- Retention for soft-deleted attachments: no cleanup job yet. Owner: Admin/Compliance.
- Approval chain (`HR_SC_AuthorizeEmployee_ms`) is not used. Revisit if a workflow needs it.

## Done (newest first — older chunks condensed; full detail in git log + docs/project-context/)

- 2026-10-09 **Slice 4, real attachments** (`53bf56a`):
  - Picker in the submit form; files upload after the ticket exists.
  - Tracking modal shows guarded download links.
  - Upload route checks Origin and Content-Length.
  - Per-person notification reads (`0502a6c`); `User.AppRole` dropped.
- 2026-10-09 **Slice 3, email** (`211b19c`, review fixes `0390502`):
  - Settings in `AppSettings`; `EmailDispatchLogs` table.
  - Real SMTP via `lib/email-notifications.ts`.
  - Dev mode on the dev environment only.
- 2026-10-09 **Slice 5, SQL Query Studio** (`805975d`): five server-side preset reports; sql.js
  removed.
- 2026-10-09 **Sonar / a11y debt** (`98acc71`, `fbdde98`, `b469d7c`): labels, dialogs,
  `SatisfactionModal` split, memoized shell context, deprecated `FormEvent` → `SubmitEvent`. Quality
  Gate OK on dev.
- 2026-10-09 **Slice 2, roles from the people rosters** (`a495462`, `49eea9a`): HR-view pickers,
  guarded roster/RBAC actions, read-only `/admin/users`.
- 2026-10-09 **Slice 1, tickets + notifications in SQL Server** (`20f0c7b`). Responsive header/pills
  (`d0900d3`, `40e43f3`); stale-cookie login loop fixed.
- 2026-10-09 **Single permission system** (`ba61cc2`). SSO issuer fix (`c255456`). Dev deploy
  green; DEV DB live.
- 2026-10-09 **Upstream port phase 2** merged. Renames/infra:
  - App id `ugt-voice-platform`; basePath on `ugtweb.ube.co.th`.
  - ClamAV removed.
  - DB names `UGT_VoicePlatform[_DEV]`.
- 2026-10-08 Upstream port phase 1 (`8e3b46c`); Next.js 15 → 16 (`c02b8c9`). Earlier: harness, CI/CD,
  setup chunks, Vite → Next.js migration (2026-09).
