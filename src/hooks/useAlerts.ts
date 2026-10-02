import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../api/client';
import { AlertItem, CreateAlertPayload, TriggeredAlertItem } from '../types/alert';
import { useWebSocketContext } from '../context/WebSocketContext';
import { AlertMessage } from '../types/websocket';

export function useAlerts() {
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlertItem[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState<boolean>(true);
  const [isLoadingTriggered, setIsLoadingTriggered] = useState<boolean>(true);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [triggeredError, setTriggeredError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const { subscribeAlerts } = useWebSocketContext();

  const fetchActiveAlerts = useCallback(async () => {
    setIsLoadingActive(true);
    setActiveError(null);
    try {
      const data = await api.getAlerts();
      setActiveAlerts(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to fetch active alerts';
      setActiveError(msg);
    } finally {
      setIsLoadingActive(false);
    }
  }, []);

  const fetchTriggeredAlerts = useCallback(async () => {
    setIsLoadingTriggered(true);
    setTriggeredError(null);
    try {
      const data = await api.getTriggeredAlerts();
      setTriggeredAlerts(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to fetch triggered alert history';
      setTriggeredError(msg);
    } finally {
      setIsLoadingTriggered(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveAlerts();
    fetchTriggeredAlerts();
  }, [fetchActiveAlerts, fetchTriggeredAlerts]);

  // Listen to live WebSocket alert events and add to triggered alerts list
  useEffect(() => {
    const unsubscribe = subscribeAlerts((alertMsg: AlertMessage) => {
      const newTriggered: TriggeredAlertItem = {
        id: alertMsg.id,
        symbol: alertMsg.symbol,
        metric: alertMsg.metric as 'price' | 'volume' | undefined,
        condition: alertMsg.condition as 'above' | 'below' | undefined,
        threshold: alertMsg.threshold,
        value: alertMsg.value,
        triggeredAt: alertMsg.ts,
        ts: alertMsg.ts,
      };

      setTriggeredAlerts((prev) => [newTriggered, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, [subscribeAlerts]);

  const createAlert = useCallback(
    async (payload: CreateAlertPayload): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      try {
        const created = await api.createAlert(payload);
        setActiveAlerts((prev) => [created, ...prev]);
        setSubmitSuccess(`Alert created successfully for ${payload.symbol}`);
        return true;
      } catch (err: unknown) {
        const msg = err instanceof ApiError ? err.message : 'Failed to create alert';
        setSubmitError(msg);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const deleteAlert = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.deleteAlert(id);
      setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
      return true;
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete alert';
      setActiveError(msg);
      return false;
    }
  }, []);

  return {
    activeAlerts,
    triggeredAlerts,
    isLoadingActive,
    isLoadingTriggered,
    activeError,
    triggeredError,
    isSubmitting,
    submitError,
    submitSuccess,
    clearSubmitFeedback: () => {
      setSubmitError(null);
      setSubmitSuccess(null);
    },
    createAlert,
    deleteAlert,
    refetchActive: fetchActiveAlerts,
    refetchTriggered: fetchTriggeredAlerts,
  };
}
