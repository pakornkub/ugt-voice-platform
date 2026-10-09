/**
 * Audit action keys — single source of truth for every string written to
 * `ActivityLogs.action` (ugt-nextjs-auth-setup, 2026-09-02).
 *
 * Naming: `<resource>.<verb>`, all lowercase, dot-separated. Never write a
 * raw string at a call site — a typo becomes a row nobody can filter for.
 *
 * Trimmed from the skill's default set for this SSO-only install: no
 * password.* actions (no local accounts), no users.create /
 * users.password-set (no local user creation — SSO rows appear on first
 * login, มติ ugt-nextjs-auth-setup §2 item 10). login.failed is also
 * omitted: Keycloak/AD own credential-failure detection, the app never sees
 * a failed bind attempt for SSO — see docs/project-context/decisions.md.
 */
export const AUDIT_ACTIONS = {
  // Authentication — written by lib/auth.ts (SSO) and lib/actions/auth.ts (logout)
  LOGIN_SUCCESS: 'login.success',
  LOGOUT: 'logout',
  LOGOUT_SSO: 'logout.sso',

  // User management — written by the retired lib/actions/admin-users.ts (kept: old rows use them)
  USERS_ROLE_ASSIGN: 'users.role-assign',
  // App-level role (employee/gatekeeper/executive/admin — tab visibility),
  // distinct from the RBAC role above (admin-section permissions). See
  // docs/project-context/decisions.md.
  USERS_APP_ROLE_ASSIGN: 'users.app-role-assign',

  // Role management — written by lib/actions/admin-roles.ts
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',

  // Mail templates — written by lib/actions/admin-mail-templates.ts
  // (ugt-nextjs-mail-setup, 2026-09-02)
  MAIL_TEMPLATES_UPDATE: 'mail-templates.update',
  MAIL_TEMPLATES_RESET: 'mail-templates.reset',

  // File attachments — written by src/app/api/files/route.ts and
  // src/app/api/files/[id]/route.ts (ugt-nextjs-upload-setup, 2026-09-02)
  FILES_UPLOAD: 'files.upload',
  FILES_DOWNLOAD: 'files.download',

  // Anonymous ticket chat — written by lib/actions/tickets.ts (upstream port, 2026-10-08)
  TICKETS_CHAT_SEND: 'tickets.chat-send',
  // Ticket workflow — written by lib/actions/tickets.ts (DB rewiring slice 1, 2026-10-09)
  TICKETS_SUBMIT: 'tickets.submit',
  TICKETS_UPDATE: 'tickets.update',
  TICKETS_EVALUATE: 'tickets.evaluate',

  // Admin config — rosters (HR admins / executives / gatekeeper officers), RBAC matrix, resets;
  // written by lib/actions/{hr-admins,executives,gatekeeper,role-access}.ts (rewiring slice 2)
  ROSTERS_UPDATE: 'rosters.update',
  RBAC_UPDATE: 'rbac.update',
  CONFIG_RESET: 'config.reset',

  // EXTENSION POINT: project-domain actions here, same `<resource>.<verb>` shape
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
