import React from 'react';
import { AlertItem } from '../../types/alert';
import { formatPrice, formatVolume } from '../../utils/formatters';
import { Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ActiveAlertsTableProps {
  alerts: AlertItem[];
  onDelete: (id: string) => void;
  className?: string;
}

export const ActiveAlertsTable: React.FC<ActiveAlertsTableProps> = ({
  alerts,
  onDelete,
  className,
}) => {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-sm overflow-hidden select-none', className)}>
      <div className="h-9 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono font-bold text-slate-800">
        <span>ACTIVE RULES</span>
        <span className="text-2xs font-normal text-slate-400">({alerts.length} active)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-2xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2 px-3.5">Asset</th>
              <th className="py-2 px-3.5">Metric</th>
              <th className="py-2 px-3.5">Condition</th>
              <th className="py-2 px-3.5 text-right">Threshold</th>
              <th className="py-2 px-3.5 text-center">Status</th>
              <th className="py-2 px-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-xs font-mono text-slate-400">
                  No active alert rules configured
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-50 transition-colors font-mono">
                  <td className="py-2 px-3.5 font-bold text-slate-900">{alert.symbol}</td>
                  <td className="py-2 px-3.5 uppercase text-slate-600 text-2xs">{alert.metric}</td>
                  <td className="py-2 px-3.5 text-slate-700">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-2xs text-2xs font-semibold uppercase',
                        alert.condition === 'above'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      )}
                    >
                      {alert.condition}
                    </span>
                  </td>
                  <td className="py-2 px-3.5 text-right font-semibold text-slate-900 tabular-nums">
                    {alert.metric === 'price'
                      ? formatPrice(alert.threshold)
                      : formatVolume(alert.threshold)}
                  </td>
                  <td className="py-2 px-3.5 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-2xs">
                      <span className="w-1 h-1 rounded-full bg-emerald-600" />
                      ACTIVE
                    </span>
                  </td>
                  <td className="py-2 px-3.5 text-right">
                    <button
                      onClick={() => onDelete(alert.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xs transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
