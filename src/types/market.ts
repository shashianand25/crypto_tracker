export type AssetSymbol = string;

export interface AssetInfo {
  symbol: string;
  name?: string;
  baseAsset?: string;
  quoteAsset?: string;
  status?: string;
}

export interface LatestPriceData {
  symbol: string;
  price: string;
  volume: string;
  ts?: string;
}

export type LatestPricesMap = Record<string, LatestPriceData>;

export type HistoryInterval = '1m' | '5m' | '1h';

export interface PriceHistoryPoint {
  price: string | number;
  volume: string | number;
  ts: string | number;
}

export interface ComparisonSeriesPoint {
  price: string | number;
  ts: string | number;
  volume?: string | number;
}

export interface ComparisonResult {
  [symbol: string]: ComparisonSeriesPoint[];
}

export interface ReplayTick {
  symbol?: string;
  price: string;
  volume: string;
  ts: string;
}
