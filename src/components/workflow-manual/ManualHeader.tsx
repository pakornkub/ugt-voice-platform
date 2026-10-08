import type { ReactNode } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, Play, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { pick } from './helpers';
import { SIMULATION_LAST_STAGE, type SimulationScenario } from './types';

interface ScenarioButtonProps {
  id: string;
  active: boolean;
  activeClass: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

const ScenarioButton = ({
  id,
  active,
  activeClass,
  icon,
  label,
  onClick,
}: Readonly<ScenarioButtonProps>) => (
  <button
    type="button"
    id={id}
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? activeClass
        : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

interface SimulationStatusProps {
  currentStep: number;
  onNext: () => void;
  onReset: () => void;
}

const SimulationStatus = ({ currentStep, onNext, onReset }: Readonly<SimulationStatusProps>) => {
  const { lang } = useLanguage();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-900/70 px-3 py-1.5">
      <span className="text-xs font-medium text-indigo-200">
        {pick(
          lang,
          <>
            Simulation Status: <strong>Stage {currentStep} of 5</strong>
          </>,
          <>
            สถานะการจำลอง: <strong>ขั้นตอนที่ {currentStep} จาก 5</strong>
          </>
        )}
      </span>
      {currentStep < SIMULATION_LAST_STAGE ? (
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-1 rounded bg-indigo-500 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-indigo-600"
        >
          <span>{pick(lang, 'Next Stage', 'ขั้นถัดไป')}</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      ) : (
        <span className="rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
          {pick(lang, 'Cycle Completed 🎉', 'จบวงจรสมบูรณ์ 🎉')}
        </span>
      )}
      <button
        type="button"
        onClick={onReset}
        className="p-1 text-slate-400 transition hover:text-white"
        title={pick(lang, 'Reset simulation', 'รีเซ็ตการจำลอง')}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

interface ManualHeaderProps {
  isSimulating: boolean;
  simulationScenario: SimulationScenario;
  simulationCurrentStep: number;
  onStartSimulation: (scenario: SimulationScenario) => void;
  onNextSimulationStep: () => void;
  onResetSimulation: () => void;
}

export const ManualHeader = ({
  isSimulating,
  simulationScenario,
  simulationCurrentStep,
  onStartSimulation,
  onNextSimulationStep,
  onResetSimulation,
}: Readonly<ManualHeaderProps>) => {
  const { lang } = useLanguage();
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
      <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="relative z-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-200 uppercase">
            <BookOpen className="h-3.5 w-3.5 text-indigo-300" />
            <span>Official System Manual & Workflow Hub</span>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-xs text-slate-300">
            SOP Edition 2026.1 • Enterprise Ready
          </span>
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {pick(
            lang,
            'System Manual & End-to-End Workflow',
            'คู่มือและกระบวนการทำงานระบบรับเรื่องร้องเรียน (System Manual & Workflow)'
          )}
        </h1>
        <p className="max-w-3xl text-xs leading-relaxed text-slate-300 sm:text-sm">
          {pick(
            lang,
            'Comprehensive operational manual, end-to-end 5-stage workflow, 6 enterprise categories & SLA matrix, PDPA data protection policies, and multi-role instructions.',
            'ศูนย์รวมคู่มือการใช้งานระบบครบวงจร แผนผังขั้นตอนการปฏิบัติงาน ขอบเขตความรับผิดชอบ 6 หมวดหมู่ การคุ้มครองข้อมูลส่วนบุคคล (PDPA) และแนวทางการจัดการข้อร้องเรียน/ข้อเสนอแนะสำหรับทุกบทบาท'
          )}
        </p>

        {/* Quick Simulation Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">
              {pick(
                lang,
                'Interactive Walkthrough Simulation:',
                'ทดลองจำลองวงจรเคส (Interactive Walkthrough):'
              )}
            </span>
            <ScenarioButton
              id="btn-sim-quality"
              active={isSimulating && simulationScenario === 'normal_quality'}
              activeClass="bg-sky-500 text-white shadow-lg shadow-sky-500/30"
              icon={<Play className="h-3 w-3" />}
              label={pick(lang, 'Simulate Quality (QC)', 'จำลองเคส Quality (QC)')}
              onClick={() => onStartSimulation('normal_quality')}
            />
            <ScenarioButton
              id="btn-sim-pdpa"
              active={isSimulating && simulationScenario === 'urgent_pdpa'}
              activeClass="bg-rose-500 text-white shadow-lg shadow-rose-500/30"
              icon={<AlertTriangle className="h-3 w-3 text-amber-300" />}
              label={pick(lang, 'Simulate Urgent PDPA', 'จำลองเคสด่วน PDPA (Compliance)')}
              onClick={() => onStartSimulation('urgent_pdpa')}
            />
          </div>

          {isSimulating && (
            <SimulationStatus
              currentStep={simulationCurrentStep}
              onNext={onNextSimulationStep}
              onReset={onResetSimulation}
            />
          )}
        </div>
      </div>
    </div>
  );
};
