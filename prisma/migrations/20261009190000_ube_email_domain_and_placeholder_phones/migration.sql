-- Owner decisions 2026-10-09 (decisions.md):
-- 1. `name@ube.com` (Keycloak/SSO) and `name@ube.co.th` (HR view) are one mailbox; the app stores the
--    @ube.com spelling (lib/email-identity.ts). Rewrite what is already stored. User.Email is
--    unique — a row is skipped when the @ube.com spelling already exists (lookups still treat
--    both spellings as the same person). Email dispatch logs are history and stay as written.
-- 2. The roster forms used to save upstream's fake phone numbers when the phone was left empty
--    (the HR view has no phone column). Clear exactly those placeholders; real numbers stay.
BEGIN TRY

BEGIN TRAN;

UPDATE u SET [Email] = LEFT(u.[Email], LEN(u.[Email]) - 10) + N'@ube.com'
FROM [dbo].[User] u
WHERE u.[Email] LIKE N'%@ube.co.th'
  AND NOT EXISTS (
    SELECT 1 FROM [dbo].[User] o WHERE o.[Email] = LEFT(u.[Email], LEN(u.[Email]) - 10) + N'@ube.com'
  );

UPDATE [dbo].[HrAdminMembers] SET [Email] = LEFT([Email], LEN([Email]) - 10) + N'@ube.com' WHERE [Email] LIKE N'%@ube.co.th';
UPDATE [dbo].[ExecutiveMembers] SET [Email] = LEFT([Email], LEN([Email]) - 10) + N'@ube.com' WHERE [Email] LIKE N'%@ube.co.th';
UPDATE [dbo].[GatekeeperOfficers] SET [Email] = LEFT([Email], LEN([Email]) - 10) + N'@ube.com' WHERE [Email] LIKE N'%@ube.co.th';
UPDATE [dbo].[DepartmentGatekeeperConfigs] SET [EscalationEmail] = LEFT([EscalationEmail], LEN([EscalationEmail]) - 10) + N'@ube.com' WHERE [EscalationEmail] LIKE N'%@ube.co.th';
UPDATE [dbo].[Tickets] SET [LoginEmail] = LEFT([LoginEmail], LEN([LoginEmail]) - 10) + N'@ube.com' WHERE [LoginEmail] LIKE N'%@ube.co.th';
UPDATE [dbo].[Tickets] SET [SubmitterEmail] = LEFT([SubmitterEmail], LEN([SubmitterEmail]) - 10) + N'@ube.com' WHERE [SubmitterEmail] LIKE N'%@ube.co.th';
UPDATE [dbo].[Tickets] SET [AssignedOfficerEmail] = LEFT([AssignedOfficerEmail], LEN([AssignedOfficerEmail]) - 10) + N'@ube.com' WHERE [AssignedOfficerEmail] LIKE N'%@ube.co.th';
UPDATE [dbo].[Notifications] SET [RecipientEmail] = LEFT([RecipientEmail], LEN([RecipientEmail]) - 10) + N'@ube.com' WHERE [RecipientEmail] LIKE N'%@ube.co.th';

UPDATE [dbo].[GatekeeperOfficers] SET [Phone] = NULL WHERE [Phone] = N'02-555-0000';
UPDATE [dbo].[ExecutiveMembers] SET [Phone] = NULL WHERE [Phone] = N'02-998-1000';
UPDATE [dbo].[HrAdminMembers] SET [Phone] = NULL WHERE [Phone] = N'02-998-2000';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
