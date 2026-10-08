import { EmployeeRecord } from '../types';
import { safeStorage } from './safeStorage';

/**
 * ฐานข้อมูลพนักงานกลางขององค์กร (Corporate Employee Database)
 * ใช้สำหรับการเชื่อมโยง (Backend Mapping) อีเมลล็อกอินและข้อมูลพนักงาน
 * เพื่อความปลอดภัยและการบริหารจัดการสิทธิ์ของ HR Admin & ตัวแทนผู้บริหาร
 */
export const EMPLOYEE_DATABASE: EmployeeRecord[] = [
  {
    employeeId: 'EMP-4092',
    nameTh: 'สมชาย วิจิตรศิลป์',
    nameEn: 'Somchai Vijitsilp',
    loginEmail: 'somchai.v@company.internal',
    department: 'Digital Innovation & Engineering',
    position: 'Senior Software Architect',
    phone: '081-445-6789',
    status: 'active',
  },
  {
    employeeId: 'EMP-1823',
    nameTh: 'ชลธิชา รัตนเวช',
    nameEn: 'Chonticha Rattanavech',
    loginEmail: 'chonticha.r@company.internal',
    department: 'Human Resources & Talent Management',
    position: 'Talent Acquisition & People Partner',
    phone: '082-998-1234',
    status: 'active',
  },
  {
    employeeId: 'EMP-3890',
    nameTh: 'จิรภัทร ชาญวิทย์',
    nameEn: 'Jiraphat Charnwit',
    loginEmail: 'jiraphat.c@company.internal',
    department: 'Quality Assurance & Plant Operations',
    position: 'QA/QC Lead Specialist',
    phone: '089-223-9012',
    status: 'active',
  },
  {
    employeeId: 'EMP-5531',
    nameTh: 'ธีรดนย์ สิทธิชัย',
    nameEn: 'Teeradon Sitthichai',
    loginEmail: 'teeradon.s@company.internal',
    department: 'Compliance & Legal Governance',
    position: 'Senior Regulatory & Compliance Auditor',
    phone: '083-771-4560',
    status: 'active',
  },
  {
    employeeId: 'EMP-2914',
    nameTh: 'วรัญญู ประเสริฐสุข',
    nameEn: 'Waranyu Prasertsuk',
    loginEmail: 'waranyu.p@company.internal',
    department: 'Distribution & Supply Chain Logistics',
    position: 'Warehouse & Logistics Supervisor',
    phone: '086-554-8901',
    status: 'active',
  },
  {
    employeeId: 'EMP-7811',
    nameTh: 'วิศรุต สุวรรณ',
    nameEn: 'Wissarut Suwan',
    loginEmail: 'wissarut.s@company.internal',
    department: 'Corporate Facilities & Safety Management',
    position: 'Infrastructure & Safety Engineer',
    phone: '085-112-3490',
    status: 'active',
  },
  {
    employeeId: 'EMP-9085',
    nameTh: 'พิษณุ เกษมสุข',
    nameEn: 'Pisanu Kasemsuk',
    loginEmail: 'pisanu90853@gmail.com',
    department: 'Digital Transformation & Enterprise Systems',
    position: 'Principal Enterprise Solution Architect',
    phone: '081-998-0053',
    status: 'active',
  },
  {
    employeeId: 'EMP-3120',
    nameTh: 'ปวีณา อุดมสุข',
    nameEn: 'Paweena Udomsuk',
    loginEmail: 'paweena.u@company.internal',
    department: 'Strategic Corporate Communication',
    position: 'Internal Communications Manager',
    phone: '084-332-9011',
    status: 'active',
  },
  {
    employeeId: 'EMP-5512',
    nameTh: 'พิเชษฐ์ ลือวัฒนา',
    nameEn: 'Pichet Luewattana',
    loginEmail: 'pichet.l@company.internal',
    department: 'Procurement & Vendor Governance',
    position: 'Senior Procurement Officer',
    phone: '087-654-3210',
    status: 'active',
  },
  {
    employeeId: 'EMP-3318',
    nameTh: 'วรรสนา ก้องเกียรติ',
    nameEn: 'Wassana Kongkiat',
    loginEmail: 'wassana.k@company.internal',
    department: 'Financial Strategy & Budgeting',
    position: 'Senior Financial Analyst',
    phone: '089-876-5432',
    status: 'active',
  },
];

export const CURRENT_LOGIN_EMPLOYEE_STORAGE_KEY = 'voiceplatform_current_login_employee';

/**
 * ดึงข้อมูลพนักงานทั้งหมด
 */
export function getAllEmployees(): EmployeeRecord[] {
  return EMPLOYEE_DATABASE;
}

/**
 * ค้นหาพนักงานจาก Employee ID
 */
export function getEmployeeById(employeeId?: string): EmployeeRecord | undefined {
  if (!employeeId) return undefined;
  const cleanId = employeeId.trim().toUpperCase();
  return EMPLOYEE_DATABASE.find(
    (e) => e.employeeId.toUpperCase() === cleanId || e.employeeId.toUpperCase().includes(cleanId)
  );
}

/**
 * ค้นหาพนักงานจาก Login Email
 */
export function getEmployeeByEmail(email?: string): EmployeeRecord | undefined {
  if (!email) return undefined;
  const cleanEmail = email.trim().toLowerCase();
  return EMPLOYEE_DATABASE.find((e) => e.loginEmail.toLowerCase() === cleanEmail);
}

/**
 * ค้นหาพนักงานจากคำค้นหา (ชื่อ, รหัส, แผนก, อีเมล)
 */
export function searchEmployees(query: string): EmployeeRecord[] {
  if (!query || !query.trim()) return EMPLOYEE_DATABASE;
  const q = query.trim().toLowerCase();
  return EMPLOYEE_DATABASE.filter(
    (e) =>
      e.nameTh.toLowerCase().includes(q) ||
      e.nameEn.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      e.loginEmail.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
  );
}

/**
 * ดึงข้อมูลบัญชีพนักงานที่ใช้ Login อยู่ในปัจจุบัน
 */
export function getCurrentLoginEmployee(): EmployeeRecord {
  try {
    const saved = safeStorage.getItem(CURRENT_LOGIN_EMPLOYEE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.loginEmail) {
        const found = getEmployeeByEmail(parsed.loginEmail);
        if (found) return found;
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to get current login employee', e);
  }
  // Default login account: Somchai Vijitsilp (or Pisanu)
  return EMPLOYEE_DATABASE[0];
}

/**
 * กำหนดบัญชีพนักงานที่ Login ปัจจุบัน (สำหรับทดสอบ)
 */
export function setCurrentLoginEmployee(employee: EmployeeRecord) {
  try {
    safeStorage.setItem(CURRENT_LOGIN_EMPLOYEE_STORAGE_KEY, JSON.stringify(employee));
  } catch (e) {
    console.error('Failed to set current login employee', e);
  }
}

/**
 * ทำการ Mapping หลังบ้าน (Backend Mapping) จากฐานข้อมูลพนักงาน
 * เพื่อระบุ email ที่ใช้ในการ login สำหรับคำร้องทุกประเภท โดยเฉพาะกรณีไม่ระบุตัวตน (Anonymous)
 */
export function mapLoginEmailForTicket(ticket: {
  submitterEmail?: string;
  submitterEmployeeId?: string;
  loginEmail?: string;
  submitterName?: string;
}): {
  loginEmail: string;
  employee?: EmployeeRecord;
  isMapped: boolean;
} {
  // 1. If explicit loginEmail is provided
  if (ticket.loginEmail && ticket.loginEmail.trim()) {
    const emp = getEmployeeByEmail(ticket.loginEmail);
    return {
      loginEmail: ticket.loginEmail.trim(),
      employee: emp,
      isMapped: true,
    };
  }

  // 2. Map via employee ID
  if (ticket.submitterEmployeeId && ticket.submitterEmployeeId.trim()) {
    const emp = getEmployeeById(ticket.submitterEmployeeId);
    if (emp) {
      return {
        loginEmail: emp.loginEmail,
        employee: emp,
        isMapped: true,
      };
    }
  }

  // 3. Map via submitterEmail
  if (ticket.submitterEmail && ticket.submitterEmail.trim()) {
    const emp = getEmployeeByEmail(ticket.submitterEmail);
    return {
      loginEmail: ticket.submitterEmail.trim(),
      employee: emp,
      isMapped: !!emp,
    };
  }

  // 4. Fallback to current logged in employee account
  const current = getCurrentLoginEmployee();
  return {
    loginEmail: current.loginEmail,
    employee: current,
    isMapped: true,
  };
}
