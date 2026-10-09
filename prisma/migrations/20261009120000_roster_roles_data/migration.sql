-- Rewiring slice 2 (decisions.md 2026-10-09 "App role comes from the people rosters").
-- Data only, no schema change.

-- 1. The app role now comes from the rosters, not User.AppRole. Carry today's dropdown admins
--    into the HR-admin roster so nobody loses admin when this deploys.
INSERT INTO [dbo].[HrAdminMembers]
  ([Id], [Name], [Position], [Department], [Email], [RoleLevel], [CanManageRbac],
   [CanManageGatekeepers], [CanManageExecutives], [ReceiveSystemAlerts], [Status],
   [IsActive], [IsDeleted], [CreatedAt], [UpdatedAt])
SELECT LOWER(CONVERT(NVARCHAR(36), NEWID())), u.[Name], N'', N'', LOWER(u.[Email]), N'super_admin',
       1, 1, 1, 1, N'active', 1, 0, SYSUTCDATETIME(), SYSUTCDATETIME()
FROM [dbo].[User] u
WHERE u.[AppRole] = N'admin'
  AND NOT EXISTS (
    SELECT 1 FROM [dbo].[HrAdminMembers] h
    WHERE LOWER(h.[Email]) = LOWER(u.[Email]) AND h.[IsDeleted] = 0
  );

-- 2. The SSO admin pages joined the RBAC matrix on 2026-10-09 but the seed never listed them for
--    admin, so the "Users" / "Audit Logs" tabs were hidden once the menu read the DB.
UPDATE [dbo].[RoleAccessConfigs]
SET [AllowedTabsJson] = CASE WHEN [AllowedTabsJson] = N'[]' THEN N'["admin_users"]'
      ELSE STUFF([AllowedTabsJson], LEN([AllowedTabsJson]), 1, N',"admin_users"]') END,
    [UpdatedAt] = SYSUTCDATETIME()
WHERE [RoleKey] = N'admin' AND [AllowedTabsJson] NOT LIKE N'%"admin_users"%';

UPDATE [dbo].[RoleAccessConfigs]
SET [AllowedTabsJson] = CASE WHEN [AllowedTabsJson] = N'[]' THEN N'["admin_audit_logs"]'
      ELSE STUFF([AllowedTabsJson], LEN([AllowedTabsJson]), 1, N',"admin_audit_logs"]') END,
    [UpdatedAt] = SYSUTCDATETIME()
WHERE [RoleKey] = N'admin' AND [AllowedTabsJson] NOT LIKE N'%"admin_audit_logs"%';
