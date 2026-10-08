import type { ReactNode } from 'react';
import type { UserRole } from '../../types';

export type ManualSection = 'workflow' | 'role_guides' | 'sla_matrix' | 'pdpa_security' | 'faq';

export type SimulationScenario = 'normal_quality' | 'urgent_pdpa';

export interface WorkflowStep {
  id: number;
  stageCode: string;
  titleTh: string;
  titleEn: string;
  shortDesc: string;
  actorRole: UserRole;
  actorTitleTh: string;
  actorColor: string;
  targetTab: string;
  targetTabLabel: string;
  durationEst: string;
  keyActions: string[];
  systemAutomations: string[];
  rulesAndSla: string;
  icon: ReactNode;
}

export interface SlaMatrixRow {
  category: string;
  nameTh: string;
  severity: string;
  badgeColor: string;
  description: string;
  responsible: string;
}

export interface RaciRow {
  processTh: string;
  employee: string;
  gatekeeper: string;
  executive: string;
  admin: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export const SIMULATION_LAST_STAGE = 5;
