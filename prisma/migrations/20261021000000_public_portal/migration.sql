-- Public portal (no login, owner 2026-10-21): tracking secret hash, filing channel, HR match flag.
-- Existing tickets were all filed through SSO, so they take the 'sso' default.
BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[Tickets] ADD [AccessKeyHash] NVARCHAR(64),
[SubmitChannel] NVARCHAR(10) NOT NULL CONSTRAINT [Tickets_SubmitChannel_df] DEFAULT 'sso',
[HrMatchStatus] NVARCHAR(20);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
