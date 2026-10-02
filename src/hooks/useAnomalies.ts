import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../api/client';
import { AnomalyEvent, AnomalyQueryParams } from '../types/anomaly';
import { useWebSocketContext } from '../context/WebSocketContext';
import { AnomalyMessage } from '../types/websocket';

export function useAnomalies(initialParams: AnomalyQueryParams = {}) {
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSymbol, setFilterSymbol] = useState<string>(initialParams.symbol || '');
  const [fromTime, setFromTime] = useState<string>(initialParams.from || '');
  const [toTime, setToTime] = useState<string>(initialParams.to || '');

  const { subscribeAnomalies } = useWebSocketContext();

  const fetchAnomalies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getAnomalies({
        symbol: filterSymbol || undefined,
        from: fromTime || undefined,
        to: toTime || undefined,
      });

      // Sort chronologically descending (newest first)
      const sorted = [...data].sort((a, b) => {
        const ta = new Date(a.ts).getTime();
        const tb = new Date(b.ts).getTime();
        return tb - ta;
      });

      setAnomalies(sorted);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to fetch anomaly records';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filterSymbol, fromTime, toTime]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  // Merge live incoming anomalies from WebSocket
  useEffect(() => {
    const unsubscribe = subscribeAnomalies((msg: AnomalyMessage) => {
      // If symbol filter is active, only include if matches
      if (filterSymbol && msg.symbol.toUpperCase() !== filterSymbol.toUpperCase()) {
        return;
      }

      const event: AnomalyEvent = {
        id: msg.id,
        symbol: msg.symbol,
        metric: msg.metric,
        event: msg.event || msg.description,
        description: msg.description,
        price: msg.price,
        volume: msg.volume,
        severity: msg.severity,
        ts: msg.ts,
      };

      setAnomalies((prev) => [event, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, [filterSymbol, subscribeAnomalies]);

  return {
    anomalies,
    isLoading,
    error,
    filterSymbol,
    setFilterSymbol,
    fromTime,
    setFromTime,
    toTime,
    setToTime,
    refetch: fetchAnomalies,
  };
}
