# API Index

<!-- ตาราง endpoint — index ชี้เข้าโค้ด ไม่ใช่ spec เต็ม (validation schema ในไฟล์ route
     คือ spec ตัวจริง อย่าลอกมา) · อัปเดตผ่าน /ugt-handoff เมื่อเพิ่ม/เปลี่ยน endpoint -->

| Method | Path | ทำอะไร | ไฟล์ | ใครเรียก |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | health check + บอกว่ามี `GEMINI_API_KEY` ตั้งไว้หรือไม่ | `src/app/api/health/route.ts` | ops/uptime check |
| POST | `/api/ai/analyze-complaint` | Gemini triage: แนะนำหมวดหมู่/urgency/risk จากร่างคำร้อง (fallback เป็น heuristic คงที่ถ้าไม่มี API key) | `src/app/api/ai/analyze-complaint/route.ts` | `analyzeGrievanceWithAI()` ใน `src/services/api.ts`, เรียกจาก `EmployeeSubmitForm` |
| POST | `/api/ai/cluster-insights` | Gemini root-cause clustering + executive summary จากคำร้องทั้งหมด (fallback เป็น cluster ตัวอย่างคงที่ถ้าไม่มี API key) | `src/app/api/ai/cluster-insights/route.ts` | `getClusterInsightsWithAI()` ใน `src/services/api.ts`, เรียกจาก `ExecutiveDashboard` |
