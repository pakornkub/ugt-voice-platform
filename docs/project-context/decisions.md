# Decisions — append-only

<!-- มติทุกเรื่อง ยกเว้น design (→ docs/DESIGN.md §10) · append ผ่าน /ugt-handoff
     ห้ามแก้/ลบย้อนหลัง — จะกลับมติ = เพิ่มรายการใหม่อ้างถึงของเก่า
     ทุกรายการต้องมี: เหตุผล + ทางเลือกที่ปัดตก (ไม่งั้นอีกสามเดือนมีคน re-litigate
     โดยไม่รู้ว่าเคยชั่งน้ำหนักแล้ว)
     กติกาสำหรับ AI: ก่อนเสนอเปลี่ยนแนวทาง/lib/โครงสร้าง — อ่านไฟล์นี้ก่อน
     ถ้างานใหม่ขัดมติเดิม ให้ยกขึ้นมาบอกผู้ใช้ ไม่ทำเงียบ ๆ -->

- 2026-09-02 Migrate the whole app from Vite+React SPA+Express (Google AI Studio scaffold)
  to Next.js App Router — **because** the org's `ugt-nextjs-*` install pipeline (SQL Server
  via Prisma, Keycloak SSO/RBAC, Jenkins/SonarQube CI, shared design system) only targets
  Next.js App Router, and the user wants this deployable under the org standard while
  keeping the exact same design/UX/workflow · rejected: adapting the `ugt-nextjs-*` skill
  assets to a non-Next.js stack (the skill explicitly forbids this — assets are org-standard
  contracts, not templates to bend).
- 2026-09-02 Phase A of the migration is a pure framework port with **zero data-layer
  changes** — every component keeps using `localStorage`/`sql.js` exactly as before, the
  free role-switcher dropdown stays, the SQL Query Studio stays — **because** this keeps the
  highest-risk step (framework port) independently verifiable as pixel-identical to the
  original before layering in the real DB/auth rewrites · rejected: doing the data-layer
  rewrite and framework port in the same pass (harder to verify, harder to roll back a
  regression to just one cause).
- 2026-09-02 Both Mail and Upload optional modules are wanted for the eventual org rollout
  — **because** the app's notifications (gatekeeper/CEO alerts, SLA warnings) are currently
  in-app only and attachments are currently a fake `Math.random()` simulator; both need real
  infra (SMTP relay, ClamAV) to be genuinely useful in production · deferred to their own
  chunks (`ugt-nextjs-mail-setup`, `ugt-nextjs-upload-setup`), not built in Phase A.
- 2026-09-02 Auth will be **SSO (Keycloak) only**, which retires the free role-switcher
  dropdown once implemented — **because** the org standard for this kind of app is SSO, and
  the user accepted that a free role switcher is inherently incompatible with real RBAC ·
  rejected: keeping the switcher alongside real auth (defeats the purpose of access control).
- 2026-09-02 `ExportAnalyticsModal`'s "SQL Query Studio" (arbitrary user-typed SQL against
  the in-browser sql.js copy) will become a set of **preset reports** once wired to real SQL
  Server — **because** letting arbitrary end-user SQL reach a real production database is a
  security risk the org standard won't accept · rejected: keeping raw SQL access scoped to
  admin + a read-only DB user (still considered a live risk, and preset reports cover the
  same "export for analysis" need without it) · rejected: dropping the feature entirely (the
  user wants the export/analytics capability preserved, just not as raw SQL).
