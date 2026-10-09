# Handoff

Last updated: 2026-10-09

## In progress

- **localStorage → DB rewiring, 6 slices** (1 tickets+notifications · 2 config tables + server
  permissions · 3 email settings + SMTP · 4 HR-view directory · 5 attachments · 6 SQL-studio
  presets). Slice 1 done on branch `claude/rewire-1-tickets-33274d` — awaiting coordinator merge.

## Next

- **Owner QA on dev** (needs a real SSO login — Claude can't enter passwords):
  `https://ugtweb.ube.co.th/ugt-voice-platform-dev`, every role/tab. First login → `/admin/setup`.
- **Prod deploy** = push `main` to `origin` (Jenkins `ugt-voice-platform` polls `main`) — owner's
  call (auto mode blocks Claude from deploying prod). `origin/main` is `9713263` (no SSO issuer
  fix yet); prod Keycloak client `ugt-voice-platform` must exist; app login must not be `sa`.
- **Rewiring slices 2–6** — pattern in decisions.md 2026-10-09 "slice 1" (layout loads →
  `ShellContext` → Server Action → `router.refresh()`; ticket scope in `lib/ticket-scope.ts`):
  - Slice 2, most urgent — **interim gap**: the RBAC / gatekeeper-officer / executive / HR-admin
    editors still save to localStorage, but menus, inbox scope and triage officer lists now come
    from the DB seed, so those edits do nothing until slice 2. Guard every write in
    `lib/actions/{role-access,gatekeeper,executives,hr-admins}.ts`; add `reset*ToDefault`;
    `get/setActiveGatekeeperDepartment` → React state; `getUserPermissions()` → `RoleAccessConfigs`.
  - Slice 3: email settings → `AppSettings`; real mail from `lib/actions/tickets.ts` (sends none
    today); replaces the client-side `logTicket*Email` simulation.
  - Slice 4: `lib/directory.ts` on `vwHR_SC_Employee` replaces `src/services/employeeDirectory.ts`.
  - Slice 5: real uploads — simulated attachments are **not persisted** since slice 1; make
    `lib/attachment-access.ts` reuse `ticketScopeWhere` (it has its own older rules).
  - Slice 6: SQL Query Studio → preset reports before wiring it to SQL Server.
  - Notification `IsRead` is one shared flag per row — per-user read table if it matters.
- OWASP UNSTABLE: 5 high left, all `eslint-config-next` dev-tool chain (`braces` has no fix yet).
- `/ugt-contribute`: org `ugt-nextjs-auth-setup` schema lacks `Account.Issuer` (Better Auth 1.7);
  `ugt-nextjs-upload-setup` `verify.mjs` requires ClamAV although scan is opt-in.
- `/setup-matt-pocock-skills` not run (no `docs/agents/`) — run before the first `/grill-with-docs`.

## Open Questions

- **`DATABASE_URL` uses the `sa` login** (dev + prod `.env`) — DBA/owner: app login per
  `docs/admin-handoff.md` §1.1 before prod.
- `.claude/settings.json` uncommitted change empties `enabledPlugins` (drops
  `ugt-nextjs-standard-mattpocock@ugt`) — owner: commit or `git checkout -- .claude/settings.json`.
- `.claude/launch.json` local edits (`node --use-system-ca` dev server, upstream preview) — not committed.
- Retention for soft-deleted attachments — no cleanup job yet. Admin/Compliance.
- Approval chain (`HR_SC_AuthorizeEmployee_ms`) not used — revisit if a workflow needs it.

## Done (newest first — older chunks condensed; full detail in git log + docs/project-context/)

- 2026-10-09 **Rewiring slice 1**: tickets / timeline / CSAT / anonymous chat / notifications in SQL
  Server via guarded Server Actions; server-side visibility (`lib/ticket-scope.ts`); shell data
  from the layout via `ShellContext`; ticket localStorage removed from `api.ts`.

- 2026-10-09 **Single permission system** (`ba61cc2`): upstream RBAC page governs every tab incl.
  `admin_users`/`admin_audit_logs`; `/admin/roles` + `/admin/mail-templates` retired;
  `getUserPermissions()` derives from `user.appRole`. Dev #8.
- 2026-10-09 **SSO login fixed** (`c255456`): `Account.Issuer` for Better Auth 1.7 (migration
  `20261009000000_account_issuer`, applied on DEV). Collision-free ids (`e8b934f`/`d3aca18`).
- 2026-10-09 **Upstream parity re-verified** page by page (jsdom harness vs captured upstream text);
  `alert()` + role-label button restored, Sonar a11y/dead-code fixes, nodemailer 10 (`9713263`).
- 2026-10-09 **Dev deploy green** (Jenkins `ugt-voice-platform-dev`); Docker `public/` fix,
  dependency hardening, vitest timeout. `origin/main` pushed once (`9713263`).
- 2026-10-09 **DEV DB live**: migrations + seed on `UGT_VoicePlatform_DEV`; offline-migration fixes
  (`83834cb`); HR views readable.
- 2026-10-09 **Upstream port phase 2 merged** (2A `416e7bf`, 2B `f69dcfc`, 2C `1907060`); session
  worktrees/branches cleaned up.
- 2026-10-09 Renames/infra: app id `ugt-voice-platform`, product **UGT VoicePlatform**, basePath on
  `ugtweb.ube.co.th`, ClamAV removed, DB names `UGT_VoicePlatform[_DEV]`, no shadow DB.
- 2026-10-08 Upstream port phase 1 (`8e3b46c`); Next.js 15 → 16 (`c02b8c9`).
- 2026-09-03 Harness layer; CI/CD. 2026-09-02 Upload, mail, auth, design scan, test/lint, DB,
  Phase A migration Vite → Next.js App Router.
