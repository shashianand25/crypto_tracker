import React from 'react';
import { cn } from '../../utils/cn';

export const SkeletonRow: React.FC<{ cols?: number; className?: string }> = ({
  cols = 5,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full flex items-center justify-between py-2.5 px-4 border-b border-slate-100 animate-pulse',
        className
      )}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-3.5 bg-slate-200 rounded-2xs',
            i === 0 ? 'w-24' : i === cols - 1 ? 'w-16' : 'w-20'
          )}
        />
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 6,
  cols = 5,
}) => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-sm overflow-hidden">
      <div className="w-full flex items-center justify-between py-2 px-4 bg-slate-50 border-b border-slate-200">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 w-16 bg-slate-200 rounded-2xs" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
};

export const ChartSkeleton: React.FC<{ height?: number | string }> = ({ height = 360 }) => {
  return (
    <div
      style={{ height }}
      className="w-full bg-slate-50 border border-slate-200 rounded-sm flex flex-col justify-between p-4 animate-pulse"
    >
      <div className="flex justify-between items-center">
        <div className="h-4 w-32 bg-slate-200 rounded-2xs" />
        <div className="h-4 w-48 bg-slate-200 rounded-2xs" />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-2xs font-mono text-slate-400 tracking-wider">
          LOADING TIME-SERIES DATA...
        </div>
      </div>
      <div className="flex justify-between items-center border-t border-slate-200 pt-2">
        <div className="h-3 w-12 bg-slate-200 rounded-2xs" />
        <div className="h-3 w-12 bg-slate-200 rounded-2xs" />
        <div className="h-3 w-12 bg-slate-200 rounded-2xs" />
        <div className="h-3 w-12 bg-slate-200 rounded-2xs" />
      </div>
    </div>
  );
};
