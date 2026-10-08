import React from 'react';

interface TabButtonProps {
  id: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

export const TabButton: React.FC<Readonly<TabButtonProps>> = ({
  id,
  active,
  icon,
  label,
  onClick,
}) => (
  <button
    id={id}
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 border-b-2 px-3 pb-3 text-xs font-semibold transition ${
      active
        ? 'border-emerald-600 text-emerald-800'
        : 'border-transparent text-slate-500 hover:text-slate-800'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);
