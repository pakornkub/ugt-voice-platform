-- Better Auth >= 1.7 requires Account.Issuer (account identity scoped by issuer).
-- Without it the OAuth callback fails with internal_server_error. Account is
-- empty in every environment (no successful login yet), so NOT NULL is safe.
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Account] ADD [Issuer] NVARCHAR(450) NOT NULL;

-- CreateIndex
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_Issuer_AccountId_key] UNIQUE NONCLUSTERED ([Issuer], [AccountId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

