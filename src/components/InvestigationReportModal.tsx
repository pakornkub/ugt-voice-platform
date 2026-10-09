'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Printer, Copy, Check, X, Shield, CheckCircle2, Lock } from 'lucide-react';
import { CategoryInfo, ComplaintTicket, ConfidentialityLevel } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { getStatusBadgeText, getUrgencyBadgeText, getRiskSeverityBadgeText } from '../services/api';
import { localizeServerText } from '../services/serverText';
import type { Language } from '../context/LanguageContext';
import { useTr } from '../context/useTr';

interface InvestigationReportModalProps {
  ticket: ComplaintTicket | null;
  onClose: () => void;
}

type Evaluation = NonNullable<ComplaintTicket['evaluation']>;
type Tr = (en: string, th: string) => string;

const localeOf = (lang: Language) => (lang === 'en' ? 'en-US' : 'th-TH');

const categoryName = (info: CategoryInfo, lang: Language) =>
  lang === 'en' ? info.nameEn : info.nameTh;

/** Responsible department: the ticket's own, else the category default ("English (Thai)" → English in EN). */
const responsibleDepartment = (ticket: ComplaintTicket, info: CategoryInfo, lang: Language) =>
  ticket.gatekeeperDepartment ||
  (lang === 'en' ? info.responsibleDept.split(' (')[0] : info.responsibleDept);

const PROTECTION_SUMMARY_TEXT: Record<ConfidentialityLevel, { th: string; en: string }> = {
  anonymous: { th: 'ไม่ระบุตัวตน (Anonymous)', en: 'Anonymous' },
  confidential_restricted: { th: 'ปกปิดตัวตนพิเศษ (Confidential)', en: 'Confidential' },
  standard_named: { th: 'ระบุตัวตน (Standard Named)', en: 'Standard Named' },
};

const ProtectionBadge: React.FC<Readonly<{ level: ConfidentialityLevel }>> = ({ level }) => {
  const { tr } = useTr();
  if (level === 'anonymous') {
    return (
      <span className="flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
        <Lock className="h-3 w-3" />
        <span>{tr('100% Anonymous Protected', 'ไม่ระบุตัวตน (100% Anonymous Protected)')}</span>
      </span>
    );
  }
  if (level === 'confidential_restricted') {
    return (
      <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
        <Shield className="h-3 w-3" />
        <span>{tr('Confidential Restricted', 'ปกปิดตัวตนพิเศษ (Confidential Restricted)')}</span>
      </span>
    );
  }
  return (
    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
      {tr('Standard Named', 'ระบุตัวตน (Standard Named)')}
    </span>
  );
};

function getProtectionNote(ticket: ComplaintTicket, tr: Tr): string {
  if (ticket.confidentiality === 'anonymous') {
    return tr(
      'This request uses the right to remain anonymous; personal identifying data does not appear in the investigation record',
      'คำร้องนี้ใช้สิทธิ์ไม่เปิดเผยตัวตน ข้อมูลอัตลักษณ์ส่วนบุคคลไม่ปรากฏในสำนวนการสอบสวน'
    );
  }
  if (ticket.confidentiality === 'confidential_restricted') {
    return tr(
      "The submitter's identity is encrypted and access is restricted to the assigned investigation committee",
      'ข้อมูลตัวตนผู้ยื่นเรื่องถูกเข้ารหัสลับและจำกัดสิทธิ์เข้าถึงเฉพาะคณะกรรมการสอบสวนที่ได้รับมอบหมาย'
    );
  }
  const name = ticket.submitterName || tr('Anonymous', 'ไม่ระบุชื่อ');
  const department = ticket.submitterDepartment || tr('Not specified', 'ไม่ระบุ');
  const employeeId = ticket.submitterEmployeeId || 'N/A';
  return tr(
    `Submitter: ${name} (${employeeId}) - Department: ${department}`,
    `ผู้ยื่นเรื่อง: ${name} (${employeeId}) - ฝ่าย ${department}`
  );
}

const SectionTitle: React.FC<Readonly<{ index: number; children: React.ReactNode }>> = ({
  index,
  children,
}) => (
  <div className="flex items-center gap-2 border-b border-slate-200 pb-1 text-xs font-bold tracking-wider text-slate-900 uppercase">
    <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-900 text-[10px] text-white">
      {index}
    </span>
    <span>{children}</span>
  </div>
);

const SignatureBlock: React.FC<Readonly<{ signature: string; name: string; role: string }>> = ({
  signature,
  name,
  role,
}) => {
  const { tr } = useTr();
  return (
    <div className="space-y-8">
      <div className="flex h-10 items-end justify-center border-b border-dashed border-slate-400 pb-1">
        <span className="font-serif text-sm text-slate-700 italic">{signature}</span>
      </div>
      <div>
        <div className="text-xs font-bold text-slate-900">({name})</div>
        <div className="text-[11px] text-slate-500">{role}</div>
        <div className="mt-1 text-[10.5px] text-slate-400">
          {tr('Date:', 'วันที่:')} ....../....../............
        </div>
      </div>
    </div>
  );
};

const ScoreCell: React.FC<
  Readonly<{ label: string; value: number; valueClass: string; suffix: string }>
> = ({ label, value, valueClass, suffix }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-2">
    <span className="block text-[10.5px] text-slate-500">{label}</span>
    <span className={valueClass}>
      {value} {suffix}
    </span>
  </div>
);

const CsatSection: React.FC<Readonly<{ evaluation: Evaluation }>> = ({ evaluation }) => {
  const { tr } = useTr();
  return (
    <div className="space-y-2.5">
      <SectionTitle index={6}>
        {tr('CSAT Verification', 'ผลการประเมินความพึงพอใจการให้บริการ (CSAT Verification)')}
      </SectionTitle>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs print:bg-white">
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 pb-3 text-center sm:grid-cols-5">
          <ScoreCell
            label={tr('Overall Service', 'ภาพรวมการบริการ')}
            value={evaluation.overallScore}
            valueClass="text-base font-black text-amber-600"
            suffix="/ 5 ★"
          />
          <ScoreCell
            label={tr('1. Speed', '1. ความรวดเร็ว')}
            value={evaluation.speedRating}
            valueClass="text-sm font-bold text-slate-800"
            suffix="/ 5"
          />
          <ScoreCell
            label={tr('2. Resolution Quality', '2. คุณภาพการแก้ปัญหา')}
            value={evaluation.resolutionQualityRating}
            valueClass="text-sm font-bold text-slate-800"
            suffix="/ 5"
          />
          <ScoreCell
            label={tr('3. Service Manner', '3. กิริยามารยาท')}
            value={evaluation.serviceMannerRating}
            valueClass="text-sm font-bold text-slate-800"
            suffix="/ 5"
          />
          <ScoreCell
            label={tr('4. Clarity', '4. ความชัดเจน')}
            value={evaluation.clarityRating}
            valueClass="text-sm font-bold text-slate-800"
            suffix="/ 5"
          />
        </div>

        {evaluation.feedbackComment && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-600">
            <strong className="text-slate-800">
              {tr('Additional employee comments:', 'ความคิดเห็นเพิ่มเติมจากพนักงาน:')}
            </strong>{' '}
            &quot;
            {evaluation.feedbackComment}&quot;
          </div>
        )}
      </div>
    </div>
  );
};

const AuditTrailTable: React.FC<Readonly<{ timeline: ComplaintTicket['timeline'] }>> = ({
  timeline,
}) => {
  const { tr, lang } = useTr();
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-left text-[11px]">
        <thead className="border-b border-slate-200 bg-slate-100 font-semibold text-slate-700">
          <tr>
            <th className="w-32 px-3 py-2">{tr('Date & Time', 'วันและเวลา')}</th>
            <th className="w-40 px-3 py-2">{tr('Actor / Role', 'ผู้ปฏิบัติงาน / บทบาท')}</th>
            <th className="px-3 py-2">{tr('Action & Notes', 'การดำเนินงานและข้อความบันทึก')}</th>
            <th className="w-28 px-3 py-2 text-center">{tr('Status', 'สถานะ')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {timeline.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50/50">
              <td className="px-3 py-2 font-mono whitespace-nowrap text-slate-500">
                {new Date(log.timestamp).toLocaleString(localeOf(lang), {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="px-3 py-2 font-medium text-slate-800">
                {localizeServerText(log.actor, lang)}{' '}
                <span className="text-[10px] text-slate-400">
                  ({localizeServerText(log.actorRole, lang)})
                </span>
              </td>
              <td className="px-3 py-2 text-slate-700">
                <span className="font-semibold text-slate-900">
                  {localizeServerText(log.action, lang)}
                </span>
                {log.notes && (
                  <span className="mt-0.5 block text-[10.5px] text-slate-500">
                    {localizeServerText(log.notes, lang)}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-center">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  {getStatusBadgeText(log.status, lang)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Clipboard summary ───────────────────────────────────────────────────────

function summaryCaseInfo(ticket: ComplaintTicket, info: CategoryInfo, tr: Tr, lang: Language) {
  const type =
    ticket.type === 'complaint'
      ? tr('Complaint', 'ข้อร้องเรียน (Complaint)')
      : tr('Suggestion', 'ข้อเสนอแนะ (Suggestion)');
  const channel = ticket.isDirectToExecutive
    ? tr('Whistleblower Direct to Executive', 'สายตรงผู้บริหาร (Whistleblower Direct to Executive)')
    : tr('Standard intake channel', 'ช่องทางรับเรื่องทั่วไป');
  return `1. ${tr('Request Information', 'ข้อมูลคำร้อง')}
- ${tr('Type', 'ประเภท')}: ${type}
- ${tr('Category', 'หมวดหมู่')}: ${categoryName(info, lang)}
- ${tr('Urgency', 'ความเร่งด่วน')}: ${ticket.urgency} | ${tr('Risk', 'ความเสี่ยง')}: ${ticket.riskSeverity}
- ${tr('Channel', 'ช่องทาง')}: ${channel}
- ${tr('Identity protection', 'สถานะคุ้มครองตัวตน')}: ${PROTECTION_SUMMARY_TEXT[ticket.confidentiality][lang]}`;
}

function summarySubject(ticket: ComplaintTicket, tr: Tr) {
  return `2. ${tr('Subject Matter', 'สาระสำคัญของเรื่อง')}
- ${tr('Title', 'หัวข้อ')}: ${ticket.title}
- ${tr('Department/Location', 'หน่วยงาน/สถานที่')}: ${ticket.locationOrUnit || tr('Not specified', 'ไม่ระบุ')}
- ${tr('Details', 'รายละเอียด')}: ${ticket.description}`;
}

function summaryFindings(ticket: ComplaintTicket, info: CategoryInfo, tr: Tr, lang: Language) {
  const officer =
    localizeServerText(ticket.assignedOfficerName, lang) ||
    tr('Gatekeeper task force', 'คณะทำงาน Gatekeeper');
  const rootCauseSummary =
    ticket.rootCauseSummary ||
    ticket.resolutionSummary ||
    tr('Fact-finding investigation in progress', 'อยู่ระหว่างการสืบสวนข้อเท็จจริง');
  return `3. ${tr('Investigation Findings and Root Cause', 'ผลการสอบสวนและสาเหตุรากเหง้า (Root Cause)')}
- ${tr('Responsible department', 'หน่วยงานที่รับผิดชอบ')}: ${responsibleDepartment(ticket, info, lang)}
- ${tr('Investigating officer', 'เจ้าหน้าที่ผู้สอบสวน')}: ${officer}
- ${tr('Root cause category', 'หมวดหมู่สาเหตุรากเหง้า')}: ${ticket.rootCauseCategory || tr('Being classified', 'อยู่ระหว่างจำแนก')}
- ${tr('Root cause summary', 'สรุปสาเหตุรากเหง้า')}: ${rootCauseSummary}`;
}

function summaryCapa(ticket: ComplaintTicket, tr: Tr) {
  const plan =
    ticket.preventiveActionPlan ||
    ticket.resolutionSummary ||
    tr('Proceed with measures per SOP', 'ดำเนินมาตรการตาม SOP');
  return `4. ${tr('Corrective and Preventive Actions (CAPA)', 'มาตรการแก้ไขและป้องกันการเกิดซ้ำ (CAPA)')}
- ${tr('Corrective and preventive approach', 'แนวทางแก้ไขและป้องกัน')}: ${plan}`;
}

function summaryEvaluation(evaluation: ComplaintTicket['evaluation'], tr: Tr) {
  if (!evaluation) return '';
  const scores = [
    `${tr('Speed', 'ความรวดเร็ว')}: ${evaluation.speedRating}`,
    `${tr('Quality', 'คุณภาพ')}: ${evaluation.resolutionQualityRating}`,
    `${tr('Manner', 'มารยาท')}: ${evaluation.serviceMannerRating}`,
    `${tr('Clarity', 'ความชัดเจน')}: ${evaluation.clarityRating}`,
  ].join(', ');
  return `\n6. ${tr('Satisfaction evaluation', 'ผลการประเมินความพึงพอใจ')}: ${evaluation.overallScore}/5 ${tr('stars', 'ดาว')} (${scores})`;
}

function buildTextSummary(
  ticket: ComplaintTicket,
  reportDocNo: string,
  currentDateFormatted: string,
  tr: Tr,
  lang: Language
): string {
  const info = CATEGORY_DEFINITIONS[ticket.category];
  return `
============================================================
${tr('INVESTIGATION SUMMARY REPORT', 'รายงานสรุปผลการสอบสวนและข้อเท็จจริง (INVESTIGATION SUMMARY REPORT)')}
${tr('Document No.', 'เลขที่เอกสาร')}: ${reportDocNo}
${tr('Tracking Code', 'รหัสติดตามคำร้อง')}: ${ticket.trackingCode}
${tr('Date Prepared', 'วันที่จัดทำ')}: ${currentDateFormatted}
============================================================

${summaryCaseInfo(ticket, info, tr, lang)}

${summarySubject(ticket, tr)}

${summaryFindings(ticket, info, tr, lang)}

${summaryCapa(ticket, tr)}

5. ${tr('Current Status', 'สถานะปัจจุบัน')}: ${getStatusBadgeText(ticket.status, lang)}
${summaryEvaluation(ticket.evaluation, tr)}

============================================================
${tr('Certified by the Governance & Witness Protection Task Force', 'รับรองความถูกต้องโดย คณะทำงานกำกับดูแลและคุ้มครองพยาน')}
============================================================
    `.trim();
}

// ── Printable document sections ─────────────────────────────────────────────

const ReportHeader: React.FC<Readonly<{ reportDocNo: string; currentDateFormatted: string }>> = ({
  reportDocNo,
  currentDateFormatted,
}) => {
  const { tr } = useTr();
  return (
    <div className="border-b-2 border-slate-800 pb-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-base font-bold text-white shadow-xs print:border print:border-slate-800">
              🏢
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 uppercase sm:text-lg">
                ORGANIZATIONAL GRIEVANCE & ETHICS GOVERNANCE
              </h1>
              <p className="text-xs font-medium text-slate-600">
                {tr(
                  'Corporate Ethics & Grievance Oversight Committee',
                  'คณะกรรมการกำกับดูแลจริยธรรมและการรับเรื่องร้องเรียนระดับองค์กร'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Classification Tag & Doc Meta */}
        <div className="space-y-1 text-right sm:border-l sm:border-slate-200 sm:pl-4">
          <span className="inline-block rounded border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-rose-800 uppercase">
            🔒 CONFIDENTIAL & PRIVILEGED
          </span>
          <div className="font-mono text-[11px] text-slate-600">
            <strong>DOC NO:</strong> {reportDocNo}
          </div>
          <div className="text-[11px] text-slate-500">
            <strong>{tr('Print date:', 'วันที่พิมพ์:')}</strong> {currentDateFormatted}
          </div>
        </div>
      </div>

      {/* Document Title Banner */}
      <div className="mt-5 border-t border-slate-200 pt-4 text-center">
        <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
          {tr(
            'Fact-Finding Summary & Corrective Action (CAPA) Report',
            'รายงานสรุปผลการสอบข้อเท็จจริงและมาตรการแก้ไขปัญหา (CAPA)'
          )}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          INVESTIGATION SUMMARY, ROOT CAUSE ASSESSMENT & CORRECTIVE ACTION REPORT
        </p>
      </div>
    </div>
  );
};

/** Section 1: Case Profile Matrix. */
const CaseProfileSection: React.FC<Readonly<{ ticket: ComplaintTicket; info: CategoryInfo }>> = ({
  ticket,
  info,
}) => {
  const { tr, lang } = useTr();
  const typeLabel =
    ticket.type === 'complaint'
      ? tr('⚠️ Complaint', '⚠️ ข้อร้องเรียน (Complaint)')
      : tr('💡 Suggestion', '💡 ข้อเสนอแนะ (Suggestion)');
  const channelLabel = ticket.isDirectToExecutive
    ? tr('👑 Direct to Executive (CEO/EVP)', '👑 สายตรงผู้บริหาร (CEO/EVP)')
    : tr('Standard (Gatekeeper)', 'มาตรฐาน (Gatekeeper)');
  return (
    <div className="space-y-2.5">
      <SectionTitle index={1}>
        {tr(
          'Case Identification & Classification',
          'ข้อมูลสารบบคำร้อง (Case Identification & Classification)'
        )}
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-4 print:bg-white">
        <div>
          <span className="block text-[11px] text-slate-500">
            {tr('Tracking Code:', 'รหัสติดตามคำร้อง:')}
          </span>
          <span className="font-mono text-sm font-bold text-slate-900">{ticket.trackingCode}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-500">
            {tr('Date Received:', 'วันที่รับเรื่องเข้าระบบ:')}
          </span>
          <span className="font-medium text-slate-800">
            {new Date(ticket.createdAt).toLocaleDateString(localeOf(lang), {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-500">
            {tr('Request Type:', 'ประเภทคำร้อง:')}
          </span>
          <span className="font-semibold text-slate-800">{typeLabel}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-500">
            {tr('Current Status:', 'สถานะปัจจุบัน:')}
          </span>
          <span className="font-bold text-indigo-900">
            {getStatusBadgeText(ticket.status, lang)}
          </span>
        </div>

        <div>
          <span className="block text-[11px] text-slate-500">
            {tr('Category:', 'หมวดหมู่เรื่อง:')}
          </span>
          <span className="font-semibold text-slate-900">{categoryName(info, lang)}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-500">
            {tr('Urgency Level:', 'ระดับความเร่งด่วน:')}
          </span>
          <span className="font-bold text-slate-800">
            {getUrgencyBadgeText(ticket.urgency, lang)}
          </span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-500">
            {tr('Risk Level:', 'ระดับความเสี่ยง:')}
          </span>
          <span className="font-bold text-slate-800">
            {getRiskSeverityBadgeText(ticket.riskSeverity, lang)}
          </span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-500">
            {tr('Intake Channel:', 'ช่องทางการรับเรื่อง:')}
          </span>
          <span className="font-semibold text-slate-800">{channelLabel}</span>
        </div>
      </div>
    </div>
  );
};

/** Section 2: Submitter & Witness Protection Status. */
const ProtectionSection: React.FC<Readonly<{ ticket: ComplaintTicket; info: CategoryInfo }>> = ({
  ticket,
  info,
}) => {
  const { tr, lang } = useTr();
  return (
    <div className="space-y-2.5">
      <SectionTitle index={2}>
        {tr(
          'Witness & Privacy Protection',
          'สถานะการคุ้มครองพยานและผู้ยื่นเรื่อง (Witness & Privacy Protection)'
        )}
      </SectionTitle>

      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs sm:flex-row sm:items-center print:bg-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ProtectionBadge level={ticket.confidentiality} />
            <span className="text-[11px] text-slate-500">
              {tr(
                'PDPA Section 26 data protection standard',
                'มาตรฐานคุ้มครองข้อมูล PDPA มาตรา 26'
              )}
            </span>
          </div>
          <p className="text-[11px] text-slate-600">{getProtectionNote(ticket, tr)}</p>
        </div>

        <div className="shrink-0 border-t pt-2 text-[11px] text-slate-500 sm:border-t-0 sm:border-l sm:border-slate-200 sm:pt-0 sm:pl-4 sm:text-right">
          <div>
            <strong>{tr('Responsible Department:', 'หน่วยงานผู้รับผิดชอบ:')}</strong>{' '}
            {responsibleDepartment(ticket, info, lang)}
          </div>
          <div>
            <strong>{tr('Lead Investigator:', 'ผู้สอบสวนหลัก:')}</strong>{' '}
            {localizeServerText(ticket.assignedOfficerName, lang) ||
              tr('Department Gatekeeper officer', 'เจ้าหน้าที่ Gatekeeper ประจำฝ่าย')}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Section 3: Summary of Allegation / Fact Statement. */
const StatementSection: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket }) => {
  const { tr } = useTr();
  return (
    <div className="space-y-2.5">
      <SectionTitle index={3}>
        {tr(
          'Statement of Incident / Grievance',
          'สาระสำคัญของข้อเท็จจริงที่ได้รับแจ้ง (Statement of Incident / Grievance)'
        )}
      </SectionTitle>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs print:bg-white">
        <div>
          <span className="block text-[11px] font-medium text-slate-500">
            {tr('Subject:', 'หัวข้อเรื่อง:')}
          </span>
          <h4 className="mt-0.5 text-sm font-bold text-slate-900">{ticket.title}</h4>
        </div>

        {ticket.locationOrUnit && (
          <div>
            <span className="block text-[11px] font-medium text-slate-500">
              {tr(
                'Location / Department / Related Unit:',
                'สถานที่ / แผนก / หน่วยงานที่เกี่ยวข้อง:'
              )}
            </span>
            <p className="mt-0.5 text-slate-700">{ticket.locationOrUnit}</p>
          </div>
        )}

        <div>
          <span className="block text-[11px] font-medium text-slate-500">
            {tr('Facts as stated in the request:', 'รายละเอียดข้อเท็จจริงตามคำร้อง:')}
          </span>
          <p className="mt-1 rounded-lg border border-slate-200 bg-white p-3 leading-relaxed whitespace-pre-line text-slate-700">
            {ticket.description}
          </p>
        </div>

        {!!ticket.attachments?.length && (
          <div>
            <span className="block text-[11px] font-medium text-slate-500">
              {tr('Supporting documents and evidence:', 'เอกสารและหลักฐานประกอบสำนวน:')}
            </span>
            <ul className="mt-1 space-y-1">
              {ticket.attachments.map((att) => (
                <li
                  key={att.id}
                  className="mr-2 inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700"
                >
                  <span>📎</span>
                  <span className="font-medium">{att.name}</span>
                  <span className="font-mono text-slate-400">({att.size})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

/** Section 4: Investigation Findings & Root Cause Analysis. */
const FindingsSection: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket }) => {
  const { tr } = useTr();
  return (
    <div className="space-y-2.5">
      <SectionTitle index={4}>
        {tr(
          'Investigation Findings & Root Cause',
          'ผลการสอบสวนข้อเท็จจริงและสาเหตุรากเหง้า (Investigation Findings & Root Cause)'
        )}
      </SectionTitle>

      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 print:bg-white">
          <span className="block text-[11px] text-slate-500">
            {tr('Root Cause Category:', 'การจำแนกสาเหตุรากเหง้า (Root Cause Category):')}
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-lg border border-indigo-200 bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-900">
              {ticket.rootCauseCategory || tr('Process', 'Process (กระบวนการ)')}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {tr(
              'Classified under the 5M standard: Process, People, Tools, Policy, Workplace/Facilities',
              'จำแนกตามมาตรฐาน 5M: Process, People, Tools, Policy, Workplace/Facilities'
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:col-span-2 print:bg-white">
          <span className="block text-[11px] text-slate-500">
            {tr('Root Cause Summary:', 'สรุปสาเหตุรากเหง้าที่แท้จริง (Root Cause Summary):')}
          </span>
          <p className="mt-1 leading-relaxed font-medium text-slate-800">
            {ticket.rootCauseSummary ||
              tr(
                'The final investigation summary is being compiled',
                'อยู่ระหว่างการประมวลผลสรุปสำนวนการสอบสวนขั้นสุดท้าย'
              )}
          </p>
        </div>
      </div>

      {ticket.resolutionSummary && (
        <div className="space-y-1 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs print:bg-white">
          <span className="flex items-center gap-1.5 font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              {tr('Resolution Summary:', 'ผลการดำเนินการแก้ไขและข้อสรุป (Resolution Summary):')}
            </span>
          </span>
          <p className="pl-5 leading-relaxed text-slate-700">{ticket.resolutionSummary}</p>
        </div>
      )}
    </div>
  );
};

/** Section 5: Corrective & Preventive Action Plan (CAPA). */
const CapaSection: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket }) => {
  const { tr } = useTr();
  return (
    <div className="space-y-2.5">
      <SectionTitle index={5}>
        {tr(
          'Corrective & Preventive Action Plan - CAPA',
          'มาตรการแก้ไขและป้องกันการเกิดซ้ำ (Corrective & Preventive Action Plan - CAPA)'
        )}
      </SectionTitle>

      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs print:bg-white">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-600 text-[10px] font-bold text-white">
            ✓
          </div>
          <div>
            <h5 className="font-bold text-slate-900">
              {tr(
                'Systematic Prevention:',
                'แผนงานป้องกันการเกิดซ้ำเชิงระบบ (Systematic Prevention):'
              )}
            </h5>
            <p className="mt-1 leading-relaxed text-slate-700">
              {ticket.preventiveActionPlan ||
                tr(
                  "Establish monitoring measures and improve the department's standard operating procedures (SOP)",
                  'จัดตั้งมาตรการเฝ้าระวังและปรับปรุงระเบียบปฏิบัติงาน (SOP) ประจำหน่วยงาน'
                )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Section 8: Formal Signatures & Endorsements. */
const SignaturesSection: React.FC<Readonly<{ ticket: ComplaintTicket }>> = ({ ticket }) => {
  const { tr, lang } = useTr();
  const officerName = localizeServerText(ticket.assignedOfficerName, lang);
  return (
    <div className="break-inside-avoid-page space-y-4 border-t-2 border-slate-800 pt-8">
      <div className="text-center text-xs font-medium text-slate-500">
        {tr(
          'This report was prepared under the regulations of the Ethics & Grievance Oversight Committee and verified against international standards.',
          'รายงานนี้จัดทำขึ้นตามระเบียบคณะกรรมการกำกับดูแลจริยธรรมและการรับเรื่องร้องเรียน ผ่านการตรวจสอบข้อเท็จจริงตามมาตรฐานสากล'
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 pt-4 text-center sm:grid-cols-3">
        {/* Officer Signature */}
        <SignatureBlock
          signature={officerName || 'มนตรี ธนบดีกุล'}
          name={
            officerName ||
            tr('Senior Legal Officer / Investigating Officer', 'นิติกรอาวุโส / เจ้าหน้าที่สอบสวน')
          }
          role={tr('Fact-Finding Investigator', 'เจ้าหน้าที่ผู้สอบสวนข้อเท็จจริง')}
        />

        {/* Gatekeeper Lead Signature */}
        <SignatureBlock
          signature="ภานุมาศ สัจจาภิรมย์"
          name="ภานุมาศ สัจจาภิรมย์"
          role={tr('Head of Gatekeeper, Business Line', 'หัวหน้าฝ่าย Gatekeeper ประจำสายงาน')}
        />

        {/* Executive / GRC Chair Signature */}
        <SignatureBlock
          signature="ดร. ปิยะวัฒน์ วิเชียรเกื้อ"
          name="ดร. ปิยะวัฒน์ วิเชียรเกื้อ"
          role={tr(
            'Chair, Audit & Governance Committee (GRC)',
            'ประธานคณะกรรมการตรวจสอบและธรรมาภิบาล (GRC)'
          )}
        />
      </div>

      {/* Official Security Stamp Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-6 font-mono text-[10px] text-slate-400">
        <div>
          HASH: SHA256-INV-SEC-{ticket.trackingCode.replaceAll(/[^A-Za-z0-9]/g, '')}
          -ENTERPRISE
        </div>
        <div>CONFIDENTIAL DOCUMENT • INTERNAL AUDIT TRAIL VERIFIED</div>
      </div>
    </div>
  );
};

export const InvestigationReportModal: React.FC<Readonly<InvestigationReportModalProps>> = ({
  ticket,
  onClose,
}) => {
  const { tr, lang } = useTr();
  const [copied, setCopied] = useState(false);

  if (!ticket) return null;

  const categoryInfo = CATEGORY_DEFINITIONS[ticket.category];
  const reportDocNo = `REP-INV-${ticket.trackingCode.replace('TK-', '')}-${new Date(ticket.createdAt).getFullYear()}`;
  const currentDateFormatted = new Date().toLocaleDateString(localeOf(lang), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    globalThis.print();
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(
      buildTextSummary(ticket, reportDocNo, currentDateFormatted, tr, lang)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLabel = copied
    ? { en: 'Copied!', th: 'คัดลอกแล้ว' }
    : { en: 'Copy Text', th: 'คัดลอกข้อความ' };

  // Rendered into <body> (portal) so `@media print` in globals.css can hide the rest of the
  // app and print only this report, un-clipped by the tracking modal's fixed/overflow wrappers.
  return createPortal(
    <div className="print-report-root fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/75 p-2 backdrop-blur-xs sm:p-4 print:static print:block print:overflow-visible print:bg-white print:p-0">
      {/* Container - Styled as Paper Document */}
      <div
        id="printable-investigation-report"
        className="animate-in fade-in zoom-in-95 my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl print:w-full print:max-w-none print:overflow-visible print:rounded-none print:border-none print:shadow-none"
      >
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-5 py-3.5 text-white print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/40 bg-indigo-600/60">
              <FileText className="h-4 w-4 text-indigo-200" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-tight sm:text-sm">
                {tr(
                  'Official Investigation & CAPA Report',
                  'รายงานสรุปผลการสอบสวนและมาตรการแก้ไข (Official Report)'
                )}
              </h3>
              <p className="font-mono text-[11px] text-slate-400">
                {reportDocNo} • {ticket.trackingCode}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-copy-report-summary"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
              title={tr('Copy summary text', 'คัดลอกข้อความสรุป')}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copyLabel[lang]}</span>
            </button>

            <button
              type="button"
              id="btn-print-report"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{tr('Print / Save PDF', 'พิมพ์รายงาน / บันทึก PDF')}</span>
            </button>

            <button
              type="button"
              id="btn-close-report-modal"
              aria-label={tr('Close report', 'ปิดรายงาน')}
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="max-h-[85vh] space-y-6 overflow-y-auto p-6 text-slate-800 sm:p-10 print:max-h-none print:overflow-visible print:p-8">
          <ReportHeader reportDocNo={reportDocNo} currentDateFormatted={currentDateFormatted} />
          <CaseProfileSection ticket={ticket} info={categoryInfo} />
          <ProtectionSection ticket={ticket} info={categoryInfo} />
          <StatementSection ticket={ticket} />
          <FindingsSection ticket={ticket} />
          <CapaSection ticket={ticket} />

          {/* Section 6: Employee CSAT Satisfaction Evaluation (If applicable) */}
          {ticket.evaluation && <CsatSection evaluation={ticket.evaluation} />}

          {/* Section 7: Chronological Audit Trail Log */}
          <div className="space-y-2.5">
            <SectionTitle index={7}>
              {tr(
                'Chronological Audit Trail',
                'บันทึกลำดับเหตุการณ์และประวัติการดำเนินงาน (Chronological Audit Trail)'
              )}
            </SectionTitle>
            <AuditTrailTable timeline={ticket.timeline} />
          </div>

          <SignaturesSection ticket={ticket} />
        </div>
      </div>
    </div>,
    document.body
  );
};
