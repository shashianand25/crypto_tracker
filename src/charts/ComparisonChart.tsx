import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  LineStyle,
  CrosshairMode,
} from 'lightweight-charts';
import { ComparisonSeriesPoint } from '../types/market';
import { parseSafeNumber, formatTimestamp } from '../utils/formatters';

interface ComparisonChartProps {
  data: Record<string, ComparisonSeriesPoint[]>;
  mode: 'absolute' | 'normalized';
  height?: number;
}

const PALETTE = [
  '#0284c7', // Sky / Blue
  '#16a34a', // Emerald / Green
  '#d97706', // Amber
  '#9333ea', // Purple
  '#dc2626', // Red
  '#0d9488', // Teal
  '#4f46e5', // Indigo
];

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  mode,
  height = 420,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const [hoveredInfo, setHoveredInfo] = useState<{
    time?: number;
    values: Record<string, number>;
  } | null>(null);

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
        vertLine: {
          color: '#94a3b8',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0f172a',
        },
        horzLine: {
          color: '#94a3b8',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0f172a',
        },
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: true,
      },
    });

    chartRef.current = chart;

    // Crosshair hover callback
    chart.subscribeCrosshairMove((param) => {
      if (
        !param.time ||
        param.point === undefined ||
        param.point.x < 0 ||
        param.point.x > containerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > height
      ) {
        setHoveredInfo(null);
        return;
      }

      const values: Record<string, number> = {};
      seriesMapRef.current.forEach((series, symbol) => {
        const val = param.seriesData.get(series);
        if (val && typeof (val as { value?: number }).value === 'number') {
          values[symbol] = (val as { value: number }).value;
        }
      });

      setHoveredInfo({
        time: typeof param.time === 'number' ? param.time : undefined,
        values,
      });
    });

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
      seriesMapRef.current.clear();
    };
  }, [height]);

  // Update Series when data or mode changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove existing series
    seriesMapRef.current.forEach((series) => {
      chart.removeSeries(series);
    });
    seriesMapRef.current.clear();

    const symbols = Object.keys(data);
    if (symbols.length === 0) return;

    symbols.forEach((symbol, index) => {
      const color = PALETTE[index % PALETTE.length];
      const series = chart.addLineSeries({
        color,
        lineWidth: 2,
        title: symbol,
        priceFormat: {
          type: mode === 'normalized' ? 'percent' : 'price',
          precision: 2,
          minMove: 0.01,
        },
      });

      const rawPoints = (data[symbol] || [])
        .map((pt) => {
          const timeSec =
            typeof pt.ts === 'number'
              ? pt.ts < 1e11
                ? Math.floor(pt.ts)
                : Math.floor(pt.ts / 1000)
              : Math.floor(new Date(pt.ts).getTime() / 1000);
          return {
            time: timeSec as UTCTimestamp,
            price: parseSafeNumber(pt.price),
          };
        })
        .filter((pt) => !isNaN(pt.time) && !isNaN(pt.price))
        .sort((a, b) => a.time - b.time);

      if (rawPoints.length === 0) return;

      const basePrice = rawPoints[0].price;

      // Deduplicate timestamps
      const formattedPoints: { time: UTCTimestamp; value: number }[] = [];
      let lastTime = 0;

      for (let i = 0; i < rawPoints.length; i++) {
        const pt = rawPoints[i];
        let t = pt.time;
        if (t <= lastTime) {
          t = (lastTime + 1) as UTCTimestamp;
        }
        lastTime = t;

        let val = pt.price;
        if (mode === 'normalized') {
          // Starting value = 100, then relative performance %: ((pt.price / basePrice) - 1) * 100 or 100 * (pt.price / basePrice)
          // Starting value = 100
          val = basePrice > 0 ? (pt.price / basePrice) * 100 : 100;
        }

        formattedPoints.push({ time: t, value: Number(val.toFixed(3)) });
      }

      series.setData(formattedPoints);
      seriesMapRef.current.set(symbol, series);
    });

    chart.timeScale().fitContent();
  }, [data, mode]);

  const symbols = Object.keys(data);

  return (
    <div className="relative w-full bg-white border border-slate-200 rounded-sm overflow-hidden select-none">
      {/* Chart Header & Legend */}
      <div className="h-9 px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-2xs font-mono">
        <div className="flex items-center gap-3 overflow-x-auto">
          <span className="font-bold text-slate-800">
            {mode === 'normalized' ? 'NORMALIZED (BASE = 100)' : 'ABSOLUTE PRICES'}
          </span>
          <div className="flex items-center gap-3">
            {symbols.map((sym, idx) => {
              const color = PALETTE[idx % PALETTE.length];
              const hoveredVal = hoveredInfo?.values[sym];
              return (
                <div key={sym} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5" style={{ backgroundColor: color }} />
                  <span className="font-medium text-slate-700">{sym}</span>
                  {hoveredVal !== undefined && (
                    <span className="font-semibold text-slate-900">
                      {mode === 'normalized'
                        ? `${hoveredVal.toFixed(2)} (${hoveredVal >= 100 ? '+' : ''}${(
                            hoveredVal - 100
                          ).toFixed(2)}%)`
                        : `$${hoveredVal.toLocaleString()}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {hoveredInfo?.time && (
          <span className="text-slate-400">
            {formatTimestamp(hoveredInfo.time * 1000, 'timeOnlyUtc')}
          </span>
        )}
      </div>

      {/* Chart Canvas */}
      <div ref={containerRef} style={{ height }} className="w-full relative" />
    </div>
  );
};
