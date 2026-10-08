BEGIN TRY

BEGIN TRAN;

-- Port of upstream 8d885a3 + d20ca0b: SLA is removed system-wide, categories 9 -> 6,
-- anonymous-submitter mapping + anonymous chat added.
-- Hand-edit on top of prisma migrate diff: SQL Server cannot DROP COLUMN while a
-- DEFAULT constraint still depends on it, so those are dropped first.
-- No data remap for the retired categories (IT/Safety/Environment): no database
-- existed when this was written; remap Tickets.Category before applying to one that has rows.

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

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

