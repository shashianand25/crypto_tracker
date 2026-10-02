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
import { PriceHistoryPoint } from '../types/market';
import { parseSafeNumber, formatPrice, formatVolume, formatTimestamp } from '../utils/formatters';

interface FinancialPriceChartProps {
  data: PriceHistoryPoint[];
  symbol: string;
  showVolume?: boolean;
  latestTick?: { price: string; volume: string; ts: string };
  height?: number;
}

export const FinancialPriceChart: React.FC<FinancialPriceChartProps> = ({
  data,
  symbol,
  showVolume = true,
  latestTick,
  height = 420,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Tooltip tracking
  const [hoveredPoint, setHoveredPoint] = useState<{
    price?: number;
    volume?: number;
    time?: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Chart
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
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.25 : 0.1,
        },
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: true,
      },
    });

    chartRef.current = chart;

    // Price Area Series
    const priceSeries = chart.addAreaSeries({
      topColor: 'rgba(2, 132, 199, 0.12)',
      bottomColor: 'rgba(2, 132, 199, 0.00)',
      lineColor: '#0284c7',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });
    priceSeriesRef.current = priceSeries;

    // Volume Histogram Series
    let volumeSeries: ISeriesApi<'Histogram'> | null = null;
    if (showVolume) {
      volumeSeries = chart.addHistogramSeries({
        color: '#cbd5e1',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.78,
          bottom: 0,
        },
      });

      volumeSeriesRef.current = volumeSeries;
    }

    // Crosshair move subscription for custom tooltip
    chart.subscribeCrosshairMove((param) => {
      if (
        !param.time ||
        param.point === undefined ||
        param.point.x < 0 ||
        param.point.x > containerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > height
      ) {
        setHoveredPoint(null);
        return;
      }

      const priceVal = param.seriesData.get(priceSeries);
      const volVal = volumeSeries ? param.seriesData.get(volumeSeries) : undefined;

      const pNum = priceVal ? (priceVal as { value?: number }).value : undefined;
      const vNum = volVal ? (volVal as { value?: number }).value : undefined;

      setHoveredPoint({
        price: pNum,
        volume: vNum,
        time: typeof param.time === 'number' ? param.time : undefined,
      });
    });

    // Handle Window Resizing
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
  }, [height, showVolume]);

  // Update Data points in chart
  useEffect(() => {
    if (!priceSeriesRef.current || !data || data.length === 0) return;

    // Process and sort points chronologically with unique timestamps
    const rawPoints = data
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
          volume: parseSafeNumber(pt.volume),
        };
      })
      .filter((pt) => !isNaN(pt.time) && !isNaN(pt.price))
      .sort((a, b) => a.time - b.time);

    // Deduplicate duplicate times by incrementing or keeping latest
    const priceData: { time: UTCTimestamp; value: number }[] = [];
    const volumeData: { time: UTCTimestamp; value: number; color?: string }[] = [];

    let lastTime = 0;
    for (let i = 0; i < rawPoints.length; i++) {
      const pt = rawPoints[i];
      let t = pt.time;
      if (t <= lastTime) {
        t = (lastTime + 1) as UTCTimestamp;
      }
      lastTime = t;

      priceData.push({ time: t, value: pt.price });

      if (showVolume && !isNaN(pt.volume)) {
        const prevPrice = i > 0 ? rawPoints[i - 1].price : pt.price;
        const isUp = pt.price >= prevPrice;
        volumeData.push({
          time: t,
          value: pt.volume,
          color: isUp ? 'rgba(34, 197, 94, 0.45)' : 'rgba(239, 68, 68, 0.45)',
        });
      }
    }

    if (priceData.length > 0) {
      priceSeriesRef.current.setData(priceData);
      if (volumeSeriesRef.current && volumeData.length > 0) {
        volumeSeriesRef.current.setData(volumeData);
      }
      chartRef.current?.timeScale().fitContent();
    }
  }, [data, showVolume]);

  // Handle live WebSocket incoming tick update
  useEffect(() => {
    if (!latestTick || !priceSeriesRef.current) return;

    const timeSec = Math.floor(new Date(latestTick.ts).getTime() / 1000) as UTCTimestamp;
    const priceNum = parseSafeNumber(latestTick.price);
    const volNum = parseSafeNumber(latestTick.volume);

    if (isNaN(timeSec) || isNaN(priceNum)) return;

    try {
      priceSeriesRef.current.update({
        time: timeSec,
        value: priceNum,
      });

      if (volumeSeriesRef.current && !isNaN(volNum)) {
        volumeSeriesRef.current.update({
          time: timeSec,
          value: volNum,
          color: 'rgba(2, 132, 199, 0.45)',
        });
      }
    } catch {
      // Ignore if tick time is older than current data
    }
  }, [latestTick]);

  return (
    <div className="relative w-full bg-white border border-slate-200 rounded-sm overflow-hidden select-none">
      {/* Chart Top Info Bar */}
      <div className="h-9 px-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-2xs font-mono">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800">{symbol}</span>
          {hoveredPoint ? (
            <div className="flex items-center gap-3 text-slate-600">
              <span>
                P: <strong className="text-slate-900">{formatPrice(hoveredPoint.price)}</strong>
              </span>
              {hoveredPoint.volume !== undefined && (
                <span>
                  V: <strong className="text-slate-900">{formatVolume(hoveredPoint.volume)}</strong>
                </span>
              )}
              {hoveredPoint.time && (
                <span className="text-slate-400">
                  {formatTimestamp(hoveredPoint.time * 1000, 'timeOnlyUtc')}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">Hover crosshair for cursor telemetry</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <span>UTC</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={containerRef} style={{ height }} className="w-full relative" />
    </div>
  );
};
