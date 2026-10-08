BEGIN TRY

BEGIN TRAN;

-- Port of upstream 8d885a3 + d20ca0b: SLA is removed system-wide, categories 9 -> 6,
-- anonymous-submitter mapping + anonymous chat added.
-- Hand-edited on top of `prisma migrate diff`:
--   1. STEP 1 below is a data step (the diff cannot generate it) that mirrors what upstream's
--      localStorage migrations do for the retired categories (IT / Safety / Environment) and
--      the retired `sla_warning` notification / mail template.
--   2. SQL Server cannot DROP COLUMN while a DEFAULT constraint depends on it, so the SLA
--      default constraints are dropped first.
-- DATA LOSS: the SLA columns (Tickets.SlaTargetHours/SlaDueDate/SlaStatus,
-- DepartmentGatekeeperConfigs.DefaultSlaHours) are dropped for good — intended (SLA removed).
-- Requires SQL Server 2017+ (OPENJSON / STRING_AGG).

-- ── STEP 1: data remap (before any schema change) ──────────────────────────
-- Environment -> Compliance (+ gatekeeperDepartment), exactly like upstream's getStoredTickets().
UPDATE [dbo].[Tickets]
SET [Category] = N'Compliance',
    [GatekeeperDepartment] = N'Governance, Risk & Compliance Division'
WHERE [Category] = N'Environment';

-- Root-cause category 'Environment' was renamed 'Workplace/Facilities' in src/types.ts.
UPDATE [dbo].[Tickets]
SET [RootCauseCategory] = N'Workplace/Facilities'
WHERE [RootCauseCategory] = N'Environment';

-- IT / Safety have no 6-category equivalent; upstream drops them (its tickets key bump to v5
-- discards the old store). Soft-delete (org rule: IsDeleted = 1, never hard delete) so the
-- rows stay recoverable but vanish from every query that filters IsDeleted.
UPDATE [dbo].[Tickets]
SET [IsDeleted] = 1, [IsActive] = 0
WHERE [Category] IN (N'IT', N'Safety');

-- Gatekeeper configs: upstream's getStoredGatekeeperConfigs() keeps only the 6 valid categories.
UPDATE [dbo].[GatekeeperOfficers]
SET [IsDeleted] = 1, [IsActive] = 0
WHERE [Category] IN (N'IT', N'Safety', N'Environment');

UPDATE [dbo].[DepartmentGatekeeperConfigs]
SET [IsDeleted] = 1, [IsActive] = 0
WHERE [Category] IN (N'IT', N'Safety', N'Environment');

-- Role access: strip retired categories out of AssignedDepartmentsJson (a JSON array of strings).
UPDATE [dbo].[RoleAccessConfigs]
SET [AssignedDepartmentsJson] = COALESCE(
  (
    SELECT N'[' + STRING_AGG(N'"' + j.[value] + N'"', N',') + N']'
    FROM OPENJSON([AssignedDepartmentsJson]) AS j
    WHERE j.[value] NOT IN (N'IT', N'Safety', N'Environment')
  ),
  N'[]'
)
WHERE [AssignedDepartmentsJson] IS NOT NULL
  AND ISJSON([AssignedDepartmentsJson]) = 1
  AND EXISTS (
    SELECT 1 FROM OPENJSON([AssignedDepartmentsJson]) AS r
    WHERE r.[value] IN (N'IT', N'Safety', N'Environment')
  );

-- sla_warning: no code path ever created these notifications; the mail template key is gone.
DELETE FROM [dbo].[Notifications] WHERE [Type] = N'sla_warning';
DELETE FROM [dbo].[AppSettings] WHERE [SettingKey] = N'mailTemplate:ticket.sla_warning';

-- ── STEP 2: schema changes (prisma migrate diff + the constraint drops) ─────
-- AlterTable
ALTER TABLE [dbo].[Tickets] DROP CONSTRAINT [Tickets_SlaTargetHours_df], [Tickets_SlaStatus_df];
ALTER TABLE [dbo].[Tickets] DROP COLUMN [SlaDueDate],
[SlaStatus],
[SlaTargetHours];
ALTER TABLE [dbo].[Tickets] ADD [IsAnonymousMapped] BIT NOT NULL CONSTRAINT [Tickets_IsAnonymousMapped_df] DEFAULT 0,
[LoginEmail] NVARCHAR(200);

-- AlterTable
ALTER TABLE [dbo].[DepartmentGatekeeperConfigs] DROP CONSTRAINT [DepartmentGatekeeperConfigs_DefaultSlaHours_df];
ALTER TABLE [dbo].[DepartmentGatekeeperConfigs] DROP COLUMN [DefaultSlaHours];

-- AlterTable
ALTER TABLE [dbo].[RoleAccessConfigs] ADD [CanViewAnonymousSubmitterEmail] BIT NOT NULL CONSTRAINT [RoleAccessConfigs_CanViewAnonymousSubmitterEmail_df] DEFAULT 0;

-- CreateTable
CREATE TABLE [dbo].[TicketAnonymousMessages] (
    [Id] NVARCHAR(1000) NOT NULL,
    [TicketId] NVARCHAR(1000) NOT NULL,
    [SenderRole] NVARCHAR(20) NOT NULL,
    [SenderDisplayName] NVARCHAR(200) NOT NULL,
    [Message] NVARCHAR(max) NOT NULL,
    [IsStaff] BIT NOT NULL CONSTRAINT [TicketAnonymousMessages_IsStaff_df] DEFAULT 0,
    [IsReadByEmployee] BIT NOT NULL CONSTRAINT [TicketAnonymousMessages_IsReadByEmployee_df] DEFAULT 0,
    [IsReadByStaff] BIT NOT NULL CONSTRAINT [TicketAnonymousMessages_IsReadByStaff_df] DEFAULT 0,
    [IsActive] BIT NOT NULL CONSTRAINT [TicketAnonymousMessages_IsActive_df] DEFAULT 1,
    [IsDeleted] BIT NOT NULL CONSTRAINT [TicketAnonymousMessages_IsDeleted_df] DEFAULT 0,
    [CreatedBy] NVARCHAR(1000),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [TicketAnonymousMessages_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedBy] NVARCHAR(1000),
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [TicketAnonymousMessages_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TicketAnonymousMessages_TicketId_idx] ON [dbo].[TicketAnonymousMessages]([TicketId]);

-- AddForeignKey
ALTER TABLE [dbo].[TicketAnonymousMessages] ADD CONSTRAINT [TicketAnonymousMessages_TicketId_fkey] FOREIGN KEY ([TicketId]) REFERENCES [dbo].[Tickets]([Id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- ── STEP 3: defaults for the new flag, same as upstream's INITIAL_ROLE_PERMISSIONS
-- (getStoredRolePermissions deep-merges these defaults into stored configs).
-- EXEC: the column is added earlier in this same batch, so a plain UPDATE would fail to compile.
EXEC(N'UPDATE [dbo].[RoleAccessConfigs] SET [CanViewAnonymousSubmitterEmail] = 1 WHERE [RoleKey] IN (N''executive'', N''admin'')');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

