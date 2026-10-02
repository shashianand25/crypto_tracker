import React from 'react';
import { cn } from '../../utils/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full py-12 px-6 flex flex-col items-center justify-center text-center bg-white border border-dashed border-slate-300 rounded-sm',
        className
      )}
    >
      <div className="font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold mb-1">
        {title}
      </div>
      {description && (
        <p className="text-xs text-slate-500 max-w-sm font-sans mb-3">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};
