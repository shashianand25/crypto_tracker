import React, { useState, useEffect, useCallback } from 'react';
import { useAssets } from '../hooks/useAssets';
import { api, ApiError } from '../api/client';
import { ComparisonResult } from '../types/market';
import { ComparisonChart } from '../charts/ComparisonChart';
import { formatPrice, formatPercent } from '../utils/formatters';
import { ChartSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { GitCompare, Plus, Check } from 'lucide-react';
import { cn } from '../utils/cn';

type CompareMode = 'normalized' | 'absolute';
type TimeRangePreset = '1H' | '6H' | '24H' | '7D';

export const ComparePage: React.FC = () => {
  const { assets } = useAssets();
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTCUSDT', 'ETHUSDT']);
  const [mode, setMode] = useState<CompareMode>('normalized');
  const [rangePreset, setRangePreset] = useState<TimeRangePreset>('24H');

  const [comparisonData, setComparisonData] = useState<ComparisonResult>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults once assets load
  useEffect(() => {
    if (assets.length > 0 && selectedSymbols.length === 0) {
      setSelectedSymbols(assets.slice(0, 2).map((a) => a.symbol));
    }
  }, [assets, selectedSymbols.length]);

  const calculateRange = useCallback(() => {
    const now = new Date();
    const to = now.toISOString();
    let fromDate: Date;

    switch (rangePreset) {
      case '1H':
        fromDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6H':
        fromDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24H':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7D':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    return { from: fromDate.toISOString(), to };
  }, [rangePreset]);

  const fetchComparison = useCallback(async () => {
    if (selectedSymbols.length === 0) {
      setComparisonData({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const { from, to } = calculateRange();

    try {
      const data = await api.getCompare(selectedSymbols, { from, to });
      setComparisonData(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load comparison data';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSymbols, calculateRange]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const toggleSymbol = (sym: string) => {
    setSelectedSymbols((prev) => {
      if (prev.includes(sym)) {
        if (prev.length <= 1) return prev; // Keep at least one
        return prev.filter((s) => s !== sym);
      } else {
        return [...prev, sym];
      }
    });
  };

  // Performance summary calculation
  const performanceSummary = selectedSymbols.map((sym) => {
    const points = comparisonData[sym] || [];
    if (points.length < 2) {
      return { symbol: sym, startPrice: undefined, endPrice: undefined, changePct: undefined };
    }
    const startPrice = Number(points[0].price);
    const endPrice = Number(points[points.length - 1].price);
    const changePct = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;

    return { symbol: sym, startPrice, endPrice, changePct };
  });

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="pb-1">
        <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight">
          MULTI-ASSET COMPARISON
        </h2>
        <p className="text-xs text-slate-500 font-sans">
          Correlate historical time-series curves with base normalization
        </p>
      </div>

      {/* Asset Selector & Controls Toolbar */}
      <div className="bg-white border border-slate-200 rounded-sm p-3.5 space-y-3 select-none">
        {/* Symbol Selector Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-mono font-semibold text-slate-500 uppercase mr-1">
            COMPARE INSTRUMENTS:
          </span>
          {assets.map((asset) => {
            const isSelected = selectedSymbols.includes(asset.symbol);
            return (
              <button
                key={asset.symbol}
                onClick={() => toggleSymbol(asset.symbol)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-sm border transition-colors',
                  isSelected
                    ? 'bg-slate-900 border-slate-900 text-white font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                )}
              >
                {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-slate-400" />}
                <span>{asset.symbol}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar: Mode and Range */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-2xs font-mono">
          {/* Normalization Mode Selection */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase">MODE:</span>
            <div className="inline-flex rounded-sm border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setMode('normalized')}
                className={cn(
                  'px-2.5 py-1 rounded-2xs font-semibold transition-colors',
                  mode === 'normalized'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                NORMALIZED % (BASE = 100)
              </button>
              <button
                onClick={() => setMode('absolute')}
                className={cn(
                  'px-2.5 py-1 rounded-2xs font-semibold transition-colors',
                  mode === 'absolute'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                ABSOLUTE PRICE
              </button>
            </div>
            {mode === 'normalized' && (
              <span className="text-[10px] text-slate-400 ml-1">
                (Starting value scaled to 100 to show relative delta)
              </span>
            )}
          </div>

          {/* Range Selection */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase mr-1">RANGE:</span>
            {(['1H', '6H', '24H', '7D'] as TimeRangePreset[]).map((rp) => (
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
      </div>

      {/* Main Comparison Chart */}
      {isLoading ? (
        <ChartSkeleton height={420} />
      ) : error ? (
        <ErrorState
          title="Comparison Data Fetch Error"
          message={error}
          onRetry={fetchComparison}
        />
      ) : Object.keys(comparisonData).length === 0 ? (
        <EmptyState
          title="No Comparison Points Available"
          description="Select at least one tracked asset with available historical data."
        />
      ) : (
        <ComparisonChart data={comparisonData} mode={mode} height={420} />
      )}

      {/* Summary Performance Table */}
      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden select-none">
        <div className="h-8 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-2xs font-mono font-bold text-slate-800">
          <span>RELATIVE PERFORMANCE BREAKDOWN</span>
          <span className="text-slate-400 font-normal">WINDOW: {rangePreset}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-2xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3.5">Asset</th>
                <th className="py-2 px-3.5 text-right">Window Open Price</th>
                <th className="py-2 px-3.5 text-right">Window Close Price</th>
                <th className="py-2 px-3.5 text-right">Relative Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-2xs">
              {performanceSummary.map((item) => (
                <tr key={item.symbol} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3.5 font-bold text-slate-900">{item.symbol}</td>
                  <td className="py-2 px-3.5 text-right text-slate-700 tabular-nums">
                    {item.startPrice !== undefined ? formatPrice(item.startPrice) : '—'}
                  </td>
                  <td className="py-2 px-3.5 text-right font-semibold text-slate-900 tabular-nums">
                    {item.endPrice !== undefined ? formatPrice(item.endPrice) : '—'}
                  </td>
                  <td className="py-2 px-3.5 text-right tabular-nums font-semibold">
                    {item.changePct !== undefined ? (
                      <span
                        className={cn(
                          item.changePct > 0 && 'text-emerald-700',
                          item.changePct < 0 && 'text-rose-700',
                          item.changePct === 0 && 'text-slate-600'
                        )}
                      >
                        {formatPercent(item.changePct)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
