import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAssets } from '../hooks/useAssets';
import { usePriceHistory, TimeRangePreset } from '../hooks/usePriceHistory';
import { useSymbolTick } from '../hooks/useWebSocket';
import { HistoryInterval } from '../types/market';
import { FinancialPriceChart } from '../charts/FinancialPriceChart';
import { formatPrice, formatVolume, formatTimestamp } from '../utils/formatters';
import { ChartSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { ArrowUp, ArrowDown, BarChart2 } from 'lucide-react';
import { cn } from '../utils/cn';

const INTERVALS: HistoryInterval[] = ['1m', '5m', '1h'];
const RANGE_PRESETS: TimeRangePreset[] = ['1H', '6H', '24H', '7D', 'Custom'];

export const AssetDetailPage: React.FC = () => {
  const { symbol = 'BTCUSDT' } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const upperSymbol = symbol.toUpperCase();

  const [interval, setInterval] = useState<HistoryInterval>('1m');
  const [rangePreset, setRangePreset] = useState<TimeRangePreset>('24H');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showVolume, setShowVolume] = useState(true);

  const { assets } = useAssets();
  const { currentTick, recentTicks, status: wsStatus } = useSymbolTick(upperSymbol);

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
    refetch,
  } = usePriceHistory({
    symbol: upperSymbol,
    interval,
    rangePreset,
    customFrom: customFrom || undefined,
    customTo: customTo || undefined,
  });

  // Calculate session delta from recent ticks or history
  const latestPrice = currentTick?.price || (historyData.length > 0 ? String(historyData[historyData.length - 1].price) : undefined);
  const latestVolume = currentTick?.volume || (historyData.length > 0 ? String(historyData[historyData.length - 1].volume) : undefined);
  const prevPrice = recentTicks[1]?.price || (historyData.length > 1 ? String(historyData[historyData.length - 2].price) : undefined);

  let direction: 'up' | 'down' | 'neutral' = 'neutral';
  if (latestPrice && prevPrice && Number(latestPrice) !== Number(prevPrice)) {
    direction = Number(latestPrice) > Number(prevPrice) ? 'up' : 'down';
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-4">
          {/* Asset Selector */}
          <div>
            <div className="text-2xs font-mono uppercase text-slate-400">INSTRUMENT</div>
            <select
              value={upperSymbol}
              onChange={(e) => navigate(`/assets/${e.target.value}`)}
              className="font-mono text-base font-bold text-slate-900 bg-transparent border-b border-slate-300 focus:border-slate-900 outline-none cursor-pointer pr-4"
            >
              {assets.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol}
                </option>
              ))}
              {!assets.some((a) => a.symbol === upperSymbol) && (
                <option value={upperSymbol}>{upperSymbol}</option>
              )}
            </select>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          {/* Current Price */}
          <div>
            <div className="text-2xs font-mono uppercase text-slate-400">LAST PRICE</div>
            <div className="flex items-center gap-1.5 font-mono text-base font-bold tabular-nums">
              {direction === 'up' && <ArrowUp className="w-4 h-4 text-emerald-600" />}
              {direction === 'down' && <ArrowDown className="w-4 h-4 text-rose-600" />}
              <span
                className={cn(
                  direction === 'up' && 'text-emerald-700',
                  direction === 'down' && 'text-rose-700',
                  direction === 'neutral' && 'text-slate-900'
                )}
              >
                {formatPrice(latestPrice)}
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          {/* Current Volume */}
          <div>
            <div className="text-2xs font-mono uppercase text-slate-400">LATEST VOLUME</div>
            <div className="font-mono text-sm font-semibold text-slate-800 tabular-nums">
              {formatVolume(latestVolume)}
            </div>
          </div>
        </div>

        {/* Live Stream Telemetry Indicator */}
        <div className="flex items-center gap-3 font-mono text-2xs">
          <div className="flex flex-col text-right">
            <span className="text-slate-400 uppercase">WEBSOCKET STATUS</span>
            <span
              className={cn(
                'font-semibold',
                wsStatus === 'CONNECTED' ? 'text-emerald-700' : 'text-amber-700'
              )}
            >
              {wsStatus === 'CONNECTED' ? '● LIVE STREAMING' : `● ${wsStatus}`}
            </span>
          </div>
          {currentTick && (
            <div className="flex flex-col text-right pl-3 border-l border-slate-200">
              <span className="text-slate-400 uppercase">LAST TICK TS</span>
              <span className="text-slate-700">
                {formatTimestamp(currentTick.ts, 'timeOnlyUtc')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Toolbar */}
      <div className="bg-white border border-slate-200 rounded-sm px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-4">
          {/* Interval Selector */}
          <div className="flex items-center gap-1.5 font-mono text-2xs">
            <span className="text-slate-400 uppercase mr-1">INTERVAL:</span>
            {INTERVALS.map((int) => (
              <button
                key={int}
                onClick={() => setInterval(int)}
                className={cn(
                  'px-2 py-0.8 rounded-2xs font-semibold border transition-colors',
                  interval === int
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                )}
              >
                {int}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Range Selector */}
          <div className="flex items-center gap-1.5 font-mono text-2xs">
            <span className="text-slate-400 uppercase mr-1">RANGE:</span>
            {RANGE_PRESETS.map((rp) => (
              <button
                key={rp}
                onClick={() => setRangePreset(rp)}
                className={cn(
                  'px-2 py-0.8 rounded-2xs font-semibold border transition-colors',
                  rangePreset === rp
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                )}
              >
                {rp}
              </button>
            ))}
          </div>
        </div>

        {/* Volume toggle */}
        <div className="flex items-center gap-2">
          {rangePreset === 'Custom' && (
            <div className="flex items-center gap-2 font-mono text-2xs">
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded-2xs text-slate-800"
              />
              <span className="text-slate-400">to</span>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-1 py-0.5 rounded-2xs text-slate-800"
              />
            </div>
          )}

          <button
            onClick={() => setShowVolume((v) => !v)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-2xs font-mono rounded-sm border transition-colors',
              showVolume
                ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            )}
            title="Toggle volume histogram pane"
          >
            <BarChart2 className="w-3 h-3" />
            <span>VOLUME</span>
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      {historyLoading ? (
        <ChartSkeleton height={420} />
      ) : historyError ? (
        <ErrorState
          title={`Historical Price Error (${upperSymbol})`}
          message={historyError}
          onRetry={refetch}
        />
      ) : historyData.length === 0 ? (
        <EmptyState
          title="No Historical Data Available"
          description="Try expanding the selected time range or selecting a different interval."
        />
      ) : (
        <FinancialPriceChart
          data={historyData}
          symbol={upperSymbol}
          showVolume={showVolume}
          latestTick={currentTick}
          height={420}
        />
      )}

      {/* Recent Live Ticks Table */}
      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden select-none">
        <div className="h-8 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-2xs font-mono font-bold text-slate-800">
          <span>LIVE TICK TELEMETRY BUFFER</span>
          <span className="text-slate-400 font-normal">
            BUFFER DEPTH: {recentTicks.length} TICKS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-2xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-1.5 px-3.5">Time (UTC)</th>
                <th className="py-1.5 px-3.5 text-right">Price</th>
                <th className="py-1.5 px-3.5 text-right">Volume</th>
                <th className="py-1.5 px-3.5 text-center">Direction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-2xs">
              {recentTicks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Awaiting live ticks from WebSocket stream...
                  </td>
                </tr>
              ) : (
                recentTicks.slice(0, 8).map((tick, idx) => {
                  const prevTick = recentTicks[idx + 1];
                  const isUp = prevTick ? Number(tick.price) >= Number(prevTick.price) : true;
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-1.5 px-3.5 text-slate-500 tabular-nums">
                        {formatTimestamp(tick.ts, 'timeOnlyUtc')}
                      </td>
                      <td className="py-1.5 px-3.5 text-right font-bold text-slate-900 tabular-nums">
                        {formatPrice(tick.price)}
                      </td>
                      <td className="py-1.5 px-3.5 text-right text-slate-700 tabular-nums">
                        {formatVolume(tick.volume)}
                      </td>
                      <td className="py-1.5 px-3.5 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 px-1 py-0.2 rounded-2xs text-[10px] font-semibold',
                            isUp
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          )}
                        >
                          {isUp ? '▲ BUY / UP' : '▼ SELL / DOWN'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
