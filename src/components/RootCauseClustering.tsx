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
  Target
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
      title: 'IT Infrastructure Aging & Hybrid Connectivity Latency',
      category: 'IT',
      riskLevel: 'Moderate',
      caseCount: 4,
      rootCause5Whys: [
        'พนักงานในชั้น 18 ไม่สามารถประชุม Virtual ได้อย่างราบรื่น (Why 1: สัญญาณ Wi-Fi หลุด)',
        'Access Point มีการแย่งช่องสัญญาณและ Overload (Why 2: จำนวนอุปกรณ์เชื่อมต่อพร้อมกันเกินเกณฑ์)',
        'อุปกรณ์ AP เป็นรุ่นเก่า Wi-Fi 5 ไม่รองรับ Multi-User MIMO (Why 3: ไม่ได้อัปเกรดตามรอบ Hardware Refresh)',
        'งบประมาณด้าน Network กระจุกตัวอยู่ที่ Data Center หลัก (Why 4: ขาดการจัดสรรงบ Edge Infrastructure)',
        'Root Cause: ขาดแผนการทบทวนวงจรชีวิตอุปกรณ์สำนักงาน (Hardware Lifecycle Policy) สำหรับ Hybrid Work',
      ],
      capaAction: 'จัดซื้อ Cisco Wi-Fi 6 AP ทดแทน 40 จุดทั่วอาคารสำนักงาน และจัดทำ Dynamic Bandwidth Management',
      sampleTickets: safeTickets.filter((t) => t.category === 'IT'),
    },
    {
      id: 'cl-2',
      title: 'Factory & Warehouse EHS Escape Route Compliance',
      category: 'Safety',
      riskLevel: 'High',
      caseCount: 3,
      rootCause5Whys: [
        'ทางหนีไฟฉุกเฉินโกดังสินค้ามีสิ่งกีดขวาง (Why 1: มีพาเลทไม้วางปิดประตู)',
        'ผู้รับเหมาภายนอกนำสินค้ามาพักไว้หน้าประตูหนีไฟ (Why 2: พื้นที่พักของชั่วคราวเต็ม)',
        'ไม่มีการตีเส้นแบ่งโซนชัดเจนในโกดัง A (Why 3: พื้นที่เพิ่งทาสีใหม่ยังไม่ได้ตีเส้นเหลือง-ดำ)',
        'ขาดเจ้าหน้าที่ความปลอดภัยตรวจรับมอบพื้นที่รายวัน (Why 4: ตารางตรวจกะกลางวันยังไม่ครอบคลุมช่วงถ่ายสินค้า)',
        'Root Cause: กระบวนการ Vendor Staging Protocol ขาดการควบคุมเข้มงวดและไม่มีระบบปรับผู้รับเหมาที่ฝ่าฝืน',
      ],
      capaAction: 'บังคับใช้มาตรการตีเส้น Safety Yellow Zone ทันที พร้อมติดตั้งเซนเซอร์ตรวจจับสิ่งกีดขวางประตูฉุกเฉิน',
      sampleTickets: safeTickets.filter((t) => t.category === 'Safety'),
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
      capaAction: 'จัดทำหลักสูตร Mandatory Respectful Leadership ทุกระดับบริหาร และเปิดระบบสายด่วน Mental Health',
      sampleTickets: safeTickets.filter((t) => t.category === 'Harassment' || t.category === 'Ethics'),
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
      capaAction: 'เชื่อมต่อ API กรมพัฒนาธุรกิจการค้า (DBD Open API) เพื่อตรวจสอบโครงสร้างผู้ถือหุ้นอัตโนมัติก่อนเปิด PO',
      sampleTickets: safeTickets.filter((t) => t.category === 'Fraud' || t.category === 'Compliance'),
    },
  ];

  const currentCluster = clusters[selectedClusterIndex];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              ระบบจัดกลุ่มปัญหา & วิเคราะห์สาเหตุเชิงลึก (Issue Clustering & Root Cause)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            วิเคราะห์หารากเหง้าของปัญหา (5-Whys Analysis) เพื่อกำหนดมาตรการป้องกันเชิงรุก (CAPA) และหยุดยั้งปัญหาเรื้อรัง
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>AI Clustering Active</span>
          </span>
        </div>
      </div>

      {/* Cluster Navigation & Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Cluster List */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
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
                  className={`w-full text-left p-4 rounded-xl border transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-indigo-700 uppercase">
                      หมวด: {c.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      c.riskLevel === 'Severe' ? 'bg-red-50 text-red-700 border-red-200' :
                      c.riskLevel === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {c.riskLevel} Risk
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2">
                    {c.title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>ความถี่: <strong>{c.caseCount} เคส</strong></span>
                    <span className="text-indigo-600 font-semibold flex items-center gap-1">
                      ดูการวิเคราะห์ <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Deep Dive Analysis & 5-Whys Tree (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Cluster Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold uppercase mb-1">
                <span>Cluster #{selectedClusterIndex + 1}</span>
                <span>•</span>
                <span>{currentCluster.category} Division</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {currentCluster.title}
              </h2>
            </div>

            {/* 5-Whys Tree Visualizer */}
            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                <span>โครงสร้างการวิเคราะห์สาเหตุ 5-Whys Analysis:</span>
              </div>

              <div className="space-y-2 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-300">
                {currentCluster.rootCause5Whys.map((step, sIdx) => {
                  const isFinal = sIdx === currentCluster.rootCause5Whys.length - 1;
                  return (
                    <div
                      key={sIdx}
                      className={`p-2.5 rounded-lg text-xs transition ${
                        isFinal
                          ? 'bg-rose-50 border border-rose-200 text-rose-950 font-bold'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isFinal ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
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
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>มาตรการแก้ไขและป้องกันเชิงรุก (Corrective & Preventive Action - CAPA):</span>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                {currentCluster.capaAction}
              </p>
            </div>

            {/* Related Cases In This Cluster */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                เคสตัวอย่างที่สอดคล้องกับกลุ่มปัญหานี้:
              </h4>
              <div className="space-y-2">
                {currentCluster.sampleTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <span className="font-mono font-bold text-indigo-700">{t.trackingCode}</span>
                      <span className="text-slate-800 font-semibold truncate">{t.title}</span>
                    </div>
                    <span className="text-indigo-600 font-semibold shrink-0 flex items-center gap-1">
                      ดูไทม์ไลน์ <ChevronRight className="w-3.5 h-3.5" />
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