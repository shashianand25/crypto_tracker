import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load market data',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full py-8 px-6 bg-rose-50/60 border border-rose-200 rounded-sm flex flex-col items-center justify-center text-center',
        className
      )}
    >
      <div className="flex items-center gap-2 text-rose-800 font-mono text-xs font-semibold uppercase tracking-wider mb-1.5">
        <AlertCircle className="w-4 h-4 text-rose-600" />
        <span>{title}</span>
      </div>
      <p className="text-xs text-rose-700/90 font-mono max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-300 text-rose-800 text-xs font-mono font-medium rounded-sm hover:bg-rose-50 active:bg-rose-100 transition-colors shadow-2xs"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
};
