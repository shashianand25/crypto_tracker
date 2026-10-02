export interface AnomalyEvent {
  id?: string;
  symbol: string;
  metric?: string;
  event?: string;
  description?: string;
  price?: string | number;
  volume?: string | number;
  severity?: string;
  ts: string;
}

export interface AnomalyQueryParams {
  symbol?: string;
  from?: string;
  to?: string;
}
