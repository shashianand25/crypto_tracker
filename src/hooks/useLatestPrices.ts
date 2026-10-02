import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, ApiError } from '../api/client';
import { LatestPriceData, LatestPricesMap } from '../types/market';
import { useWebSocketContext } from '../context/WebSocketContext';
import { parseSafeNumber } from '../utils/formatters';

export interface PriceRecordWithDirection extends LatestPriceData {
  previousPrice?: string;
  direction?: 'up' | 'down' | 'neutral';
  lastUpdatedMs: number;
}

export function useLatestPrices() {
  const [initialPrices, setInitialPrices] = useState<LatestPricesMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { latestTicks } = useWebSocketContext();

  const fetchPrices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getLatestPrices();
      setInitialPrices(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to fetch latest prices';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Merge initial REST prices with real-time incoming WebSocket ticks
  const mergedPrices = useMemo<Record<string, PriceRecordWithDirection>>(() => {
    const result: Record<string, PriceRecordWithDirection> = {};
    const now = Date.now();

    // 1. Seed with REST data
    for (const [sym, data] of Object.entries(initialPrices)) {
      result[sym] = {
        ...data,
        lastUpdatedMs: data.ts ? new Date(data.ts).getTime() || now : now,
        direction: 'neutral',
      };
    }

    // 2. Overlay live WS ticks
    for (const [sym, tick] of Object.entries(latestTicks)) {
      const prev = result[sym];
      const prevPriceNum = prev ? parseSafeNumber(prev.price) : NaN;
      const newPriceNum = parseSafeNumber(tick.price);

      let direction: 'up' | 'down' | 'neutral' = 'neutral';
      if (!isNaN(prevPriceNum) && !isNaN(newPriceNum) && prevPriceNum !== newPriceNum) {
        direction = newPriceNum > prevPriceNum ? 'up' : 'down';
      } else if (prev) {
        direction = prev.direction || 'neutral';
      }

      result[sym] = {
        symbol: sym,
        price: tick.price,
        volume: tick.volume,
        ts: tick.ts,
        previousPrice: prev?.price,
        direction,
        lastUpdatedMs: tick.ts ? new Date(tick.ts).getTime() || now : now,
      };
    }

    return result;
  }, [initialPrices, latestTicks]);

  return {
    prices: mergedPrices,
    isLoading,
    error,
    refetch: fetchPrices,
  };
}
