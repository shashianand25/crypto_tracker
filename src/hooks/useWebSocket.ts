import { useEffect } from 'react';
import { useWebSocketContext } from '../context/WebSocketContext';
import { TickMessage, AlertMessage, AnomalyMessage } from '../types/websocket';

export function useWebSocket() {
  const ws = useWebSocketContext();
  return ws;
}

export function useSymbolTick(symbol: string | null, onTick?: (tick: TickMessage) => void) {
  const ws = useWebSocketContext();

  useEffect(() => {
    if (!symbol || !onTick) return;
    const unsubscribe = ws.subscribeTicks(symbol, onTick);
    return () => {
      unsubscribe();
    };
  }, [symbol, onTick, ws]);

  const upper = symbol ? symbol.toUpperCase() : '';
  const currentTick = upper ? ws.latestTicks[upper] : undefined;
  const recentTicks = upper ? ws.recentTicksBySymbol[upper] || [] : [];

  return {
    currentTick,
    recentTicks,
    status: ws.status,
  };
}

export function useLiveAlertsSubscription(onAlert: (alert: AlertMessage) => void) {
  const ws = useWebSocketContext();

  useEffect(() => {
    const unsubscribe = ws.subscribeAlerts(onAlert);
    return () => {
      unsubscribe();
    };
  }, [onAlert, ws]);
}

export function useLiveAnomaliesSubscription(onAnomaly: (anomaly: AnomalyMessage) => void) {
  const ws = useWebSocketContext();

  useEffect(() => {
    const unsubscribe = ws.subscribeAnomalies(onAnomaly);
    return () => {
      unsubscribe();
    };
  }, [onAnomaly, ws]);
}
