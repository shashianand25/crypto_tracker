export interface HealthStatusResponse {
  status?: string;
  healthy?: boolean;
  dataCollectionStatus?: string;
  latestDataTimestamp?: string;
  dataFreshness?: string | number;
  backendAvailability?: string;
  timestamp?: string;
  uptime?: number;
  services?: Record<string, unknown>;
  [key: string]: unknown;
}
