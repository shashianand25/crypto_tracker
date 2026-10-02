import React, { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  LineStyle,
  CrosshairMode,
} from 'lightweight-charts';
import { ReplayTick } from '../types/market';
import { parseSafeNumber, formatPrice, formatVolume, formatTimestamp } from '../utils/formatters';

interface ReplayChartProps {
  revealedTicks: ReplayTick[];
  symbol: string;
  currentTick: ReplayTick | null;
  height?: number;
}

export const ReplayChart: React.FC<ReplayChartProps> = ({
  revealedTicks,
  symbol,
  currentTick,
  height = 380,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
        fontSize: 11,
        fontFamily: 'Inter, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { color: '#f1f5f9', style: LineStyle.Dotted },
        horzLines: { color: '#f1f5f9', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#94a3b8', width: 1, style: LineStyle.Dashed },
        horzLine: { color: '#94a3b8', width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: true,
      },
    });

    chartRef.current = chart;

    const priceSeries = chart.addAreaSeries({
      topColor: 'rgba(15, 23, 42, 0.08)',
      bottomColor: 'rgba(15, 23, 42, 0.00)',
      lineColor: '#0f172a',
      lineWidth: 2,
    });
    priceSeriesRef.current = priceSeries;

    const volumeSeries = chart.addHistogramSeries({
      color: '#cbd5e1',
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      chart.applyOptions({
        width: entries[0].contentRect.width,
      });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!priceSeriesRef.current || !volumeSeriesRef.current) return;

    if (revealedTicks.length === 0) {
      priceSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      return;
    }

    const priceData: { time: UTCTimestamp; value: number }[] = [];
    const volumeData: { time: UTCTimestamp; value: number; color?: string }[] = [];
    let lastTime = 0;

    for (let i = 0; i < revealedTicks.length; i++) {
      const pt = revealedTicks[i];
      const timeSec = Math.floor(new Date(pt.ts).getTime() / 1000);
      const priceNum = parseSafeNumber(pt.price);
      const volNum = parseSafeNumber(pt.volume);

      if (isNaN(timeSec) || isNaN(priceNum)) continue;

      let t = timeSec;
      if (t <= lastTime) {
        t = lastTime + 1;
      }
      lastTime = t;

      priceData.push({ time: t as UTCTimestamp, value: priceNum });

      if (!isNaN(volNum)) {
        const prevPrice = i > 0 ? parseSafeNumber(revealedTicks[i - 1].price) : priceNum;
        volumeData.push({
          time: t as UTCTimestamp,
          value: volNum,
          color: priceNum >= prevPrice ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
        });
      }
    }

    if (priceData.length > 0) {
      priceSeriesRef.current.setData(priceData);
      volumeSeriesRef.current.setData(volumeData);
      chartRef.current?.timeScale().scrollToRealTime();
    }
  }, [revealedTicks]);

  return (
    <div className="relative w-full bg-white border border-slate-200 rounded-sm overflow-hidden select-none">
      <div className="h-9 px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-2xs font-mono">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900">{symbol}</span>
          {currentTick && (
            <div className="flex items-center gap-3 text-slate-700">
              <span>
                PRICE: <strong className="text-slate-950">{formatPrice(currentTick.price)}</strong>
              </span>
              <span>
                VOL: <strong className="text-slate-950">{formatVolume(currentTick.volume)}</strong>
              </span>
              <span className="text-slate-400">
                {formatTimestamp(currentTick.ts, 'timeOnlyUtc')}
              </span>
            </div>
          )}
        </div>
        <div className="text-slate-400">
          REVEALED TICKS: {revealedTicks.length.toLocaleString()}
        </div>
      </div>
      <div ref={containerRef} style={{ height }} className="w-full relative" />
    </div>
  );
};
