import React from 'react';
import { TriggeredAlertItem } from '../../types/alert';
import { formatPrice, formatVolume, formatTimestamp } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface TriggeredAlertsTableProps {
  triggeredAlerts: TriggeredAlertItem[];
  className?: string;
}

export const TriggeredAlertsTable: React.FC<TriggeredAlertsTableProps> = ({
  triggeredAlerts,
  className,
}) => {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-sm overflow-hidden select-none', className)}>
      <div className="h-9 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono font-bold text-slate-800">
        <span>TRIGGERED HISTORY</span>
        <span className="text-2xs font-normal text-slate-400">
          ({triggeredAlerts.length} events)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-2xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2 px-3.5">Triggered Time</th>
              <th className="py-2 px-3.5">Asset</th>
              <th className="py-2 px-3.5">Metric</th>
              <th className="py-2 px-3.5">Condition</th>
              <th className="py-2 px-3.5 text-right">Threshold</th>
              <th className="py-2 px-3.5 text-right">Triggered Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {triggeredAlerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                  No alerts have been triggered yet
                </td>
              </tr>
            ) : (
              triggeredAlerts.map((t, idx) => (
                <tr key={t.id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3.5 text-2xs text-slate-500 tabular-nums">
                    {formatTimestamp(t.triggeredAt || t.ts, 'full')}
                  </td>
                  <td className="py-2 px-3.5 font-bold text-slate-900">{t.symbol}</td>
                  <td className="py-2 px-3.5 uppercase text-slate-600 text-2xs">{t.metric || 'price'}</td>
                  <td className="py-2 px-3.5 uppercase text-2xs">
                    {t.condition ? (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-2xs font-semibold',
                          t.condition === 'above'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        )}
                      >
                        {t.condition}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2 px-3.5 text-right tabular-nums text-slate-700">
                    {t.threshold !== undefined
                      ? t.metric === 'volume'
                        ? formatVolume(t.threshold)
                        : formatPrice(t.threshold)
                      : '—'}
                  </td>
                  <td className="py-2 px-3.5 text-right tabular-nums font-semibold text-slate-900">
                    {t.value !== undefined
                      ? t.metric === 'volume'
                        ? formatVolume(t.value)
                        : formatPrice(t.value)
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
