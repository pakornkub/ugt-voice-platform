-- Owner decision 2026-10-09 (decisions.md): auto-assign defaults to Lead Manual (upstream's
-- "recommended" mode) — supersedes 20261009160000_auto_assign_default_off. Every category goes to
-- lead_manual; the new-ticket email goes to the assignee (the Lead here), so nothing else changes.
BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[DepartmentGatekeeperConfigs] DROP CONSTRAINT [DepartmentGatekeeperConfigs_AutoAssignMode_df];
ALTER TABLE [dbo].[DepartmentGatekeeperConfigs] ADD CONSTRAINT [DepartmentGatekeeperConfigs_AutoAssignMode_df] DEFAULT 'lead_manual' FOR [AutoAssignMode];
UPDATE [dbo].[DepartmentGatekeeperConfigs] SET [AutoAssignMode] = 'lead_manual';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
