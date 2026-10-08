import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SelectedMarkProps {
  iconClassName: string;
  label: string;
}

/** "เลือกอยู่" tick shown inside the currently selected option card. */
export const SelectedMark: React.FC<Readonly<SelectedMarkProps>> = ({ iconClassName, label }) => (
  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
    <CheckCircle2 className={iconClassName} /> {label}
  </div>
);
