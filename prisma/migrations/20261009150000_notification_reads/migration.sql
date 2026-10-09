BEGIN TRY

BEGIN TRAN;

-- Per-person read state for in-app notifications (2026-10-09) — replaces the shared IsRead flag.
CREATE TABLE [dbo].[NotificationReads] (
    [Id] NVARCHAR(1000) NOT NULL,
    [NotificationId] NVARCHAR(100) NOT NULL,
    [UserId] NVARCHAR(100) NOT NULL,
    [IsActive] BIT NOT NULL CONSTRAINT [NotificationReads_IsActive_df] DEFAULT 1,
    [IsDeleted] BIT NOT NULL CONSTRAINT [NotificationReads_IsDeleted_df] DEFAULT 0,
    [CreatedBy] NVARCHAR(1000),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [NotificationReads_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedBy] NVARCHAR(1000),
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [NotificationReads_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [NotificationReads_NotificationId_UserId_key] UNIQUE NONCLUSTERED ([NotificationId],[UserId])
);

CREATE NONCLUSTERED INDEX [NotificationReads_UserId_idx] ON [dbo].[NotificationReads]([UserId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
