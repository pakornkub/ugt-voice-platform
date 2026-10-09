-- Reference data the app cannot work without, for a database that was migrated but never seeded
-- (prod: `prisma migrate deploy` only — the seed also carries demo tickets and made-up people, so it
-- never runs there). Without RoleAccessConfigs rows every role, admin included, gets no tabs; without
-- the six DepartmentGatekeeperConfigs rows no officer can be added. Inserts only what is missing, so
-- the seeded DEV database is untouched. No people and no escalation addresses — the admin adds the
-- real ones. Values: prisma/seed.ts ROLE_ACCESS_CONFIGS + src/mockData.ts INITIAL_GATEKEEPER_CONFIGS.
BEGIN TRY

BEGIN TRAN;

IF NOT EXISTS (SELECT 1 FROM [dbo].[RoleAccessConfigs] WHERE [RoleKey] = N'employee')
INSERT INTO [dbo].[RoleAccessConfigs] ([Id], [RoleKey], [RoleTitleTh], [RoleTitleEn], [DescriptionTh], [BadgeColor], [AllowedTabsJson], [CanViewAllDepartments], [AssignedDepartmentsJson], [CanViewDirectCeoTickets], [CanViewConfidentialIdentities], [CanViewAnonymousSubmitterEmail], [CanEditRootCauseAndCapa], [CanManageGatekeeperOfficers], [CanManageRolePermissions], [UpdatedAt])
VALUES (LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')), N'employee', N'พนักงานทั่วไป (General Employee)', N'General Employee', N'ผู้ใช้งานทั่วไป สามารถยื่นข้อร้องเรียน/ข้อเสนอแนะ ติดตามสถานะคำร้องของตนเอง และศึกษาคู่มือเกณฑ์มาตรฐาน', N'bg-blue-50 text-blue-700 border-blue-200', N'["submit","my_tickets","workflow"]', 0, N'[]', 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[RoleAccessConfigs] WHERE [RoleKey] = N'gatekeeper')
INSERT INTO [dbo].[RoleAccessConfigs] ([Id], [RoleKey], [RoleTitleTh], [RoleTitleEn], [DescriptionTh], [BadgeColor], [AllowedTabsJson], [CanViewAllDepartments], [AssignedDepartmentsJson], [CanViewDirectCeoTickets], [CanViewConfidentialIdentities], [CanViewAnonymousSubmitterEmail], [CanEditRootCauseAndCapa], [CanManageGatekeeperOfficers], [CanManageRolePermissions], [UpdatedAt])
VALUES (LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')), N'gatekeeper', N'ผู้ประสานงานหน่วยงาน (Gatekeeper)', N'Department Gatekeeper', N'เจ้าหน้าที่ผู้รับผิดชอบประจำหน่วยงาน คัดกรอง สืบสวน และส่งต่อแก้ไขตามสายงานที่เกี่ยวข้อง', N'bg-emerald-50 text-emerald-700 border-emerald-200', N'["gatekeeper","my_tickets","workflow"]', 1, N'["HR","Compliance","Ethics","Fraud","Harassment","Quality"]', 0, 0, 0, 1, 0, 0, CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[RoleAccessConfigs] WHERE [RoleKey] = N'executive')
INSERT INTO [dbo].[RoleAccessConfigs] ([Id], [RoleKey], [RoleTitleTh], [RoleTitleEn], [DescriptionTh], [BadgeColor], [AllowedTabsJson], [CanViewAllDepartments], [AssignedDepartmentsJson], [CanViewDirectCeoTickets], [CanViewConfidentialIdentities], [CanViewAnonymousSubmitterEmail], [CanEditRootCauseAndCapa], [CanManageGatekeeperOfficers], [CanManageRolePermissions], [UpdatedAt])
VALUES (LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')), N'executive', N'ผู้บริหารระดับสูง (CEO / EVP / GRC)', N'Executive & Governance Board', N'ผู้บริหารและคณะกรรมการกำกับดูแล เข้าถึงแดชบอร์ดภาพรวม กล่องข้อร้องเรียนสายตรง Whistleblower และการวิเคราะห์ CAPA', N'bg-purple-50 text-purple-700 border-purple-200', N'["executive","clustering","workflow"]', 1, N'[]', 1, 0, 1, 1, 0, 0, CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[RoleAccessConfigs] WHERE [RoleKey] = N'admin')
INSERT INTO [dbo].[RoleAccessConfigs] ([Id], [RoleKey], [RoleTitleTh], [RoleTitleEn], [DescriptionTh], [BadgeColor], [AllowedTabsJson], [CanViewAllDepartments], [AssignedDepartmentsJson], [CanViewDirectCeoTickets], [CanViewConfidentialIdentities], [CanViewAnonymousSubmitterEmail], [CanEditRootCauseAndCapa], [CanManageGatekeeperOfficers], [CanManageRolePermissions], [UpdatedAt])
VALUES (LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')), N'admin', N'HR Administrator & ตัวแทนผู้บริหาร', N'HR Admin & Executive Representative', N'ผู้ดูแลระบบสูงสุดและตัวแทนฝ่ายบริหาร มีสิทธิ์เข้าถึงทุกฟังก์ชัน กำหนดสิทธิ์ RBAC และจัดสรรผู้รับผิดชอบหน่วยงาน', N'bg-rose-50 text-rose-700 border-rose-200', N'["submit","my_tickets","workflow","gatekeeper","executive","clustering","admin_gatekeeper","rbac_management","admin_users","admin_audit_logs"]', 1, N'[]', 1, 1, 1, 1, 1, 1, CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[DepartmentGatekeeperConfigs] WHERE [Category] = N'HR')
INSERT INTO [dbo].[DepartmentGatekeeperConfigs] ([Id], [Category], [DepartmentName], [DepartmentCode], [AutoAssignMode], [UpdatedAt])
VALUES (LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')), N'HR', N'People & Culture Department (ฝ่ายบริหารทรัพยากรบุคคล)', N'DEPT-HR-01', N'lead_manual', CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[DepartmentGatekeeperConfigs] WHERE [Category] = N'Compliance')
INSERT INTO [dbo].[DepartmentGatekeeperConfigs] ([Id], [Category], [DepartmentName], [DepartmentCode], [AutoAssignMode], [UpdatedAt])
VALUES (LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')), N'Compliance', N'Governance, Risk & Compliance Division (ฝ่ายกำกับดูแลและกฎหมาย)', N'DEPT-GRC-04', N'lead_manual', CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[DepartmentGatekeeperConfigs] WHERE [Category] = N'Ethics')
INSERT INTO [dbo].[DepartmentGatekeeperConfigs] ([Id], [Category], [DepartmentName], [DepartmentCode], [AutoAssignMode], [UpdatedAt])
VALUES (LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')), N'Ethics', N'Ethics Committee & Internal Governance (คณะกรรมการจริยธรรมองค์กร)', N'DEPT-ETH-05', N'lead_manual', CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[DepartmentGatekeeperConfigs] WHERE [Category] = N'Fraud')
INSERT INTO [dbo].[DepartmentGatekeeperConfigs] ([Id], [Category], [DepartmentName], [DepartmentCode], [AutoAssignMode], [UpdatedAt])
VALUES (LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')), N'Fraud', N'Internal Audit & Forensic Investigation (ฝ่ายตรวจสอบภายในและการสอบสวนทุจริต)', N'DEPT-AUD-07', N'lead_manual', CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[DepartmentGatekeeperConfigs] WHERE [Category] = N'Harassment')
INSERT INTO [dbo].[DepartmentGatekeeperConfigs] ([Id], [Category], [DepartmentName], [DepartmentCode], [AutoAssignMode], [UpdatedAt])
VALUES (LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')), N'Harassment', N'Human Rights & Grievance Panel (คณะกรรมการคุ้มครองสิทธิมนุษยชนและการล่วงละเมิด)', N'DEPT-HRM-06', N'lead_manual', CURRENT_TIMESTAMP);

IF NOT EXISTS (SELECT 1 FROM [dbo].[DepartmentGatekeeperConfigs] WHERE [Category] = N'Quality')
INSERT INTO [dbo].[DepartmentGatekeeperConfigs] ([Id], [Category], [DepartmentName], [DepartmentCode], [AutoAssignMode], [UpdatedAt])
VALUES (LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', '')), N'Quality', N'Operational Excellence & Quality Assurance (ฝ่ายตรวจสอบคุณภาพและมาตรฐาน - Quality Impropriety)', N'DEPT-QA-08', N'lead_manual', CURRENT_TIMESTAMP);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
