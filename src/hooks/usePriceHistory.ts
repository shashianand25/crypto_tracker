import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError } from '../api/client';
import { PriceHistoryPoint, HistoryInterval } from '../types/market';

export type TimeRangePreset = '1H' | '6H' | '24H' | '7D' | 'Custom';

export interface UsePriceHistoryOptions {
  symbol: string;
  interval?: HistoryInterval;
  rangePreset?: TimeRangePreset;
  customFrom?: string;
  customTo?: string;
}

export function usePriceHistory({
  symbol,
  interval = '1m',
  rangePreset = '24H',
  customFrom,
  customTo,
}: UsePriceHistoryOptions) {
  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Compute from / to ISO strings based on preset
  const calculateRange = useCallback(() => {
    if (rangePreset === 'Custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }

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
  }, [rangePreset, customFrom, customTo]);

  const activeRequestIdRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    const reqId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    const { from, to } = calculateRange();

    try {
      const history = await api.getAssetHistory(symbol, {
        from,
        to,
        interval,
      });

      if (reqId === activeRequestIdRef.current) {
        // Sort chronologically by timestamp
        const sorted = [...history].sort((a, b) => {
          const ta = typeof a.ts === 'number' ? a.ts : new Date(a.ts).getTime();
          const tb = typeof b.ts === 'number' ? b.ts : new Date(b.ts).getTime();
          return ta - tb;
        });
        setData(sorted);
      }
    } catch (err: unknown) {
      if (reqId === activeRequestIdRef.current) {
        const msg = err instanceof ApiError ? err.message : `Failed to load history for ${symbol}`;
        setError(msg);
      }
    } finally {
      if (reqId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [symbol, interval, calculateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
