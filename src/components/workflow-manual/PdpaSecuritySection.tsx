import type { ReactNode } from 'react';
import { Crown, FileCheck2, Laptop, ShieldCheck } from 'lucide-react';
import { GuideCard, PanelHeader } from './ui';

interface PdpaPoint {
  icon: ReactNode;
  title: string;
  body: string;
}

const PDPA_POINTS: readonly PdpaPoint[] = [
  {
    icon: <ShieldCheck className="h-4 w-4 text-blue-600" />,
    title: '1. การจำกัดสิทธิ์เข้าถึงตามหน้าที่ (Role-Based Access Control)',
    body: 'ข้อมูลคำร้องจะถูกเปิดให้เฉพาะเจ้าหน้าที่ Gatekeeper ประจำฝ่ายที่รับผิดชอบและผู้บริหารตามลำดับสิทธิ์เท่านั้น โดยบทบาทมาจากรายชื่อในหน้าจัดการผู้บริหาร & Gatekeeper และสิทธิ์ของแต่ละบทบาทกำหนดที่หน้า RBAC เพื่อป้องกันการรั่วไหลของข้อมูลและรักษาความเป็นธรรมในการตรวจสอบ',
  },
  {
    icon: <FileCheck2 className="h-4 w-4 text-emerald-600" />,
    title: '2. การบันทึกประวัติการดำเนินงาน (Audit Trail Logging)',
    body: 'ทุกการดำเนินการ เช่น การเปิดดู การเปลี่ยนสถานะ การมอบหมายงาน และการบันทึกข้อความ จะถูกบันทึกประวัติ (Timeline Log) พร้อมระบุวันเวลาและผู้ดำเนินการอย่างโปร่งใส',
  },
  {
    icon: <Crown className="h-4 w-4 text-purple-600" />,
    title: '3. มาตรการส่งตรงถึงผู้บริหาร (CEO / EVP Direct Bypass)',
    body: 'กรณีเคสที่มีความละเอียดอ่อนสูง หรือเกี่ยวข้องกับสายการบังคับบัญชา ระบบมีช่องทางส่งตรงถึงผู้บริหารระดับสูงโดยตรงเพื่อคุ้มครองผู้ยื่นเรื่องและดำเนินการอย่างเป็นธรรม',
  },
  {
    icon: <Laptop className="h-4 w-4 text-indigo-600" />,
    title: '4. การเข้ารหัสและความปลอดภัยระดับระบบ (Enterprise Encryption)',
    body: 'ผู้ใช้เข้าสู่ระบบด้วยบัญชีบริษัท (SSO) และระบบส่งข้อมูลผ่านการเชื่อมต่อที่เข้ารหัส ไฟล์แนบไม่ได้เปิดเป็นลิงก์สาธารณะ — ดาวน์โหลดได้เฉพาะผู้ที่มีสิทธิ์เห็นคำร้องนั้นผ่านระบบที่ตรวจสอบสิทธิ์ทุกครั้ง',
  },
];

export const PdpaSecuritySection = () => (
  <div className="space-y-6">
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-7">
      <PanelHeader
        className="flex items-center justify-between border-b border-slate-200 pb-4"
        iconBoxClass="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-600"
        icon={<ShieldCheck className="h-6 w-6" />}
        title="นโยบายความปลอดภัยและการคุ้มครองข้อมูลส่วนบุคคล (PDPA & Data Governance)"
        subtitle="มาตรการรักษาความลับ การควบคุมสิทธิ์การเข้าถึง และธรรมาภิบาลข้อมูลองค์กร"
      >
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          PDPA Compliant
        </span>
      </PanelHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PDPA_POINTS.map((point) => (
          <GuideCard key={point.title} title={point.title} body={point.body} lead={point.icon} />
        ))}
      </div>
    </div>
  </div>
);
