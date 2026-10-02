export type ConnectionStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'RECONNECTING'
  | 'RECONNECTED';

export interface TickMessage {
  type: 'tick';
  symbol: string;
  price: string;
  volume: string;
  ts: string;
}

export interface AlertMessage {
  type: 'alert';
  id?: string;
  symbol: string;
  metric?: string;
  condition?: string;
  threshold?: number;
  value?: string | number;
  message?: string;
  ts: string;
}

export interface AnomalyMessage {
  type: 'anomaly';
  id?: string;
  symbol: string;
  metric?: string;
  event?: string;
  description?: string;
  price?: string;
  volume?: string;
  severity?: string;
  ts: string;
}

export type WebSocketIncomingMessage =
  | TickMessage
  | AlertMessage
  | AnomalyMessage
  | { type: string; [key: string]: unknown };
