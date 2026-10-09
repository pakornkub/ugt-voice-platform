BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[EmailDispatchLogs] (
    [Id] NVARCHAR(1000) NOT NULL,
    [TriggerEvent] NVARCHAR(30) NOT NULL,
    [TicketId] NVARCHAR(100),
    [TrackingCode] NVARCHAR(30) NOT NULL,
    [RecipientEmail] NVARCHAR(200) NOT NULL,
    [RecipientName] NVARCHAR(200) NOT NULL,
    [RecipientRole] NVARCHAR(20) NOT NULL,
    [Subject] NVARCHAR(1000) NOT NULL,
    [Body] NVARCHAR(max) NOT NULL,
    [Status] NVARCHAR(20) NOT NULL,
    [DeliveryChannel] NVARCHAR(200),
    [ErrorMessage] NVARCHAR(1000),
    [IsActive] BIT NOT NULL CONSTRAINT [EmailDispatchLogs_IsActive_df] DEFAULT 1,
    [IsDeleted] BIT NOT NULL CONSTRAINT [EmailDispatchLogs_IsDeleted_df] DEFAULT 0,
    [CreatedBy] NVARCHAR(1000),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [EmailDispatchLogs_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedBy] NVARCHAR(1000),
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [EmailDispatchLogs_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [EmailDispatchLogs_CreatedAt_idx] ON [dbo].[EmailDispatchLogs]([CreatedAt]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

