'use client';

import React, { useState } from 'react';
import { UserRole } from '../types';
import { FaqSection } from './workflow-manual/FaqSection';
import { ManualHeader } from './workflow-manual/ManualHeader';
import { ManualTabs } from './workflow-manual/ManualTabs';
import { PdpaSecuritySection } from './workflow-manual/PdpaSecuritySection';
import { RoleGuidesSection } from './workflow-manual/RoleGuidesSection';
import { SlaMatrixSection } from './workflow-manual/SlaMatrixSection';
import {
  SIMULATION_LAST_STAGE,
  type ManualSection,
  type SimulationScenario,
} from './workflow-manual/types';
import { WorkflowSection } from './workflow-manual/WorkflowSection';

interface WorkflowDiagramProps {
  onNavigateTab: (tab: string) => void;
  onSwitchRole?: (role: UserRole) => void;
}

export const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({
  onNavigateTab,
  onSwitchRole,
}) => {
  const [activeManualSection, setActiveManualSection] = useState<ManualSection>('workflow');
  const [selectedRoleGuide, setSelectedRoleGuide] = useState<UserRole>('employee');
  const [selectedStepId, setSelectedStepId] = useState<number>(1);
  const [simulationCurrentStep, setSimulationCurrentStep] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationScenario, setSimulationScenario] =
    useState<SimulationScenario>('normal_quality');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);
  const [faqSearchQuery, setFaqSearchQuery] = useState<string>('');

  // Simulation handlers
  const handleStartSimulation = (scenario: SimulationScenario) => {
    setSimulationScenario(scenario);
    setSimulationCurrentStep(1);
    setSelectedStepId(1);
    setIsSimulating(true);
    setActiveManualSection('workflow');
  };

  const handleNextSimulationStep = () => {
    if (simulationCurrentStep < SIMULATION_LAST_STAGE) {
      const nextStep = simulationCurrentStep + 1;
      setSimulationCurrentStep(nextStep);
      setSelectedStepId(nextStep);
    } else {
      setIsSimulating(false);
    }
  };

  const handleResetSimulation = () => {
    setIsSimulating(false);
    setSimulationCurrentStep(1);
    setSelectedStepId(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <ManualHeader
        isSimulating={isSimulating}
        simulationScenario={simulationScenario}
        simulationCurrentStep={simulationCurrentStep}
        onStartSimulation={handleStartSimulation}
        onNextSimulationStep={handleNextSimulationStep}
        onResetSimulation={handleResetSimulation}
      />

      {/* Main Manual Navigation Tabs */}
      <ManualTabs active={activeManualSection} onChange={setActiveManualSection} />

      {activeManualSection === 'workflow' && (
        <WorkflowSection
          selectedStepId={selectedStepId}
          onSelectStep={setSelectedStepId}
          isSimulating={isSimulating}
          simulationScenario={simulationScenario}
          simulationCurrentStep={simulationCurrentStep}
          onNavigateTab={onNavigateTab}
          onSwitchRole={onSwitchRole}
        />
      )}

      {activeManualSection === 'role_guides' && (
        <RoleGuidesSection
          selectedRole={selectedRoleGuide}
          onSelectRole={setSelectedRoleGuide}
          onNavigateTab={onNavigateTab}
          onSwitchRole={onSwitchRole}
        />
      )}

      {activeManualSection === 'sla_matrix' && <SlaMatrixSection />}

      {activeManualSection === 'pdpa_security' && <PdpaSecuritySection />}

      {activeManualSection === 'faq' && (
        <FaqSection
          searchQuery={faqSearchQuery}
          onSearchQueryChange={setFaqSearchQuery}
          expandedIndex={expandedFaqIndex}
          onExpandedIndexChange={setExpandedFaqIndex}
        />
      )}
    </div>
  );
};
