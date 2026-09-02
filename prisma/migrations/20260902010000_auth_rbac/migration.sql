-- Auth + RBAC schema for UGT VoiceCare, added by ugt-nextjs-auth-setup
-- (2026-09-02) — generated offline (no live SQL Server available at
-- authoring time — see docs/admin-handoff.md §1) via:
--   npx prisma migrate diff --from-schema <pre-chunk schema.prisma snapshot> \
--     --to-schema prisma/schema.prisma --script
-- Once real DATABASE_URL/SHADOW_DATABASE_URL values land, mark this
-- migration as already applied (same as 20260902000000_init) rather than
-- replaying it through `migrate dev`:
--   npx prisma migrate resolve --applied 20260902010000_auth_rbac
--   npx prisma generate
BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [Id] NVARCHAR(1000) NOT NULL,
    [Name] NVARCHAR(1000) NOT NULL,
    [Email] NVARCHAR(1000) NOT NULL,
    [EmailVerified] BIT NOT NULL CONSTRAINT [User_EmailVerified_df] DEFAULT 0,
    [Image] NVARCHAR(max),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [User_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    [AuthType] NVARCHAR(1000) NOT NULL CONSTRAINT [User_AuthType_df] DEFAULT 'sso',
    [RoleId] NVARCHAR(1000),
    [AppRole] NVARCHAR(20),
    [LdapUsername] NVARCHAR(1000),
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [User_Email_key] UNIQUE NONCLUSTERED ([Email]),
    CONSTRAINT [User_LdapUsername_key] UNIQUE NONCLUSTERED ([LdapUsername])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [Id] NVARCHAR(1000) NOT NULL,
    [ExpiresAt] DATETIME2 NOT NULL,
    [Token] NVARCHAR(1000) NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [Session_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    [IpAddress] NVARCHAR(1000),
    [UserAgent] NVARCHAR(max),
    [UserId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Session_Token_key] UNIQUE NONCLUSTERED ([Token])
);

-- CreateTable
CREATE TABLE [dbo].[Account] (
    [Id] NVARCHAR(1000) NOT NULL,
    [AccountId] NVARCHAR(1000) NOT NULL,
    [ProviderId] NVARCHAR(1000) NOT NULL,
    [UserId] NVARCHAR(1000) NOT NULL,
    [AccessToken] NVARCHAR(max),
    [RefreshToken] NVARCHAR(max),
    [IdToken] NVARCHAR(max),
    [AccessTokenExpiresAt] DATETIME2,
    [RefreshTokenExpiresAt] DATETIME2,
    [Scope] NVARCHAR(1000),
    [Password] NVARCHAR(max),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [Account_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Account_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Account_ProviderId_AccountId_key] UNIQUE NONCLUSTERED ([ProviderId],[AccountId])
);

-- CreateTable
CREATE TABLE [dbo].[Verification] (
    [Id] NVARCHAR(1000) NOT NULL,
    [Identifier] NVARCHAR(1000) NOT NULL,
    [VerificationValue] NVARCHAR(max) NOT NULL,
    [ExpiresAt] DATETIME2 NOT NULL,
    [CreatedAt] DATETIME2 CONSTRAINT [Verification_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2,
    CONSTRAINT [Verification_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[Role] (
    [Id] NVARCHAR(1000) NOT NULL,
    [Name] NVARCHAR(1000) NOT NULL,
    [Description] NVARCHAR(max),
    [IsSystem] BIT NOT NULL CONSTRAINT [Role_IsSystem_df] DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [Role_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [UpdatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Role_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Role_Name_key] UNIQUE NONCLUSTERED ([Name])
);

-- CreateTable
CREATE TABLE [dbo].[Permission] (
    [Id] NVARCHAR(1000) NOT NULL,
    [PermKey] NVARCHAR(1000) NOT NULL,
    [Label] NVARCHAR(1000) NOT NULL,
    [GroupName] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Permission_pkey] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [Permission_PermKey_key] UNIQUE NONCLUSTERED ([PermKey])
);

-- CreateTable
CREATE TABLE [dbo].[RolePermission] (
    [RoleId] NVARCHAR(1000) NOT NULL,
    [PermissionId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [RolePermission_pkey] PRIMARY KEY CLUSTERED ([RoleId],[PermissionId])
);

-- CreateTable
CREATE TABLE [dbo].[RateLimit] (
    [Id] NVARCHAR(1000) NOT NULL,
    [BucketKey] NVARCHAR(1000),
    [RequestCount] INT NOT NULL,
    [LastRequest] BIGINT NOT NULL,
    CONSTRAINT [RateLimit_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateTable
CREATE TABLE [dbo].[ActivityLogs] (
    [Id] INT NOT NULL IDENTITY(1,1),
    [UserId] NVARCHAR(1000) NOT NULL,
    [Action] NVARCHAR(1000) NOT NULL,
    [Detail] NVARCHAR(max),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [ActivityLogs_CreatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ActivityLogs_pkey] PRIMARY KEY CLUSTERED ([Id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLogs_CreatedAt_idx] ON [dbo].[ActivityLogs]([CreatedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLogs_Action_idx] ON [dbo].[ActivityLogs]([Action]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLogs_UserId_idx] ON [dbo].[ActivityLogs]([UserId]);

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_RoleId_fkey] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Role]([Id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_UserId_fkey] FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([Id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [RolePermission_RoleId_fkey] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Role]([Id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermission] ADD CONSTRAINT [RolePermission_PermissionId_fkey] FOREIGN KEY ([PermissionId]) REFERENCES [dbo].[Permission]([Id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

