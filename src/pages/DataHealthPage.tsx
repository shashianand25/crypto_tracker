import React from 'react';
import { useHealth } from '../hooks/useHealth';
import { useDataFreshness } from '../hooks/useDataFreshness';
import { getApiBaseUrl, getWebSocketUrl } from '../api/client';
import { formatTimestamp } from '../utils/formatters';
import { HeartPulse, RefreshCw, Server, Wifi, Database, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export const DataHealthPage: React.FC = () => {
  const {
    healthData,
    isLoading,
    error,
    latencyMs,
    lastCheckedAt,
    wsStatus,
    totalTicksReceived,
    refetch,
  } = useHealth();

  const { secondsAgo } = useDataFreshness();

  // Distinguish health strictly based on backend response
  const getOverallHealth = (): {
    status: 'Healthy' | 'Degraded' | 'Disconnected' | 'Unknown';
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  } => {
    if (error) {
      return {
        status: 'Disconnected',
        badgeClass: 'bg-rose-50 border-rose-300 text-rose-800',
        icon: XCircle,
      };
    }

    if (!healthData) {
      return {
        status: 'Unknown',
        badgeClass: 'bg-slate-100 border-slate-300 text-slate-700',
        icon: HelpCircle,
      };
    }

    // Check backend reported status fields
    const statusStr = String(healthData.status || '').toLowerCase();
    const isHealthyBool = healthData.healthy;

    if (statusStr === 'healthy' || statusStr === 'ok' || statusStr === 'up' || isHealthyBool === true) {
      return {
        status: 'Healthy',
        badgeClass: 'bg-emerald-50 border-emerald-300 text-emerald-800',
        icon: CheckCircle2,
      };
    }

    if (statusStr === 'degraded' || statusStr === 'warning' || isHealthyBool === false) {
      return {
        status: 'Degraded',
        badgeClass: 'bg-amber-50 border-amber-300 text-amber-800',
        icon: AlertTriangle,
      };
    }

    return {
      status: 'Healthy',
      badgeClass: 'bg-emerald-50 border-emerald-300 text-emerald-800',
      icon: CheckCircle2,
    };
  };

  const healthState = getOverallHealth();
  const StatusIcon = healthState.icon;

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-slate-800" />
            <span>DATA PIPELINE HEALTH MONITOR</span>
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Engineering telemetry for REST APIs, live WebSocket feeds, and data freshness
          </p>
        </div>

        <button
          onClick={refetch}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-sm text-xs font-mono font-medium transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
          <span>RUN HEALTH CHECK</span>
        </button>
      </div>

      {/* System Status Banner */}
      <div className={cn('p-4 border rounded-sm flex items-center justify-between select-none', healthState.badgeClass)}>
        <div className="flex items-center gap-3">
          <StatusIcon className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="font-mono text-sm font-bold uppercase tracking-wide">
              SYSTEM STATE: {healthState.status}
            </div>
            <div className="text-xs font-mono opacity-85 mt-0.5">
              {error
                ? error
                : `Backend responded with status "${healthData?.status ?? 'active'}"`}
            </div>
          </div>
        </div>

        <div className="text-right font-mono text-2xs opacity-75 hidden sm:block">
          <div>PING: {latencyMs !== null ? `${latencyMs}ms` : '—'}</div>
          <div>CHECKED: {lastCheckedAt ? formatTimestamp(lastCheckedAt, 'timeOnlyUtc') : '—'}</div>
        </div>
      </div>

      {/* Subsystem Health Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs select-none">
        {/* Backend REST Service */}
        <div className="bg-white border border-slate-200 rounded-sm p-3.5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span>BACKEND REST API</span>
            </div>
            <span
              className={cn(
                'px-1.5 py-0.2 border text-[10px] font-semibold rounded-2xs',
                healthData
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              )}
            >
              {healthData ? 'ONLINE' : 'UNREACHABLE'}
            </span>
          </div>

          <div className="space-y-1 text-2xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Endpoint:</span>
              <span className="text-slate-800 truncate max-w-[150px]">{getApiBaseUrl()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RTT Latency:</span>
              <span className="text-slate-800 font-semibold">{latencyMs !== null ? `${latencyMs} ms` : '—'}</span>
            </div>
            {healthData?.uptime !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-400">Uptime:</span>
                <span className="text-slate-800">{Math.round(Number(healthData.uptime))}s</span>
              </div>
            )}
          </div>
        </div>

        {/* WebSocket Live Feed */}
        <div className="bg-white border border-slate-200 rounded-sm p-3.5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Wifi className="w-3.5 h-3.5 text-slate-500" />
              <span>LIVE WEBSOCKET</span>
            </div>
            <span
              className={cn(
                'px-1.5 py-0.2 border text-[10px] font-semibold rounded-2xs',
                wsStatus === 'CONNECTED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              )}
            >
              {wsStatus}
            </span>
          </div>

          <div className="space-y-1 text-2xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Endpoint:</span>
              <span className="text-slate-800 truncate max-w-[150px]">{getWebSocketUrl()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ticks Ingested:</span>
              <span className="text-slate-800 font-semibold">{totalTicksReceived.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Connection:</span>
              <span className="text-slate-800">{wsStatus === 'CONNECTED' ? 'Active stream' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        {/* Data Freshness */}
        <div className="bg-white border border-slate-200 rounded-sm p-3.5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>DATA FRESHNESS</span>
            </div>
            <span
              className={cn(
                'px-1.5 py-0.2 border text-[10px] font-semibold rounded-2xs',
                secondsAgo !== null && secondsAgo <= 5
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              )}
            >
              {secondsAgo !== null ? (secondsAgo <= 5 ? 'FRESH' : 'DELAYED') : 'NO DATA'}
            </span>
          </div>

          <div className="space-y-1 text-2xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Elapsed Age:</span>
              <span className="text-slate-800 font-semibold">
                {secondsAgo !== null ? `${secondsAgo.toFixed(1)} sec` : '—'}
              </span>
            </div>
            {healthData?.latestDataTimestamp && (
              <div className="flex justify-between">
                <span className="text-slate-400">Server TS:</span>
                <span className="text-slate-800">
                  {formatTimestamp(healthData.latestDataTimestamp, 'timeOnlyUtc')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Collector:</span>
              <span className="text-slate-800">{healthData?.dataCollectionStatus || 'Active'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Health Payload Telemetry */}
      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden select-none">
        <div className="h-8 px-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-2xs font-mono font-bold text-slate-800">
          <span>RAW HEALTH PAYLOAD (GET /api/health)</span>
          <span className="text-slate-400 font-normal">JSON TELEMETRY</span>
        </div>

        <div className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
          <pre className="selection:bg-slate-700">
            {healthData
              ? JSON.stringify(healthData, null, 2)
              : error
              ? JSON.stringify({ error, status: 'unreachable' }, null, 2)
              : '// Awaiting health payload response...'}
          </pre>
        </div>
      </div>
    </div>
  );
};
