# Handoff

Last updated: 2026-10-09

## In progress

- Nothing in progress. Upstream port (phase 1 + 2A/2B/2C) is merged to `main` and deployed
  to **dev** (`https://ugtweb.ube.co.th/ugt-voice-platform-dev`, Jenkins
  `ugt-voice-platform-dev` #2). `origin/main` is still old (`f35e50e`) — `develop` = local `main`.

## Next

- **Owner QA on dev** (needs a real SSO login — Claude can't enter passwords): every role/tab vs
  upstream; reference text of every upstream page is in the session scratchpad
  (`upstream-capture*.json`, captured from `upstream/main` `d20ca0b`).
- **Prod deploy** = push `main` to `origin` (Jenkins `ugt-voice-platform` polls `main`) — owner's
  call. Prod DB `UGT_VoicePlatform` has never been migrated; the Deploy stage runs
  `prisma migrate deploy` itself.
- **localStorage → Server Action rewiring** (`src/services/api.ts` → `lib/actions/*`) — now
  unblocked (DEV DB `UGT_VoicePlatform_DEV` migrated + seeded 2026-10-09). Gaps beyond call-site
  swaps (full audit in `decisions.md` 2026-09-03):
  - `reset{GatekeeperConfigs,Executives,HrAdmins,RolePermissions}ToDefault` have no Server Action.
  - `get/setActiveGatekeeperDepartment` → plain React state.
  - Other ticket actions lack session/permission guards — copy `requireChatAccess` from
    `sendAnonymousChatMessage`, add gatekeeper department scoping.
  - Install `ugt-nextjs-auth-setup`'s `lib/directory.ts` on `vwHR_SC_Employee` and replace the
    mock in `src/services/employeeDirectory.ts` / `resolveLoginEmail()` (decisions 2026-10-09).
  - Email settings (`AdminEmailNotificationSettings`, localStorage) → `AppSettings` + real SMTP;
    retire `/admin/mail-templates` (decisions 2026-10-08).
- Redesign `ExportAnalyticsModal`'s SQL Query Studio as preset reports before wiring it to SQL
  Server (decided — `decisions.md`).
- OWASP stage is UNSTABLE: 10 high left need major bumps (`nodemailer` 10, `prisma`/
  `@prisma/config` → `deepmerge-ts`/`mysql2`, `eslint-config-next` → `fast-glob`/`braces`).
- `/setup-matt-pocock-skills` not run (no `docs/agents/`) — run before the first `/grill-with-docs`.

## Open Questions

- **`DATABASE_URL` uses the `sa` login** (dev + prod `.env`) — DBA/owner: create the app login
  from `docs/admin-handoff.md` §1.1 before prod.
- `.claude/settings.json` has an uncommitted change emptying `enabledPlugins` (drops
  `ugt-nextjs-standard-mattpocock@ugt`) — owner: commit or `git checkout -- .claude/settings.json`.
- `.claude/launch.json` local edits (dev server via `node --use-system-ca`, upstream preview) —
  machine-specific, not committed.
- Retention for soft-deleted attachments — no cleanup job yet. Admin/Compliance.
- Approval chain (`HR_SC_AuthorizeEmployee_ms`) not used — revisit if a workflow needs it.

## Done (newest first — older chunks condensed; full detail in git log + docs/project-context/)

- 2026-10-09 **Dev deploy green** (Jenkins `ugt-voice-platform-dev` #2, UNSTABLE only from OWASP):
  fixed Docker `COPY /app/public` (`Dockerfile` `mkdir -p public`), `npm audit fix` (high 15→10),
  vitest `testTimeout` 20s. Smoke-tested dev: `/api/health` DB ok, basePath redirects, SSO start
  (`redirect_uri` matches Keycloak client `ugt-voice-platform-dev`), CSP nonce on all scripts.
- 2026-10-09 **DEV DB live**: 5 migrations + seed on `UGT_VoicePlatform_DEV`; fixed
  `migration_lock.toml` provider (`mssql`) and `add_attachments` DROP CONSTRAINT (`83834cb`).
  HR views readable (`vwHR_SC_Employee`, `HR_SC_AuthorizeEmployee_ms`).
- 2026-10-09 **Upstream port phase 2 merged** — 2A employee UI (`416e7bf`), 2B gatekeeper/exec
  (`f69dcfc`), 2C admin + email settings (`1907060`); two-axis review each, Sonar fixes applied;
  239 tests.
- 2026-10-09 Renames/infra: app id `ugt-voice-platform` (`cc3b60c`), product **UGT VoicePlatform**
  (`213e93b`), basePath on `ugtweb.ube.co.th` (`e39901d`), ClamAV removed (`647f6be`), DB names
  `UGT_VoicePlatform[_DEV]`, no shadow DB (`15938ff`/`f35e50e`).
- 2026-10-08 Upstream port phase 1 (shared layer, `8e3b46c`); Next.js 15 → 16 (`c02b8c9`).
- 2026-09-03 Harness layer; CI/CD (`ugt-nextjs-cicd-setup`).
- 2026-09-02 Upload, mail, auth (Keycloak SSO), design scan, test/lint, database layer, Phase A
  migration Vite → Next.js App Router.
