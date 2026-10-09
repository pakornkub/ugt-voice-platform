---
paths:
  - 'lib/auth.ts'
  - 'lib/auth-client.ts'
  - 'lib/get-user-permissions.ts'
  - 'lib/permissions.ts'
  - 'lib/permissions-sync.ts'
  - 'lib/permission-group-select.ts'
  - 'lib/audit-actions.ts'
  - 'lib/actions/auth.ts'
  - 'lib/actions/admin-setup.ts'
  - 'lib/actions/admin-users.ts'
  - 'src/proxy.ts'
  - 'src/app/login/**'
  - 'src/app/admin/setup/**'
  - 'src/app/(shell)/admin/users/**'
  - 'src/app/(shell)/admin/audit-logs/**'
  - 'src/app/(shell)/layout.tsx'
---

<!-- Owned by ugt-nextjs-auth-setup — may be overwritten wholesale on /plugin update.
     ADAPTED from the skill's default asset (which assumes SSO+LDAP+Local, a
     linked-server employee directory, and an approval chain): this project is
     SSO (Keycloak)-only and has no employee directory / approval-chain
     integration. The guard is `src/proxy.ts` (src/ layout; was
     `src/middleware.ts` until the Next 16 upgrade — see
     docs/project-context/decisions.md, 2026-10-08). Sections that don't apply here (LDAP, local password/reset,
     data-scope-by-employee-code, directory enrichment, approval chain) are
     dropped rather than left describing code that doesn't exist. -->

# Auth / RBAC rules (loads when touching auth, session, or admin-section files)

## One permission system — the upstream RBAC page (2026-10-09)

Supersedes the old "two RBAC systems" rule (`docs/project-context/decisions.md`, 2026-10-09):

- The only role a user has is `user.appRole` (employee / gatekeeper / executive / admin), set on
  `/admin/users` (`assignUserAppRoleAction`; you cannot change your own).
- Which tabs a role sees — including `admin_users` and `admin_audit_logs` — comes from the
  upstream RBAC matrix (`RoleAccessConfigs.allowedTabs`, page `/admin/rbac`). Never gate a tab on
  `identity.permissions` in Navbar.
- Server guards call `getUserPermissions()`, which derives keys from `appRole`
  (`permissionsForAppRole` in `lib/get-user-permissions.ts`). Don't add new `Role`/`Permission`
  UI — those tables exist only for the `/admin/setup` bootstrap.

## SSO only — no LDAP, no local password

`lib/auth.ts` registers Keycloak via `genericOAuth`/`keycloak()`, guarded by
`env.KEYCLOAK_ISSUER && env.KEYCLOAK_CLIENT_ID && env.KEYCLOAK_CLIENT_SECRET`
so a build with `SKIP_ENV_VALIDATION=1` never crashes. `emailAndPassword` is
present but `enabled: false, disableSignUp: true` — Better Auth's Prisma
adapter still expects the `account` model to exist regardless of whether it's
used. There is no sign-up page, no `/reset-password`, no
`lib/password-policy.ts` — don't add local-account flows without a new มติ.

- Identity is the Keycloak **username** (`preferred_username`, stored as
  `user.ldapUsername`), not email — `mapProfileToUser` resolves the existing
  row by `ldapUsername` first and lets its email win, or Better Auth "creates"
  instead of "links" and dies on the unique email constraint.
- SSO user sync (setting `authType: 'sso'`, writing `login.success` to the
  audit log) happens in `lib/auth.ts`'s `databaseHooks.session.create.after`
  hook — Better Auth drops custom fields returned from `mapProfileToUser`
  itself, so enrichment must happen here, not there.
- `login.failed` is deliberately not an audit action — Keycloak owns
  credential-failure detection; the app never sees a failed bind attempt.

## Cookie prefix — keep identical across 3 files

Derived from `NEXT_PUBLIC_BASE_PATH` (`ugt-voice-platform` / `ugt-voice-platform-dev` when
deployed, empty locally — decisions.md 2026-10-09) — falls back to `'better-auth'`.

| File                  | What uses the prefix                                         |
| --------------------- | ------------------------------------------------------------ |
| `lib/auth.ts`         | `advanced.cookiePrefix` (Better Auth writes cookies with it) |
| `src/proxy.ts`        | `getSessionCookie(request, { cookiePrefix })`                |
| `lib/actions/auth.ts` | `SESSION_COOKIE_NAME` for `ssoLogoutAction`                  |

Mismatch = `ERR_TOO_MANY_REDIRECTS` in production (local never shows it
because http has no `__Secure-` prefix — `BETTER_AUTH_URL` on `https://` makes
Better Auth prepend `__Secure-`; your code must compute the same name).

## Logout clears both the cookie AND the Keycloak SSO session

`ssoLogoutAction` (`lib/actions/auth.ts`) does backchannel logout — a
server-side POST to Keycloak's `/protocol/openid-connect/logout`, never a
browser redirect through Keycloak. Non-fatal by design: if Keycloak is
unreachable, the local session still clears and the user still lands on
`/login`.

- Cookie clearing uses `cookieStore.set(name, '', { maxAge: 0, secure })` —
  **never** `cookieStore.delete()`, which omits the `Secure` flag so the
  browser silently refuses to delete a `__Secure-` prefixed cookie
  (production/https-only bug, invisible in local dev).
- Deleting the DB session requires stripping the HMAC signature from the
  cookie token first (`substring(0, lastIndexOf('.'))`) — the DB stores the
  raw token, not the signed cookie value.

## `src/proxy.ts`

- Cookie-**presence** check only (`getSessionCookie`), never
  `auth.api.getSession()` — this function runs on every non-static request; a
  DB round-trip here adds latency to every navigation and turns a DB hiccup
  into a whole-app outage. The real session check (and the `appRole` gate)
  belongs in `src/app/(shell)/layout.tsx` / `src/app/admin/setup/layout.tsx`,
  which already talk to the DB once per render.
- Always bypasses `/_next/`, static assets, `/api/auth/`, and `/api/health` —
  the health check must never bounce to `/login` or the container never goes
  healthy.
- `export const config` (the matcher) is the only export name Next.js reads —
  renaming it silently disables route protection.
- Also sets CSP + security headers (nonce-based `script-src`) on every
  response — don't strip this while touching the auth-gate logic.

## First-admin bootstrap

`isAdminInitialized()` (`lib/get-user-permissions.ts`) checks for any
`Role { isSystem: true }` row and caches a positive result for the process
lifetime (a bootstrapped system never needs re-checking, short of a restart
that already clears the cache). `/admin/setup` is reachable by anyone with a
session until that first system role exists — **never** hardcode or
pre-register a first admin; the org rule (มติ 2026-08-11) is that the first
person to log in claims it via `/admin/setup`.

## Privileged Server Actions — fixed order

```
1. session    → no session: return Unauthorized
2. permission → hasPermission(perms, PERMISSIONS.X) fails: return Forbidden
3. action     → domain checks, then the real work
4. audit log  → written after success (non-blocking, `.catch(() => {})`)
```

- Permission keys are `resource:action`, only from `lib/permissions.ts`'s
  `PERMISSIONS` — a key must have a matching `ALL_PERMISSIONS` seed entry (and
  vice versa), or it's either ungrantable or a checkbox with no consumer.
- Load permissions server-side and pass as props — never call
  `getUserPermissions` from a Client Component.
- **Hide** buttons the user lacks permission for (don't disable) — the
  Server Action guard is the real security boundary, the UI is UX only.
- `Role { isSystem: true }` cannot be deleted through any code path.

## Audit log

- Actions are `<resource>.<verb>` from `lib/audit-actions.ts`'s
  `AUDIT_ACTIONS` — never a raw string at a call site (a typo becomes a row
  nobody can filter for).
- `ActivityLog` is append-only — no UPDATE/DELETE from app code.
- Never store passwords/secrets/tokens or over-broad PII in `detail`.
- login/logout writes must be non-blocking — an audit failure must never
  break the auth flow itself.

## What this project does NOT have (don't reach for these)

- `lib/directory.ts` / org employee linked-server enrichment — no employee
  directory integration exists; `appRole` is set manually by an admin, not
  synced from HR data.
- `lib/approval-chain.ts` / `lib/scope.ts` — no approval-routing or
  employee-code-based data-scope system. The app's own department-based
  Gatekeeper scoping (`RolePermissionConfig.assignedDepartments`) is a
  separate, pre-existing mechanism — see `docs/project-context/business-rules.md`.
- `lib/password-policy.ts`, `components/forgot-password-dialog.tsx`,
  `components/reset-password-form.tsx` — no local accounts, nothing to reset.
