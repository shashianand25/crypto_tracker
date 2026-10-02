import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAssets } from '../hooks/useAssets';
import { api, ApiError } from '../api/client';
import { ReplayTick } from '../types/market';
import { ReplayControls, PlaybackSpeed } from '../components/replay/ReplayControls';
import { ReplayChart } from '../charts/ReplayChart';
import { ReplayTape } from '../components/replay/ReplayTape';
import { ChartSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { History, Play } from 'lucide-react';

export const ReplayPage: React.FC = () => {
  const { assets } = useAssets();
  const [symbol, setSymbol] = useState('BTCUSDT');

  // Time window defaults: last 4 hours
  const [fromTime, setFromTime] = useState(() => {
    const d = new Date(Date.now() - 4 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [toTime, setToTime] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });

  const [allTicks, setAllTicks] = useState<ReplayTick[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync symbol once assets load
  useEffect(() => {
    if (assets.length > 0 && !assets.some((a) => a.symbol === symbol)) {
      setSymbol(assets[0].symbol);
    }
  }, [assets, symbol]);

  const loadReplayData = useCallback(async () => {
    if (!symbol) return;
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentIndex(0);

    try {
      const fromIso = fromTime ? new Date(fromTime).toISOString() : undefined;
      const toIso = toTime ? new Date(toTime).toISOString() : undefined;

      const data = await api.getReplay(symbol, {
        from: fromIso,
        to: toIso,
      });

      // Sort chronologically ascending
      const sorted = [...data].sort((a, b) => {
        const ta = new Date(a.ts).getTime();
        const tb = new Date(b.ts).getTime();
        return ta - tb;
      });

      setAllTicks(sorted);
      if (sorted.length > 0) {
        // Start with at least the first 5 ticks or 10% for immediate chart visibility
        setCurrentIndex(Math.min(5, sorted.length - 1));
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load historical replay data';
      setError(msg);
      setAllTicks([]);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, fromTime, toTime]);

  // Initial load once on mount
  useEffect(() => {
    loadReplayData();
  }, [loadReplayData]);

  // Playback loop
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(50, Math.round(500 / speed));

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= allTicks.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, allTicks.length]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const revealedTicks = allTicks.slice(0, currentIndex + 1);
  const currentTick = allTicks[currentIndex] || null;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="pb-1">
        <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight">
          HISTORICAL MARKET REPLAY ENGINE
        </h2>
        <p className="text-xs text-slate-500 font-sans">
          Deterministic time-series playback for market microstructure analysis
        </p>
      </div>

      {/* Query Parameters Box */}
      <div className="bg-white border border-slate-200 rounded-sm p-3.5 select-none">
        <div className="flex flex-wrap items-end gap-3 text-xs font-mono">
          {/* Asset Selector */}
          <div>
            <label className="block text-2xs font-semibold uppercase text-slate-500 mb-1">
              INSTRUMENT
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-sm font-bold text-slate-900 outline-none"
            >
              {assets.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol}
                </option>
              ))}
            </select>
          </div>

          {/* From Time */}
          <div>
            <label className="block text-2xs font-semibold uppercase text-slate-500 mb-1">
              FROM (UTC / LOCAL)
            </label>
            <input
              type="datetime-local"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              className="h-8 px-2 bg-slate-50 border border-slate-300 rounded-sm text-slate-800 outline-none text-xs font-mono"
            />
          </div>

          {/* To Time */}
          <div>
            <label className="block text-2xs font-semibold uppercase text-slate-500 mb-1">
              TO (UTC / LOCAL)
            </label>
            <input
              type="datetime-local"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              className="h-8 px-2 bg-slate-50 border border-slate-300 rounded-sm text-slate-800 outline-none text-xs font-mono"
            />
          </div>

          {/* Load Button */}
          <button
            onClick={loadReplayData}
            disabled={isLoading}
            className="h-8 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-sm font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <History className="w-3.5 h-3.5" />
            <span>{isLoading ? 'FETCHING REPLAY...' : 'LOAD REPLAY DATA'}</span>
          </button>
        </div>
      </div>

      {/* Main Replay Controls & Visualization */}
      {isLoading ? (
        <ChartSkeleton height={420} />
      ) : error ? (
        <ErrorState
          title="Replay Data Ingestion Error"
          message={error}
          onRetry={loadReplayData}
        />
      ) : allTicks.length === 0 ? (
        <EmptyState
          title="No Replay Data Found"
          description="The backend returned zero historical ticks for the specified asset and time range. Try widening the window."
          action={
            <button
              onClick={loadReplayData}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-mono rounded-sm"
            >
              Retry Query
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Controls */}
          <ReplayControls
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onRestart={handleRestart}
            speed={speed}
            onChangeSpeed={(s) => setSpeed(s)}
            currentIndex={currentIndex}
            totalTicks={allTicks.length}
            onSeek={(idx) => setCurrentIndex(idx)}
            currentTimeString={currentTick?.ts}
          />

          {/* Replay Chart */}
          <ReplayChart
            revealedTicks={revealedTicks}
            symbol={symbol}
            currentTick={currentTick}
            height={400}
          />

          {/* Replay Tick Tape */}
          <ReplayTape ticks={revealedTicks} />
        </div>
      )}
    </div>
  );
};
