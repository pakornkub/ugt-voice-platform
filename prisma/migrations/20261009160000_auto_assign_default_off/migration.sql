-- Auto-assign became real on 2026-10-09 (lib/auto-assign.ts); the owner chose "off" as the default
-- (decisions.md). Existing rows go to 'off' too: the stored mode never assigned anything before, so
-- this keeps today's behaviour until an admin picks a mode on the Gatekeeper page.
BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[DepartmentGatekeeperConfigs] DROP CONSTRAINT [DepartmentGatekeeperConfigs_AutoAssignMode_df];
ALTER TABLE [dbo].[DepartmentGatekeeperConfigs] ADD CONSTRAINT [DepartmentGatekeeperConfigs_AutoAssignMode_df] DEFAULT 'off' FOR [AutoAssignMode];
UPDATE [dbo].[DepartmentGatekeeperConfigs] SET [AutoAssignMode] = 'off';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
