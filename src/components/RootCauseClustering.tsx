'use client';

import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  ShieldCheck,
  AlertOctagon,
  GitBranch,
  Workflow,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  TrendingDown,
  Building,
  Target,
} from 'lucide-react';
import { ComplaintTicket } from '../types';
import { CATEGORY_DEFINITIONS } from '../mockData';

interface RootCauseClusteringProps {
  tickets: ComplaintTicket[];
  onSelectTicket: (ticket: ComplaintTicket) => void;
}

export const RootCauseClustering: React.FC<RootCauseClusteringProps> = ({
  tickets = [],
  onSelectTicket,
}) => {
  const [selectedClusterIndex, setSelectedClusterIndex] = useState(0);

  const safeTickets = tickets || [];

  // Group tickets into realistic root cause clusters
  const clusters = [
    {
      id: 'cl-1',
      title: 'Quality Assurance & Delivery Inspection Latency',
      category: 'Quality',
      riskLevel: 'Moderate',
      caseCount: 4,
      rootCause5Whys: [
        'ขั้นตอนการตรวจรับสินค้าสำเร็จรูปมีความล่าช้าสะสม (Why 1: การลงผลตรวจแบบกระดาษทำให้คอขวด)',
        'เจ้าหน้าที่ QC ต้องสุ่มตรวจซ้ำซ้อนหลายรอบ (Why 2: มาตรฐานการระบุข้อบกพร่องขาดความชัดเจน)',
        'ขาดคู่มือเกณฑ์การตรวจรับดิจิทัลแบบภาพถ่ายเปรียบเทียบ (Why 3: ไม่ได้ปรับปรุง SOP ตรวจสอบคุณภาพ)',
        'งบประมาณและการพัฒนาเทคโนโลยียังไม่ครอบคลุมระบบ QC ปลายทาง (Why 4: มุ่งเน้นเฉพาะสายการผลิตต้นน้ำ)',
        'Root Cause: ขาดระบบ Digital Quality Assurance Platform และเกณฑ์จำแนกข้อบกพร่องแบบเรียลไทม์',
      ],
      capaAction:
        'พัฒนาระบบ Digital QA Inspection ผ่านแท็บเล็ตและเชื่อมต่อระบบ ERP ปลายทางอัตโนมัติ',
      sampleTickets: safeTickets.filter((t) => t.category === 'Quality'),
    },
    {
      id: 'cl-2',
      title: 'Facility Environmental Controls & Odor Waste Management',
      category: 'Compliance',
      riskLevel: 'High',
      caseCount: 3,
      rootCause5Whys: [
        'มีกลิ่นรบกวนสะสมบริเวณพื้นที่ปฏิบัติงานและโรงอาหาร (Why 1: ระบบดักกลิ่นและบำบัดอากาศมีประสิทธิภาพลดลง)',
        'แผ่นกรองอากาศ Carbon Filter อิ่มตัวและเกินอายุการใช้งาน (Why 2: ไม่มีการเปลี่ยนตามรอบที่กำหนด)',
        'ไม่มีตาราง Preventive Maintenance รายเดือนสำหรับระบบบำบัดกลิ่น (Why 3: ขาดผู้รับผิดชอบกำกับดูแลโดยตรง)',
        'การตรวจสอบสภาพแวดล้อมอาศัยการร้องเรียนของพนักงานเท่านั้น (Why 4: ขาดเซนเซอร์วัดค่ามลพิษอัตโนมัติ)',
        'Root Cause: ขาดมาตรการเฝ้าระวังสิ่งแวดล้อมเชิงรุก (Proactive Environmental Monitoring Protocol)',
      ],
      capaAction:
        'ติดตั้งระบบ IoT Air Quality Sensors ตรวจวัดสารระเหยอัตโนมัติ พร้อมกำหนดแผนเปลี่ยนไส้กรองทุก 45 วัน',
      sampleTickets: safeTickets.filter((t) => t.category === 'Compliance'),
    },
    {
      id: 'cl-3',
      title: 'Workplace Psychological Safety & Supervisory Conduct',
      category: 'Harassment',
      riskLevel: 'Severe',
      caseCount: 2,
      rootCause5Whys: [
        'พนักงานในทีมร้องเรียนเรื่องการถูกข่มขู่ในช่องแชตกลุ่ม (Why 1: หัวหน้างานใช้วาจาคุกคาม)',
        'หัวหน้างานเผชิญแรงกดดันด้านเป้าหมายยอดขาย (Why 2: การบริหารจัดการเป้าหมายในภาวะวิกฤตตึงเครียด)',
        'ขาดทักษะการสื่อสารเชิงบวกและการให้ Feedback (Why 3: ไม่เคยผ่านการอบรม Empathic Leadership)',
        'ไม่มีกลไกตรวจเช็คสุขภาพจิตและวัฒนธรรมทีมรายไตรมาส (Why 4: ขาดเครื่องมือ Pulse Survey)',
        'Root Cause: องค์กรยังขาดหลักสูตรอบรม Code of Conduct และช่องทางให้คำปรึกษาทางใจที่เป็นกลาง',
      ],
      capaAction:
        'จัดทำหลักสูตร Mandatory Respectful Leadership ทุกระดับบริหาร และเปิดระบบสายด่วน Mental Health',
      sampleTickets: safeTickets.filter(
        (t) => t.category === 'Harassment' || t.category === 'Ethics'
      ),
    },
    {
      id: 'cl-4',
      title: 'Procurement Cross-Shareholding & Vendor Integrity Verification',
      category: 'Fraud',
      riskLevel: 'Severe',
      caseCount: 2,
      rootCause5Whys: [
        'พบใบเสนอราคาคู่เทียบมีข้อมูลที่อยู่และเบอร์โทรศัพท์เดียวกัน (Why 1: ผู้เสนอราคาเป็นกลุ่มเดียวกัน)',
        'ระบบจัดซื้อเดิมไม่มีการเช็ค Cross-Relationship อัตโนมัติ (Why 2: เจ้าหน้าที่ตรวจสอบด้วยสายตา Manual)',
        'ขาดการเชื่อมต่อฐานข้อมูลกรมพัฒนาธุรกิจการค้า (Why 3: ระบบ ERP ขาดโมดูล Supplier API Sync)',
        'Root Cause: ขาดระบบ Automated Conflict of Interest Screening ในกระบวนการ Vendor Onboarding',
      ],
      capaAction:
        'เชื่อมต่อ API กรมพัฒนาธุรกิจการค้า (DBD Open API) เพื่อตรวจสอบโครงสร้างผู้ถือหุ้นอัตโนมัติก่อนเปิด PO',
      sampleTickets: safeTickets.filter(
        (t) => t.category === 'Fraud' || t.category === 'Compliance'
      ),
    },
  ];

  const currentCluster = clusters[selectedClusterIndex];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-xl border border-indigo-100 bg-indigo-50 p-2 text-indigo-600">
              <Layers className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              ระบบจัดกลุ่มปัญหา & วิเคราะห์สาเหตุเชิงลึก (Issue Clustering & Root Cause)
            </h1>
          </div>
          <p className="text-xs text-slate-600 sm:text-sm">
            วิเคราะห์หารากเหง้าของปัญหา (5-Whys Analysis) เพื่อกำหนดมาตรการป้องกันเชิงรุก (CAPA)
            และหยุดยั้งปัญหาเรื้อรัง
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>AI Clustering Active</span>
          </span>
        </div>
      </div>

      {/* Cluster Navigation & Cards Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Cluster List */}
        <div className="space-y-3">
          <span className="block text-xs font-bold tracking-wider text-slate-700 uppercase">
            กลุ่มปัญหาที่พบความถี่สูง (Detected Clusters)
          </span>

          <div className="space-y-2.5">
            {clusters.map((c, idx) => {
              const isSelected = selectedClusterIndex === idx;
              return (
                <button
                  key={c.id}
                  type="button"
                  id={`cluster-btn-${c.id}`}
                  onClick={() => setSelectedClusterIndex(idx)}
                  className={`flex w-full flex-col justify-between rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-50/90 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-indigo-700 uppercase">
                      หมวด: {c.category}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        c.riskLevel === 'Severe'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : c.riskLevel === 'High'
                            ? 'border-orange-200 bg-orange-50 text-orange-700'
                            : 'border-blue-200 bg-blue-50 text-blue-700'
                      }`}
                    >
                      {c.riskLevel} Risk
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-xs font-bold text-slate-900 sm:text-sm">
                    {c.title}
                  </h3>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                    <span>
                      ความถี่: <strong>{c.caseCount} เคส</strong>
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-indigo-600">
                      ดูการวิเคราะห์ <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Deep Dive Analysis & 5-Whys Tree (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Active Cluster Details Card */}
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="border-b border-slate-100 pb-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-indigo-700 uppercase">
                <span>Cluster #{selectedClusterIndex + 1}</span>
                <span>•</span>
                <span>{currentCluster.category} Division</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                {currentCluster.title}
              </h2>
            </div>

            {/* 5-Whys Tree Visualizer */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-800 uppercase">
                <GitBranch className="h-4 w-4 text-indigo-600" />
                <span>โครงสร้างการวิเคราะห์สาเหตุ 5-Whys Analysis:</span>
              </div>

              <div className="relative space-y-2 pl-4 before:absolute before:top-2 before:bottom-2 before:left-1 before:w-0.5 before:bg-indigo-300">
                {currentCluster.rootCause5Whys.map((step, sIdx) => {
                  const isFinal = sIdx === currentCluster.rootCause5Whys.length - 1;
                  return (
                    <div
                      key={sIdx}
                      className={`rounded-lg p-2.5 text-xs transition ${
                        isFinal
                          ? 'border border-rose-200 bg-rose-50 font-bold text-rose-950'
                          : 'border border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                            isFinal ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isFinal ? 'ROOT' : `Why ${sIdx + 1}`}
                        </span>
                        <span className="flex-1">{step}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CAPA Action Plan Box */}
            <div className="space-y-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-950 uppercase">
                <Target className="h-4 w-4 text-emerald-600" />
                <span>มาตรการแก้ไขและป้องกันเชิงรุก (Corrective & Preventive Action - CAPA):</span>
              </div>
              <p className="text-xs leading-relaxed font-medium text-emerald-900">
                {currentCluster.capaAction}
              </p>
            </div>

            {/* Related Cases In This Cluster */}
            <div>
              <h4 className="mb-2 text-xs font-bold tracking-wider text-slate-700 uppercase">
                เคสตัวอย่างที่สอดคล้องกับกลุ่มปัญหานี้:
              </h4>
              <div className="space-y-2">
                {currentCluster.sampleTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs transition hover:bg-slate-100"
                  >
                    <div className="mr-2 flex items-center gap-2 truncate">
                      <span className="font-mono font-bold text-indigo-700">{t.trackingCode}</span>
                      <span className="truncate font-semibold text-slate-800">{t.title}</span>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 font-semibold text-indigo-600">
                      ดูไทม์ไลน์ <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
