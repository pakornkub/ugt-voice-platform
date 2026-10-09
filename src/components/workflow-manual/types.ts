import type { ReactNode } from 'react';
import type { UserRole } from '../../types';

export type ManualSection = 'workflow' | 'role_guides' | 'sla_matrix' | 'pdpa_security' | 'faq';

/** A value authored once per UI language; render it with `localize(lang, value)`. */
export interface Bilingual<T = string> {
  th: T;
  en: T;
}

export type SimulationScenario = 'normal_quality' | 'urgent_pdpa';

export interface WorkflowStep {
  id: number;
  stageCode: string;
  titleTh: string;
  titleEn: string;
  shortDesc: Bilingual;
  actorRole: UserRole;
  actorTitle: Bilingual;
  actorColor: string;
  targetTab: string;
  targetTabLabel: Bilingual;
  durationEst: Bilingual;
  keyActions: Bilingual[];
  systemAutomations: Bilingual[];
  rulesAndSla: Bilingual;
  icon: ReactNode;
}

export interface SlaMatrixRow {
  category: string;
  name: Bilingual;
  severity: string;
  badgeColor: string;
  description: Bilingual;
  responsible: string;
}

export interface RaciRow {
  process: Bilingual;
  employee: Bilingual;
  gatekeeper: Bilingual;
  executive: Bilingual;
  admin: Bilingual;
}

export interface FaqItem {
  q: Bilingual;
  a: Bilingual;
}

export const SIMULATION_LAST_STAGE = 5;
