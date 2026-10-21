# Handoff

Last updated: 2026-10-21

## In progress

- **No-login portal + rename to UGT VoiceCare** merged to `develop` and `main` 2026-10-21 (owner: "merge
  เข้า dev และ prd"; `/code-review` run, fixes: whole-name HR match, last X-Forwarded-For hop, docs).
  Prod deploy runs migration `20261021000000_public_portal` (DEV already has it). Next: confirm both
  Jenkins builds green + health; owner QA of the staff view via SSO (HR match badge, portal anonymous card).

## Next

- **Prod after the portal ships**: the deploy runs the migration; tell employees the new link / QR
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
- `/setup-matt-pocock-skills` has not been run; run it before the first `/grill-with-docs`.

## Open Questions

- **`DATABASE_URL` uses the `sa` login** (dev and prod) and its password was printed in Jenkins logs
  of dev builds ≤ #14 and prod build #2 (fixed since `36db572`) — DBA/owner: rotate it now and switch
  to an app login per `docs/admin-handoff.md` §1.1.
- Prod Keycloak client and prod SMTP values in `env-ugt-voice-platform` — owner to confirm with a
  real login / test send.
- Retention for soft-deleted attachments: no cleanup job yet. Owner: Admin/Compliance.
- Approval chain (`HR_SC_AuthorizeEmployee_ms`) is not used. Revisit if a workflow needs it.

## Done (newest first — older chunks condensed; full detail in git log + docs/project-context/)

- 2026-10-21 **No-login portal** `/report` + `/track` (`src/components/PublicPortal.tsx`,
  `lib/public-access.ts`, `lib/actions/public-tickets.ts`, `tickets.ts:submitPublicTicket`,
  `requireTicketActor`, `fileCaller`), DEV mail safeguard, login hero hidden on phones; display name
  **UGT VoiceCare**. 1260+ tests. See decisions.md / business-rules.md 2026-10-21.
- 2026-10-15 **Prod deploy** of the refactor (`489161b..55b55a4`, build #12, health OK).
- 2026-10-15 **Architecture refactor** (owner: all 6 review items, behaviour unchanged): `lib/ticket-status.ts`,
  `lib/server-text.ts`, `lib/ticket-events.ts`, server-owned visibility (`ticket.view`, bell audience in
  `isNotificationForViewer`), `lib/roster-rules.ts` + `lib/role-access-rules.ts`, api.ts split. 1229 tests.
  Upstream-parity deviation recorded in decisions.md.
- 2026-10-14 Prod test-data reset (codes `X-TK-…`, counter → 0) · prod deploy `e0f9dbb..489161b`: one
  dispatch rule (Lead on ticket, mail every GK), owner UI fixes, CSAT + direct-to-executive mail.
- 2026-10-09 **Owner fixes after go-live** (`a25daf0`…`4a1429e`): reference-data migration, DEV bar,
  HR search, chat notifications, @ube.com emails, TK-YYYY-0001 numbers, version-skew handling.
- 2026-10-09 **Prod deploy** (`9713263..2f1e450`, 42 commits) · every screen bilingual TH/EN (`87929b7`).
- 2026-10-09 Rewiring slices 1–5, single permission system, SSO issuer fix, platform PRs #16–#20.
- 2026-10-08 Upstream port phase 1/2, Next.js 16. Earlier: harness, CI/CD, setup chunks (2026-09).
