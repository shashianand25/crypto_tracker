import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../api/client';
import { AssetInfo } from '../types/market';

export function useAssets() {
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getAssets();
      setAssets(data);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to fetch tracked assets';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return {
    assets,
    isLoading,
    error,
    refetch: fetchAssets,
  };
}
