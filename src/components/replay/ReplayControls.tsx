import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { formatTimestamp } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10;

interface ReplayControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  speed: PlaybackSpeed;
  onChangeSpeed: (speed: PlaybackSpeed) => void;
  currentIndex: number;
  totalTicks: number;
  onSeek: (index: number) => void;
  currentTimeString?: string;
  className?: string;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 1, 2, 5, 10];

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onRestart,
  speed,
  onChangeSpeed,
  currentIndex,
  totalTicks,
  onSeek,
  currentTimeString,
  className,
}) => {
  const progressPercent = totalTicks > 0 ? (currentIndex / (totalTicks - 1)) * 100 : 0;

  return (
    <div className={cn('bg-white border border-slate-200 rounded-sm p-3.5 select-none space-y-3', className)}>
      {/* Top Bar: Playback controls & Speed */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Play / Pause / Restart */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            disabled={totalTicks === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-sm text-xs font-mono font-semibold transition-colors shadow-2xs"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>PLAY</span>
              </>
            )}
          </button>

          <button
            onClick={onRestart}
            disabled={totalTicks === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-sm text-xs font-mono transition-colors"
            title="Restart from beginning"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESTART</span>
          </button>
        </div>

        {/* Current Replayed Timestamp Display */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-sm font-mono text-xs">
          <span className="text-slate-500 uppercase text-2xs">Replay Time:</span>
          <strong className="text-slate-900 font-bold">
            {currentTimeString ? formatTimestamp(currentTimeString, 'timeOnlyUtc') : '—'}
          </strong>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 font-mono text-2xs">
          <span className="text-slate-500 mr-1 uppercase">SPEED:</span>
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={cn(
                'px-2 py-0.8 rounded-2xs font-semibold border transition-colors',
                speed === s
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Scrubber Timeline Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-2xs font-mono text-slate-500">
          <span>
            TIMELINE: {currentIndex + 1} / {totalTicks} TICKS
          </span>
          <span>{progressPercent.toFixed(1)}%</span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(0, totalTicks - 1)}
          value={currentIndex}
          onChange={(e) => onSeek(Number(e.target.value))}
          disabled={totalTicks === 0}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
        />
      </div>
    </div>
  );
};
