import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsersTable } from './UsersTable';
import { LanguageProvider } from '../context/LanguageContext';

const USERS = [
  {
    id: 'u1',
    name: 'Somchai',
    email: 'somchai@ube.co.th',
    authType: 'sso',
    role: 'gatekeeper' as const,
    source: 'gatekeepers' as const,
    officerCategories: ['HR' as const, 'Ethics' as const],
  },
  {
    id: 'u2',
    name: 'Malee',
    email: 'malee@ube.co.th',
    authType: 'sso',
    role: 'employee' as const,
    source: null,
    officerCategories: [],
  },
  {
    id: 'u3',
    name: 'Admin',
    email: 'admin@ube.co.th',
    authType: 'sso',
    role: 'admin' as const,
    source: 'hr_admins' as const,
    officerCategories: [],
  },
  {
    id: 'u4',
    name: 'Boss',
    email: 'boss@ube.co.th',
    authType: 'sso',
    role: 'executive' as const,
    source: 'executives' as const,
    officerCategories: [],
  },
];

const renderTable = (users = USERS) =>
  render(
    <LanguageProvider>
      <UsersTable users={users} currentUserId="u3" />
    </LanguageProvider>
  );

beforeEach(() => localStorage.clear());

describe('UsersTable (Thai)', () => {
  it('shows the page heading, the column headers and the roster source of each role', () => {
    renderTable();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('จัดการผู้ใช้ (Users)');
    expect(screen.getByText(/รายชื่อผู้ใช้ที่เคยเข้าสู่ระบบผ่าน SSO/)).toBeInTheDocument();
    for (const name of ['ชื่อ - อีเมล', 'วิธีเข้าสู่ระบบ', 'บทบาท', 'ที่มาของบทบาท']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
    expect(screen.getByText('พนักงานทั่วไป')).toBeInTheDocument();
    expect(screen.getByText('ผู้บริหาร')).toBeInTheDocument();
    expect(screen.getByText('รายชื่อ Gatekeeper (HR, Ethics)')).toBeInTheDocument();
    expect(screen.getByText('รายชื่อ HR Admin')).toBeInTheDocument();
    expect(screen.getByText('รายชื่อผู้บริหาร')).toBeInTheDocument();
    expect(screen.getByText('ไม่อยู่ในรายชื่อใด')).toBeInTheDocument();
    expect(screen.getByText('คุณ')).toBeInTheDocument();
  });

  it('shows the empty state', () => {
    renderTable([]);
    expect(screen.getByText('ยังไม่มีผู้ใช้ในระบบ')).toBeInTheDocument();
  });
});

describe('UsersTable (English)', () => {
  beforeEach(() => localStorage.setItem('voiceplatform_lang_preference_v2', 'en'));

  it('translates the heading, headers, roles and roster sources', () => {
    renderTable();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Users');
    expect(screen.getByText(/Users who have signed in through SSO/)).toBeInTheDocument();
    for (const name of ['Name - Email', 'Sign-in method', 'Role', 'Role source']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
    expect(screen.getByText('General Employee')).toBeInTheDocument();
    expect(screen.getByText('Executive')).toBeInTheDocument();
    expect(screen.getByText('Gatekeeper roster (HR, Ethics)')).toBeInTheDocument();
    expect(screen.getByText('HR Admin roster')).toBeInTheDocument();
    expect(screen.getByText('Executive roster')).toBeInTheDocument();
    expect(screen.getByText('Not on any roster')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('shows the empty state in English', () => {
    renderTable([]);
    expect(screen.getByText('No users in the system yet')).toBeInTheDocument();
  });
});
