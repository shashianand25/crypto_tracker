import React from 'react';
import { ReplayTick } from '../../types/market';
import { formatPrice, formatVolume, formatTimestamp } from '../../utils/formatters';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ReplayTapeProps {
  ticks: ReplayTick[];
  className?: string;
}

export const ReplayTape: React.FC<ReplayTapeProps> = ({ ticks, className }) => {
  // Show up to the last 15 ticks in reverse chronological order
  const displayTicks = ticks.slice(-15).reverse();

  return (
    <div className={cn('bg-white border border-slate-200 rounded-sm overflow-hidden select-none', className)}>
      <div className="h-8 px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-2xs font-mono font-bold text-slate-800">
        <span>REPLAY TICK TAPE</span>
        <span className="text-slate-400 font-normal">LAST 15 TICKS</span>
      </div>

      <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto font-mono text-2xs">
        {displayTicks.length === 0 ? (
          <div className="py-6 text-center text-slate-400">Press play to begin tick stream</div>
        ) : (
          displayTicks.map((t, idx) => {
            const prev = displayTicks[idx + 1];
            const isUp = prev ? Number(t.price) >= Number(prev.price) : true;

            return (
              <div
                key={idx}
                className="px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 tabular-nums">
                    {formatTimestamp(t.ts, 'timeOnlyUtc')}
                  </span>
                  <span className="font-bold text-slate-900">{t.symbol || 'ASSET'}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-600 tabular-nums">
                    Vol: {formatVolume(t.volume)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 font-semibold tabular-nums',
                      isUp ? 'text-emerald-700' : 'text-rose-700'
                    )}
                  >
                    {isUp ? (
                      <ArrowUp className="w-2.5 h-2.5 text-emerald-600" />
                    ) : (
                      <ArrowDown className="w-2.5 h-2.5 text-rose-600" />
                    )}
                    {formatPrice(t.price)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
