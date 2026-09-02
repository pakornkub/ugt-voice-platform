'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  X,
  FileSpreadsheet,
  FileCode,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Lightbulb,
  ShieldCheck,
  TrendingUp,
  Clock,
  HeartHandshake,
  Database as DatabaseIcon,
  Play,
  Terminal,
  Upload,
  RefreshCw,
  Table,
  Check
} from 'lucide-react';
import { ComplaintTicket, GrievanceCategory, TicketStatus } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';
import { 
  downloadSqliteDatabaseFile, 
  executeSqlAnalyticsQuery, 
  importSqliteDatabaseFile,
  syncAllTicketsToSqlite,
  getSqliteDb
} from '../services/sqliteDb';

interface ExportAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: ComplaintTicket[];
}

export type ExportDatasetType = 'comprehensive' | 'operational_sla' | 'root_cause_capa' | 'csat_quality';
export type ExportFileFormat = 'sqlite' | 'csv' | 'json';

export const ExportAnalyticsModal: React.FC<ExportAnalyticsModalProps> = ({
  isOpen,
  onClose,
  tickets = [],
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFileFormat>('sqlite');
  const [datasetType, setDatasetType] = useState<ExportDatasetType>('comprehensive');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'export' | 'sql_studio' | 'guide'>('export');

  // SQL Studio State
  const [sqlQuery, setSqlQuery] = useState<string>(
    `-- รายงานวิเคราะห์จำนวนข้อร้องเรียนและอัตราแก้ไขสำเร็จ แยกตามหมวดหมู่
SELECT 
  category AS "หมวดหมู่",
  COUNT(*) AS "จำนวนเรื่องทั้งหมด",
  SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS "แก้ไขสำเร็จ",
  ROUND(AVG(sla_target_hours), 1) AS "SLA เฉลี่ย (ชม.)",
  SUM(CASE WHEN is_direct_to_executive = 1 THEN 1 ELSE 0 END) AS "สายตรงผู้บริหาร"
FROM tickets
GROUP BY category
ORDER BY COUNT(*) DESC;`
  );
  const [sqlResult, setSqlResult] = useState<{ columns: string[]; rows: any[][]; executionTimeMs: number; error?: string } | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Sync SQLite when modal opens
  useEffect(() => {
    if (isOpen && tickets.length > 0) {
      syncAllTicketsToSqlite(tickets).catch((err) => {
        console.warn('Initial SQLite sync error:', err);
      });
    }
  }, [isOpen, tickets]);

  // Execute initial SQL query when opening SQL studio tab
  const runSqlQuery = async (queryToRun?: string) => {
    const q = queryToRun || sqlQuery;
    setIsExecutingSql(true);
    try {
      const res = await executeSqlAnalyticsQuery(q);
      setSqlResult(res);
    } catch (err: any) {
      setSqlResult({
        columns: [],
        rows: [],
        executionTimeMs: 0,
        error: err?.message || 'SQL Execution Error',
      });
    } finally {
      setIsExecutingSql(false);
    }
  };

  // Filtered tickets based on selections
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Department filter
      if (departmentFilter !== 'ALL' && ticket.category !== departmentFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && ticket.status !== statusFilter) {
        return false;
      }
      // Time range filter
      if (timeRange !== 'ALL') {
        const ticketDate = new Date(ticket.createdAt);
        const now = new Date('2026-09-01T00:00:00Z');
        const diffDays = (now.getTime() - ticketDate.getTime()) / (1000 * 3600 * 24);
        if (timeRange === '7d' && diffDays > 7) return false;
        if (timeRange === '30d' && diffDays > 30) return false;
        if (timeRange === '90d' && diffDays > 90) return false;
      }
      return true;
    });
  }, [tickets, departmentFilter, statusFilter, timeRange]);

  // Analytics Metrics Preview
  const metrics = useMemo(() => {
    const total = filteredTickets.length;
    if (total === 0) {
      return { total: 0, resolvedRate: 0, avgResolutionHours: 0, avgCsat: 0, slaMetRate: 0 };
    }
    const resolved = filteredTickets.filter((t) => t.status === 'resolved' || t.status === 'closed');
    const evaluated = filteredTickets.filter((t) => t.evaluation && t.evaluation.overallScore > 0);
    const avgCsat = evaluated.length > 0
      ? evaluated.reduce((acc, curr) => acc + (curr.evaluation?.overallScore || 0), 0) / evaluated.length
      : 0;

    const slaMet = filteredTickets.filter((t) => t.slaStatus === 'met' || t.slaStatus === 'on_track');
    
    // Calculate avg resolution time
    let totalHours = 0;
    let countedResolved = 0;
    resolved.forEach((t) => {
      if (t.resolvedAt && t.createdAt) {
        const diff = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600);
        if (diff > 0) {
          totalHours += diff;
          countedResolved++;
        }
      }
    });

    return {
      total,
      resolvedRate: Math.round((resolved.length / total) * 100),
      avgResolutionHours: countedResolved > 0 ? Math.round(totalHours / countedResolved) : 48,
      avgCsat: Number(avgCsat.toFixed(1)),
      slaMetRate: Math.round((slaMet.length / total) * 100),
    };
  }, [filteredTickets]);

  if (!isOpen) return null;

  // Helper to escape CSV string
  const escapeCsv = (val: any): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Generate enriched analytics records
  const generateExportData = () => {
    return filteredTickets.map((t) => {
      let resolutionLeadTimeHours = '';
      if (t.resolvedAt && t.createdAt) {
        const diff = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600);
        resolutionLeadTimeHours = diff > 0 ? diff.toFixed(1) : '';
      }

      let triageLeadTimeHours = '';
      const triageLog = t.timeline?.find((l) => l.action.includes('รับเรื่อง') || l.action.includes('Triage') || l.status === 'gatekeeper_triaged');
      if (triageLog && triageLog.timestamp && t.createdAt) {
        const diff = (new Date(triageLog.timestamp).getTime() - new Date(t.createdAt).getTime()) / (1000 * 3600);
        triageLeadTimeHours = diff > 0 ? diff.toFixed(1) : '';
      }

      return {
        trackingCode: t.trackingCode,
        createdAt: t.createdAt,
        type: t.type === 'complaint' ? 'ข้อร้องเรียน (Complaint)' : 'ข้อเสนอแนะ (Suggestion)',
        categoryKey: t.category,
        categoryNameTh: CATEGORY_DEFINITIONS[t.category]?.nameTh || t.category,
        responsibleDept: CATEGORY_DEFINITIONS[t.category]?.responsibleDept || t.gatekeeperDepartment || '',
        locationOrUnit: t.locationOrUnit || '',
        isDirectToExecutive: t.isDirectToExecutive ? 'ใช่ (CEO Direct / Whistleblower)' : 'ไม่ใช่ (Standard)',
        confidentiality: t.confidentiality === 'anonymous' ? 'ไม่ระบุตัวตน (Anonymous)' : t.confidentiality === 'confidential_restricted' ? 'ปิดเป็นความลับ (Confidential)' : 'เปิดเผยชื่อ (Standard)',
        submitterDepartment: t.submitterDepartment || (t.confidentiality === 'anonymous' ? 'ปกปิด (Anonymous)' : '-'),
        title: t.title,
        description: t.description,
        urgency: t.urgency,
        riskSeverity: t.riskSeverity,
        sentiment: t.sentiment || 'Neutral',
        status: t.status,
        statusLabelTh: t.status === 'submitted' ? 'ยื่นเรื่องใหม่' : t.status === 'gatekeeper_triaged' ? 'รับเรื่องแล้ว' : t.status === 'in_progress' ? 'กำลังแก้ไข' : t.status === 'resolved' ? 'แก้ไขเสร็จสิ้น' : 'ปิดเรื่อง',
        assignedOfficerName: t.assignedOfficerName || '-',
        slaTargetHours: t.slaTargetHours,
        slaStatus: t.slaStatus,
        slaBreached: t.slaStatus === 'overdue' ? 'เกินกำหนด SLA' : 'อยู่ในเกณฑ์ SLA',
        triageLeadTimeHours: triageLeadTimeHours || '-',
        resolutionLeadTimeHours: resolutionLeadTimeHours || '-',
        resolvedAt: t.resolvedAt || '-',
        closedAt: t.closedAt || '-',
        rootCauseCategory: t.rootCauseCategory || '-',
        rootCauseSummary: t.rootCauseSummary || '-',
        preventiveActionPlan: t.preventiveActionPlan || '-',
        clusterGroup: t.clusterGroup || '-',
        resolutionSummary: t.resolutionSummary || '-',
        hasAttachments: t.attachments && t.attachments.length > 0 ? `มี (${t.attachments.length} ไฟล์)` : 'ไม่มี',
        csatOverallScore: t.evaluation?.overallScore ? `${t.evaluation.overallScore}/5` : '-',
        csatSpeedRating: t.evaluation?.speedRating ? `${t.evaluation.speedRating}/5` : '-',
        csatQualityRating: t.evaluation?.resolutionQualityRating ? `${t.evaluation.resolutionQualityRating}/5` : '-',
        csatMannerRating: t.evaluation?.serviceMannerRating ? `${t.evaluation.serviceMannerRating}/5` : '-',
        csatPermanentlyResolved: t.evaluation?.isResolvedPermanently !== undefined ? (t.evaluation.isResolvedPermanently ? 'หายขาดถาวร' : 'ยังไม่หายขาด') : '-',
        csatFeedbackComment: t.evaluation?.feedbackComment || '-',
        csatImprovementSuggestions: t.evaluation?.improvementSuggestions || '-',
      };
    });
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (selectedFormat === 'sqlite') {
        // Direct binary .sqlite file download
        await downloadSqliteDatabaseFile(`enterprise_grievance_v3_${new Date().toISOString().slice(0, 10)}.sqlite`);
      } else if (selectedFormat === 'json') {
        const rawData = generateExportData();
        const exportPayload = {
          metadata: {
            system: 'Enterprise Grievance & Whistleblower System',
            version: '3.0.0',
            exportedAt: new Date().toISOString(),
            datasetType,
            totalRecords: rawData.length,
            filters: {
              department: departmentFilter,
              status: statusFilter,
              timeRange,
            },
            summaryMetrics: metrics,
          },
          data: rawData,
        };
        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `grievance_data_${datasetType}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // CSV Format
        const data = generateExportData();
        const headers = [
          'รหัสคำร้อง (Tracking Code)',
          'วันที่และเวลายื่นเรื่อง (Created At)',
          'ประเภทคำร้อง (Type)',
          'รหัสหมวดหมู่ (Category Key)',
          'ชื่อหมวดหมู่ภาษาไทย (Category Name)',
          'หน่วยงานที่รับผิดชอบ (Responsible Dept)',
          'สถานที่หรือหน่วยงานย่อย (Location/Unit)',
          'ช่องทางสายตรงผู้บริหาร/Whistleblower (Direct CEO)',
          'ระดับการปกปิดข้อมูล (Confidentiality)',
          'สังกัดฝ่ายของผู้แจ้ง (Submitter Dept)',
          'หัวข้อเรื่องร้องเรียน (Title)',
          'รายละเอียดข้อร้องเรียน (Description)',
          'ระดับความเร่งด่วน (Urgency)',
          'ระดับความเสี่ยง (Risk Severity)',
          'การวิเคราะห์ความรู้สึก AI (Sentiment)',
          'รหัสสถานะ (Status Key)',
          'สถานะการดำเนินงาน (Status Label)',
          'เจ้าหน้าที่ผู้รับผิดชอบ (Assigned Officer)',
          'เป้าหมาย SLA (SLA Target Hours)',
          'สถานะ SLA (SLA Status)',
          'การปฏิบัติตาม SLA (SLA Compliance)',
          'เวลาคัดกรองเรื่อง ชม. (Triage Lead Time)',
          'เวลาแก้ไขแล้วเสร็จ ชม. (Resolution Lead Time)',
          'วันที่แก้ไขเสร็จ (Resolved At)',
          'วันที่ปิดเรื่องสมบูรณ์ (Closed At)',
          'หมวดหมู่สาเหตุรากเหง้า (Root Cause Category)',
          'สรุปสาเหตุรากเหง้า (Root Cause Summary)',
          'แผนปฏิบัติการป้องกันการเกิดซ้ำ (CAPA Preventive Action)',
          'กลุ่มปัญหาที่จัดคลัสเตอร์ (Cluster Group)',
          'สรุปผลการแก้ไข (Resolution Summary)',
          'ไฟล์แนบหลักฐาน (Attachments)',
          'คะแนนความพึงพอใจรวม (CSAT Overall)',
          'คะแนนความรวดเร็ว (CSAT Speed)',
          'คะแนนคุณภาพการแก้ปัญหา (CSAT Quality)',
          'คะแนนกิริยามารยาทบริการ (CSAT Manner)',
          'ปัญหาได้รับการแก้ไขหายขาดหรือไม่ (Permanently Resolved)',
          'ความคิดเห็นพนักงาน (CSAT Feedback)',
          'ข้อเสนอแนะในการปรับปรุง (Improvement Suggestions)',
        ];

        const rows = data.map((d) => [
          escapeCsv(d.trackingCode),
          escapeCsv(d.createdAt),
          escapeCsv(d.type),
          escapeCsv(d.categoryKey),
          escapeCsv(d.categoryNameTh),
          escapeCsv(d.responsibleDept),
          escapeCsv(d.locationOrUnit),
          escapeCsv(d.isDirectToExecutive),
          escapeCsv(d.confidentiality),
          escapeCsv(d.submitterDepartment),
          escapeCsv(d.title),
          escapeCsv(d.description),
          escapeCsv(d.urgency),
          escapeCsv(d.riskSeverity),
          escapeCsv(d.sentiment),
          escapeCsv(d.status),
          escapeCsv(d.statusLabelTh),
          escapeCsv(d.assignedOfficerName),
          escapeCsv(d.slaTargetHours),
          escapeCsv(d.slaStatus),
          escapeCsv(d.slaBreached),
          escapeCsv(d.triageLeadTimeHours),
          escapeCsv(d.resolutionLeadTimeHours),
          escapeCsv(d.resolvedAt),
          escapeCsv(d.closedAt),
          escapeCsv(d.rootCauseCategory),
          escapeCsv(d.rootCauseSummary),
          escapeCsv(d.preventiveActionPlan),
          escapeCsv(d.clusterGroup),
          escapeCsv(d.resolutionSummary),
          escapeCsv(d.hasAttachments),
          escapeCsv(d.csatOverallScore),
          escapeCsv(d.csatSpeedRating),
          escapeCsv(d.csatQualityRating),
          escapeCsv(d.csatMannerRating),
          escapeCsv(d.csatPermanentlyResolved),
          escapeCsv(d.csatFeedbackComment),
          escapeCsv(d.csatImprovementSuggestions),
        ].join(','));

        const csvContent = '\uFEFF' + headers.map(escapeCsv).join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `grievance_bi_analytics_${datasetType}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Export failed:', err);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportStatus('กำลังนำเข้าฐานข้อมูล SQLite...');
      const count = await importSqliteDatabaseFile(file);
      setImportStatus(`นำเข้าสำเร็จ! พบ ${count} รายการในฐานข้อมูล`);
      setTimeout(() => setImportStatus(null), 4000);
      runSqlQuery();
    } catch (err: any) {
      setImportStatus(`เกิดข้อผิดพลาด: ${err.message}`);
    }
  };

  const PRESET_QUERIES = [
    {
      title: '1. สรุปภาพรวม & พาเรโต (Pareto by Category)',
      sql: `SELECT 
  category AS "หมวดหมู่",
  COUNT(*) AS "จำนวนเคส",
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tickets), 1) || '%' AS "สัดส่วน %",
  SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS "แก้ไขสำเร็จ"
FROM tickets
GROUP BY category
ORDER BY COUNT(*) DESC;`,
    },
    {
      title: '2. ตรวจสอบเคสเกินกำหนด SLA (SLA Breaches)',
      sql: `SELECT 
  tracking_code AS "รหัสคำร้อง",
  category AS "หมวดหมู่",
  title AS "หัวข้อ",
  urgency AS "ความเร่งด่วน",
  sla_target_hours AS "SLA (ชม.)",
  status AS "สถานะปัจจุบัน",
  assigned_officer_name AS "ผู้รับผิดชอบ"
FROM tickets
WHERE sla_status = 'breached' OR status = 'in_progress'
ORDER BY created_at ASC;`,
    },
    {
      title: '3. สรุปคะแนน CSAT และการแก้ปัญหาถาวร',
      sql: `SELECT 
  t.category AS "หมวดหมู่",
  COUNT(e.ticket_tracking_code) AS "จำนวนผู้ประเมิน",
  ROUND(AVG(e.overall_score), 2) AS "คะแนนรวมเฉลี่ย",
  ROUND(AVG(e.speed_rating), 2) AS "ความเร็วเฉลี่ย",
  ROUND(AVG(e.resolution_quality_rating), 2) AS "คุณภาพเฉลี่ย",
  SUM(e.is_resolved_permanently) AS "แก้หายขาด (เคส)"
FROM tickets t
JOIN ticket_evaluations e ON t.tracking_code = e.ticket_tracking_code
GROUP BY t.category;`,
    },
    {
      title: '4. สาเหตุรากเหง้า (RCA Category Breakdown)',
      sql: `SELECT 
  IFNULL(NULLIF(root_cause_category, ''), 'ยังไม่ระบุ') AS "สาเหตุรากเหง้า (RCA)",
  COUNT(*) AS "จำนวนเรื่อง",
  GROUP_CONCAT(DISTINCT category) AS "หมวดหมู่ที่พบ"
FROM tickets
GROUP BY root_cause_category
ORDER BY COUNT(*) DESC;`,
    },
    {
      title: '5. ช่องทางสายตรงผู้บริหาร (Whistleblower)',
      sql: `SELECT 
  tracking_code AS "รหัสเคส",
  category AS "หมวดหมู่",
  title AS "หัวข้อ",
  confidentiality AS "ระดับความลับ",
  urgency AS "ความเร่งด่วน",
  status AS "สถานะ",
  created_at AS "วันที่แจ้ง"
FROM tickets
WHERE is_direct_to_executive = 1
ORDER BY created_at DESC;`,
    },
  ];

  return (
    <div
      id="modal-export-analytics"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 px-6 py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <DatabaseIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">ศูนย์ข้อมูล SQLite & ส่งออกข้อมูลวิเคราะห์ (SQLite & BI Data Hub)</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[10px] font-semibold border border-emerald-400/30">
                  SQLite in Browser (Wasm)
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                จัดเก็บข้อมูลทั้งหมดในรูปแบบฐานข้อมูลเชิงสัมพันธ์ SQLite สามารถรันคำสั่ง SQL หรือดาวน์โหลดไฟล์ .sqlite ไปเปิดได้ทันที
              </p>
            </div>
          </div>
          <button
            id="btn-close-export-modal"
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 pt-3 flex items-center gap-2 shrink-0">
          <button
            id="tab-export-config"
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>ดาวน์โหลดข้อมูล (.sqlite, Excel CSV, JSON)</span>
          </button>
          <button
            id="tab-sql-studio"
            type="button"
            onClick={() => {
              setActiveTab('sql_studio');
              if (!sqlResult) runSqlQuery();
            }}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'sql_studio'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-600" />
            <span>SQLite Query Studio (รัน SQL สดบนเว็บ)</span>
          </button>
          <button
            id="tab-export-guide"
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            <span>คู่มือมิติข้อมูลสำหรับปรับปรุงองค์กร</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'export' ? (
            <>
              {/* SQLite Highlight Banner */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                  <DatabaseIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">
                      ฐานข้อมูล SQLite ภายในเบราว์เซอร์ (Client-Side SQLite Engine)
                    </h4>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                      Active
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    ระบบได้แปลงโครงสร้างข้อมูลเป็นตาราง Relational Tables (ได้แก่ <code className="bg-white px-1 py-0.5 rounded border text-slate-700">tickets</code>, <code className="bg-white px-1 py-0.5 rounded border text-slate-700">ticket_timeline</code>, <code className="bg-white px-1 py-0.5 rounded border text-slate-700">ticket_evaluations</code>, <code className="bg-white px-1 py-0.5 rounded border text-slate-700">gatekeeper_officers</code>, <code className="bg-white px-1 py-0.5 rounded border text-slate-700">executive_members</code>) พร้อม Indexing เรียบร้อยแล้ว
                  </p>
                </div>
              </div>

              {/* Format Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. เลือกรูปแบบไฟล์ที่ต้องการดาวน์โหลด (File Format)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    id="format-select-sqlite"
                    onClick={() => setSelectedFormat('sqlite')}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      selectedFormat === 'sqlite'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <DatabaseIcon className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs font-bold">SQLite Database (.sqlite)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        ไฟล์ฐานข้อมูล Binary สมบูรณ์ เปิดด้วย <strong>DB Browser for SQLite, DBeaver, TablePlus</strong> หรือ Python sqlite3 ได้ 100%
                      </p>
                    </div>
                    {selectedFormat === 'sqlite' && (
                      <div className="mt-2 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> เลือกอยู่ (แนะนำ)
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    id="format-select-csv"
                    onClick={() => setSelectedFormat('csv')}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      selectedFormat === 'csv'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs font-bold">Excel CSV (UTF-8 BOM)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        ตาราง 38 มิติข้อมูล เปิดใน Microsoft Excel, Google Sheets ภาษาไทยสระไม่เพี้ยน
                      </p>
                    </div>
                    {selectedFormat === 'csv' && (
                      <div className="mt-2 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> เลือกอยู่
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    id="format-select-json"
                    onClick={() => setSelectedFormat('json')}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      selectedFormat === 'json'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <FileCode className="w-5 h-5 text-indigo-600" />
                        <span className="text-xs font-bold">JSON Document</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        โครงสร้าง JSON พร้อม Metadata เหมาะสำหรับต่อ API Pipeline หรือ Python Pandas
                      </p>
                    </div>
                    {selectedFormat === 'json' && (
                      <div className="mt-2 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> เลือกอยู่
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Dataset Scope Cards (For CSV / JSON) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. เลือกโปรไฟล์ข้อมูลสำหรับการวิเคราะห์ (Dataset Profile)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      id: 'comprehensive',
                      name: 'ชุดข้อมูลวิเคราะห์ครบวงจร',
                      sub: 'BI Comprehensive (38 มิติข้อมูล)',
                      desc: 'รวมข้อมูลเรื่องร้องเรียน, SLA Lead Time, RCA สาเหตุต้นตอ, แผน CAPA และคะแนน CSAT ครบทุกคอลัมน์',
                      icon: <BarChart3 className="w-4 h-4 text-emerald-600" />,
                    },
                    {
                      id: 'operational_sla',
                      name: 'ประสิทธิภาพการปฏิบัติงาน & SLA',
                      sub: 'SLA & Operations Performance',
                      desc: 'เน้นวิเคราะห์เวลาตอบรับ (Triage Time), เวลาแก้ไข (Lead Time) และจุดติดขัดรายหน่วยงาน',
                      icon: <Clock className="w-4 h-4 text-blue-600" />,
                    },
                    {
                      id: 'root_cause_capa',
                      name: 'สาเหตุต้นตอ & แผนป้องกันซ้ำ',
                      sub: 'RCA & CAPA Action Plans',
                      desc: 'วิเคราะห์การจัดกลุ่มความถี่ (Ishikawa / 5-Why) และติดตามผลมาตรการปรับปรุงกระบวนการ',
                      icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
                    },
                    {
                      id: 'csat_quality',
                      name: 'ความพึงพอใจพนักงาน & CSAT',
                      sub: 'Employee Voice & CSAT Quality',
                      desc: 'วิเคราะห์คะแนนความพึงพอใจ 4 ด้าน และความคิดเห็นเสนอแนะจากพนักงานหลังปิดเรื่อง',
                      icon: <HeartHandshake className="w-4 h-4 text-rose-600" />,
                    },
                  ].map((ds) => (
                    <button
                      key={ds.id}
                      type="button"
                      onClick={() => setDatasetType(ds.id as ExportDatasetType)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        datasetType === ds.id
                          ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          {ds.icon}
                          <span className="text-xs font-bold text-slate-900">{ds.name}</span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mb-1">{ds.sub}</div>
                        <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">{ds.desc}</p>
                      </div>
                      {datasetType === ds.id && (
                        <div className="mt-2 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> เลือกอยู่
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>3. กรองข้อมูลเฉพาะส่วนที่ต้องการวิเคราะห์ (Filters)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">หน่วยงาน / หมวดหมู่</label>
                    <select
                      id="export-filter-dept"
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="ALL">ทุกหน่วยงาน (All Categories)</option>
                      {Object.keys(CATEGORY_DEFINITIONS).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat} - {CATEGORY_DEFINITIONS[cat as GrievanceCategory]?.nameTh.split('(')[0].trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">สถานะการดำเนินงาน</label>
                    <select
                      id="export-filter-status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="ALL">ทุกสถานะ (All Statuses)</option>
                      <option value="submitted">ยื่นเรื่องใหม่</option>
                      <option value="gatekeeper_triaged">รับเรื่องแล้ว (Triaged)</option>
                      <option value="in_progress">กำลังแก้ไข (In Progress)</option>
                      <option value="resolved">แก้ไขเสร็จสิ้น (Resolved)</option>
                      <option value="closed">ปิดเรื่องแล้ว (Closed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">ช่วงเวลาที่ยื่นเรื่อง</label>
                    <select
                      id="export-filter-timerange"
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="ALL">ข้อมูลทั้งหมดในระบบ</option>
                      <option value="7d">7 วันล่าสุด</option>
                      <option value="30d">30 วันล่าสุด (เดือนปัจจุบัน)</option>
                      <option value="90d">90 วันล่าสุด (ไตรมาสล่าสุด)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Metrics Summary Card */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      สรุปภาพรวมข้อมูลที่พร้อมส่งออก (Export Preview Stats)
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-200">
                    {metrics.total} รายการ
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 block font-medium">อัตราแก้ไขสำเร็จ</span>
                    <span className="text-lg font-black text-emerald-400">{metrics.resolvedRate}%</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 block font-medium">SLA Compliance</span>
                    <span className="text-lg font-black text-sky-400">{metrics.slaMetRate}%</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 block font-medium">เวลาเฉลี่ยในการแก้ไข</span>
                    <span className="text-lg font-black text-amber-300">{metrics.avgResolutionHours} ชม.</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
                    <span className="text-[10px] text-slate-400 block font-medium">คะแนนความพึงพอใจ (CSAT)</span>
                    <span className="text-lg font-black text-purple-300">
                      {metrics.avgCsat > 0 ? `${metrics.avgCsat} / 5.0` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Download Action Section */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="text-xs text-slate-500">
                  {selectedFormat === 'sqlite'
                    ? '📁 ดาวน์โหลดไฟล์ฐานข้อมูล .sqlite Binary ก้อนสมบูรณ์ พร้อม Table & Schema ทั้งหมด'
                    : selectedFormat === 'csv'
                    ? '📊 ไฟล์ Excel CSV แบบ UTF-8 with BOM รองรับภาษาไทย'
                    : '📄 ไฟล์ JSON Structured Document'}
                </div>

                <button
                  type="button"
                  id="btn-trigger-download"
                  onClick={handleDownload}
                  disabled={isExporting || metrics.total === 0}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition ${
                    metrics.total === 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isExporting
                      ? 'กำลังประมวลผล...'
                      : selectedFormat === 'sqlite'
                      ? 'ดาวน์โหลดไฟล์ SQLite (.sqlite)'
                      : `ดาวน์โหลดไฟล์ (${filteredTickets.length} รายการ)`}
                  </span>
                </button>
              </div>

              {exportSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3 text-emerald-800 text-xs animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">ดาวน์โหลดสำเร็จ!</span> ไฟล์พร้อมเปิดใช้งานใน DB Browser for SQLite, DBeaver หรือ Excel ได้ทันที
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'sql_studio' ? (
            /* SQLite Query Studio Tab */
            <div className="space-y-5">
              {/* Top Controls & Import/Export */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-sm">SQLite Interactive Query Console</h3>
                    <p className="text-xs text-slate-400">รันคำสั่ง SQL Query บนฐานข้อมูลในเบราว์เซอร์ได้ทันที</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                    <span>นำเข้า .sqlite</span>
                    <input
                      type="file"
                      accept=".sqlite,.db"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => downloadSqliteDatabaseFile()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>บันทึก .sqlite</span>
                  </button>
                </div>
              </div>

              {importStatus && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              {/* Preset SQL queries quick buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  คำสั่ง SQL สำเร็จรูปสำหรับการวิเคราะห์ (Preset Queries)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {PRESET_QUERIES.map((pq, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSqlQuery(pq.sql);
                        runSqlQuery(pq.sql);
                      }}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition group"
                    >
                      <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 flex items-center justify-between">
                        <span>{pq.title}</span>
                        <Play className="w-3 h-3 text-slate-400 group-hover:text-emerald-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* SQL Code Input Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-slate-500" />
                    <span>SQL Editor</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => runSqlQuery()}
                    disabled={isExecutingSql}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs active:scale-98"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isExecutingSql ? 'กำลังรัน Query...' : 'รัน SQL (Execute)'}</span>
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    id="sql-query-input"
                    rows={6}
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="w-full font-mono text-xs p-3.5 bg-slate-900 text-emerald-300 rounded-xl border border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                    placeholder="SELECT * FROM tickets LIMIT 10;"
                  />
                </div>
              </div>

              {/* Query Results Table */}
              <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-700">
                    <span>ผลลัพธ์การสืบค้น (Query Result)</span>
                    {sqlResult && !sqlResult.error && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                        {sqlResult.rows.length} แถว
                      </span>
                    )}
                  </div>
                  {sqlResult && (
                    <span className="text-slate-500 text-[11px]">
                      เวลาประมวลผล: {sqlResult.executionTimeMs} ms
                    </span>
                  )}
                </div>

                {sqlResult?.error ? (
                  <div className="p-4 bg-rose-50 text-rose-800 text-xs font-mono">
                    <span className="font-bold">SQL Error:</span> {sqlResult.error}
                  </div>
                ) : sqlResult && sqlResult.rows.length > 0 ? (
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          {sqlResult.columns.map((col, idx) => (
                            <th key={idx} className="px-3.5 py-2 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {sqlResult.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3.5 py-2 whitespace-nowrap text-slate-800">
                                {cell === null || cell === undefined ? (
                                  <span className="text-slate-400 italic">NULL</span>
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    ไม่มีข้อมูล หรือยังไม่ได้รันคำสั่ง SQL
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Guide Tab: Recommendations for Data Analytics */
            <div className="space-y-5 text-slate-800">
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold text-amber-900 text-sm">
                    คำแนะนำ: โครงสร้างข้อมูลที่ระบบจัดเตรียมไว้เพื่อนำไปวิเคราะห์ปรับปรุงองค์กร
                  </h4>
                  <p className="text-amber-800 leading-relaxed">
                    ข้อมูลข้อร้องเรียนและข้อเสนอแนะที่มีคุณภาพสูง ต้องสามารถตอบคำถามสำคัญ 4 ประการขององค์กรได้แก่: 
                    <strong> ปัญหาอะไรเกิดบ่อยที่สุด? (What), เกิดจากสาเหตุรากเหง้าอะไร? (Why), ใครแก้และใช้เวลานานเท่าใด? (How long), และพนักงานพึงพอใจหรือไม่? (Outcome)</strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Categorical & Pareto */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">1</span>
                    <span>การวิเคราะห์ความถี่ปัญหาตามกฎพาเรโต (Pareto 80/20 Analysis)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>คอลัมน์ที่แนะนำ:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Category</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Location/Unit</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Urgency</code>
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <strong>ประโยชน์:</strong> หาว่า 20% ของหมวดหมู่ปัญหาใดที่สร้างผลกระทบต่อพนักงาน 80% เช่น ปัญหาเครือข่าย IT หรือปัญหาโรงอาหาร เพื่อจัดสรรงบประมาณแก้ไขได้ตรงจุด
                  </p>
                </div>

                {/* 2. SLA & Bottlenecks */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-sky-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px]">2</span>
                    <span>การวิเคราะห์เวลาตอบสนอง & จุดคอขวด (Lead Time & SLA Bottlenecks)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>คอลัมน์ที่แนะนำ:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Triage Lead Time</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Resolution Lead Time</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Responsible Dept</code>
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <strong>ประโยชน์:</strong> เปรียบเทียบ Lead Time จริงกับเป้าหมาย SLA รายฝ่าย เพื่อดูว่าหน่วยงานใดใช้เวลาคัดกรองหรือแก้ไขนานเกินเกณฑ์ และต้องเพิ่มทรัพยากรช่วยเหลือ
                  </p>
                </div>

                {/* 3. RCA & CAPA */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">3</span>
                    <span>การวิเคราะห์สาเหตุรากเหง้า & แผนป้องกันซ้ำ (RCA & CAPA Effectiveness)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>คอลัมน์ที่แนะนำ:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Root Cause Category</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Preventive Action Plan</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Cluster Group</code>
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <strong>ประโยชน์:</strong> แยกประเภทสาเหตุตาม Ishikawa (Process, People, Equipment, Policy, Environment) เพื่อป้องกันการเกิดซ้ำ (Systemic Fix) แทนการแก้แบบชั่วคราว
                  </p>
                </div>

                {/* 4. CSAT & Sentiment */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px]">4</span>
                    <span>การประเมินความพึงพอใจและแนวโน้มความรู้สึก (CSAT & Employee Sentiment)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>คอลัมน์ที่แนะนำ:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">CSAT Overall Score</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Speed / Quality / Manner</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Permanently Resolved</code>
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <strong>ประโยชน์:</strong> ติดตามความไว้วางใจของพนักงานที่มีต่อระบบ หากคะแนนความพึงพอใจสูงจะส่งผลให้พนักงานกล้าแจ้งเตือนข้อร้องเรียนหรือความเสี่ยงทุจริตล่วงหน้า
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>SQLite Wasm Engine พร้อมใช้งาน | Schema v3.0 Relational Model</span>
          </div>
          <button
            id="btn-export-modal-footer-close"
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};