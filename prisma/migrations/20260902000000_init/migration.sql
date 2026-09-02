-- Initial schema for UGT VoiceCare, generated offline (no live SQL Server
-- available at authoring time — see docs/admin-handoff.md) via:
--   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
-- Once real DATABASE_URL/SHADOW_DATABASE_URL values land in .env.local, mark
-- this migration as already applied rather than replaying it through
-- `migrate dev` (which would try to diff against an empty shadow DB and
-- regenerate an equivalent script anyway):
--   npx prisma migrate resolve --applied 20260902000000_init
--   npx prisma generate
-- Then continue with `npx prisma migrate dev --name <next-change>` as normal
-- for every schema change after this one.

BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[Tickets] (
    [Id] NVARCHAR(1000) NOT NULL,
    [TrackingCode] NVARCHAR(20) NOT NULL,
    [Type] NVARCHAR(20) NOT NULL,
    [Category] NVARCHAR(30) NOT NULL,
    [Title] NVARCHAR(500) NOT NULL,
    [Description] NVARCHAR(max) NOT NULL,
    [LocationOrUnit] NVARCHAR(300),
    [IsDirectToExecutive] BIT NOT NULL CONSTRAINT [Tickets_IsDirectToExecutive_df] DEFAULT 0,
    [Confidentiality] NVARCHAR(30) NOT NULL CONSTRAINT [Tickets_Confidentiality_df] DEFAULT 'confidential_restricted',
    [SubmitterName] NVARCHAR(200),
    [SubmitterEmployeeId] NVARCHAR(50),
    [SubmitterDepartment] NVARCHAR(300),
    [SubmitterEmail] NVARCHAR(200),
    [SubmitterPhone] NVARCHAR(50),
    [GatekeeperDepartment] NVARCHAR(300) NOT NULL,
    [AssignedOfficerName] NVARCHAR(200),
    [AssignedOfficerEmail] NVARCHAR(200),
    [SlaTargetHours] INT NOT NULL CONSTRAINT [Tickets_SlaTargetHours_df] DEFAULT 48,
    [SlaDueDate] DATETIME2 NOT NULL,
    [SlaStatus] NVARCHAR(30) NOT NULL CONSTRAINT [Tickets_SlaStatus_df] DEFAULT 'on_track',
    [Status] NVARCHAR(30) NOT NULL CONSTRAINT [Tickets_Status_df] DEFAULT 'submitted',
    [Urgency] NVARCHAR(20) NOT NULL CONSTRAINT [Tickets_Urgency_df] DEFAULT 'Medium',
    [RiskSeverity] NVARCHAR(20) NOT NULL CONSTRAINT [Tickets_RiskSeverity_df] DEFAULT 'Moderate',
    [Sentiment] NVARCHAR(50),
    [ClusterGroup] NVARCHAR(300),
    [RootCauseCategory] NVARCHAR(50),
    [RootCauseSummary] NVARCHAR(max),
    [PreventiveActionPlan] NVARCHAR(max),
    [ResolutionSummary] NVARCHAR(max),
    [ResolvedAt] DATETIME2,
    [ClosedAt] DATETIME2,
    [AttachmentsJson] NVARCHAR(max) CONSTRAINT [Tickets_AttachmentsJson_df] DEFAULT '[]',
    [IsActive] BIT NOT NULL CONSTRAINT [Tickets_IsActive_df] DEFAULT 1,
    [IsDeleted] BIT NOT NULL CONSTRAINT [Tickets_IsDeleted_df] DEFAULT 0,
    [CreatedBy] NVARCHAR(1000),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [Tickets_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedBy] NVARCHAR(1000),
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Tickets_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Tickets_TrackingCode_key] UNIQUE NONCLUSTERED ([TrackingCode])
);

-- CreateTable
CREATE TABLE [dbo].[TicketTimelineLogs] (
    [Id] NVARCHAR(1000) NOT NULL,
    [TicketId] NVARCHAR(1000) NOT NULL,
    [Status] NVARCHAR(30) NOT NULL,
    [Action] NVARCHAR(500) NOT NULL,
    [Actor] NVARCHAR(200) NOT NULL,
    [ActorRole] NVARCHAR(50) NOT NULL,
    [Notes] NVARCHAR(max),
    [AttachmentName] NVARCHAR(300),
    [IsAutomated] BIT NOT NULL CONSTRAINT [TicketTimelineLogs_IsAutomated_df] DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [TicketTimelineLogs_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TicketTimelineLogs_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[TicketEvaluations] (
    [Id] NVARCHAR(1000) NOT NULL,
    [TicketId] NVARCHAR(1000) NOT NULL,
    [OverallScore] INT NOT NULL,
    [SpeedRating] INT NOT NULL CONSTRAINT [TicketEvaluations_SpeedRating_df] DEFAULT 5,
    [ResolutionQualityRating] INT NOT NULL CONSTRAINT [TicketEvaluations_ResolutionQualityRating_df] DEFAULT 5,
    [ServiceMannerRating] INT NOT NULL CONSTRAINT [TicketEvaluations_ServiceMannerRating_df] DEFAULT 5,
    [ClarityRating] INT NOT NULL CONSTRAINT [TicketEvaluations_ClarityRating_df] DEFAULT 5,
    [IsResolvedPermanently] BIT NOT NULL CONSTRAINT [TicketEvaluations_IsResolvedPermanently_df] DEFAULT 1,
    [FeedbackComment] NVARCHAR(max),
    [ImprovementSuggestions] NVARCHAR(max),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [TicketEvaluations_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TicketEvaluations_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [TicketEvaluations_TicketId_key] UNIQUE NONCLUSTERED ([TicketId])
);

-- CreateTable
CREATE TABLE [dbo].[DepartmentGatekeeperConfigs] (
    [Id] NVARCHAR(1000) NOT NULL,
    [Category] NVARCHAR(30) NOT NULL,
    [DepartmentName] NVARCHAR(300) NOT NULL,
    [DepartmentCode] NVARCHAR(50) NOT NULL,
    [DefaultSlaHours] INT NOT NULL CONSTRAINT [DepartmentGatekeeperConfigs_DefaultSlaHours_df] DEFAULT 48,
    [AutoAssignMode] NVARCHAR(30) NOT NULL CONSTRAINT [DepartmentGatekeeperConfigs_AutoAssignMode_df] DEFAULT 'lead_manual',
    [EscalationEmail] NVARCHAR(200),
    [NotificationWebhookUrl] NVARCHAR(500),
    [IsActive] BIT NOT NULL CONSTRAINT [DepartmentGatekeeperConfigs_IsActive_df] DEFAULT 1,
    [IsDeleted] BIT NOT NULL CONSTRAINT [DepartmentGatekeeperConfigs_IsDeleted_df] DEFAULT 0,
    [CreatedBy] NVARCHAR(1000),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DepartmentGatekeeperConfigs_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedBy] NVARCHAR(1000),
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DepartmentGatekeeperConfigs_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [DepartmentGatekeeperConfigs_Category_key] UNIQUE NONCLUSTERED ([Category])
);

-- CreateTable
CREATE TABLE [dbo].[GatekeeperOfficers] (
    [Id] NVARCHAR(1000) NOT NULL,
    [Category] NVARCHAR(30) NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [RoleTitle] NVARCHAR(300) NOT NULL,
    [Email] NVARCHAR(200) NOT NULL,
    [Phone] NVARCHAR(50),
    [IsLead] BIT NOT NULL CONSTRAINT [GatekeeperOfficers_IsLead_df] DEFAULT 0,
    [AvatarUrl] NVARCHAR(500),
    [IsActive] BIT NOT NULL CONSTRAINT [GatekeeperOfficers_IsActive_df] DEFAULT 1,
    [IsDeleted] BIT NOT NULL CONSTRAINT [GatekeeperOfficers_IsDeleted_df] DEFAULT 0,
    [CreatedBy] NVARCHAR(1000),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [GatekeeperOfficers_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedBy] NVARCHAR(1000),
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [GatekeeperOfficers_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[ExecutiveMembers] (
    [Id] NVARCHAR(1000) NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [Position] NVARCHAR(400) NOT NULL,
    [Department] NVARCHAR(300) NOT NULL,
    [Email] NVARCHAR(200) NOT NULL,
    [Phone] NVARCHAR(50),
    [RoleType] NVARCHAR(30) NOT NULL,
    [IsPrimaryWhistleblowerReceiver] BIT NOT NULL CONSTRAINT [ExecutiveMembers_IsPrimaryWhistleblowerReceiver_df] DEFAULT 0,
    [CanViewConfidentialIdentities] BIT NOT NULL CONSTRAINT [ExecutiveMembers_CanViewConfidentialIdentities_df] DEFAULT 0,
    [ReceiveAlertNotifications] BIT NOT NULL CONSTRAINT [ExecutiveMembers_ReceiveAlertNotifications_df] DEFAULT 1,
    [AssignedCommitteesJson] NVARCHAR(max) CONSTRAINT [ExecutiveMembers_AssignedCommitteesJson_df] DEFAULT '[]',
    [Status] NVARCHAR(20) NOT NULL CONSTRAINT [ExecutiveMembers_Status_df] DEFAULT 'active',
    [IsActive] BIT NOT NULL CONSTRAINT [ExecutiveMembers_IsActive_df] DEFAULT 1,
    [IsDeleted] BIT NOT NULL CONSTRAINT [ExecutiveMembers_IsDeleted_df] DEFAULT 0,
    [CreatedBy] NVARCHAR(1000),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [ExecutiveMembers_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedBy] NVARCHAR(1000),
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ExecutiveMembers_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[HrAdminMembers] (
    [Id] NVARCHAR(1000) NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [Position] NVARCHAR(400) NOT NULL,
    [Department] NVARCHAR(300) NOT NULL,
    [Email] NVARCHAR(200) NOT NULL,
    [Phone] NVARCHAR(50),
    [RoleLevel] NVARCHAR(30) NOT NULL,
    [CanManageRbac] BIT NOT NULL CONSTRAINT [HrAdminMembers_CanManageRbac_df] DEFAULT 0,
    [CanManageGatekeepers] BIT NOT NULL CONSTRAINT [HrAdminMembers_CanManageGatekeepers_df] DEFAULT 0,
    [CanManageExecutives] BIT NOT NULL CONSTRAINT [HrAdminMembers_CanManageExecutives_df] DEFAULT 0,
    [ReceiveSystemAlerts] BIT NOT NULL CONSTRAINT [HrAdminMembers_ReceiveSystemAlerts_df] DEFAULT 1,
    [Status] NVARCHAR(20) NOT NULL CONSTRAINT [HrAdminMembers_Status_df] DEFAULT 'active',
    [IsActive] BIT NOT NULL CONSTRAINT [HrAdminMembers_IsActive_df] DEFAULT 1,
    [IsDeleted] BIT NOT NULL CONSTRAINT [HrAdminMembers_IsDeleted_df] DEFAULT 0,
    [CreatedBy] NVARCHAR(1000),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [HrAdminMembers_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedBy] NVARCHAR(1000),
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [HrAdminMembers_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Notifications] (
    [Id] NVARCHAR(1000) NOT NULL,
    [TicketId] NVARCHAR(1000),
    [TrackingCode] NVARCHAR(20),
    [Title] NVARCHAR(500) NOT NULL,
    [Message] NVARCHAR(max) NOT NULL,
    [Type] NVARCHAR(30) NOT NULL,
    [RecipientRole] NVARCHAR(20),
    [RecipientEmail] NVARCHAR(200),
    [IsRead] BIT NOT NULL CONSTRAINT [Notifications_IsRead_df] DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [Notifications_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Notifications_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[RoleAccessConfigs] (
    [Id] NVARCHAR(1000) NOT NULL,
    [RoleKey] NVARCHAR(20) NOT NULL,
    [RoleTitleTh] NVARCHAR(200) NOT NULL,
    [RoleTitleEn] NVARCHAR(200) NOT NULL,
    [DescriptionTh] NVARCHAR(max) NOT NULL,
    [BadgeColor] NVARCHAR(200) NOT NULL,
    [AllowedTabsJson] NVARCHAR(max) NOT NULL CONSTRAINT [RoleAccessConfigs_AllowedTabsJson_df] DEFAULT '[]',
    [CanViewAllDepartments] BIT NOT NULL CONSTRAINT [RoleAccessConfigs_CanViewAllDepartments_df] DEFAULT 0,
    [AssignedDepartmentsJson] NVARCHAR(max) CONSTRAINT [RoleAccessConfigs_AssignedDepartmentsJson_df] DEFAULT '[]',
    [CanViewDirectCeoTickets] BIT NOT NULL CONSTRAINT [RoleAccessConfigs_CanViewDirectCeoTickets_df] DEFAULT 0,
    [CanViewConfidentialIdentities] BIT NOT NULL CONSTRAINT [RoleAccessConfigs_CanViewConfidentialIdentities_df] DEFAULT 0,
    [CanEditRootCauseAndCapa] BIT NOT NULL CONSTRAINT [RoleAccessConfigs_CanEditRootCauseAndCapa_df] DEFAULT 0,
    [CanManageGatekeeperOfficers] BIT NOT NULL CONSTRAINT [RoleAccessConfigs_CanManageGatekeeperOfficers_df] DEFAULT 0,
    [CanManageRolePermissions] BIT NOT NULL CONSTRAINT [RoleAccessConfigs_CanManageRolePermissions_df] DEFAULT 0,
    [IsActive] BIT NOT NULL CONSTRAINT [RoleAccessConfigs_IsActive_df] DEFAULT 1,
    [IsDeleted] BIT NOT NULL CONSTRAINT [RoleAccessConfigs_IsDeleted_df] DEFAULT 0,
    [CreatedBy] NVARCHAR(1000),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [RoleAccessConfigs_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedBy] NVARCHAR(1000),
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [RoleAccessConfigs_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [RoleAccessConfigs_RoleKey_key] UNIQUE NONCLUSTERED ([RoleKey])
);

-- AddForeignKey
ALTER TABLE [dbo].[TicketTimelineLogs] ADD CONSTRAINT [TicketTimelineLogs_TicketId_fkey] FOREIGN KEY ([TicketId]) REFERENCES [dbo].[Tickets]([Id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TicketEvaluations] ADD CONSTRAINT [TicketEvaluations_TicketId_fkey] FOREIGN KEY ([TicketId]) REFERENCES [dbo].[Tickets]([Id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[GatekeeperOfficers] ADD CONSTRAINT [GatekeeperOfficers_Category_fkey] FOREIGN KEY ([Category]) REFERENCES [dbo].[DepartmentGatekeeperConfigs]([Category]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

