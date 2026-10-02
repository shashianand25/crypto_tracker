import React from 'react';
import { useDataFreshness } from '../../hooks/useDataFreshness';
import { cn } from '../../utils/cn';

interface DataFreshnessProps {
  className?: string;
}

export const DataFreshness: React.FC<DataFreshnessProps> = ({ className }) => {
  const { secondsAgo, status } = useDataFreshness();

  if (status !== 'CONNECTED' && status !== 'RECONNECTED') {
    return (
      <span className={cn('text-2xs font-mono text-slate-400 select-none', className)}>
        Stream paused
      </span>
    );
  }

  if (secondsAgo === null) {
    return (
      <span className={cn('text-2xs font-mono text-slate-400 select-none', className)}>
        Awaiting tick
      </span>
    );
  }

  const isStale = secondsAgo > 10;

  return (
    <span
      className={cn(
        'text-2xs font-mono select-none transition-colors',
        isStale ? 'text-amber-600 font-medium' : 'text-slate-600',
        className
      )}
      title="Elapsed time since last tick received from live WebSocket"
    >
      Data {secondsAgo.toFixed(1)}s old
    </span>
  );
};
