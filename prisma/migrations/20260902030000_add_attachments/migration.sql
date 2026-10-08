-- Real file attachments for UGT VoiceCare, generated offline (no live SQL
-- Server available at authoring time — see docs/admin-handoff.md) via:
--   npx prisma migrate diff --from-schema <git HEAD's prior schema.prisma> \
--     --to-schema prisma/schema.prisma --script
-- Drops the `Tickets.AttachmentsJson` bridging column (see the prior
-- migrations' schemas) and adds the real `Attachments` table
-- (ugt-nextjs-upload-setup, 2026-09-02) — see
-- docs/project-context/decisions.md for why linking is a real FK
-- (`TicketId` + optional `TimelineLogId`) rather than the skill's default
-- polymorphic entityType/entityId shape.
--
-- Once real DATABASE_URL/SHADOW_DATABASE_URL values land in .env.local, mark
-- this migration as already applied rather than replaying it through
-- `migrate dev`:
--   npx prisma migrate resolve --applied 20260902030000_add_attachments
--   npx prisma generate
-- Then continue with `npx prisma migrate dev --name <next-change>` as normal
-- for every schema change after this one.

BEGIN TRY

BEGIN TRAN;

-- AlterTable
-- SQL Server refuses DROP COLUMN while a DEFAULT constraint depends on it.
ALTER TABLE [dbo].[Tickets] DROP CONSTRAINT [Tickets_AttachmentsJson_df];
ALTER TABLE [dbo].[Tickets] DROP COLUMN [AttachmentsJson];

-- CreateTable
CREATE TABLE [dbo].[Attachments] (
    [Id] NVARCHAR(1000) NOT NULL,
    [TicketId] NVARCHAR(1000) NOT NULL,
    [TimelineLogId] NVARCHAR(1000),
    [StorageKey] NVARCHAR(300) NOT NULL,
    [FileName] NVARCHAR(255) NOT NULL,
    [ContentType] NVARCHAR(150) NOT NULL,
    [FileSize] INT NOT NULL,
    [Checksum] NVARCHAR(64) NOT NULL,
    [ScanStatus] NVARCHAR(20) NOT NULL CONSTRAINT [Attachments_ScanStatus_df] DEFAULT 'clean',
    [ScanSignature] NVARCHAR(200),
    [ScannedAt] DATETIME2,
    [IsActive] BIT NOT NULL CONSTRAINT [Attachments_IsActive_df] DEFAULT 1,
    [IsDeleted] BIT NOT NULL CONSTRAINT [Attachments_IsDeleted_df] DEFAULT 0,
    [CreatedBy] NVARCHAR(1000),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [Attachments_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedBy] NVARCHAR(1000),
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Attachments_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Attachments_StorageKey_key] UNIQUE NONCLUSTERED ([StorageKey])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Attachments_TicketId_idx] ON [dbo].[Attachments]([TicketId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Attachments_TimelineLogId_idx] ON [dbo].[Attachments]([TimelineLogId]);

-- AddForeignKey
ALTER TABLE [dbo].[Attachments] ADD CONSTRAINT [Attachments_TicketId_fkey] FOREIGN KEY ([TicketId]) REFERENCES [dbo].[Tickets]([Id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Attachments] ADD CONSTRAINT [Attachments_TimelineLogId_fkey] FOREIGN KEY ([TimelineLogId]) REFERENCES [dbo].[TicketTimelineLogs]([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
