import React from 'react';
import { AnomalyEvent } from '../../types/anomaly';
import { formatPrice, formatVolume, formatTimestamp } from '../../utils/formatters';
import { Activity } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AnomalyTableProps {
  anomalies: AnomalyEvent[];
  selectedAnomaly: AnomalyEvent | null;
  onSelectAnomaly: (anomaly: AnomalyEvent) => void;
  className?: string;
}

export const AnomalyTable: React.FC<AnomalyTableProps> = ({
  anomalies,
  selectedAnomaly,
  onSelectAnomaly,
  className,
}) => {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-sm overflow-hidden select-none', className)}>
      <div className="h-9 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono font-bold text-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-amber-600" />
          <span>DETECTED ANOMALIES</span>
        </div>
        <span className="text-2xs font-normal text-slate-400">
          ({anomalies.length} events logged)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-2xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2 px-3.5">Time (UTC)</th>
              <th className="py-2 px-3.5">Asset</th>
              <th className="py-2 px-3.5">Event</th>
              <th className="py-2 px-3.5 text-right">Price</th>
              <th className="py-2 px-3.5 text-right">Volume</th>
              {/* Only show severity column header if any anomaly provides severity */}
              {anomalies.some((a) => a.severity) && (
                <th className="py-2 px-3.5 text-center">Severity</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {anomalies.length === 0 ? (
              <tr>
                <td
                  colSpan={anomalies.some((a) => a.severity) ? 6 : 5}
                  className="py-8 text-center text-xs text-slate-400"
                >
                  No anomalous activity detected within selected query
                </td>
              </tr>
            ) : (
              anomalies.map((item, idx) => {
                const isSelected =
                  selectedAnomaly &&
                  (selectedAnomaly.id ? selectedAnomaly.id === item.id : selectedAnomaly.ts === item.ts);

                return (
                  <tr
                    key={item.id || idx}
                    onClick={() => onSelectAnomaly(item)}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-amber-50/80 border-l-4 border-l-amber-600 font-semibold'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    <td className="py-2 px-3.5 text-2xs text-slate-500 tabular-nums">
                      {formatTimestamp(item.ts, 'timeOnlyUtc')}
                    </td>
                    <td className="py-2 px-3.5 font-bold text-slate-900">{item.symbol}</td>
                    <td className="py-2 px-3.5 text-slate-700">
                      <span>{item.event || item.description || 'Unusual Activity'}</span>
                    </td>
                    <td className="py-2 px-3.5 text-right tabular-nums text-slate-800">
                      {item.price !== undefined ? formatPrice(item.price) : '—'}
                    </td>
                    <td className="py-2 px-3.5 text-right tabular-nums text-slate-800">
                      {item.volume !== undefined ? formatVolume(item.volume) : '—'}
                    </td>
                    {anomalies.some((a) => a.severity) && (
                      <td className="py-2 px-3.5 text-center">
                        {item.severity ? (
                          <span className="px-1.5 py-0.5 rounded-2xs text-[10px] bg-slate-100 text-slate-700 uppercase font-semibold">
                            {item.severity}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
