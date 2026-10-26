# Handoff

Last updated: 2026-10-26

## In progress

- Nothing in progress — `/guide` + Next.js 16.4.3 live on DEV (#41/#42) and prod (#15, health OK).
  Owner QA of the staff view via SSO still open — see Next.

## Next

- **Portal is live on prod**: owner QA of the staff view via SSO; tell employees the new link / QR
  (`…/ugt-voice-platform/` now opens the form). Employees who filed via SSO before lose "my tickets".
- Portal follow-ups skipped for speed: "request a new secret" button, HR match badge in the inbox list,
  admin-readable (encrypted, audited) secret — owner asked for it, hash chosen for now.
- Admin-saved email settings may still read "VoicePlatform" — re-save the texts on the admin page.
- **Prod after this deploy**: turn on RBAC → "เข้าถึงกล่องข้อร้องเรียนสายตรง CEO/EVP" for **GK** (on
  DEV already) — without it direct-to-executive tickets get no Lead. Prod mail goes to real people.
- **Owner QA on prod** (SSO needs the owner; Claude can't enter passwords): roster pickers, RBAC,
  a test ticket, a CSAT rating.
- **Clean up QA data on DEV**: TK-2026-0001, -0002, -0003, -1184, -5377 (+ attachment, email log rows), and
  portal tests TK-2026-0004 (anonymous), TK-2026-0005 (`qa-portal@example.invalid`).
- **Platform PRs** #21 (DEV bar) and #22 (version skew) both claim 4.76.0 — the second to merge
  renumbers to 4.77.0. Earlier #16–#20: merge one at a time in order, renumber later versions;
  `/plugin update` only after merge + tag.
- **Gemini / PDPA**: complaint text (incl. anonymous) goes to Google Gemini when `GEMINI_API_KEY` is
  set — Compliance/DPO to confirm, or remove the key. `/api/ai/*` only checks cookie presence.
- OWASP: two reviewed suppressions (`braces`, `sprintf-js`) — remove when fixed versions ship.
- `npm audit` = 0 since 2026-10-26 via `package.json` overrides (`undici`, `vite`, `@vitest/mocker`,
  `@azure/msal-node` 7 — only under `@types/mssql`, `fast-uri` 3.1.9). Drop each override once its
  parent ships the fix; bump `vitest` itself with npm 11 (`npx npm@11 install`), npm 10.9 crashes.
- `/setup-matt-pocock-skills` has not been run; run it before the first `/grill-with-docs`.

## Open Questions

- **"6 หมวดหมู่มาตรฐาน" badge** on the submit form (`/report`, category card) — owner marked it with an
  X on a screenshot (2026-10-26); remove it? Owner to confirm.
- **Employee guide PDPA card** says submitter data is "encrypted" (`RoleGuidesSection.tsx:EmployeeGuideBody`,
  now public on `/guide`) — no encryption at rest found in `lib/`, and direct-to-CEO/EVP mail also
  reaches executives. Owner/DPO: soften the wording or confirm.

- **`DATABASE_URL` uses the `sa` login** (dev and prod) and its password was printed in Jenkins logs
  of dev builds ≤ #14 and prod build #2 (fixed since `36db572`) — DBA/owner: rotate it now and switch
  to an app login per `docs/admin-handoff.md` §1.1.
- Prod Keycloak client and prod SMTP values in `env-ugt-voice-platform` — owner to confirm with a
  real login / test send.
- Retention for soft-deleted attachments: no cleanup job yet. Owner: Admin/Compliance.
- Approval chain (`HR_SC_AuthorizeEmployee_ms`) is not used. Revisit if a workflow needs it.

## Done (newest first — older chunks condensed; full detail in git log + docs/project-context/)

- 2026-10-26 **`/guide` — employee user guide without login** (`src/app/guide/page.tsx`,
  `PublicPortal.tsx:PortalGuide` → `RoleGuidesSection.tsx:EmployeeGuideBody`, `PUBLIC_PATHS`), third tab
  in `PortalHeader`; guide text fixed to the no-login flow (chat name, code dashes, attachments);
  **Next.js 16.4.0 → 16.4.3** (critical advisories, decisions.md). Prod #14 failed the Quality Gate
  (OWASP advisories newer than #13) → `f1eb91b` nodemailer 10.2.1, zod 4.6.7, undici override,
  `SuccessScreen` prop `trackingSecret` (S6846). Prod #15 deploy `ef68fe0..f1eb91b`.
- 2026-10-21 **No-login portal** `/report` + `/track` (`PublicPortal.tsx`, `lib/public-access.ts`,
  `public-tickets.ts`, `tickets.ts:submitPublicTicket`), display name **UGT VoiceCare** — prod #13
  (`55b55a4..ef68fe0`, migration `20261021000000_public_portal`). See decisions/business-rules 10-21.
- 2026-10-15 **Architecture refactor** (behaviour unchanged: `lib/ticket-status.ts`, `server-text.ts`,
  `ticket-events.ts`, server-owned visibility, roster/RBAC rules, api.ts split) — prod #12.
- 2026-10-14 Prod test-data reset · one dispatch rule (Lead on ticket, mail every GK), CSAT +
  direct-to-executive mail, owner UI fixes — prod `e0f9dbb..489161b`.
- 2026-10-09 Go-live fixes (`a25daf0`…`4a1429e`), prod deploy `9713263..2f1e450`, bilingual TH/EN,
  rewiring slices 1–5, platform PRs #16–#20. Earlier: upstream port, Next.js 16, setup (2026-09).
