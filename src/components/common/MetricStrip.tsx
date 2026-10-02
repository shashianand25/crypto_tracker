import React from 'react';
import { cn } from '../../utils/cn';

export interface MetricItem {
  label: string;
  value: React.ReactNode;
  hint?: string;
  statusColor?: 'normal' | 'up' | 'down' | 'warning';
}

interface MetricStripProps {
  metrics: MetricItem[];
  className?: string;
}

export const MetricStrip: React.FC<MetricStripProps> = ({ metrics, className }) => {
  return (
    <div
      className={cn(
        'w-full bg-white border border-slate-200 divide-x divide-slate-200 flex flex-wrap items-center text-xs select-none shadow-xs',
        className
      )}
    >
      {metrics.map((m, idx) => (
        <div
          key={idx}
          className="flex-1 min-w-[140px] px-3.5 py-2 flex items-center justify-between gap-3"
        >
          <div className="flex flex-col">
            <span className="text-2xs font-medium uppercase tracking-wider text-slate-500">
              {m.label}
            </span>
            {m.hint && <span className="text-[10px] text-slate-400">{m.hint}</span>}
          </div>
          <div
            className={cn(
              'font-mono text-sm font-semibold tracking-tight text-right',
              m.statusColor === 'up' && 'text-emerald-700',
              m.statusColor === 'down' && 'text-rose-700',
              m.statusColor === 'warning' && 'text-amber-700',
              (!m.statusColor || m.statusColor === 'normal') && 'text-slate-900'
            )}
          >
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
};
