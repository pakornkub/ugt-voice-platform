'use client';

import { WorkflowDiagram } from '@/components/WorkflowDiagram';
import { useShell } from '../../shell-context';

export default function WorkflowPage() {
  const { navigateTab } = useShell();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <WorkflowDiagram onNavigateTab={navigateTab} />
    </div>
  );
}
