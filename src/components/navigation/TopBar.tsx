import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { DataFreshness } from '../common/DataFreshness';
import { Search } from 'lucide-react';

interface TopBarProps {
  onOpenSearch?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenSearch }) => {
  const location = useLocation();
  const [utcTime, setUtcTime] = useState<string>('');

  // Keep a clean UTC clock running
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timeStr = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(
        now.getUTCSeconds()
      )} UTC`;
      setUtcTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Derive title from pathname
  const getContextTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/markets') {
      return { title: 'Market Overview', subtitle: 'Live activity across tracked assets' };
    }
    if (path.startsWith('/assets/')) {
      const sym = path.replace('/assets/', '').toUpperCase();
      return { title: `Asset: ${sym}`, subtitle: 'Real-time telemetry and order analysis' };
    }
    if (path === '/compare') {
      return { title: 'Multi-Asset Comparison', subtitle: 'Relative performance analysis' };
    }
    if (path === '/replay') {
      return { title: 'Market Replay Engine', subtitle: 'Historical tick-by-tick simulation' };
    }
    if (path === '/alerts') {
      return { title: 'Alerts & Triggers', subtitle: 'Threshold rules and event history' };
    }
    if (path === '/anomalies') {
      return { title: 'Anomaly Detection', subtitle: 'Unusual price and volume events' };
    }
    if (path === '/health') {
      return { title: 'Pipeline Health', subtitle: 'Data pipeline and ingestion telemetry' };
    }
    return { title: 'Market Terminal', subtitle: 'Cryptocurrency intelligence' };
  };

  const context = getContextTitle();

  return (
    <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between select-none flex-shrink-0 z-10">
      {/* Left: Context */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <h1 className="font-mono text-xs font-bold text-slate-900 uppercase tracking-tight">
          {context.title}
        </h1>
        <span className="hidden md:inline text-slate-300 font-mono text-xs">|</span>
        <span className="hidden md:inline text-2xs text-slate-500 font-sans">
          {context.subtitle}
        </span>
      </div>

      {/* Center: Search / Quick Switch button */}
      <div className="flex items-center">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-600 rounded-sm text-xs font-mono transition-colors"
          title="Quick switch asset (Cmd+K)"
        >
          <Search className="w-3 h-3 text-slate-400" />
          <span className="text-2xs text-slate-600">Search assets...</span>
          <kbd className="hidden sm:inline px-1 bg-white border border-slate-200 rounded-2xs text-[10px] text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Realtime status, freshness, clock */}
      <div className="flex items-center gap-3">
        <DataFreshness />
        <div className="h-3 w-px bg-slate-200" />
        <ConnectionStatus showReconnectButton={true} />
        <div className="h-3 w-px bg-slate-200 hidden sm:block" />
        <span className="hidden sm:inline font-mono text-2xs text-slate-600 tabular-nums">
          {utcTime}
        </span>
      </div>
    </header>
  );
};
