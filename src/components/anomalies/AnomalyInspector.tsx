import React, { useMemo } from 'react';
import { AnomalyEvent } from '../../types/anomaly';
import { usePriceHistory } from '../../hooks/usePriceHistory';
import { FinancialPriceChart } from '../../charts/FinancialPriceChart';
import { formatPrice, formatVolume, formatTimestamp } from '../../utils/formatters';
import { ChartSkeleton, TableSkeleton } from '../common/LoadingSkeleton';
import { ErrorState } from '../common/ErrorState';
import { X, Calendar } from 'lucide-react';

interface AnomalyInspectorProps {
  anomaly: AnomalyEvent;
  onClose: () => void;
  className?: string;
}

export const AnomalyInspector: React.FC<AnomalyInspectorProps> = ({
  anomaly,
  onClose,
  className,
}) => {
  // Compute window around anomaly timestamp: 1 hour before and 30 mins after
  const { customFrom, customTo } = useMemo(() => {
    const tsMillis = new Date(anomaly.ts).getTime();
    const fromDate = new Date(tsMillis - 60 * 60 * 1000).toISOString();
    const toDate = new Date(tsMillis + 30 * 60 * 1000).toISOString();
    return { customFrom: fromDate, customTo: toDate };
  }, [anomaly.ts]);

  const { data, isLoading, error, refetch } = usePriceHistory({
    symbol: anomaly.symbol,
    interval: '1m',
    rangePreset: 'Custom',
    customFrom,
    customTo,
  });

  return (
    <div className={`bg-white border border-slate-200 rounded-sm p-4 select-none ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900">
                {anomaly.symbol}
              </span>
              <span className="text-2xs font-mono uppercase bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-2xs font-semibold">
                ANOMALY EVENT
              </span>
            </div>
            <span className="text-xs text-slate-600 font-mono mt-0.5">
              {anomaly.event || anomaly.description || 'Unusual telemetry detected'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-2xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-sm">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{formatTimestamp(anomaly.ts, 'full')}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-800 rounded-2xs transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 font-mono text-xs">
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xs">
          <div className="text-2xs text-slate-500 uppercase">PRICE AT EVENT</div>
          <div className="font-semibold text-slate-900 mt-0.5">
            {anomaly.price !== undefined ? formatPrice(anomaly.price) : '—'}
          </div>
        </div>
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xs">
          <div className="text-2xs text-slate-500 uppercase">VOLUME AT EVENT</div>
          <div className="font-semibold text-slate-900 mt-0.5">
            {anomaly.volume !== undefined ? formatVolume(anomaly.volume) : '—'}
          </div>
        </div>
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xs">
          <div className="text-2xs text-slate-500 uppercase">TIMESTAMP</div>
          <div className="font-semibold text-slate-900 mt-0.5">
            {formatTimestamp(anomaly.ts, 'timeOnlyUtc')}
          </div>
        </div>
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xs">
          <div className="text-2xs text-slate-500 uppercase">STATUS</div>
          <div className="font-semibold text-amber-700 mt-0.5">FLAGGED</div>
        </div>
      </div>

      {/* Historical Context Chart */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-2xs font-mono text-slate-500 px-1">
          <span>HISTORICAL CONTEXT AROUND EVENT WINDOW (1m INTERVAL)</span>
          <span>WINDOW: -60m TO +30m</span>
        </div>

        {isLoading ? (
          <div className="h-64 bg-slate-50 border border-slate-200 flex items-center justify-center font-mono text-2xs text-slate-400">
            LOADING EVENT CONTEXT CHART...
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : data.length === 0 ? (
          <div className="h-48 bg-slate-50 border border-slate-200 flex items-center justify-center font-mono text-2xs text-slate-400">
            No historical price points available for this timestamp window
          </div>
        ) : (
          <FinancialPriceChart
            data={data}
            symbol={anomaly.symbol}
            height={300}
            showVolume={true}
          />
        )}
      </div>
    </div>
  );
};
