-- The app role comes from the people rosters since 2026-10-09 (decisions.md). Runs after
-- 20261009120000_roster_roles_data, which copied AppRole='admin' users into HrAdminMembers.
ALTER TABLE [dbo].[User] DROP COLUMN [AppRole];
