import type { ReactNode } from 'react';

interface BulletListProps {
  items: readonly string[];
  dotClass: string;
}

/** Dot-bullet list used by the "key actions" / "system automations" cards. */
export const BulletList = ({ items, dotClass }: Readonly<BulletListProps>) => (
  <ul className="space-y-2 text-xs text-slate-700">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2">
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
        <span className="leading-relaxed">{item}</span>
      </li>
    ))}
  </ul>
);

export interface ManualTableColumn {
  label: string;
  className: string;
}

interface ManualTableProps {
  columns: readonly ManualTableColumn[];
  children: ReactNode;
}

/** Shared table shell (header row + striped body) for the RACI and category matrices. */
export const ManualTable = ({ columns, children }: Readonly<ManualTableProps>) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="border-y border-slate-200 bg-slate-50 text-slate-700">
          {columns.map((col) => (
            <th key={col.label} className={col.className}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-slate-800">{children}</tbody>
    </table>
  </div>
);

interface CardHeadingProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  titleClass: string;
  children: ReactNode;
}

/** Title + subtitle on the left, a trailing badge/legend on the right. */
export const CardHeading = ({
  icon,
  title,
  subtitle,
  titleClass,
  children,
}: Readonly<CardHeadingProps>) => (
  <div className="mb-4 flex items-center justify-between">
    <div>
      <h3 className={titleClass}>
        {icon}
        <span>{title}</span>
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
    </div>
    {children}
  </div>
);

interface PanelHeaderProps {
  className: string;
  iconBoxClass: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  children?: ReactNode;
}

/** Icon box + h2/subtitle header of a manual panel, with an optional trailing action/badge. */
export const PanelHeader = ({
  className,
  iconBoxClass,
  icon,
  title,
  subtitle,
  children,
}: Readonly<PanelHeaderProps>) => (
  <div className={className}>
    <div className="flex items-center gap-3">
      <div className={iconBoxClass}>{icon}</div>
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
);

export const GUIDE_HEADING_CLASS = {
  row: 'flex items-center gap-2 text-xs font-bold text-slate-900',
  rowTight: 'flex items-center gap-1.5 text-xs font-bold text-slate-900',
  plain: 'text-xs font-bold text-slate-900',
} as const;

type GuideCardTone = 'default' | 'success';

const GUIDE_CARD_TONE: Record<
  GuideCardTone,
  { container: string; heading: string | null; body: string }
> = {
  default: {
    container: 'border-slate-200 bg-slate-50/50',
    heading: null,
    body: 'text-slate-600',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50/40',
    heading: 'flex items-center gap-2 text-xs font-bold text-emerald-950',
    body: 'text-emerald-900/80',
  },
};

interface GuideCardProps {
  title: string;
  /** Leading badge or icon; when present the title is wrapped in a span. */
  lead?: ReactNode;
  /** Use an h4 heading element instead of a div. */
  asHeading?: boolean;
  headingClass?: string;
  tone?: GuideCardTone;
  body?: string;
  children?: ReactNode;
}

/** Bordered info card used throughout the role guides and the PDPA panel. */
export const GuideCard = ({
  title,
  lead,
  asHeading = false,
  headingClass = GUIDE_HEADING_CLASS.row,
  tone = 'default',
  body,
  children,
}: Readonly<GuideCardProps>) => {
  const styles = GUIDE_CARD_TONE[tone];
  const HeadingTag = asHeading ? 'h4' : 'div';
  return (
    <div className={`space-y-2 rounded-xl border p-4 ${styles.container}`}>
      <HeadingTag className={styles.heading ?? headingClass}>
        {lead}
        {lead ? <span>{title}</span> : title}
      </HeadingTag>
      {body && <p className={`text-xs leading-relaxed ${styles.body}`}>{body}</p>}
      {children}
    </div>
  );
};

interface GuideListItem {
  id: string;
  content: ReactNode;
}

/** Disc bullet list with rich (JSX) items, keyed by a stable id. */
export const GuideList = ({ items }: Readonly<{ items: readonly GuideListItem[] }>) => (
  <ul className="list-disc space-y-1.5 pl-8 text-xs text-slate-600">
    {items.map((item) => (
      <li key={item.id}>{item.content}</li>
    ))}
  </ul>
);

export type { GuideListItem };

/** Round numbered badge shown in front of a guide card title. */
export const NumberBadge = ({
  number,
  badgeClass,
}: Readonly<{ number: number; badgeClass: string }>) => (
  <span
    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${badgeClass}`}
  >
    {number}
  </span>
);
