import React from 'react';
import { useAssets } from '../hooks/useAssets';
import { useLatestPrices } from '../hooks/useLatestPrices';
import { useAlerts } from '../hooks/useAlerts';
import { useWebSocketContext } from '../context/WebSocketContext';
import { useDataFreshness } from '../hooks/useDataFreshness';
import { MetricStrip, MetricItem } from '../components/common/MetricStrip';
import { AssetTable } from '../components/markets/AssetTable';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';

export const MarketOverviewPage: React.FC = () => {
  const { assets, isLoading: assetsLoading, error: assetsError, refetch: refetchAssets } = useAssets();
  const { prices, isLoading: pricesLoading, error: pricesError, refetch: refetchPrices } = useLatestPrices();
  const { activeAlerts } = useAlerts();
  const { totalTicksReceived, status: wsStatus } = useWebSocketContext();
  const { secondsAgo } = useDataFreshness();

  const isLoading = assetsLoading || pricesLoading;
  const error = assetsError || pricesError;

  const handleRetry = () => {
    refetchAssets();
    refetchPrices();
  };

  // Metrics for horizontal strip
  const metricItems: MetricItem[] = [
    {
      label: 'Tracked Assets',
      value: assets.length.toLocaleString(),
      hint: 'Active instruments',
    },
    {
      label: 'Live Stream Ticks',
      value: totalTicksReceived.toLocaleString(),
      hint: wsStatus === 'CONNECTED' ? 'Ingesting ticks' : 'Stream disconnected',
      statusColor: wsStatus === 'CONNECTED' ? 'normal' : 'warning',
    },
    {
      label: 'Pipeline Freshness',
      value:
        wsStatus !== 'CONNECTED'
          ? 'OFFLINE'
          : secondsAgo !== null
          ? `${secondsAgo.toFixed(1)}s`
          : 'Awaiting',
      hint: 'Latency delta',
      statusColor:
        wsStatus !== 'CONNECTED' ? 'down' : secondsAgo && secondsAgo > 5 ? 'warning' : 'up',
    },
    {
      label: 'Active Rules',
      value: activeAlerts.length.toLocaleString(),
      hint: 'Armed triggers',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight">
            MARKET OVERVIEW
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Real-time multi-asset market activity and telemetry
          </p>
        </div>
      </div>

      {/* Horizontal Metrics Strip */}
      <MetricStrip metrics={metricItems} />

      {/* Content Area */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : error ? (
        <ErrorState
          title="Market Data Ingestion Error"
          message={error}
          onRetry={handleRetry}
        />
      ) : assets.length === 0 ? (
        <EmptyState
          title="No Tracked Assets Found"
          description="The market data service reported zero registered assets. Verify backend collector configuration."
          action={
            <button
              onClick={handleRetry}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-mono rounded-sm"
            >
              Refresh Assets
            </button>
          }
        />
      ) : (
        <AssetTable assets={assets} prices={prices} />
      )}
    </div>
  );
};
