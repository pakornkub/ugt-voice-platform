import type { ReactNode } from 'react';
import { ArrowRight, Check, CheckCircle2, ChevronRight, Clock, Sparkles, Zap } from 'lucide-react';
import type { UserRole } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { clickableProps } from '../clickableProps';
import { pick } from './helpers';
import { RaciMatrix } from './RaciMatrix';
import type { SimulationScenario, WorkflowStep } from './types';
import { BulletList } from './ui';
import { WORKFLOW_STEPS } from './workflowSteps';

const SCENARIO_NAME: Record<SimulationScenario, string> = {
  normal_quality: '🔍 ข้อร้องเรียนชิ้นงาน QC ผิดมาตรฐาน',
  urgent_pdpa: '📋 ข้อร้องเรียนด่วน PDPA จัดเก็บเอกสารไม่จำกัดสิทธิ์',
};

const SCENARIO_DEPARTMENT: Record<SimulationScenario, string> = {
  normal_quality: 'Quality (QA/QC)',
  urgent_pdpa: 'Compliance & Legal',
};

const SIMULATION_STEP_TEXT: Record<number, (scenario: SimulationScenario) => string> = {
  1: () =>
    'พนักงานกรอกข้อมูลผู้ยื่นเรื่อง เลือกหมวดหมู่ ระบุความเร่งด่วน พร้อมแนบหลักฐาน ระบบออกรหัส Ticket ทันที',
  2: (scenario) =>
    `ระบบคัดแยกเข้าสู่ทีม Gatekeeper ประจำฝ่าย ${SCENARIO_DEPARTMENT[scenario]} โดยอัตโนมัติ พร้อมแจ้งเตือนเจ้าหน้าที่`,
  3: () =>
    'Gatekeeper ประจำฝ่ายกดรับเรื่อง ตรวจสอบข้อเท็จจริง แก้ไขข้อบกพร่อง และบันทึก Resolution Notes ให้ผู้ยื่นรับทราบ',
  4: () =>
    'พนักงานได้รับแจ้งเตือน ตรวจสอบผลการแก้ไข และทำแบบประเมินความพึงพอใจ CSAT 5 ดาว พร้อมยืนยันปิดเคสอย่างสมบูรณ์',
  5: () =>
    'ข้อมูลถูกส่งเข้า Executive Dashboard และ AI ดำเนินการจัดกลุ่มเพื่อวิเคราะห์แนวทางปรับปรุงเชิงป้องกันระดับองค์กรต่อไป',
};

interface StepCardProps {
  step: WorkflowStep;
  showConnector: boolean;
  isSelected: boolean;
  isSimCurrent: boolean;
  isSimPassed: boolean;
  onSelect: (id: number) => void;
}

const StepCard = ({
  step,
  showConnector,
  isSelected,
  isSimCurrent,
  isSimPassed,
  onSelect,
}: Readonly<StepCardProps>) => {
  const { lang } = useLanguage();
  return (
    <div
      id={`workflow-step-card-${step.id}`}
      {...clickableProps(() => onSelect(step.id))}
      className={`relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50/90 shadow-xs ring-2 ring-indigo-500/20'
          : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/80'
      } ${isSimCurrent ? 'animate-pulse ring-4 ring-amber-400' : ''}`}
    >
      {/* Connector Arrow (Desktop) */}
      {showConnector && (
        <div className="absolute top-1/2 -right-3 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400 shadow-xs md:flex">
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {isSimPassed ? <Check className="h-4 w-4 font-black text-emerald-600" /> : step.id}
          </span>
          <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
            {step.stageCode}
          </span>
        </div>

        <h3 className="mb-1 line-clamp-2 text-xs font-bold text-slate-900">
          {pick(lang, step.titleEn, step.titleTh.replace(/^\d+\.\s*/, ''))}
        </h3>
        <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-500">{step.shortDesc}</p>
      </div>

      <div className="mt-3 border-t border-slate-200/60 pt-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${step.actorColor}`}>
            {step.actorRole}
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
            <Clock className="h-2.5 w-2.5" />
            {step.durationEst}
          </span>
        </div>
      </div>
    </div>
  );
};

const CardTitle = ({ icon, title }: Readonly<{ icon: ReactNode; title: string }>) => (
  <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-slate-800">
    {icon}
    <span>{title}</span>
  </h4>
);

interface DetailCardProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

const DetailCard = ({ icon, title, children }: Readonly<DetailCardProps>) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
    <CardTitle icon={icon} title={title} />
    {children}
  </div>
);

interface StepDetailsProps {
  step: WorkflowStep;
  isSimulating: boolean;
  simulationScenario: SimulationScenario;
  simulationCurrentStep: number;
  onNavigateTab: (tab: string) => void;
  onSwitchRole?: (role: UserRole) => void;
}

const StepDetails = ({
  step,
  isSimulating,
  simulationScenario,
  simulationCurrentStep,
  onNavigateTab,
  onSwitchRole,
}: Readonly<StepDetailsProps>) => {
  const { lang } = useLanguage();

  const handleLaunch = () => {
    onSwitchRole?.(step.actorRole);
    onNavigateTab(step.targetTab);
  };

  return (
    <div className="relative mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
            {step.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                {pick(lang, `Stage ${step.id} of 5`, `ขั้นตอนที่ ${step.id} / 5`)}
              </span>
              <span className="font-mono text-xs text-slate-500">[{step.titleEn}]</span>
            </div>
            <h3 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
              {pick(lang, `${step.id}. ${step.titleEn}`, step.titleTh)}
            </h3>
          </div>
        </div>

        {/* Direct Link to Operational Tab */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLaunch}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
          >
            <span>
              {pick(
                lang,
                `Launch: ${step.targetTabLabel}`,
                `เปิดใช้งานหน้านี้: ${step.targetTabLabel}`
              )}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Details Breakdown */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <DetailCard
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          title={pick(lang, 'Key Operational Actions:', 'การปฏิบัติงานหลัก (Key Actions):')}
        >
          <BulletList items={step.keyActions} dotClass="bg-emerald-500" />
        </DetailCard>

        <DetailCard
          icon={<Sparkles className="h-4 w-4 text-indigo-600" />}
          title={pick(lang, 'System Automations:', 'ระบบอัตโนมัติ (System Automations):')}
        >
          <BulletList items={step.systemAutomations} dotClass="bg-indigo-500" />
        </DetailCard>

        {/* 3. Governance & Policy Rules */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <CardTitle
              icon={<Clock className="h-4 w-4 text-indigo-600" />}
              title={pick(
                lang,
                'Governance & Policies:',
                'เกณฑ์การกำกับดูแล (Governance & Policy):'
              )}
            />
            <p className="rounded-lg border border-indigo-200/60 bg-indigo-50/60 p-3 text-xs leading-relaxed text-slate-700">
              {step.rulesAndSla}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="text-slate-500">
              {pick(lang, 'Primary Role:', 'ผู้รับผิดชอบหลัก:')}
            </span>
            <span className="font-bold text-slate-800">
              {pick(lang, step.actorRole, step.actorTitleTh)}
            </span>
          </div>
        </div>
      </div>

      {isSimulating && (
        <SimulationScenarioBox scenario={simulationScenario} currentStep={simulationCurrentStep} />
      )}
    </div>
  );
};

const SimulationScenarioBox = ({
  scenario,
  currentStep,
}: Readonly<{ scenario: SimulationScenario; currentStep: number }>) => (
  <div className="mt-5 flex items-start gap-3 rounded-xl border border-indigo-700 bg-indigo-900 p-4 text-white">
    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
    <div className="text-xs">
      <div className="mb-1 font-bold text-amber-300">
        ตัวอย่างสถานการณ์จำลอง: {SCENARIO_NAME[scenario]}
      </div>
      <div className="leading-relaxed text-indigo-100">
        <span>{SIMULATION_STEP_TEXT[currentStep]?.(scenario)}</span>
      </div>
    </div>
  </div>
);

interface WorkflowSectionProps {
  selectedStepId: number;
  onSelectStep: (id: number) => void;
  isSimulating: boolean;
  simulationScenario: SimulationScenario;
  simulationCurrentStep: number;
  onNavigateTab: (tab: string) => void;
  onSwitchRole?: (role: UserRole) => void;
}

export const WorkflowSection = ({
  selectedStepId,
  onSelectStep,
  isSimulating,
  simulationScenario,
  simulationCurrentStep,
  onNavigateTab,
  onSwitchRole,
}: Readonly<WorkflowSectionProps>) => {
  const { lang } = useLanguage();
  const activeStep = WORKFLOW_STEPS.find((s) => s.id === selectedStepId) ?? WORKFLOW_STEPS[0];

  return (
    <div className="space-y-6">
      {/* Interactive Workflow Flowchart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
              <Zap className="h-5 w-5 text-amber-500" />
              <span>
                {pick(
                  lang,
                  'End-to-End Workflow Flowchart',
                  'ผังขั้นตอนการปฏิบัติงานแบบครบวงจร (End-to-End Workflow)'
                )}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {pick(
                lang,
                'Click each stage to inspect role responsibilities, automated triggers, and SLA policies.',
                'คลิกที่แต่ละขั้นตอนเพื่อตรวจสอบรายละเอียด หน้าที่รับผิดชอบ ระบบอัตโนมัติ และแนวทางกำกับดูแล'
              )}
            </p>
          </div>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {pick(lang, '5 Core Stages', '5 ขั้นตอนหลัก (Stage 1-5)')}
          </span>
        </div>

        {/* Step Cards Grid */}
        <div className="relative grid grid-cols-1 gap-3 md:grid-cols-5">
          {WORKFLOW_STEPS.map((step, idx) => (
            <StepCard
              key={step.id}
              step={step}
              showConnector={idx < WORKFLOW_STEPS.length - 1}
              isSelected={selectedStepId === step.id}
              isSimCurrent={isSimulating && simulationCurrentStep === step.id}
              isSimPassed={isSimulating && simulationCurrentStep > step.id}
              onSelect={onSelectStep}
            />
          ))}
        </div>

        {/* Selected Step Detailed Inspection Panel */}
        <StepDetails
          step={activeStep}
          isSimulating={isSimulating}
          simulationScenario={simulationScenario}
          simulationCurrentStep={simulationCurrentStep}
          onNavigateTab={onNavigateTab}
          onSwitchRole={onSwitchRole}
        />
      </div>

      <RaciMatrix />
    </div>
  );
};
