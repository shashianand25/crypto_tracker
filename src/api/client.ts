import {
  AssetInfo,
  LatestPriceData,
  LatestPricesMap,
  HistoryInterval,
  PriceHistoryPoint,
  ComparisonResult,
  ReplayTick,
} from '../types/market';
import { CreateAlertPayload, AlertItem, TriggeredAlertItem } from '../types/alert';
import { AnomalyEvent, AnomalyQueryParams } from '../types/anomaly';
import { HealthStatusResponse } from '../types/health';

export class ApiError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Centralized API Client
 * Uses VITE_API_BASE_URL (defaults to http://localhost:3000)
 */
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getWebSocketUrl(): string {
  const wsBase = API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return `${wsBase}/ws/live`;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
      let errorDetails: unknown = undefined;
      try {
        const body = await res.json();
        errorDetails = body;
        if (body.message) errorMsg = body.message;
        else if (body.error) errorMsg = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
      } catch {
        // Non-JSON error body
      }
      throw new ApiError(errorMsg, res.status, errorDetails);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(message, 0);
  }
}

export const api = {
  /**
   * GET /api/assets
   * Fetches tracked cryptocurrencies. Normalized into AssetInfo[].
   */
  async getAssets(): Promise<AssetInfo[]> {
    const raw = await request<unknown>('/api/assets');
    
    // Normalize string array or object array or wrapper object
    if (Array.isArray(raw)) {
      return raw.map((item) => {
        if (typeof item === 'string') {
          return { symbol: item.toUpperCase() };
        }
        return {
          symbol: (item.symbol || '').toUpperCase(),
          name: item.name,
          baseAsset: item.baseAsset,
          quoteAsset: item.quoteAsset,
          status: item.status,
        };
      });
    }

    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      const list = Array.isArray(obj.assets)
        ? obj.assets
        : Array.isArray(obj.data)
        ? obj.data
        : Object.keys(obj).map((key) => ({ symbol: key, ...(obj[key] as object) }));

      return list.map((item) => {
        if (typeof item === 'string') return { symbol: item.toUpperCase() };
        return {
          symbol: (item.symbol || '').toUpperCase(),
          name: item.name,
          baseAsset: item.baseAsset,
          quoteAsset: item.quoteAsset,
          status: item.status,
        };
      });
    }

    return [];
  },

  /**
   * GET /api/prices/latest
   * Latest price and volume for all assets.
   */
  async getLatestPrices(): Promise<LatestPricesMap> {
    const raw = await request<unknown>('/api/prices/latest');
    const result: LatestPricesMap = {};

    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item && item.symbol) {
          result[item.symbol.toUpperCase()] = {
            symbol: item.symbol.toUpperCase(),
            price: String(item.price ?? '0'),
            volume: String(item.volume ?? '0'),
            ts: item.ts ? String(item.ts) : undefined,
          };
        }
      }
    } else if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      // Check if wrapped in { data: [...] }
      if (Array.isArray(obj.data)) {
        for (const item of obj.data) {
          if (item && item.symbol) {
            result[item.symbol.toUpperCase()] = {
              symbol: item.symbol.toUpperCase(),
              price: String(item.price ?? '0'),
              volume: String(item.volume ?? '0'),
              ts: item.ts ? String(item.ts) : undefined,
            };
          }
        }
      } else {
        // Dict format: { "BTCUSDT": { price: "...", volume: "..." } }
        for (const [key, val] of Object.entries(obj)) {
          if (val && typeof val === 'object') {
            const v = val as Record<string, unknown>;
            result[key.toUpperCase()] = {
              symbol: key.toUpperCase(),
              price: String(v.price ?? '0'),
              volume: String(v.volume ?? '0'),
              ts: v.ts ? String(v.ts) : undefined,
            };
          }
        }
      }
    }

    return result;
  },

  /**
   * GET /api/prices/:symbol/latest
   * Latest price and volume for one asset.
   */
  async getAssetLatestPrice(symbol: string): Promise<LatestPriceData> {
    const raw = await request<Record<string, unknown>>(`/api/prices/${encodeURIComponent(symbol)}/latest`);
    return {
      symbol: (raw.symbol ? String(raw.symbol) : symbol).toUpperCase(),
      price: String(raw.price ?? '0'),
      volume: String(raw.volume ?? '0'),
      ts: raw.ts ? String(raw.ts) : undefined,
    };
  },

  /**
   * GET /api/prices/:symbol/history?from&to&interval
   * Historical price/volume.
   */
  async getAssetHistory(
    symbol: string,
    params: { from?: string; to?: string; interval?: HistoryInterval } = {}
  ): Promise<PriceHistoryPoint[]> {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.interval) query.set('interval', params.interval);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const raw = await request<unknown>(
      `/api/prices/${encodeURIComponent(symbol)}/history${queryString}`
    );

    if (Array.isArray(raw)) {
      return raw.map((item) => ({
        price: item.price ?? 0,
        volume: item.volume ?? 0,
        ts: item.ts ?? item.timestamp ?? 0,
      }));
    }

    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      const list = Array.isArray(obj.history)
        ? obj.history
        : Array.isArray(obj.data)
        ? obj.data
        : [];
      return list.map((item: Record<string, unknown>) => ({
        price: (item.price ?? 0) as string | number,
        volume: (item.volume ?? 0) as string | number,
        ts: (item.ts ?? item.timestamp ?? 0) as string | number,
      }));
    }

    return [];
  },

  /**
   * GET /api/compare?symbols=BTCUSDT,ETHUSDT&from&to
   * Comparison data.
   */
  async getCompare(
    symbols: string[],
    params: { from?: string; to?: string } = {}
  ): Promise<ComparisonResult> {
    const query = new URLSearchParams();
    query.set('symbols', symbols.join(','));
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);

    const raw = await request<unknown>(`/api/compare?${query.toString()}`);
    const result: ComparisonResult = {};

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      // Could be { BTCUSDT: [...points], ETHUSDT: [...points] }
      for (const [key, val] of Object.entries(obj)) {
        if (Array.isArray(val)) {
          result[key.toUpperCase()] = val.map((pt) => ({
            price: pt.price ?? 0,
            volume: pt.volume ?? 0,
            ts: pt.ts ?? pt.timestamp ?? 0,
          }));
        }
      }
    } else if (Array.isArray(raw)) {
      // Group by symbol if flattened list
      for (const item of raw) {
        const sym = (item.symbol || 'UNKNOWN').toUpperCase();
        if (!result[sym]) result[sym] = [];
        result[sym].push({
          price: item.price ?? 0,
          volume: item.volume ?? 0,
          ts: item.ts ?? item.timestamp ?? 0,
        });
      }
    }

    return result;
  },

  /**
   * GET /api/replay/:symbol?from&to
   * Chronological historical data for market replay.
   */
  async getReplay(
    symbol: string,
    params: { from?: string; to?: string } = {}
  ): Promise<ReplayTick[]> {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const raw = await request<unknown>(
      `/api/replay/${encodeURIComponent(symbol)}${queryString}`
    );

    const list: unknown[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).data)
      ? ((raw as Record<string, unknown>).data as unknown[])
      : [];

    return list.map((item) => {
      const pt = item as Record<string, unknown>;
      return {
        symbol: (pt.symbol ? String(pt.symbol) : symbol).toUpperCase(),
        price: String(pt.price ?? '0'),
        volume: String(pt.volume ?? '0'),
        ts: String(pt.ts ?? pt.timestamp ?? new Date().toISOString()),
      };
    });
  },

  /**
   * POST /api/alerts
   */
  async createAlert(payload: CreateAlertPayload): Promise<AlertItem> {
    return await request<AlertItem>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * GET /api/alerts
   */
  async getAlerts(): Promise<AlertItem[]> {
    const raw = await request<unknown>('/api/alerts');
    if (Array.isArray(raw)) {
      return raw as AlertItem[];
    }
    if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).alerts)) {
      return (raw as Record<string, unknown>).alerts as AlertItem[];
    }
    return [];
  },

  /**
   * DELETE /api/alerts/:id
   */
  async deleteAlert(id: string): Promise<void> {
    await request<unknown>(`/api/alerts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /**
   * GET /api/alerts/triggered
   */
  async getTriggeredAlerts(): Promise<TriggeredAlertItem[]> {
    const raw = await request<unknown>('/api/alerts/triggered');
    if (Array.isArray(raw)) {
      return raw as TriggeredAlertItem[];
    }
    if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).triggered)) {
      return (raw as Record<string, unknown>).triggered as TriggeredAlertItem[];
    }
    return [];
  },

  /**
   * GET /api/anomalies?symbol&from&to
   */
  async getAnomalies(params: AnomalyQueryParams = {}): Promise<AnomalyEvent[]> {
    const query = new URLSearchParams();
    if (params.symbol) query.set('symbol', params.symbol);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const raw = await request<unknown>(`/api/anomalies${queryString}`);

    if (Array.isArray(raw)) {
      return raw as AnomalyEvent[];
    }
    if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).anomalies)) {
      return (raw as Record<string, unknown>).anomalies as AnomalyEvent[];
    }
    return [];
  },

  /**
   * GET /api/health
   */
  async getHealth(): Promise<HealthStatusResponse> {
    return await request<HealthStatusResponse>('/api/health');
  },
};
