import React from 'react';
import { AlertOctagon, CheckCircle2, FileCheck2, FileWarning, Scale, Users } from 'lucide-react';
import type { GrievanceCategory } from '../../types';

const CATEGORY_ICONS: Record<GrievanceCategory, React.ElementType> = {
  HR: Users,
  Compliance: FileCheck2,
  Ethics: Scale,
  Fraud: FileWarning,
  Harassment: AlertOctagon,
  Quality: CheckCircle2,
};

export const CategoryIcon: React.FC<Readonly<{ category: GrievanceCategory }>> = ({ category }) => {
  const Icon = CATEGORY_ICONS[category] ?? Users;
  return <Icon className="h-4 w-4" />;
};
