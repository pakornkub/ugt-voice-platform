'use client';

import { WorkflowDiagram } from '@/components/WorkflowDiagram';
import { useShell } from '../../shell-context';

export default function WorkflowPage() {
  const { navigateTab, setCurrentRole } = useShell();
  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <WorkflowDiagram onNavigateTab={navigateTab} onSwitchRole={setCurrentRole} />
    </div>
  );
}
