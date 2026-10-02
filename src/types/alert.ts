export type AlertMetric = 'price' | 'volume';
export type AlertCondition = 'above' | 'below';

export interface CreateAlertPayload {
  symbol: string;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: number;
}

export interface AlertItem {
  id: string;
  symbol: string;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: number;
  status?: string;
  createdAt?: string;
  created_at?: string;
}

export interface TriggeredAlertItem {
  id?: string;
  alertId?: string;
  symbol: string;
  metric?: AlertMetric | string;
  condition?: AlertCondition | string;
  threshold?: number;
  value?: string | number;
  triggeredAt?: string;
  ts?: string;
}
