import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { getWebSocketUrl } from '../api/client';
import {
  ConnectionStatus,
  TickMessage,
  AlertMessage,
  AnomalyMessage,
  WebSocketIncomingMessage,
} from '../types/websocket';

export interface LiveNotification {
  id: string;
  type: 'alert' | 'anomaly';
  symbol: string;
  title: string;
  message?: string;
  price?: string;
  volume?: string;
  metric?: string;
  condition?: string;
  threshold?: number;
  ts: string;
  receivedAt: number;
}

type TickListener = (tick: TickMessage) => void;
type AlertListener = (alert: AlertMessage) => void;
type AnomalyListener = (anomaly: AnomalyMessage) => void;

interface WebSocketContextType {
  status: ConnectionStatus;
  latestTicks: Record<string, TickMessage>;
  recentTicksBySymbol: Record<string, TickMessage[]>;
  lastMessageTime: number | null;
  totalTicksReceived: number;
  notifications: LiveNotification[];
  dismissNotification: (id: string) => void;
  reconnect: () => void;
  subscribeTicks: (symbol: string | null, listener: TickListener) => () => void;
  subscribeAlerts: (listener: AlertListener) => () => void;
  subscribeAnomalies: (listener: AnomalyListener) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

const MAX_RECENT_TICKS_PER_SYMBOL = 30;
const MAX_NOTIFICATIONS = 8;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 10000;

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');
  const [latestTicks, setLatestTicks] = useState<Record<string, TickMessage>>({});
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);
  const [totalTicksReceived, setTotalTicksReceived] = useState<number>(0);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);

  // Internal refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasConnectedRef = useRef<boolean>(false);
  const isManuallyClosedRef = useRef<boolean>(false);

  // Recent ticks by symbol circular buffer
  const recentTicksRef = useRef<Record<string, TickMessage[]>>({});
  const [, setRecentTicksTick] = useState<number>(0);

  // Listener subscriptions
  const tickListenersRef = useRef<Set<{ symbol: string | null; listener: TickListener }>>(new Set());
  const alertListenersRef = useRef<Set<AlertListener>>(new Set());
  const anomalyListenersRef = useRef<Set<AnomalyListener>>(new Set());

  // Throttled tick batching for React render efficiency
  const pendingTicksRef = useRef<Record<string, TickMessage>>({});
  const tickBatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingTicks = useCallback(() => {
    if (Object.keys(pendingTicksRef.current).length > 0) {
      setLatestTicks((prev) => ({
        ...prev,
        ...pendingTicksRef.current,
      }));
      pendingTicksRef.current = {};
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = getWebSocketUrl();
    const isReconnecting = wasConnectedRef.current;
    setStatus(isReconnecting ? 'RECONNECTING' : 'CONNECTING');

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        const nextStatus = wasConnectedRef.current ? 'RECONNECTED' : 'CONNECTED';
        wasConnectedRef.current = true;
        reconnectAttemptRef.current = 0;
        setStatus(nextStatus);

        // Transition RECONNECTED to CONNECTED after 2s
        if (nextStatus === 'RECONNECTED') {
          setTimeout(() => {
            setStatus('CONNECTED');
          }, 2000);
        }
      };

      socket.onmessage = (event) => {
        const now = Date.now();
        setLastMessageTime(now);

        try {
          const data = JSON.parse(event.data) as WebSocketIncomingMessage;
          if (!data || !data.type) return;

          if (data.type === 'tick') {
            const tick = data as TickMessage;
            const sym = (tick.symbol || '').toUpperCase();
            if (!sym) return;

            setTotalTicksReceived((prev) => prev + 1);

            // Buffer in recent ticks
            if (!recentTicksRef.current[sym]) {
              recentTicksRef.current[sym] = [];
            }
            const buf = recentTicksRef.current[sym];
            buf.unshift(tick);
            if (buf.length > MAX_RECENT_TICKS_PER_SYMBOL) {
              buf.pop();
            }

            // Stage for state update
            pendingTicksRef.current[sym] = tick;
            if (!tickBatchTimerRef.current) {
              tickBatchTimerRef.current = setTimeout(() => {
                flushPendingTicks();
                tickBatchTimerRef.current = null;
                setRecentTicksTick(Date.now());
              }, 100);
            }

            // Immediately notify direct listeners (e.g. charts)
            tickListenersRef.current.forEach(({ symbol, listener }) => {
              if (symbol === null || symbol === sym) {
                try {
                  listener(tick);
                } catch (e) {
                  console.error('Tick listener error:', e);
                }
              }
            });
          } else if (data.type === 'alert') {
            const alertMsg = data as AlertMessage;
            const notifId = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const notification: LiveNotification = {
              id: notifId,
              type: 'alert',
              symbol: (alertMsg.symbol || 'ALERT').toUpperCase(),
              title: alertMsg.message || `Alert Triggered: ${alertMsg.symbol}`,
              metric: alertMsg.metric,
              condition: alertMsg.condition,
              threshold: alertMsg.threshold,
              price: alertMsg.value !== undefined ? String(alertMsg.value) : undefined,
              ts: alertMsg.ts || new Date().toISOString(),
              receivedAt: now,
            };

            setNotifications((prev) => [notification, ...prev.slice(0, MAX_NOTIFICATIONS - 1)]);

            alertListenersRef.current.forEach((listener) => {
              try {
                listener(alertMsg);
              } catch (e) {
                console.error('Alert listener error:', e);
              }
            });
          } else if (data.type === 'anomaly') {
            const anomalyMsg = data as AnomalyMessage;
            const notifId = `anomaly-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const notification: LiveNotification = {
              id: notifId,
              type: 'anomaly',
              symbol: (anomalyMsg.symbol || 'ANOMALY').toUpperCase(),
              title: anomalyMsg.event || anomalyMsg.description || `Unusual Activity: ${anomalyMsg.symbol}`,
              message: anomalyMsg.description,
              price: anomalyMsg.price,
              volume: anomalyMsg.volume,
              ts: anomalyMsg.ts || new Date().toISOString(),
              receivedAt: now,
            };

            setNotifications((prev) => [notification, ...prev.slice(0, MAX_NOTIFICATIONS - 1)]);

            anomalyListenersRef.current.forEach((listener) => {
              try {
                listener(anomalyMsg);
              } catch (e) {
                console.error('Anomaly listener error:', e);
              }
            });
          }
        } catch (parseErr) {
          console.warn('Failed to parse WebSocket message:', parseErr);
        }
      };

      socket.onerror = () => {
        // Socket errors will trigger onclose
      };

      socket.onclose = () => {
        wsRef.current = null;
        if (!isManuallyClosedRef.current) {
          setStatus(wasConnectedRef.current ? 'RECONNECTING' : 'DISCONNECTED');
          scheduleReconnect();
        } else {
          setStatus('DISCONNECTED');
        }
      };
    } catch {
      setStatus('DISCONNECTED');
      scheduleReconnect();
    }
  }, [flushPendingTicks]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) return;
    reconnectAttemptRef.current += 1;
    const expDelay = Math.min(
      MAX_RECONNECT_DELAY_MS,
      BASE_RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttemptRef.current)
    );
    const jitter = Math.random() * 500;
    const delay = Math.round(expDelay + jitter);

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  }, [connect]);

  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }
    connect();
  }, [connect]);

  useEffect(() => {
    isManuallyClosedRef.current = false;
    connect();

    return () => {
      isManuallyClosedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (tickBatchTimerRef.current) {
        clearTimeout(tickBatchTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Subscription callbacks
  const subscribeTicks = useCallback((symbol: string | null, listener: TickListener) => {
    const entry = { symbol: symbol ? symbol.toUpperCase() : null, listener };
    tickListenersRef.current.add(entry);
    return () => {
      tickListenersRef.current.delete(entry);
    };
  }, []);

  const subscribeAlerts = useCallback((listener: AlertListener) => {
    alertListenersRef.current.add(listener);
    return () => {
      alertListenersRef.current.delete(listener);
    };
  }, []);

  const subscribeAnomalies = useCallback((listener: AnomalyListener) => {
    anomalyListenersRef.current.add(listener);
    return () => {
      anomalyListenersRef.current.delete(listener);
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        status,
        latestTicks,
        recentTicksBySymbol: recentTicksRef.current,
        lastMessageTime,
        totalTicksReceived,
        notifications,
        dismissNotification,
        reconnect,
        subscribeTicks,
        subscribeAlerts,
        subscribeAnomalies,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export function useWebSocketContext(): WebSocketContextType {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return ctx;
}
