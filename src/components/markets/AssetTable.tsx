import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetInfo } from '../../types/market';
import { PriceRecordWithDirection } from '../../hooks/useLatestPrices';
import { formatPrice, formatVolume, formatRelativeTime } from '../../utils/formatters';
import { ArrowUp, ArrowDown, Search, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AssetTableProps {
  assets: AssetInfo[];
  prices: Record<string, PriceRecordWithDirection>;
  className?: string;
}

// Memoized Table Row to prevent excessive rerendering across all rows
const AssetTableRow = memo<{
  asset: AssetInfo;
  priceData?: PriceRecordWithDirection;
  onClick: () => void;
}>(({ asset, priceData, onClick }) => {
  const [flashColor, setFlashColor] = useState<'up' | 'down' | null>(null);

  // Trigger subtle flash when price value changes
  useEffect(() => {
    if (!priceData?.direction || priceData.direction === 'neutral') return;

    setFlashColor(priceData.direction);
    const timer = setTimeout(() => {
      setFlashColor(null);
    }, 400);

    return () => clearTimeout(timer);
  }, [priceData?.price, priceData?.direction]);

  const hasData = Boolean(priceData && priceData.price);
  const direction = priceData?.direction || 'neutral';

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer border-b border-slate-200/80 hover:bg-slate-50 transition-colors select-none text-xs group"
    >
      {/* Symbol Column */}
      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span>{asset.symbol}</span>
          {asset.name && (
            <span className="text-2xs font-sans font-normal text-slate-400 hidden sm:inline">
              {asset.name}
            </span>
          )}
        </div>
      </td>

      {/* Price Column with Flash Animation */}
      <td className="py-2.5 px-3.5 text-right font-mono tabular-nums whitespace-nowrap">
        <span
          className={cn(
            'inline-flex items-center justify-end gap-1 px-1.5 py-0.5 rounded-2xs transition-colors duration-300 font-semibold',
            flashColor === 'up' && 'bg-emerald-100/80 text-emerald-800',
            flashColor === 'down' && 'bg-rose-100/80 text-rose-800',
            !flashColor && direction === 'up' && 'text-emerald-700',
            !flashColor && direction === 'down' && 'text-rose-700',
            !flashColor && direction === 'neutral' && 'text-slate-900'
          )}
        >
          {direction === 'up' && <ArrowUp className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
          {direction === 'down' && <ArrowDown className="w-3 h-3 text-rose-600 flex-shrink-0" />}
          {hasData ? formatPrice(priceData!.price) : '—'}
        </span>
      </td>

      {/* Volume Column */}
      <td className="py-2.5 px-3.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
        {hasData ? formatVolume(priceData!.volume, asset.baseAsset) : '—'}
      </td>

      {/* Last Update */}
      <td className="py-2.5 px-3.5 text-right font-mono text-2xs text-slate-500 tabular-nums whitespace-nowrap">
        {priceData?.lastUpdatedMs ? formatRelativeTime(priceData.lastUpdatedMs) : '—'}
      </td>

      {/* Status */}
      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.2 border text-[10px] font-mono rounded-2xs',
            hasData
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-slate-50 border-slate-200 text-slate-400'
          )}
        >
          <span
            className={cn(
              'w-1 h-1 rounded-full',
              hasData ? 'bg-emerald-600' : 'bg-slate-400'
            )}
          />
          {hasData ? 'STREAMING' : 'IDLE'}
        </span>
      </td>

      {/* Action link */}
      <td className="py-2.5 px-3 text-right text-slate-300 group-hover:text-slate-700 transition-colors">
        <ArrowRight className="w-3.5 h-3.5 inline-block" />
      </td>
    </tr>
  );
});

AssetTableRow.displayName = 'AssetTableRow';

export const AssetTable: React.FC<AssetTableProps> = ({ assets, prices, className }) => {
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  // Re-render elapsed time every 2 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(timer);
  }, []);

  const filteredAssets = assets.filter((a) => {
    const f = filter.toLowerCase().trim();
    if (!f) return true;
    return a.symbol.toLowerCase().includes(f) || (a.name && a.name.toLowerCase().includes(f));
  });

  return (
    <div className={cn('bg-white border border-slate-200 rounded-sm overflow-hidden select-none', className)}>
      {/* Table Toolbar / Filter */}
      <div className="h-10 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-700">
          <span>ALL ASSETS</span>
          <span className="text-2xs font-normal text-slate-400 font-sans">
            ({filteredAssets.length} of {assets.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-sm w-52">
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter symbol..."
            className="w-full bg-transparent text-xs font-mono text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-2xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2 px-3.5">Asset</th>
              <th className="py-2 px-3.5 text-right">Price</th>
              <th className="py-2 px-3.5 text-right">Volume</th>
              <th className="py-2 px-3.5 text-right">Last Update</th>
              <th className="py-2 px-3.5 text-center">Status</th>
              <th className="py-2 px-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs font-mono text-slate-400">
                  No matching assets found
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset) => (
                <AssetTableRow
                  key={asset.symbol}
                  asset={asset}
                  priceData={prices[asset.symbol]}
                  onClick={() => navigate(`/assets/${asset.symbol}`)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
