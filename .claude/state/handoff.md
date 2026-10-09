# Handoff

Last updated: 2026-10-09

## In progress

- Nothing in progress. Rewiring slices 1 and 2 are merged on `main`. Next: check the dev deploy. Push
  `develop`, and Jenkins runs `prisma migrate deploy`, including the data migration
  `20261009120000_roster_roles_data`. That migration copies today's `AppRole=admin` users into
  `HrAdminMembers`; until it runs, those users resolve to `employee`.

## Next

- **Owner QA on dev** (needs a real SSO login; Claude can't enter passwords):
  `https://ugtweb.ube.co.th/ugt-voice-platform-dev`. Check every role and tab, the roster pickers
  (HR view), the `/admin/users` source column, and the submit-form prefill.
- **Prod deploy** = push `main` to `origin` (Jenkins `ugt-voice-platform` polls `main`). This is the
  owner's call; auto mode blocks Claude from deploying prod. `origin/main` is `9713263`. Before the
  deploy: the prod Keycloak client `ugt-voice-platform` must exist, and the app login must not be `sa`.
- **Rewiring slices 3–5** (`src/services/api.ts` → `lib/actions/*`; the UX stays upstream's). The
  pattern is layout → `ShellContext` → Server Action → `router.refresh()`:
  - **Slice 3, email:** `AdminEmailNotificationSettings` → `AppSettings` + real SMTP (`lib/email.ts`)
    - dispatch log. `lib/actions/tickets.ts` sends no mail yet. The simulated log still reads
      gatekeeper configs from localStorage (`getStoredGatekeeperConfigs`).
  - **Slice 4, attachments:** `FileUpload` in the submit form and the timeline. Upload and download
    are already scoped to tickets the caller can see (`lib/attachment-access.ts`).
  - **Slice 5, SQL Query Studio:** preset reports before wiring it to SQL Server.
  - Notification `IsRead` is one shared flag per row; add a per-user read table if it matters.
  - Drop the unread `User.AppRole` column once prod has run the roster data migration.
- **Server Action errors are masked in production**, so the UI pre-checks lock-out cases itself.
  Keep that pattern for new error codes.
- **OWASP UNSTABLE:** 5 high findings left, all in the `eslint-config-next` dev-tool chain (`braces`
  has no fix yet).
- **`/ugt-contribute`:**
  - The org `ugt-nextjs-auth-setup` schema lacks `Account.Issuer` (Better Auth 1.7).
  - The `ugt-nextjs-upload-setup` `verify.mjs` requires ClamAV although scanning is opt-in.
- **`/setup-matt-pocock-skills`** has not been run (no `docs/agents/`). Run it before the first
  `/grill-with-docs`.

## Open Questions

- **`DATABASE_URL` uses the `sa` login** (dev and prod `.env`). DBA/owner: create an app login per
  `docs/admin-handoff.md` §1.1 before prod.
- `.claude/settings.json` has an uncommitted change that empties `enabledPlugins` (drops
  `ugt-nextjs-standard-mattpocock@ugt`). Owner: commit it or run
  `git checkout -- .claude/settings.json`.
- `.claude/launch.json` has local edits (`node --use-system-ca` dev server, upstream preview); not
  committed.
- Retention for soft-deleted attachments: no cleanup job yet. Owner: Admin/Compliance.
- Approval chain (`HR_SC_AuthorizeEmployee_ms`) is not used. Revisit if a workflow needs it.

## Done (newest first — older chunks condensed; full detail in git log + docs/project-context/)

- 2026-10-09 **Rewiring slice 2: roles come from the people rosters** (`a495462` + follow-up).
  - Role order is HR admin > executive > GK officer > employee (`lib/roster-role.ts`), resolved per
    request.
  - The HR view (`lib/directory.ts`) feeds the roster pickers, HR badges and the submit-form prefill.
  - Roster/RBAC actions are guarded (`lib/tab-guard.ts`, lock-out rules); `/admin/users` is
    read-only.
  - Attachments are scoped like tickets; mock `employeeDirectory.ts` removed.
  - Reviewed on two axes. Rendered text is identical to before (old-vs-new render diff).
- 2026-10-09 **Rewiring slice 1: tickets and notifications in SQL Server** (`20f0c7b`).
  - Guarded Server Actions with server-side scope and identity redaction (`lib/ticket-scope.ts`);
    shell data comes from `ShellContext`.
  - Same day: responsive header, pills and heroes (`d0900d3`, `40e43f3`); stale-cookie login loop
    fixed.
- 2026-10-09 **Single permission system** (`ba61cc2`): the upstream RBAC page governs every tab;
  `/admin/roles` and `/admin/mail-templates` retired.
- 2026-10-09 **SSO login fixed** (`c255456`): `Account.Issuer` for Better Auth 1.7 (migration
  `20261009000000_account_issuer`).
- 2026-10-09 **Upstream parity re-verified** page by page; nodemailer 10 (`9713263`).
- 2026-10-09 **Dev deploy green** (Jenkins `ugt-voice-platform-dev`). `origin/main` pushed once
  (`9713263`).
- 2026-10-09 **DEV DB live**: migrations + seed on `UGT_VoicePlatform_DEV` (`83834cb`).
- 2026-10-09 **Upstream port phase 2 merged** (2A `416e7bf`, 2B `f69dcfc`, 2C `1907060`).
- 2026-10-09 **Renames/infra**:
  - App id `ugt-voice-platform`, product name **UGT VoicePlatform**.
  - basePath on `ugtweb.ube.co.th`.
  - ClamAV removed.
  - DB names `UGT_VoicePlatform[_DEV]`; no shadow DB.
- 2026-10-08 Upstream port phase 1 (`8e3b46c`); Next.js 15 → 16 (`c02b8c9`). Earlier: harness, CI/CD,
  setup chunks, Vite → Next.js migration (2026-09).
