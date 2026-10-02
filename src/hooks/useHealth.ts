import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../api/client';
import { HealthStatusResponse } from '../types/health';
import { useWebSocketContext } from '../context/WebSocketContext';

export function useHealth() {
  const [data, setData] = useState<HealthStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  const ws = useWebSocketContext();

  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const response = await api.getHealth();
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setData(response);
      setLastCheckedAt(Date.now());
    } catch (err: unknown) {
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      const msg = err instanceof ApiError ? err.message : 'Backend health check failed';
      setError(msg);
      setData(null);
      setLastCheckedAt(Date.now());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    healthData: data,
    isLoading,
    error,
    latencyMs,
    lastCheckedAt,
    wsStatus: ws.status,
    totalTicksReceived: ws.totalTicksReceived,
    refetch: checkHealth,
  };
}
