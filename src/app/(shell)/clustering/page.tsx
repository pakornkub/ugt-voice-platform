'use client';

import { RootCauseClustering } from '@/components/RootCauseClustering';
import { useShell } from '../../shell-context';

export default function ClusteringPage() {
  const { tickets, openTracking } = useShell();
  return <RootCauseClustering tickets={tickets} onSelectTicket={openTracking} />;
}
